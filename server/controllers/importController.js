import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import Route from '../models/Route.js'
import User from '../models/User.js'
import Admin from '../models/Admin.js'
import Maintenance from '../models/Maintenance.js'
import { STAFF_ROLES, ROLES } from '../utils/roles.js'
import { emailInUse } from '../utils/accountEmails.js'
import { finalizeRouteFields } from '../utils/routeHelpers.js'
import {
  resolveWriteDepotId,
  isSuperadministrator,
  assertDepotAccess,
} from '../utils/depotAccess.js'
import { cancelActiveSchedulesForBus } from '../utils/fleetAssignmentHelpers.js'
import { syncBusMaintenanceFields } from '../utils/busMaintenanceSync.js'
import {
  sanitizeMaintenanceBody,
  finalizeMaintenanceFields,
  syncBusStatusFromMaintenance,
} from '../utils/maintenanceHelpers.js'
import { sanitizeWorkingHoursInput } from '../utils/timeFormat.js'
import {
  parseCsv,
  rowsToCsv,
  parseBoolean,
  parseOptionalDate,
} from '../utils/csvHelpers.js'
import { CSV_TEMPLATES, IMPORT_TYPES } from '../utils/csvImportTemplates.js'

const BUS_STATUSES = new Set(['available', 'in-service', 'maintenance'])
const BUS_SERVICE_TYPES = new Set(['express', 'ordinary', 'semi-luxury'])
const DRIVER_STATUSES = new Set(['available', 'on-duty', 'on-leave', 'off-duty'])
const ROUTE_STATUSES = new Set(['active', 'inactive', 'draft'])
const MAINTENANCE_STATUSES = new Set(['scheduled', 'in-progress', 'completed', 'cancelled'])

function emptyRow(row, headers) {
  return headers.every((h) => !String(row[h] ?? '').trim())
}

function requireHeaders(headers, expected) {
  const missing = expected.filter((h) => !headers.includes(h))
  if (missing.length) {
    const error = new Error(`Missing CSV columns: ${missing.join(', ')}`)
    error.statusCode = 400
    throw error
  }
}

