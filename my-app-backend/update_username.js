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
    const oldUsername = process.argv[2] || 'p1';
    const newUsername = process.argv[3] || 'payroll1';
    
    const user = await User.findOne({ username: oldUsername });
    
    if (!user) {
      console.log(`❌ User "${oldUsername}" not found in database`);
      process.exit(1);
    }
    
    console.log(`\nCurrent user: ${user.username} (${user.role}) at ${user.address}`);
    console.log(`Updating username from "${oldUsername}" to "${newUsername}"...\n`);
    
    // Check if new username already exists
    const existing = await User.findOne({ username: newUsername });
    if (existing) {
      console.log(`⚠️ Username "${newUsername}" already exists. Cannot update.`);
      process.exit(1);
    }
    
    user.username = newUsername;
    await user.save();
    
    console.log(`✅ Username updated successfully!`);
    console.log(`New username: ${user.username}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});


