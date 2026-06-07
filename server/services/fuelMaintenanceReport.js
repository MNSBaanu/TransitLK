import FuelLog from '../models/FuelLog.js'
import Maintenance from '../models/Maintenance.js'
import { parseReportRange } from './reportAnalytics.js'

function round1(n) {
  return Math.round(n * 10) / 10
}

function roundPct(part, total) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
}

function bucketLabel(date, index, period) {
  if (period === 'weekly') {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  }
  return `W${index + 1}`
}

function buildTrendBuckets(start, end, period, fuelLogs, maintenanceRecords, valueKey) {
  const bucketCount = period === 'weekly' ? 7 : 4
  const rangeMs = Math.max(end.getTime() - start.getTime(), 1)
  const bucketMs = rangeMs / bucketCount
  const items = []

  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(start.getTime() + i * bucketMs)
    const bEnd = new Date(start.getTime() + (i + 1) * bucketMs)
    const label = bucketLabel(bStart, i, period)

    if (valueKey === 'fuel') {
      const inBucket = fuelLogs.filter((f) => {
        const d = new Date(f.fuel_date)
        return d >= bStart && d < bEnd
      })
      items.push({
        label,
        liters: round1(inBucket.reduce((s, f) => s + (f.liters || 0), 0)),
        cost: Math.round(inBucket.reduce((s, f) => s + (f.amount || 0), 0)),
      })
    } else {
      const inBucket = maintenanceRecords.filter((m) => {
        const d = new Date(m.service_date)
        return d >= bStart && d < bEnd
      })
      items.push({
        label,
        cost: Math.round(inBucket.reduce((s, m) => s + (m.cost || 0), 0)),
      })
    }
  }

  return items
}

function buildInsights({ fuelByVehicle, totalFuelCost, totalMaintCost, totalLiters, period }) {
  const insights = []
  const totalSpend = totalFuelCost + totalMaintCost

  if (totalSpend === 0) {
    insights.push({
      type: 'info',
      text: `No fuel or maintenance spend recorded for this ${period} period. Log entries to track cost-effective operations.`,
    })
    return insights
  }

  const fuelShare = roundPct(totalFuelCost, totalSpend)
  const maintShare = roundPct(totalMaintCost, totalSpend)

  if (fuelShare >= 70) {
    insights.push({
      type: 'warning',
      text: `Fuel accounts for ${fuelShare}% of operational spend — review refuelling patterns and route efficiency to reduce costs.`,
    })
  } else if (maintShare >= 50) {
    insights.push({
      type: 'warning',
      text: `Maintenance is ${maintShare}% of spend — consider preventive servicing to avoid costly repairs.`,
    })
  } else {
    insights.push({
      type: 'success',
      text: `Balanced spend split: fuel ${fuelShare}%, maintenance ${maintShare}%. Operations remain cost-effective for this period.`,
    })
  }

  const highFuel = fuelByVehicle.filter((v) => v.highUsage)
  if (highFuel.length > 0) {
    insights.push({
      type: 'warning',
      text:
        highFuel.length === 1
          ? `${highFuel[0].regNumber} is flagged for high fuel use (${highFuel[0].liters} L). Schedule inspection to improve eco-efficiency.`
          : `${highFuel.length} vehicles exceed fleet fuel averages: ${highFuel.map((v) => v.regNumber).join(', ')}.`,
    })
  } else if (totalFuelCost > 0 && totalLiters > 0 && fuelByVehicle.length > 0) {
    const top = fuelByVehicle[0]
    insights.push({
      type: 'info',
      text: `Highest fuel consumer this period: ${top.regNumber} (${top.liters} L). Monitor for sustained high usage.`,
    })
  }

  return insights
}

