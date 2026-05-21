import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import errorHandler from './middleware/errorMiddleware.js'

// Routes
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import routeRoutes from './routes/routeRoutes.js'
import scheduleRoutes from './routes/scheduleRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import busRoutes from './routes/busRoutes.js'
import maintenanceRoutes from './routes/maintenanceRoutes.js'
import fuelRoutes from './routes/fuelRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import depotRoutes from './routes/depotRoutes.js'
import adminRoutes from './routes/adminRoutes.js'

dotenv.config()
connectDB()

const app = express()

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/buses', busRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/fuel', fuelRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/depots', depotRoutes)
app.use('/api/admins', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Error handler (must be last)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
