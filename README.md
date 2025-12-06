# 🔐 TimeChain - Blockchain-Based Timesheet Management System

TimeChain** is a decentralized timesheet verification platform built on Ethereum blockchain technology. The system leverages smart contracts, NFT tokenization, and distributed file storage to create an immutable, transparent workflow for employee time tracking and payroll processing.

Developed by:** Hardavi Thoria, Pranav Sheth

---

🚀 Features

Core Functionality
- ✅ Employee Portal - Submit timesheets to departments, track verification status, view audit trails
- ✅ Department Portal - Verify/reject employee timesheets, forward to payroll departments
- ✅ Payroll Portal - Final verification and approval for payroll processing
- ✅ Admin Portal - System administration and management

Key Features/ Improvements 

- 📄 IPFS Storage - Timesheets stored securely on IPFS via Pinata
- 🔗 NFT Tokenization - Each timesheet submission creates a unique ERC-721 NFT
- ✅ Sequential Verification - Department must verify before Payroll can approve (enforced by smart contract)
- ❌ Rejection Workflow - Departments and Payroll can reject with on-chain reasons
- 📊 Complete Audit Trail - All actions (submission, verification, rejection) recorded on-chain with timestamps
- 👥 Multi-Employee Support - Multiple employees can submit to the same department/payroll
- 🌙 Dark Mode - Toggle between light and dark themes
- 🔒 Role-Based Access - Secure access control via MetaMask authentication

---

🛠️ Technologies Used

- Smart Contracts Solidity 0.4.25, ERC-721 NFT standard
- Blockchain Ganache (local Ethereum network), Truffle Suite
- Frontend React.js, Web3.js, React Router, React Feather Icons
- Backend Node.js, Express.js, MongoDB, Mongoose
- Storage IPFS via Pinata API
- Wallet MetaMask browser extension
- Styling CSS3 with modern design system (Emerald/Green theme)

---

🧾 Project Structure

```
Blockchain_Final/
├── contracts/
│   └── trustid.sol              # Main smart contract (ERC-721 NFT)
├── migrations/
│   └── 2_deploy_contracts.js    # Truffle deployment script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmployeePortal.js      # Employee interface
│   │   │   ├── DepartmentPortal.js    # Department interface
│   │   │   ├── PayrollPortal.js       # Payroll interface
│   │   │   ├── AdminPortal.js         # Admin interface
│   │   │   └── AuthPage.js            # Login/Registration
│   │   ├── App.js                     # Main app component
│   │   └── contract.json              # Contract ABI and addresses
│   └── package.json
├── my-app-backend/
│   ├── server.js                      # Express server
│   ├── models/                        # MongoDB schemas
│   ├── contract.json                  # Contract configuration
│   └── .env                           # Environment variables
├── build/
│   └── contracts/                    # Compiled contracts
├── truffle-config.js                  # Truffle configuration
└── package.json
```

---

 ⚙️ How It Works

Workflow Overview

1. Employee Submission
   - Employee uploads timesheet document → Stored on IPFS
   - NFT minted on blockchain with unique Token ID
   - Timesheet linked to department name
   - Submission timestamp recorded in audit trail

2. Department Verification
   - Department manager reviews timesheet
   - Can **Verify** → Updates on-chain status, records timestamp
   - Can **Reject** → Stores rejection reason on-chain, records timestamp
   - Only verified timesheets can proceed to payroll

3. Payroll Request
   - Department forwards verified timesheet to selected payroll department
   - Creates verification request on blockchain
   - Payroll department receives notification

4. Payroll Verification
   - Payroll reviews timesheet (requires department verification first)
   - Can **Approve** → Final verification, records timestamp
   - Can **Reject** → Stores rejection reason on-chain, records timestamp
   - Complete audit trail maintained


Multi-Employee Support

- Multiple employees (E1, E2, etc.) can submit to the same department (D1)
- Each submission creates a unique NFT with separate Token ID
- All submissions are tracked independently
- Department can verify/reject each timesheet separately
- All verified timesheets can be forwarded to the same payroll (P1)

---

 📦 Installation & Setup

 📋 Prerequisites

- Node.js (v14 or higher) and npm
- MongoDB (local or cloud instance)
- Ganache (GUI or CLI) - Local Ethereum blockchain
- MetaMask browser extension
- Truffle - `npm install -g truffle`
- Pinata API credentials (for IPFS storage)

---

 🔧 Environment Setup

1. Clone the repository

```bash
git clone <repository-url>
cd Blockchain_Final
```

