const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } else if (process.env.NODE_ENV !== 'production') {
      // Only use memory server in development
      console.log('Starting MongoDB Memory Server...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        console.log('MongoDB Memory Server created');
        const mongoUri = mongoServer.getUri();
        console.log(`Connecting to: ${mongoUri}`);
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Memory Server Connected: ${conn.connection.host}`);
      } catch (memError) {
        console.error('MongoDB Memory Server failed:', memError.message);
        console.error('Please install mongodb-memory-server or set MONGODB_URI');
        process.exit(1);
      }
    } else {
      throw new Error('MONGODB_URI environment variable is required in production');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;
