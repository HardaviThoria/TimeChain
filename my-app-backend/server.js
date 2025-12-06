require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const Web3 = require('web3').default;
const IdentityVerification = require('../build/contracts/TrustID.json');
const contractData = require('./contract.json');

const app = express();
app.use(express.json());

// ✅ CORS Setup
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ✅ MongoDB Setup
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// ✅ Mongoose Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: String,
  address: String,
});
const User = mongoose.model('User', userSchema);

// ✅ Web3 and Contract Setup
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
const contractAddress = contractData.networks[1337]?.address || contractData.networks[5777]?.address;
const contractABI = contractData.abi;
const contract = new web3.eth.Contract(contractABI, contractAddress);

// ✅ REGISTER ROUTE
app.post('/api/register', async (req, res) => {
  const { username, password, role, address } = req.body;

  if (!username || !password || !role || !address) {
    return res.status(400).json({ message: 'Missing required fields (username, password, role, address).' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Only department and payroll are registered on blockchain
    if (role === 'department' || role === 'payroll') {
      if (!web3.utils.isAddress(address)) {
        return res.status(400).json({ message: 'Invalid Ethereum address.' });
      }

      const accounts = await web3.eth.getAccounts();
      const ownerAccount = accounts[0];

      // SWAPPED: Department registers as institution (verifies first), Payroll registers as employer (verifies second)
      try {
        if (role === 'department') {
          const tx = await contract.methods.registerInstitution(address, username).send({
            from: ownerAccount,
            gas: 500000,
          });
          console.log(`✅ Department registered on blockchain. TX: ${tx.transactionHash}`);
        } else {
          const tx = await contract.methods.registerEmployer(address, username).send({
            from: ownerAccount,
            gas: 500000,
          });
          console.log(`✅ Payroll registered on blockchain. TX: ${tx.transactionHash}`);
        }
      } catch (blockchainError) {
        console.error('❌ Blockchain registration error:', blockchainError);
        throw new Error(`Blockchain registration failed: ${blockchainError.message}`);
      }
    }

    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      address,
    });

    await newUser.save();

    console.log(`✅ ${role} registered: ${username}, address: ${address}`);
    res.status(201).json({ message: `${role} registered successfully.` });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ✅ LOGIN ROUTE
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    res.json({ message: 'Login successful.', role: user.role });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ✅ GET Departments
app.get('/api/employers', async (req, res) => {
  try {
    const employers = await User.find({ role: 'department' }).select('username address');
    res.json({ employers });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments.' });
  }
});

// ✅ GET Departments (alias for employee portal)
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await User.find({ role: 'department' }).select('username address');
    res.json({ departments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments.' });
  }
});

// ✅ GET Payroll Departments
app.get('/api/institutions', async (req, res) => {
  try {
    const institutions = await User.find({ role: 'payroll' }).select('username address');
    res.json({ institutions: institutions.map(i => i.username) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payroll departments.' });
  }
});

// ✅ GET Payroll Departments (alias)
app.get('/api/payrolls', async (req, res) => {
  try {
    const payrolls = await User.find({ role: 'payroll' }).select('username address');
    res.json({ payrolls: payrolls.map(i => i.username) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payroll departments.' });
  }
});

// ✅ START SERVER
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
