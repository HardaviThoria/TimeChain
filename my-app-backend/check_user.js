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
    const username = process.argv[2] || 'd1';
    const user = await User.findOne({ username });
    
    if (user) {
      console.log('\n✅ User found in database:');
      console.log('Username:', user.username);
      console.log('Role:', user.role);
      console.log('Address:', user.address);
      
      if (user.role === 'department' || user.role === 'payroll') {
        console.log('\n📋 To register on blockchain, run:');
        if (user.role === 'department') {
          console.log(`node register_department.js ${user.address} ${user.username}`);
        } else {
          console.log(`node register_payroll.js ${user.address} ${user.username}`);
        }
      }
    } else {
      console.log(`\n❌ User "${username}" not found in database`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({});
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.role}) - ${u.address}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});


