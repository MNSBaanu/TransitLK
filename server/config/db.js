import mongoose from 'mongoose'
import { backfillIncompleteDriverProfiles } from '../utils/driverProfileBackfill.js'
import { backfillTimeFormats } from '../utils/timeFormatBackfill.js'
import { backfillReportData } from '../utils/reportDataBackfill.js'

const ensureAdminIndexes = async () => {
  const collection = mongoose.connection.collection('admins')
  const indexes = await collection.indexes()
  const legacyUserIdIndex = indexes.find((index) => index.name === 'userId_1')

  if (legacyUserIdIndex?.unique && !legacyUserIdIndex.partialFilterExpression) {
    await collection.dropIndex('userId_1')
    await collection.createIndex(
      { userId: 1 },
      {
        name: 'userId_1',
        unique: true,
        partialFilterExpression: { userId: { $type: 'objectId' } },
      }
    )
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    await ensureAdminIndexes()
    await backfillIncompleteDriverProfiles()
    await backfillTimeFormats()
    await backfillReportData()
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB
