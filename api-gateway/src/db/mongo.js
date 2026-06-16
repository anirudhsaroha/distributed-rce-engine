const mongoose = require('mongoose');

async function initMongo(mongoUrl) {
  const url = mongoUrl || process.env.MONGO_URL || 'mongodb://localhost:27017/rce_engine';
  mongoose.set('strictQuery', true);
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');
}

module.exports = { initMongo };
