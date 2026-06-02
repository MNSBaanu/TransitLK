import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Depot from '../models/Depot.js'
import Route from '../models/Route.js'
import Schedule from '../models/Schedule.js'
import { inferRouteServiceType } from '../utils/routeServiceType.js'

dotenv.config()

/** Curated set: Matale depot routes only (30); via routes include intermediary stops. */
const MATALALE_ROUTES = [
  ['8', 'Matale', 'via Warakamura', 'Colombo', 141.3],
  ['8/1', 'Matale', 'via Kumbiyangoda', 'Colombo', 140.2],
  ['41/3', 'Matale', '', 'Minneriya', 115.0],
  ['42/3', 'Matale', 'via Talawa', 'Anuradhapura', 122.7],
  ['43/1', 'Matale', 'via Maradankadawela', 'Anuradhapura', 114.9],
  ['45/1', 'Matale', '', 'Tricomalee', 155.2],
  ['52/4', 'Matale', '', 'Pansalgodella', 115.0],
  ['556', 'Matale', '', 'Kurunegala', 51.0],
  ['556/1', 'Matale', '', 'Dodangaslanda', 28.3],
  ['579', 'Matale', 'via Owilikanda', 'Halgolla', 30.8],
  ['579/1', 'Matale', 'via Owilikanda', 'Galhinna', 28.2],
  ['580', 'Matale', 'via Hettipola', 'Hasalaka', 126.8],
  ['580/1', 'Matale', '', 'Hadungamuwa', 109.5],
  ['581', 'Matale', 'via Elahera', 'Kaduruwela', 119.5],
  ['581/1', 'Matale', '', 'Giritale', 93.1],
  ['582/1', 'Matale', '', 'Sigiriya', 65.2],
  ['584', 'Matale', 'via Madipola', 'Galewela', 39.0],
  ['585/1', 'Matale', 'via Akuramboda', 'Galewela', 39.1],
  ['588/2', 'Matale', 'via Leliambe', 'Wehigala', 17.7],
  ['589', 'Matale', 'Kumbiyangoda (town service)', 'Matale', 17.2],
  ['589/4', 'Matale', 'via Weteke Workshop', 'Wehigala', 15.3],
  ['560/5', 'Matale', '', 'Rattota', 11.6],
  ['583', 'Matale', '', 'Nayakumbura', 38.0],
  ['587', 'Matale', '', 'Ilukkumbura', 38.0],
  ['591', 'Matale', '', 'Galgolla', 30.4],
  ['592', 'Matale', '', 'Kabaragala', 23.4],
  ['596', 'Matale', '', 'Kumbaloluwa', 19.6],
  ['593', 'Matale', 'via Warakamura', 'Kandy', 26.2],
  ['594', 'Matale', 'via Kumbiyangoda', 'Kandy', 25.1],
  ['636', 'Matale', 'via Wattegama', 'Kandy', 31.6],
]

const KEEP_ROUTE_NOS = MATALALE_ROUTES.map((route) => route[0])

function buildRouteDoc([routeNo, startPoint, viaDescription, endPoint, distance], depotId) {
  const normalizedVia = viaDescription.trim()
  const stopName = normalizedVia.replace(/^via\s+/i, '').trim()

  return {
    depotId,
    routeNo,
    routeName: `${startPoint} - ${endPoint}`,
    startPoint,
    endPoint,
    viaDescription: normalizedVia || undefined,
    stops: stopName ? [stopName] : [],
    distance,
    serviceType: inferRouteServiceType({
      startPoint,
      endPoint,
      viaDescription: normalizedVia,
      distance,
    }),
    status: 'active',
  }
}

async function run() {
  await connectDB()

  const depot = await Depot.findOne({ depotCode: 'ML' })
  if (!depot) {
    throw new Error('Matale depot (ML) not found in database')
  }

  let upserted = 0
  for (const route of MATALALE_ROUTES) {
    const routeNo = route[0]
    await Route.findOneAndUpdate(
      { depotId: depot._id, routeNo },
      buildRouteDoc(route, depot._id),
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    upserted += 1
  }

  const staleRoutes = await Route.find({
    depotId: depot._id,
    routeNo: { $nin: KEEP_ROUTE_NOS },
  }).select('_id routeNo')

  let removedSchedules = 0
  if (staleRoutes.length) {
    const staleIds = staleRoutes.map((route) => route._id)
    const scheduleResult = await Schedule.deleteMany({ routeId: { $in: staleIds } })
    removedSchedules = scheduleResult.deletedCount || 0
    await Route.deleteMany({ _id: { $in: staleIds } })
  }

  const total = await Route.countDocuments({ depotId: depot._id })
  const withStops = await Route.countDocuments({
    depotId: depot._id,
    stops: { $exists: true, $not: { $size: 0 } },
  })

  console.log(`Upserted ${upserted} Matale routes (target: ${MATALALE_ROUTES.length}).`)
  console.log(
    `Removed ${staleRoutes.length} extra route(s) and ${removedSchedules} linked schedule(s).`
  )
  console.log(`Depot now has ${total} routes (${withStops} with intermediary stops).`)
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
