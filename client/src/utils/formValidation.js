export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_LK_RE = /^(\+94|0)?[\s-]?[0-9]{2,3}[\s-]?[0-9]{3}[\s-]?[0-9]{4}$/
export const MONGO_ID_RE = /^[a-f\d]{24}$/i
export const REG_NUMBER_RE = /^[A-Z0-9-]{2,20}$/i
export const DEPOT_CODE_RE = /^[A-Z0-9]{1,6}$/
export function trim(value) {
  return typeof value === 'string' ? value.trim() : value
}

export function hasErrors(errors = {}) {
  return Object.values(errors).some(Boolean)
}

export function firstError(errors = {}) {
  return Object.values(errors).find(Boolean) || null
}

export function fieldBorderClass(hasError) {
  return hasError
    ? 'border-red-400 focus:border-red-500'
    : 'border-outline-variant focus:border-neutral-900'
}

function requiredText(value, label, min = 1) {
  const v = trim(value)
  if (!v) return `${label} is required`
  if (v.length < min) return `${label} must be at least ${min} characters`
  return null
}

function positiveNumber(value, label, { min = 0, allowZero = false } = {}) {
  if (value === '' || value === null || value === undefined) return `${label} is required`
  const n = Number(value)
  if (!Number.isFinite(n)) return `${label} must be a valid number`
  if (!allowZero && n <= 0) return `${label} must be greater than 0`
  if (allowZero && n < min) return `${label} must be at least ${min}`
  return null
}

function emailField(value) {
  const v = trim(value)
  if (!v) return 'Email is required'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address'
  return null
}

function passwordField(value, { required: isRequired = true, minLength = 6 } = {}) {
  if (!value) return isRequired ? 'Password is required' : null
  if (value.length < minLength) return `Password must be at least ${minLength} characters`
  return null
}

function phoneField(value, { required: isRequired = true } = {}) {
  const v = trim(value)
  if (!v) return isRequired ? 'Contact number is required' : null
  if (!PHONE_LK_RE.test(v.replace(/\s/g, ''))) {
    return 'Enter a valid Sri Lankan phone number (e.g. 077 123 4567)'
  }
  return null
}

function dateNotFuture(value, label) {
  if (!value) return `${label} is required`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return `${label} is invalid`
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (d > today) return `${label} cannot be in the future`
  return null
}

function dateNotPast(value, label) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return `${label} is invalid`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d < today) return `${label} cannot be in the past`
  return null
}

export function validateLogin({ email, password }) {
  const errors = {}
  const emailErr = emailField(email)
  if (emailErr) errors.email = emailErr
  if (!password) errors.password = 'Password is required'
  return errors
}

export function validateBusForm(form) {
  const errors = {}
  const regErr = requiredText(form.regNumber, 'Registration number', 2)
  if (regErr) errors.regNumber = regErr
  else if (!REG_NUMBER_RE.test(trim(form.regNumber))) {
    errors.regNumber = 'Use letters, numbers, and hyphens only'
  }

  const capErr = positiveNumber(form.capacity, 'Capacity', { min: 1 })
  if (capErr) errors.capacity = capErr
  else if (!Number.isInteger(Number(form.capacity))) {
    errors.capacity = 'Capacity must be a whole number'
  }

  if (form.mileage !== '' && form.mileage != null) {
    const mileage = Number(form.mileage)
    if (!Number.isFinite(mileage) || mileage < 0) {
      errors.mileage = 'Mileage must be zero or greater'
    }
  }

  return errors
}

export function validateDriverForm(form, { isEdit = false, resetPassword = false } = {}) {
  const errors = {}
  const nameErr = requiredText(form.name, 'Full name', 2)
  if (nameErr) errors.name = nameErr

  const licenseErr = requiredText(form.licenseNo, 'License number', 2)
  if (licenseErr) errors.licenseNo = licenseErr

  const contactErr = phoneField(form.contactNo)
  if (contactErr) errors.contactNo = contactErr

  const expiryErr = dateNotPast(form.licenseExpiry, 'License expiry date')
  if (expiryErr) errors.licenseExpiry = expiryErr

  const email = trim(form.email)
  const password = form.password || ''

  if (isEdit) {
    if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address'
    if (resetPassword) {
      const passErr = passwordField(password, { required: true })
      if (passErr) errors.password = passErr
    }
  } else {
    const wantsLogin = Boolean(email || password)
    if (wantsLogin) {
      if (!email) errors.email = 'Email is required when setting up driver login'
      else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address'

      const passErr = passwordField(password, { required: true })
      if (passErr) errors.password = passErr
    }
  }

  const start = trim(form.workingHoursStart)
  const end = trim(form.workingHoursEnd)
  if (start || end) {
    if (!start) errors.workingHoursStart = 'Start time is required'
    if (!end) errors.workingHoursEnd = 'End time is required'
    if (start && end && start === end) {
      errors.workingHoursEnd = 'End time must differ from start time'
    }
  }

  return errors
}