export async function buildFuelMaintenanceReport(query = {}) {
  const { from, to, period = 'monthly' } = query
  const { start, end, mode } = parseReportRange({ from, to, period })

  const [fuelLogs, maintenanceRecords] = await Promise.all([
    FuelLog.find({ fuel_date: { $gte: start, $lte: end } })
      .populate('bus_id', 'regNumber')
      .sort({ fuel_date: -1 }),
    Maintenance.find({ service_date: { $gte: start, $lte: end } })
      .populate('bus_id', 'regNumber')
      .sort({ service_date: -1 }),
  ])

  const totalLiters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.amount || 0), 0)
  const totalMaintCost = maintenanceRecords.reduce((s, m) => s + (m.cost || 0), 0)
  const totalOperationalCost = totalFuelCost + totalMaintCost

  const fuelByBusMap = new Map()
  for (const log of fuelLogs) {
    const bid = String(log.bus_id?._id || log.bus_id)
    if (!bid) continue
    if (!fuelByBusMap.has(bid)) {
      fuelByBusMap.set(bid, { liters: 0, amount: 0, entries: 0, regNumber: log.bus_id?.regNumber || '—' })
    }
    const row = fuelByBusMap.get(bid)
    row.liters += log.liters || 0
    row.amount += log.amount || 0
    row.entries += 1
  }

  const fuelByVehicleRaw = [...fuelByBusMap.entries()]
    .map(([busId, fuel]) => ({
      busId,
      regNumber: fuel.regNumber,
      liters: round1(fuel.liters),
      amount: Math.round(fuel.amount),
      entries: fuel.entries,
      avgLitersPerEntry: fuel.entries > 0 ? round1(fuel.liters / fuel.entries) : null,
      fuelShare: roundPct(fuel.liters, totalLiters),
    }))
    .sort((a, b) => b.liters - a.liters)

  const avgLitersPerEntryFleet =
    fuelByVehicleRaw.length > 0
      ? fuelByVehicleRaw.reduce((s, v) => s + (v.avgLitersPerEntry || 0), 0) / fuelByVehicleRaw.length
      : null

  const HIGH_USAGE_FACTOR = 1.25
  const HIGH_USAGE_SHARE = 25

  const fuelByVehicle = fuelByVehicleRaw.map((v) => ({
    ...v,
    highUsage:
      (avgLitersPerEntryFleet != null &&
        v.avgLitersPerEntry != null &&
        v.avgLitersPerEntry >= avgLitersPerEntryFleet * HIGH_USAGE_FACTOR) ||
      v.fuelShare >= HIGH_USAGE_SHARE,
  }))

  const highFuelVehicleCount = fuelByVehicle.filter((v) => v.highUsage).length

  const maintByTypeMap = new Map()
  for (const rec of maintenanceRecords) {
    const type = rec.description?.trim() || 'Other'
    if (!maintByTypeMap.has(type)) {
      maintByTypeMap.set(type, { type, count: 0, cost: 0 })
    }
    const row = maintByTypeMap.get(type)
    row.count += 1
    row.cost += rec.cost || 0
  }

  const maintByBusMap = new Map()
  for (const rec of maintenanceRecords) {
    const bid = String(rec.bus_id?._id || rec.bus_id)
    if (!bid) continue
    if (!maintByBusMap.has(bid)) {
      maintByBusMap.set(bid, {
        busId: bid,
        regNumber: rec.bus_id?.regNumber || '—',
        cost: 0,
        entries: 0,
      })
    }
    const row = maintByBusMap.get(bid)
    row.cost += rec.cost || 0
    row.entries += 1
  }

  const fuelTrend = buildTrendBuckets(start, end, mode, fuelLogs, maintenanceRecords, 'fuel')
  const maintenanceTrend = buildTrendBuckets(start, end, mode, fuelLogs, maintenanceRecords, 'maintenance')

  const insights = buildInsights({
    fuelByVehicle,
    totalFuelCost,
    totalMaintCost,
    totalLiters,
    period: mode,
  })

  const vehiclesOfConcern = fuelByVehicle.filter((v) => v.highUsage)

  return {
    period: {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      mode,
    },
    combined: {
      totalOperationalCost: Math.round(totalOperationalCost),
      fuelSharePct: roundPct(totalFuelCost, totalOperationalCost),
      maintenanceSharePct: roundPct(totalMaintCost, totalOperationalCost),
      highFuelVehicleCount,
    },
    fuel: {
      totalLiters: round1(totalLiters),
      totalCost: Math.round(totalFuelCost),
      totalEntries: fuelLogs.length,
      avgLitersPerEntry: fuelLogs.length > 0 ? round1(totalLiters / fuelLogs.length) : 0,
      avgCostPerLiter: totalLiters > 0 ? round1(totalFuelCost / totalLiters) : 0,
      byVehicle: fuelByVehicle,
      trend: fuelTrend,
    },
    maintenance: {
      totalCost: Math.round(totalMaintCost),
      totalEntries: maintenanceRecords.length,
      vehiclesServiced: maintByBusMap.size,
      byServiceType: [...maintByTypeMap.values()]
        .map((r) => ({ ...r, cost: Math.round(r.cost) }))
        .sort((a, b) => b.cost - a.cost),
      byVehicle: [...maintByBusMap.values()]
        .map((v) => ({ ...v, cost: Math.round(v.cost) }))
        .sort((a, b) => b.cost - a.cost),
      trend: maintenanceTrend,
    },
    insights,
    vehiclesOfConcern,
  }
}
