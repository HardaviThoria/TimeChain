require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ MongoDB connected');
  
  // Define the User schema (same as in server.js)
  const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    role: String,
    address: String,
  });
  const User = mongoose.model('User', userSchema);
  
  try {
    // Delete all users
    const result = await User.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} user(s) from the database`);
    
    // Optionally, drop the entire collection
    // await User.collection.drop();
    // console.log('✅ Dropped users collection');
    
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});


