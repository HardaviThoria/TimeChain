require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ MongoDB connected');
  
  const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    role: String,
    address: String,
  });
  const User = mongoose.model('User', userSchema);
  
  try {
    const username = process.argv[2] || 'p1';
    const newAddress = process.argv[3];
    
    if (!newAddress) {
      console.log('Usage: node update_address.js <username> <new_address>');
      process.exit(1);
    }
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`❌ User "${username}" not found in database`);
      process.exit(1);
    }
    
    console.log(`\nCurrent user: ${user.username} (${user.role}) at ${user.address}`);
    console.log(`Updating address to: ${newAddress}\n`);
    
    user.address = newAddress;
    await user.save();
    
    console.log(`✅ Address updated successfully!`);
    console.log(`New address: ${user.address}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});


