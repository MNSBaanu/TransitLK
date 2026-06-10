import Driver from '../models/Driver.js'

const SHIFT_PATTERNS = [
  '06:00 - 14:00',
  '08:00 - 16:00',
  '10:00 - 18:00',
  '06:00 - 18:00',
]

function nameSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function buildContactNo(index, licenseNo) {
  const seed = String(licenseNo || '').replace(/\D/g, '') || String(index + 1)
  const digits = seed.padStart(7, '0').slice(-7)
  return `07${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
}

function buildLicenseExpiry(licenseNo, index) {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1 + (index % 3))
  const offset = (String(licenseNo || '').charCodeAt(0) || 65) % 90
  date.setDate(date.getDate() + offset)
  return date
}

function needsProfileBackfill(driver) {
  return (
    !driver.contactNo?.trim() ||
    !driver.workingHours?.trim() ||
    !driver.licenseExpiry ||
    !driver.email?.trim()
  )
}

/** Fill missing driver roster fields (contact, hours, license expiry, email). */
export async function backfillIncompleteDriverProfiles() {
  const drivers = await Driver.find({}).sort({ createdAt: 1 })
  if (!drivers.length) return { updated: 0 }

  const usedEmails = new Set(
    drivers.map((driver) => driver.email?.toLowerCase()).filter(Boolean)
  )

  let updated = 0
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i]
    if (!needsProfileBackfill(driver)) continue

    const patch = {}

    if (!driver.contactNo?.trim()) {
      patch.contactNo = buildContactNo(i, driver.licenseNo)
    }
    if (!driver.workingHours?.trim()) {
      patch.workingHours = SHIFT_PATTERNS[i % SHIFT_PATTERNS.length]
    }
    if (!driver.licenseExpiry) {
      patch.licenseExpiry = buildLicenseExpiry(driver.licenseNo, i)
    }
    if (!driver.email?.trim()) {
      const base = nameSlug(driver.name) || `driver${i + 1}`
      let email = `${base}@transitlk.lk`
      let suffix = 2
      while (usedEmails.has(email)) {
        email = `${base}${suffix}@transitlk.lk`
        suffix++
      }
      patch.email = email
      usedEmails.add(email)
    }

    if (Object.keys(patch).length) {
      await Driver.findByIdAndUpdate(driver._id, patch)
      updated++
    }
  }

  if (updated) {
    console.log(`Driver profile backfill: updated ${updated} driver(s)`)
  }

  return { updated }
}
