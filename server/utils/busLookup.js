import mongoose from 'mongoose'
import Bus from '../models/Bus.js'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Resolve a bus by MongoDB id or registration number. */
export async function resolveBusReference(busRef) {
  const ref = String(busRef ?? '').trim()
  if (!ref) {
    const error = new Error('Bus is required')
    error.statusCode = 400
    throw error
  }

  let bus = null
  if (mongoose.isValidObjectId(ref)) {
    bus = await Bus.findById(ref)
  }
  if (!bus) {
    bus = await Bus.findOne({ regNumber: new RegExp(`^${escapeRegex(ref)}$`, 'i') })
  }
  if (!bus) {
    const error = new Error('Bus not found')
    error.statusCode = 404
    throw error
  }
  return bus
}

export function controllerErrorStatus(error) {
  if (error.statusCode) return error.statusCode
  if (error.name === 'ValidationError' || error.name === 'CastError') return 400
  return 500
}

export function controllerErrorMessage(error) {
  if (error.name === 'ValidationError') {
    return Object.values(error.errors)
      .map((entry) => entry.message)
      .join(', ')
  }
  if (error.name === 'CastError') {
    return 'Invalid bus reference'
  }
  return error.message
}
