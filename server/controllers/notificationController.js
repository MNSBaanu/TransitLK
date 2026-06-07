import Notification from '../models/Notification.js'
import Bus from '../models/Bus.js'
import Schedule from '../models/Schedule.js'
import Driver from '../models/Driver.js'
import { detectPeriodConflicts } from '../utils/scheduleHelpers.js'

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Protected
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Generate notifications based on current system state
// @route   POST /api/notifications/generate
// @access  Protected
export const generateNotifications = async (req, res) => {
  try {
    const userId = req.user._id
    const today = new Date()
    const oneWeekFromNow = new Date(today)
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)

    const notifications = []

    // 1. Maintenance Due Alerts
    const buses = await Bus.find()
    buses.forEach((bus) => {
      if (bus.nextMaintenanceDate) {
        const nextDate = new Date(bus.nextMaintenanceDate)
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))
        
        if (daysUntil <= 7 && daysUntil >= 0) {
          notifications.push({
            userId,
            type: 'maintenance_due',
            priority: daysUntil <= 3 ? 'high' : 'medium',
            title: 'Maintenance Due Soon',
            message: `${bus.regNumber} is due for maintenance in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            data: { busId: bus._id, regNumber: bus.regNumber, nextMaintenanceDate: bus.nextMaintenanceDate },
            link: '/buses',
          })
        } else if (daysUntil < 0) {
          notifications.push({
            userId,
            type: 'overdue_maintenance',
            priority: 'critical',
            title: 'Maintenance Overdue',
            message: `${bus.regNumber} is overdue for maintenance by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`,
            data: { busId: bus._id, regNumber: bus.regNumber, nextMaintenanceDate: bus.nextMaintenanceDate },
            link: '/maintenance',
          })
        }
      }
    })

    // 2. Schedule Conflicts
    const todayStr = today.toISOString().split('T')[0]
    const schedules = await Schedule.find({
      tripDate: { $gte: todayStr },
      status: { $in: ['pending', 'approved', 'scheduled'] },
    }).populate('routeId', 'routeName')
    
    const conflicts = detectPeriodConflicts(schedules)
    conflicts.forEach((conflict) => {
      notifications.push({
        userId,
        type: 'schedule_conflict',
        priority: 'high',
        title: 'Schedule Conflict',
        message: conflict.message,
        data: { conflict },
        link: '/schedules',
      })
    })

    // 3. Delayed Trips
    const delayedSchedules = await Schedule.find({
      status: 'delayed',
    }).populate('routeId', 'routeName')
    
    delayedSchedules.forEach((schedule) => {
      notifications.push({
        userId,
        type: 'delayed_trip',
        priority: 'medium',
        title: 'Trip Delayed',
        message: `${schedule.routeId?.routeName || 'Route'} · ${schedule.departureTime}–${schedule.arrivalTime}`,
        data: { scheduleId: schedule._id, routeId: schedule.routeId?._id },
        link: '/schedules',
      })
    })

    // 4. License Expiry Warnings
    const drivers = await Driver.find()
    drivers.forEach((driver) => {
      if (driver.licenseExpiry) {
        const expiryDate = new Date(driver.licenseExpiry)
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        
        if (daysUntil <= 30 && daysUntil > 0) {
          notifications.push({
            userId,
            type: 'license_expiry_warning',
            priority: daysUntil <= 7 ? 'high' : 'medium',
            title: 'License Expiring Soon',
            message: `${driver.name}'s license expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            data: { driverId: driver._id, name: driver.name, licenseNo: driver.licenseNo, licenseExpiry: driver.licenseExpiry },
            link: '/buses',
          })
        } else if (daysUntil <= 0) {
          notifications.push({
            userId,
            type: 'license_expiry_warning',
            priority: 'critical',
            title: 'License Expired',
            message: `${driver.name}'s license expired on ${expiryDate.toLocaleDateString('en-GB')}`,
            data: { driverId: driver._id, name: driver.name, licenseNo: driver.licenseNo, licenseExpiry: driver.licenseExpiry },
            link: '/buses',
          })
        }
      }
    })

    // Clear old notifications and insert new ones
    await Notification.deleteMany({ userId })
    if (notifications.length > 0) {
      await Notification.insertMany(notifications)
    }

    // Add "all clear" if no notifications
    if (notifications.length === 0) {
      await Notification.create({
        userId,
        type: 'maintenance_due',
        priority: 'low',
        title: 'All Clear',
        message: 'No urgent depot alerts for today.',
        link: '/dashboard',
      })
    }

    const allNotifications = await Notification.find({ userId }).sort({ createdAt: -1 })
    res.json(allNotifications)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Protected
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }
    notification.read = true
    await notification.save()
    res.json(notification)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Protected
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id
    await Notification.updateMany({ userId, read: false }, { read: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Protected
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' })
    }
    await notification.deleteOne()
    res.json({ message: 'Notification deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
