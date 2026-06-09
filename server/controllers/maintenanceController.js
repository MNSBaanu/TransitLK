import Maintenance from '../models/Maintenance.js'
import Bus from '../models/Bus.js'
import { cancelActiveSchedulesForBus } from '../utils/fleetAssignmentHelpers.js'
import { syncBusMaintenanceFields } from '../utils/busMaintenanceSync.js'
import {
  computeMaintenanceDuration,
  finalizeMaintenanceFields,
  sanitizeMaintenanceBody,
  syncBusStatusFromMaintenance,
} from '../utils/maintenanceHelpers.js'
import { buildFuelMaintenanceReport } from '../services/fuelMaintenanceReport.js'
import { createFuelMaintenanceReportPdfStream } from '../services/fuelMaintenanceReportPdf.js'
import { buildFuelMaintenanceReportSpreadsheet } from '../utils/excelExport.js'

// @desc    Fuel & maintenance summary report for a date range
// @route   GET /api/maintenance/report
// @access  Protected
export const getFuelMaintenanceReport = async (req, res) => {
  try {
    const data = await buildFuelMaintenanceReport(req.query)
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Export fuel & maintenance summary as styled Excel (colored tables)
// @route   GET /api/maintenance/report/csv
// @access  Protected
export const exportFuelMaintenanceReportCsv = async (req, res) => {
  try {
    const data = await buildFuelMaintenanceReport(req.query)
    const filename = `transitlk-fuel-maintenance-${data.period.mode}-${data.period.from}-${data.period.to}`
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`)
    res.send(buildFuelMaintenanceReportSpreadsheet(data))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Export fuel & maintenance summary as PDF
// @route   GET /api/maintenance/report/pdf
// @access  Protected
export const exportFuelMaintenanceReportPdf = async (req, res) => {
  try {
    const data = await buildFuelMaintenanceReport(req.query)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fuel-maintenance-${data.period.from}-${data.period.to}.pdf"`
    )
    const doc = createFuelMaintenanceReportPdfStream(data)
    doc.pipe(res)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create a maintenance record
// @route   POST /api/maintenance
// @access  Protected
function attachMaintenancePresentation(record) {
  const doc = record?.toObject ? record.toObject() : { ...record }
  doc.durationLabel = computeMaintenanceDuration(doc)
  return doc
}

export const createMaintenance = async (req, res) => {
  try {
    const payload = finalizeMaintenanceFields(sanitizeMaintenanceBody(req.body))
    const { bus_id, description } = payload

    const bus = await Bus.findById(bus_id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    const record = await Maintenance.create(payload)

    if (payload.status === 'scheduled' || payload.status === 'in-progress') {
      await cancelActiveSchedulesForBus(
        bus_id,
        description?.trim() || 'Vehicle logged for maintenance — schedule cancelled'
      )
    }

    await syncBusStatusFromMaintenance(bus_id)
    await syncBusMaintenanceFields(bus_id)

    const populated = await Maintenance.findById(record._id).populate(
      'bus_id',
      'regNumber status lastMaintenanceDate nextMaintenanceDate'
    )
    res.status(201).json(attachMaintenancePresentation(populated))
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Get all maintenance records (filter by bus_id, date range)
// @route   GET /api/maintenance
// @access  Protected
export const getAllMaintenance = async (req, res) => {
  try {
    const { bus_id, from, to } = req.query
    const filter = {}

    if (bus_id) filter.bus_id = bus_id
    if (from || to) {
      filter.service_date = {}
      if (from) filter.service_date.$gte = new Date(from)
      if (to) filter.service_date.$lte = new Date(to)
    }

    const records = await Maintenance.find(filter)
      .populate('bus_id', 'regNumber status lastMaintenanceDate nextMaintenanceDate')
      .sort({ service_date: -1 })
    res.json(records.map((record) => attachMaintenancePresentation(record)))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get a single maintenance record by ID
// @route   GET /api/maintenance/:id
// @access  Protected
export const getMaintenanceById = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id).populate('bus_id', 'regNumber status')
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }
    res.json(attachMaintenancePresentation(record))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update a maintenance record
// @route   PUT /api/maintenance/:id
// @access  Protected
export const updateMaintenance = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }

    const previousBusId = record.bus_id
    const payload = finalizeMaintenanceFields(
      sanitizeMaintenanceBody(req.body, { isUpdate: true }),
      record
    )

    const updated = await Maintenance.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })

    await syncBusStatusFromMaintenance(updated.bus_id)
    if (previousBusId && String(previousBusId) !== String(updated.bus_id)) {
      await syncBusStatusFromMaintenance(previousBusId)
    }

    await syncBusMaintenanceFields(updated.bus_id)
    if (previousBusId && String(previousBusId) !== String(updated.bus_id)) {
      await syncBusMaintenanceFields(previousBusId)
    }

    const populated = await Maintenance.findById(updated._id).populate(
      'bus_id',
      'regNumber status lastMaintenanceDate nextMaintenanceDate'
    )
    res.json(attachMaintenancePresentation(populated))
  } catch (error) {
    const status = error.statusCode || 500
    res.status(status).json({ message: error.message })
  }
}

// @desc    Delete a maintenance record
// @route   DELETE /api/maintenance/:id
// @access  Protected
export const deleteMaintenance = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' })
    }

    const busId = record.bus_id
    await record.deleteOne()
    await syncBusStatusFromMaintenance(busId)
    await syncBusMaintenanceFields(busId)

    res.json({ message: 'Maintenance record removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
