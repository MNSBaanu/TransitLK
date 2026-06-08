import Maintenance from '../models/Maintenance.js'
import Bus from '../models/Bus.js'
import { cancelActiveSchedulesForBus } from '../utils/fleetAssignmentHelpers.js'
import {
  reconcileFleetMaintenanceData,
  syncBusMaintenanceFields,
} from '../utils/busMaintenanceSync.js'
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
export const createMaintenance = async (req, res) => {
  const { bus_id, service_date, description, cost } = req.body

  try {
    const bus = await Bus.findById(bus_id)
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    const record = await Maintenance.create({ bus_id, service_date, description, cost })

    await cancelActiveSchedulesForBus(
      bus_id,
      description?.trim() || 'Vehicle logged for maintenance — schedule cancelled'
    )
    await Bus.findByIdAndUpdate(bus_id, { status: 'maintenance' })
    await syncBusMaintenanceFields(bus_id)

    const populated = await Maintenance.findById(record._id).populate(
      'bus_id',
      'regNumber status lastMaintenanceDate nextMaintenanceDate'
    )
    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all maintenance records (filter by bus_id, date range)
// @route   GET /api/maintenance
// @access  Protected
export const getAllMaintenance = async (req, res) => {
  try {
    await reconcileFleetMaintenanceData()

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
    res.json(records)
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
    res.json(record)
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

    const updated = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    await syncBusMaintenanceFields(updated.bus_id)
    if (previousBusId && String(previousBusId) !== String(updated.bus_id)) {
      await syncBusMaintenanceFields(previousBusId)
    }

    const populated = await Maintenance.findById(updated._id).populate(
      'bus_id',
      'regNumber status lastMaintenanceDate nextMaintenanceDate'
    )
    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
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
    await syncBusMaintenanceFields(busId)

    const remaining = await Maintenance.countDocuments({ bus_id: busId })
    if (remaining === 0) {
      const bus = await Bus.findById(busId).select('status')
      if (bus?.status === 'maintenance') {
        await Bus.findByIdAndUpdate(busId, {
          status: 'available',
          lastMaintenanceDate: null,
          nextMaintenanceDate: null,
        })
      }
    }

    res.json({ message: 'Maintenance record removed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