2. Install dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../my-app-backend
npm install
```

3. Configure environment variables

Create a `.env` file in `my-app-backend/`:

```env
MONGO_URI=mongodb://localhost:27017/timechain
PORT=5001
```

Note Pinata API keys are currently hardcoded in the frontend. For production, move them to environment variables.

---

 🚀 Running the Application

1. Start Ganache
   - Open Ganache GUI or run `ganache-cli -p 7545`
   - Note the RPC URL: `http://127.0.0.1:7545`
   - Copy the first account's private key to MetaMask

2. Deploy Smart Contracts

```bash
# From project root
truffle migrate --reset
```

This will:
- Compile the smart contract
- Deploy to Ganache network
- Update `contract.json` files in frontend and backend

3. Start Backend Server

```bash
cd my-app-backend
node server.js
```

Server runs on `http://localhost:5001`

4. Start Frontend

```bash
cd frontend
npm start
```

Frontend runs on `http://localhost:3000`

5. Configure MetaMask
   - Add Ganache network:
     - Network Name: `Ganache Local`
     - RPC URL: `http://127.0.0.1:7545`
     - Chain ID: `1337`
     - Currency Symbol: `ETH`
   - Import accounts from Ganache using private keys

---

 👥 User Roles & Access

 Employee
- Submit timesheets to departments
- View submission status
- Track verification progress
- View complete audit trail
- Multiple submissions to same department allowed

 Department Manager
- View all timesheets submitted to their department
- Verify or reject timesheets with reasons
- Forward verified timesheets to payroll departments
- View audit trail for each submission

 Payroll Department
- View verification requests from departments
- Approve or reject timesheets (requires department verification first)
- View complete audit trail
- Process multiple requests independently

 Admin
- System administration
- User management
- Contract management

---

 🔐 Security Features

- Smart Contract Access Control - Only registered departments/payrolls can verify
- Sequential Verification - Enforced at contract level
- On-Chain Rejection Reasons - Transparent rejection tracking
- Complete Audit Trail - All actions recorded with timestamps and actor addresses
- IPFS Storage - Decentralized, immutable document storage
- MetaMask Authentication - Secure wallet-based login

---

 📊 Key Features Explained

 Rejection Workflow
- Departments and Payroll can reject timesheets with on-chain reasons
- Rejection reasons are permanently stored on blockchain
- Rejected status prevents further verification
- Complete rejection history in audit trail

 Audit Trail
Every action is recorded on-chain:
- Submission timestamp and employee address
- Department verification/rejection timestamp and address
- Payroll verification/rejection timestamp and address
- All rejection reasons

 Multi-Employee Support
- Multiple employees can submit to the same department
- Each submission is tracked independently by Token ID
- Department sees all submissions in one view
- Payroll receives all requests from verified departments

---

 🐛 Troubleshooting

 Common Issues

1. Access Restricted" Error
   - Ensure department/payroll is registered on blockchain
   - Use registration scripts: `register_department.js` or `register_payroll.js`
   - Verify MetaMask account matches registered address

2. Contract Not Found
   - Run `truffle migrate --reset` to redeploy contracts
   - Check `contract.json` files are updated with new addresses

3. Port Conflicts
   - Backend default: `5001` (check `.env` file)
   - Frontend default: `3000`
   - Update API endpoints if ports differ

4. MetaMask Connection Issues
   - Ensure Ganache is running
   - Check network is set to Ganache (Chain ID: 1337)
   - Refresh page and reconnect MetaMask

---

 📝 API Endpoints

 Backend (`http://localhost:5001`)

- `POST /api/register` - Register new user (Employee, Department, Payroll, Admin)
- `POST /api/login` - User authentication
- `GET /api/departments` - Get all registered departments
- `GET /api/payrolls` - Get all registered payroll departments

---

 🎨 Design System

- Color Theme Emerald/Green
- UI Style Modern, clean, glassmorphism effects
- Dark Mode Toggle available in all portals
- Responsive: Works on desktop and tablet devices

---

 📄 License

This project is licensed under the **MIT License**.

---

👨‍💻 Developers

**Hardavi Thoria**  CWID: 829265454, Email: hardavit@csu.fullerton.edu
**Pranav Sheth**    CWID: 810028118, Email: PranavSheth@csu.fullerton.edu

---

 🙏 Acknowledgments

- OpenZeppelin for ERC-721 implementation
- Pinata for IPFS storage service
- Truffle Suite for development tools
- React community for excellent libraries

---

 📚 Additional Resources

- [Truffle Documentation](https://www.trufflesuite.com/docs)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [IPFS Documentation](https://docs.ipfs.io/)

---