export function downloadSampleCsv(req, res) {
  const { type } = req.params
  const template = CSV_TEMPLATES[type]
  if (!template) {
    return res.status(404).json({ message: 'Unknown import type' })
  }

  const csv = rowsToCsv(template.headers, template.sampleRows)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`)
  res.send(csv)
}

async function importVehicles(req, rows, headers, depotId) {
  requireHeaders(headers, CSV_TEMPLATES.vehicles.headers)
  const result = { imported: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    if (emptyRow(row, headers)) continue
    const line = row.__row
    const regNumber = String(row.regNumber || '').trim()
    const capacity = Number(row.capacity)
    const mileage = row.mileage === '' ? 0 : Number(row.mileage)
    const serviceType = String(row.serviceType || 'ordinary').trim().toLowerCase()
    const status = String(row.status || 'available').trim().toLowerCase()

    if (!regNumber) {
      result.errors.push({ row: line, message: 'regNumber is required' })
      continue
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      result.errors.push({ row: line, message: 'capacity must be a number >= 1' })
      continue
    }
    if (!BUS_SERVICE_TYPES.has(serviceType)) {
      result.errors.push({ row: line, message: `Invalid serviceType: ${serviceType}` })
      continue
    }
    if (!BUS_STATUSES.has(status)) {
      result.errors.push({ row: line, message: `Invalid status: ${status}` })
      continue
    }

    const exists = await Bus.findOne({ regNumber })
    if (exists) {
      result.skipped += 1
      result.errors.push({ row: line, message: `Vehicle ${regNumber} already exists — skipped` })
      continue
    }

    await Bus.create({
      regNumber,
      capacity,
      mileage: Number.isFinite(mileage) && mileage >= 0 ? mileage : 0,
      serviceType,
      status,
      depotId,
    })
    result.imported += 1
  }

  return result
}

async function importDrivers(req, rows, headers, depotId) {
  requireHeaders(headers, CSV_TEMPLATES.drivers.headers)
  const result = { imported: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    if (emptyRow(row, headers)) continue
    const line = row.__row
    const name = String(row.name || '').trim()
    const licenseNo = String(row.licenseNo || '').trim()
    const email = String(row.email || '').trim().toLowerCase()
    const password = String(row.password || '').trim()
    const contactNo = String(row.contactNo || '').trim()
    const workingHours = sanitizeWorkingHoursInput(row.workingHours)
    const licenseExpiry = parseOptionalDate(row.licenseExpiry)
    const status = String(row.status || 'available').trim().toLowerCase()

    if (!name || !licenseNo) {
      result.errors.push({ row: line, message: 'name and licenseNo are required' })
      continue
    }
    if (!DRIVER_STATUSES.has(status)) {
      result.errors.push({ row: line, message: `Invalid status: ${status}` })
      continue
    }
    if (row.licenseExpiry && licenseExpiry === null) {
      result.errors.push({ row: line, message: 'licenseExpiry must be YYYY-MM-DD' })
      continue
    }
    if (email && password && password.length < 6) {
      result.errors.push({ row: line, message: 'password must be at least 6 characters when email is set' })
      continue
    }

    if (await Driver.findOne({ licenseNo })) {
      result.skipped += 1
      result.errors.push({ row: line, message: `License ${licenseNo} already exists — skipped` })
      continue
    }
    if (email && (await emailInUse(email))) {
      result.skipped += 1
      result.errors.push({ row: line, message: `Email ${email} already in use — skipped` })
      continue
    }

    const driver = new Driver({
      name,
      licenseNo,
      email: email || undefined,
      password: password || undefined,
      contactNo: contactNo || undefined,
      workingHours: workingHours || undefined,
      licenseExpiry,
      status,
      depotId,
    })
    await driver.save()
    result.imported += 1
  }

  return result
}

async function importRoutes(req, rows, headers, depotId) {
  requireHeaders(headers, CSV_TEMPLATES.routes.headers)
  const result = { imported: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    if (emptyRow(row, headers)) continue
    const line = row.__row
    const routeNo = String(row.routeNo || '').trim()
    const startPoint = String(row.startPoint || '').trim()
    const endPoint = String(row.endPoint || '').trim()
    const viaDescription = String(row.viaDescription || '').trim()
    const distance = Number(row.distance)
    const serviceType = String(row.serviceType || 'ordinary').trim().toLowerCase()
    const status = String(row.status || 'active').trim().toLowerCase()

    if (!routeNo || !startPoint || !endPoint) {
      result.errors.push({ row: line, message: 'routeNo, startPoint, and endPoint are required' })
      continue
    }
    if (!Number.isFinite(distance) || distance < 0) {
      result.errors.push({ row: line, message: 'distance must be a number >= 0' })
      continue
    }
    if (!BUS_SERVICE_TYPES.has(serviceType)) {
      result.errors.push({ row: line, message: `Invalid serviceType: ${serviceType}` })
      continue
    }
    if (!ROUTE_STATUSES.has(status)) {
      result.errors.push({ row: line, message: `Invalid status: ${status}` })
      continue
    }

    const dupFilter = depotId ? { depotId, routeNo } : { routeNo }
    if (await Route.findOne(dupFilter)) {
      result.skipped += 1
      result.errors.push({ row: line, message: `Route ${routeNo} already exists — skipped` })
      continue
    }

    const data = finalizeRouteFields({
      routeNo,
      startPoint,
      endPoint,
      viaDescription: viaDescription || undefined,
      distance,
      serviceType,
      status,
      depotId,
      createdBy: req.user?.id,
    })

    await Route.create(data)
    result.imported += 1
  }

  return result
}

async function importUsers(req, rows, headers, depotId) {
  requireHeaders(headers, CSV_TEMPLATES.users.headers)
  const result = { imported: 0, skipped: 0, errors: [] }
  const superadmin = isSuperadministrator(req.user)

  for (const row of rows) {
    if (emptyRow(row, headers)) continue
    const line = row.__row
    const name = String(row.name || '').trim()
    const email = String(row.email || '').trim().toLowerCase()
    const password = String(row.password || '').trim()
    const role = String(row.role || '').trim().toLowerCase()
    const isActive = parseBoolean(row.isActive, true)

    if (!name || !email || !password) {
      result.errors.push({ row: line, message: 'name, email, and password are required' })
      continue
    }
    if (password.length < 6) {
      result.errors.push({ row: line, message: 'password must be at least 6 characters' })
      continue
    }

    if (role === ROLES.ADMINISTRATOR) {
      if (!superadmin) {
        result.errors.push({ row: line, message: 'Only superadministrator can import administrator accounts' })
        continue
      }
      if (!depotId) {
        result.errors.push({ row: line, message: 'depotId required for administrator (assign depot in CSV import context)' })
        continue
      }
      if (await emailInUse(email)) {
        result.skipped += 1
        result.errors.push({ row: line, message: `Email ${email} already in use — skipped` })
        continue
      }
      await Admin.create({
        name,
        email,
        password,
        role: ROLES.ADMINISTRATOR,
        depotId,
      })
      result.imported += 1
      continue
    }

    if (!STAFF_ROLES.includes(role)) {
      result.errors.push({
        row: line,
        message: `Invalid role: ${role}. Use transport_scheduler, fleet_manager, or depot_manager`,
      })
      continue
    }

    if (!depotId) {
      result.errors.push({ row: line, message: 'Your account must be assigned to a depot' })
      continue
    }

    if (await emailInUse(email)) {
      result.skipped += 1
      result.errors.push({ row: line, message: `Email ${email} already in use — skipped` })
      continue
    }

    await User.create({
      name,
      email,
      password,
      role,
      depotId,
      isActive,
    })
    result.imported += 1
  }

  return result
}

async function importMaintenance(req, rows, headers, depotId) {
  requireHeaders(headers, CSV_TEMPLATES.maintenance.headers)
  const result = { imported: 0, skipped: 0, errors: [] }
  const touchedBusIds = new Set()

  for (const row of rows) {
    if (emptyRow(row, headers)) continue
    const line = row.__row
    const regNumber = String(row.regNumber || '').trim()
    const description = String(row.description || '').trim()
    const cost = Number(row.cost)
    const status = String(row.status || 'completed').trim().toLowerCase()
    const serviceDate = parseOptionalDate(row.service_date)
    const startedAt = row.startedAt?.trim() ? parseOptionalDate(row.startedAt) : null
    const completedAt = row.completedAt?.trim() ? parseOptionalDate(row.completedAt) : null

    if (!regNumber || !description) {
      result.errors.push({ row: line, message: 'regNumber and description are required' })
      continue
    }
    if (!serviceDate) {
      result.errors.push({ row: line, message: 'service_date must be YYYY-MM-DD' })
      continue
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      result.errors.push({ row: line, message: 'cost must be a number greater than 0' })
      continue
    }
    if (!MAINTENANCE_STATUSES.has(status)) {
      result.errors.push({ row: line, message: `Invalid status: ${status}` })
      continue
    }
    if (startedAt === null && row.startedAt?.trim()) {
      result.errors.push({ row: line, message: 'startedAt must be YYYY-MM-DD' })
      continue
    }
    if (completedAt === null && row.completedAt?.trim()) {
      result.errors.push({ row: line, message: 'completedAt must be YYYY-MM-DD' })
      continue
    }

    const busFilter = depotId ? { regNumber, depotId } : { regNumber }
    const bus = await Bus.findOne(busFilter)
    if (!bus) {
      result.errors.push({ row: line, message: `Vehicle ${regNumber} not found in your depot` })
      continue
    }

    try {
      assertDepotAccess(
        req.user,
        bus.depotId,
        'Not allowed to import maintenance for buses outside your depot'
      )
    } catch (err) {
      result.errors.push({ row: line, message: err.message })
      continue
    }

    try {
      const payload = finalizeMaintenanceFields(
        sanitizeMaintenanceBody({
          bus_id: bus._id,
          service_date: serviceDate,
          description,
          cost,
          status,
          ...(startedAt ? { startedAt } : {}),
          ...(completedAt ? { completedAt } : {}),
        })
      )

      if (payload.status === 'scheduled' || payload.status === 'in-progress') {
        await cancelActiveSchedulesForBus(
          bus._id,
          description || 'Vehicle logged for maintenance — schedule cancelled'
        )
      }

      await Maintenance.create(payload)
      touchedBusIds.add(String(bus._id))
      result.imported += 1
    } catch (err) {
      result.errors.push({ row: line, message: err.message || 'Could not create maintenance record' })
    }
  }

  for (const busId of touchedBusIds) {
    await syncBusStatusFromMaintenance(busId)
    await syncBusMaintenanceFields(busId)
  }

  return result
}

export async function importCsv(req, res) {
  try {
    const { type } = req.params
    if (!IMPORT_TYPES.includes(type)) {
      return res.status(404).json({ message: 'Unknown import type' })
    }

    const { csv } = req.body
    if (!csv?.trim()) {
      return res.status(400).json({ message: 'CSV content is required' })
    }

    const depotId = resolveWriteDepotId(req.user, req.body.depotId)
    if (!depotId && type !== 'users' && !isSuperadministrator(req.user)) {
      return res.status(403).json({ message: 'This account is not assigned to a depot' })
    }

    const { headers, rows } = parseCsv(csv)
    if (!headers.length) {
      return res.status(400).json({ message: 'CSV file is empty or has no header row' })
    }

    let result
    switch (type) {
      case 'vehicles':
        result = await importVehicles(req, rows, headers, depotId)
        break
      case 'drivers':
        result = await importDrivers(req, rows, headers, depotId)
        break
      case 'routes':
        result = await importRoutes(req, rows, headers, depotId)
        break
      case 'users':
        result = await importUsers(req, rows, headers, depotId)
        break
      case 'maintenance':
        result = await importMaintenance(req, rows, headers, depotId)
        break
      default:
        return res.status(404).json({ message: 'Unknown import type' })
    }

    res.json({
      type,
      ...result,
      hints: CSV_TEMPLATES[type].hints,
    })
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}
