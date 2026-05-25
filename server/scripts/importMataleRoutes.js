import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Depot from '../models/Depot.js'
import Route from '../models/Route.js'

dotenv.config()

const MATALALE_ROUTES = [
  ['8', 'Matale', 'via Warakamura', 'Colombo', 141.3],
  ['8/1', 'Matale', 'via Kumbiyangoda', 'Colombo', 140.2],
  ['41/2', 'Kandy', 'via Dambulla', 'Pollonnaruwa', 145.4],
  ['41/3', 'Matale', '', 'Minneriya', 115.0],
  ['42/2', 'Kandy', 'via Talawa', 'Anuradhapura', 148.9],
  ['42/3', 'Matale', 'via Talawa', 'Anuradhapura', 122.7],
  ['43', 'Kandy', 'via Maradankadawela', 'Anuradhapura', 141.1],
  ['43/1', 'Matale', 'via Maradankadawela', 'Anuradhapura', 114.9],
  ['45/1', 'Matale', '', 'Tricomalee', 155.2],
  ['52/4', 'Matale', '', 'Pansalgodella', 115.0],
  ['556', 'Matale', '', 'Kurunegala', 51.0],
  ['556/1', 'Matale', '', 'Dodangaslanda', 28.3],
  ['556/3', 'Matale', '', 'Salagama', 21.5],
  ['556/4', 'Matale', '', 'Yatawatte', 19.3],
  ['560', 'Matale', '', 'Gammaduwa', 22.4],
  ['560/1', 'Matale', '', 'Wellangahawatte', 18.0],
  ['560/2', 'Matale', '', 'Alakolamada', 16.9],
  ['560/3', 'Matale', '', 'Veralugastenne', 15.8],
  ['560/4', 'Matale', '', 'Gansarapola', 12.9],
  ['560/5', 'Matale', '', 'Rattota', 11.6],
  ['560/6', 'Rattota', '', 'Gammaduwa', 10.8],
  ['560/7', 'Matale', '', 'Nawaragoda', 9.6],
  ['560/8', 'Matale', '', 'Hapuwide', 8.1],
  ['560/9', 'Welangahawatte', '', 'Rattota', 6.4],
  ['560/10', 'Rattota', '', 'Alakolamada', 5.3],
  ['560/11', 'Rattota', '', 'Veralugastenne', 4.2],
  ['579', 'Matale', 'via Owilikanda', 'Halgolla', 30.8],
  ['579/1', 'Matale', 'via Owilikanda', 'Galhinna', 28.2],
  ['579/2', 'Matale', '', 'Ankumbura', 20.8],
  ['579/3', 'Matale', '', 'Pathingolla', 16.3],
  ['579/4', 'Matale', '', 'Owilikanda', 13.7],
  ['580', 'Matale', 'via Hettipola', 'Hasalaka', 126.8],
  ['580/1', 'Matale', '', 'Hadungamuwa', 109.5],
  ['580/2', 'Matale', '', 'Maraka', 103.8],
  ['580/3', 'Matale', '', 'Hettipola', 93.4],
  ['580/4', 'Matale', '', 'Pallegama', 82.1],
  ['581', 'Matale', 'via Elahera', 'Kaduruwela', 119.5],
  ['581/1', 'Matale', '', 'Giritale', 93.1],
  ['581/2', 'Matale', '', 'Diyabeduma', 86.0],
  ['581/3', 'Polonnaruwa', '', 'Elahera', 57.2],
  ['581/4', 'Matale', '', 'Helambagahawatte', 47.2],
  ['581/5', 'Matale', '', 'Talagoda', 45.0],
  ['581/7', 'Diyabeduma', '', 'Kaduruwela', 24.5],
  ['581/8', 'Helambagahawatte', '', 'Naula', 17.9],
  ['581/9', 'Opalgala', '', 'Naula', 15.5],
  ['582/1', 'Matale', '', 'Sigiriya', 65.2],
  ['582/5', 'Matale', '', 'Lenadora', 34.1],
  ['583', 'Matale', '', 'Nayakumbura', 38.0],
  ['583/1', 'Matale', '', 'Muruthalawa', 31.6],
  ['583/2', 'Matale', '', 'Bowatenne', 30.9],
  ['583/3', 'Matale', '', 'Naula', 29.3],
  ['583/4', 'Matale', '', 'Hanamunagala', 24.2],
  ['583/5', 'Matale', '', 'Aandawela', 22.5],
  ['583/6', 'Matale', '', 'Rathgammanna', 20.9],
  ['583/7', 'Matale', '', 'Madawalaulpotha', 17.6],
  ['583/8', 'Naula', '', 'Nayakumbura', 8.7],
  ['583/9', 'Naula', '', 'Nikula', 3.5],
  ['584', 'Matale', 'via Madipola', 'Galewela', 39.0],
  ['584/2', 'Matale', '', 'Wahacotte', 33.2],
  ['584/4', 'Matale', '', 'Pallepola', 19.5],
  ['585/1', 'Matale', 'via Akuramboda', 'Galewela', 39.1],
  ['585/3', 'Matale', 'via Akuramboda', 'Wahacotte', 33.3],
  ['586', 'Matale', '', 'Matalapitiya', 25.1],
  ['586/1', 'Matale', '', 'Mahawela', 20.6],
  ['586/2', 'Matale', '', 'Etipola', 15.8],
  ['587', 'Matale', '', 'Ilukkumbura', 38.0],
  ['587/1', 'Matale', '', 'Polwattakanda', 24.6],
  ['587/2', 'Matale', '', 'Medawatte', 23.0],
  ['587/3', 'Matale', '', 'Nikolawatte', 18.7],
  ['587/4', 'Rattota', '', 'Polwattekanda', 12.6],
  ['587/5', 'Rattota', '', 'Nikulayawatte', 9.5],
  ['588', 'Matale', '', 'Hunugala', 20.9],
  ['588/1', 'Matale', '', 'Elkaduwa', 17.7],
  ['588/2', 'Matale', 'via Leliambe', 'Wehigala', 17.7],
  ['589', 'Matale', 'Kumbiyangoda (town service)', 'Matale', 17.2],
  ['589/1', 'Matale', 'Warivapola (town service)', 'Matale', 17.2],
  ['589/2', 'Matale', '', 'Guruluwela', 17.2],
  ['589/3', 'Guruluwela', '', 'Guruluwela - Owila', 17.2],
  ['589/4', 'Matale', 'via Weteke Workshop', 'Wehigala', 15.3],
  ['589/5', 'Matale', 'via Jayasekara Watte', 'Imbulandanda', 10.1],
  ['590', 'Matale', '', 'Neluwakanda', 9.7],
  ['590/1', 'Matale', '', 'Hapuwida', 8.1],
  ['590/2', 'Matale', '', 'Wetessaya', 7.1],
  ['591', 'Matale', '', 'Galgolla', 30.4],
  ['591/1', 'Matale', '', 'Galhinna', 27.9],
  ['592', 'Matale', '', 'Kabaragala', 23.4],
  ['592/1', 'Matale', '', 'Tambalagala', 18.5],
  ['592/2', 'Matale', '', 'Kandenuwara', 14.7],
  ['592/3', 'Matale', '', 'Bandarapola', 9.0],
  ['592/4', 'Matale', '', 'Udahapuvide', 8.1],
  ['593', 'Matale', 'via Warakamura', 'Kandy', 26.2],
  ['593/3', 'Matale', '', 'Alawatugoda', 9.8],
  ['593/5', 'Matale', '', 'Kalalpitiya', 6.4],
  ['594', 'Matale', 'via Kumbiyangoda', 'Kandy', 25.1],
  ['594/1', 'Matale', 'via Kumbiyangoda', 'Alawatugoda', 8.7],
  ['596', 'Matale', '', 'Kumbaloluwa', 19.6],
  ['596/1', 'Matale', '', 'Loluwela', 17.7],
  ['596/2', 'Loluwela', '', 'Kaikawela', 9.5],
  ['615/5', 'Handungamuwa', '', 'Hettipola', 17.0],
  ['615/6', 'Maraka', '', 'Hettipola', 10.5],
  ['636', 'Matale', 'via Wattegama', 'Kandy', 31.6],
  ['636/1', 'Matale', '', 'Wattegama', 16.9],
  ['1', 'Rythalawela', '', 'Palapathwala', 17.5],
]

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
    serviceType: 'ordinary',
    status: 'active',
  }
}

async function run() {
  await connectDB()

  const depot = await Depot.findOne({ depotCode: 'ML' })
  if (!depot) {
    throw new Error('Matale depot (ML) not found in database')
  }

  let count = 0
  for (const route of MATALALE_ROUTES) {
    const routeNo = route[0]
    await Route.findOneAndUpdate(
      { depotId: depot._id, routeNo },
      buildRouteDoc(route, depot._id),
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    count += 1
  }

  const total = await Route.countDocuments({ depotId: depot._id })
  console.log(`Imported ${count} Matale routes. Depot now has ${total} routes.`)
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
