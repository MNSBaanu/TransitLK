import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import errorHandler from './middleware/errorMiddleware.js'

// Routes
import routeRoutes from './routes/routeRoutes.js'
import scheduleRoutes from './routes/scheduleRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import busRoutes from './routes/busRoutes.js'
import maintenanceRoutes from './routes/maintenanceRoutes.js'
import fuelRoutes from './routes/fuelRoutes.js'
import reportRoutes from './routes/reportRoutes.js'

dotenv.config()
connectDB()

const app = express()

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// API Routes (auth disabled for development)
app.use('/api/routes', routeRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/buses', busRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/fuel', fuelRoutes)
app.use('/api/reports', reportRoutes)

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
