// Assigned to: Irfa — list endpoint for route assignment (Baanu)

import express from 'express'
import Driver from '../models/Driver.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const drivers = await Driver.find().sort({ name: 1 })
    res.json(drivers)
  } catch (err) {
    next(err)
  }
})

export default router
