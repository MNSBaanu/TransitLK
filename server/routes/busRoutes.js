// Assigned to: Irfa — list endpoint for route assignment (Baanu)

import express from 'express'
import Bus from '../models/Bus.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const buses = await Bus.find().sort({ regNumber: 1 })
    res.json(buses)
  } catch (err) {
    next(err)
  }
})

export default router