export function validateDepotForm(form) {
  const errors = {}
  const codeErr = requiredText(form.depotCode, 'Depot code')
  if (codeErr) errors.depotCode = codeErr
  else if (!DEPOT_CODE_RE.test(trim(form.depotCode).toUpperCase())) {
    errors.depotCode = 'Use 1–6 letters or numbers'
  }

  const regionErr = requiredText(form.region, 'Region', 2)
  if (regionErr) errors.region = regionErr

  const nameErr = requiredText(form.depotName, 'Depot name', 2)
  if (nameErr) errors.depotName = nameErr

  ;[
    ['directContactNo', form.directContactNo],
    ['mobileContactNo', form.mobileContactNo],
    ['contactNo', form.contactNo],
  ].forEach(([key, phone]) => {
    const v = trim(phone)
    if (v && !PHONE_LK_RE.test(v.replace(/\s/g, ''))) {
      errors[key] = 'Enter a valid phone number'
    }
  })

  return errors
}

export function validateUserForm(form, { isEdit = false, depotRequired = true } = {}) {
  const errors = {}
  const nameErr = requiredText(form.name, 'Full name', 2)
  if (nameErr) errors.name = nameErr

  const emailErr = emailField(form.email)
  if (emailErr) errors.email = emailErr

  if (!isEdit) {
    const passErr = passwordField(form.password, { required: true })
    if (passErr) errors.password = passErr
  } else if (form.password) {
    const passErr = passwordField(form.password, { required: false })
    if (passErr) errors.password = passErr
  }

  if (depotRequired && !trim(form.depotId)) {
    errors.depotId = 'Depot assignment is required for this role'
  }

  return errors
}

export function validateAdminForm(form, { isEdit = false } = {}) {
  const errors = {}
  const nameErr = requiredText(form.name, 'Full name', 2)
  if (nameErr) errors.name = nameErr

  const emailErr = emailField(form.email)
  if (emailErr) errors.email = emailErr

  if (!isEdit) {
    const passErr = passwordField(form.password, { required: true })
    if (passErr) errors.password = passErr
  } else if (form.password) {
    const passErr = passwordField(form.password, { required: false })
    if (passErr) errors.password = passErr
  }

  if (form.role === 'administrator' && !trim(form.depotId)) {
    errors.depotId = 'Depot assignment is required for administrators'
  }

  return errors
}

export function validateMaintenanceForm(form) {
  const errors = {}

  if (!trim(form.bus_id)) {
    errors.bus_id = 'Select a bus'
  }

  const dateErr = dateNotFuture(form.service_date, 'Service date')
  if (dateErr) errors.service_date = dateErr

  const descErr = requiredText(form.description, 'Description', 3)
  if (descErr) errors.description = descErr

  const costErr = positiveNumber(form.cost, 'Cost')
  if (costErr) errors.cost = costErr

  if (!form.status) {
    errors.status = 'Status is required'
  }

  if (form.status === 'completed' && !trim(form.completedAt)) {
    errors.completedAt = 'Completion date is required for completed maintenance'
  }

  if (form.startedAt && form.completedAt) {
    const start = new Date(form.startedAt)
    const end = new Date(form.completedAt)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      errors.completedAt = 'Completion date cannot be before start date'
    }
  }

  return errors
}

export function validateFuelForm(form) {
  const errors = {}

  if (!trim(form.bus_id)) {
    errors.bus_id = 'Select a bus'
  }

  const dateErr = dateNotFuture(form.fuel_date, 'Fuel date')
  if (dateErr) errors.fuel_date = dateErr

  const litersErr = positiveNumber(form.liters, 'Liters')
  if (litersErr) errors.liters = litersErr

  const amountErr = positiveNumber(form.amount, 'Amount')
  if (amountErr) errors.amount = amountErr

  return errors
}

export function validateRouteForm(form) {
  const errors = {}
  const routeNoErr = requiredText(form.routeNo, 'Route number')
  if (routeNoErr) errors.routeNo = routeNoErr

  const startErr = requiredText(form.startPoint, 'Start point', 2)
  if (startErr) errors.startPoint = startErr

  const endErr = requiredText(form.endPoint, 'End point', 2)
  if (endErr) errors.endPoint = endErr

  if (form.distance === '' || form.distance == null) {
    errors.distance = 'Distance is required'
  } else {
    const d = Number(form.distance)
    if (!Number.isFinite(d) || d < 0) errors.distance = 'Distance must be zero or greater'
  }

  return errors
}

export function validateDateRange(fromDate, toDate) {
  const errors = {}
  if (!fromDate) errors.fromDate = 'Start date is required'
  if (!toDate) errors.toDate = 'End date is required'
  if (fromDate && toDate && fromDate > toDate) {
    errors.toDate = 'End date must be on or after start date'
  }
  return errors
}
