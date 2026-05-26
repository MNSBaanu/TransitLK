import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import { inferRouteServiceType } from '../utils/routeServiceType.js'

dotenv.config()

async function run() {
  await connectDB()

  const routes = await Route.find({})
    .select('routeName startPoint endPoint viaDescription distance serviceType busId updatedAt')
    .sort({ updatedAt: -1, createdAt: -1 })

  const routeUpdates = []
  const busUpdates = new Map()
  const nextCounts = { ordinary: 0, 'semi-luxury': 0, express: 0 }

  for (const route of routes) {
    const nextServiceType = inferRouteServiceType(route)
    nextCounts[nextServiceType] += 1

    if (route.serviceType !== nextServiceType) {
      routeUpdates.push({
        updateOne: {
          filter: { _id: route._id },
          update: { $set: { serviceType: nextServiceType } },
        },
      })
    }

    if (route.busId && !busUpdates.has(String(route.busId))) {
      busUpdates.set(String(route.busId), {
        updateOne: {
          filter: { _id: route.busId },
          update: { $set: { serviceType: nextServiceType } },
        },
      })
    }
  }

  if (routeUpdates.length) await Route.bulkWrite(routeUpdates)
  if (busUpdates.size) await Bus.bulkWrite([...busUpdates.values()])

  console.log(`Routes scanned: ${routes.length}`)
  console.log(`Routes updated: ${routeUpdates.length}`)
  console.log(`Assigned buses synced: ${busUpdates.size}`)
  console.log(
    `Service type totals -> ordinary: ${nextCounts.ordinary}, semi-luxury: ${nextCounts['semi-luxury']}, express: ${nextCounts.express}`
  )

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
