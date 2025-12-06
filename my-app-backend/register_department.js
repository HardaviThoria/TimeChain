const Web3 = require('web3').default;
const contractData = require('./contract.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const registerDepartment = async (accountAddress, username) => {
    try {
        const accounts = await web3.eth.getAccounts();
        const ownerAccount = accounts[0]; // Assuming the first account is the owner

        const networkId = await web3.eth.net.getId();
        console.log("Current network ID:", networkId);
        
        // Try to get contract address from network 1337 or 5777
        const deployedNetwork = contractData.networks[networkId] || contractData.networks[1337] || contractData.networks[5777];

        if (!deployedNetwork) {
            console.error("Contract not deployed to the current network.");
            console.log("Available networks:", Object.keys(contractData.networks || {}));
            return;
        }

        const contractAddress = deployedNetwork.address;
        console.log("Using contract address:", contractAddress);
        const contract = new web3.eth.Contract(contractData.abi, contractAddress);

        console.log("Owner account:", ownerAccount);
        console.log("Available accounts:", accounts);
        console.log("Contract address:", deployedNetwork.address);

        // Check current registration status
        const isRegistered = await contract.methods.institutions(accountAddress).call();
        console.log("Current registration status:", isRegistered);

        if (isRegistered) {
            console.log(`${username} at ${accountAddress} is already registered.`);
            return;
        }

        console.log(`Registering ${username} at address ${accountAddress}...`);
        const receipt = await contract.methods.registerInstitution(accountAddress, username).send({
            from: ownerAccount,
            gas: 500000,
        });

        if (receipt.status) {
            console.log("✅ Registration successful!");
            console.log("Transaction hash:", receipt.transactionHash);
            // Verify immediately after registration
            const verificationStatus = await contract.methods.institutions(accountAddress).call();
            const registeredName = await contract.methods.getInstitutionName(accountAddress).call();
            console.log("Verification - Registered:", verificationStatus);
            console.log("Verification - Name:", registeredName);
        } else {
            console.error("❌ Registration failed. Receipt:", receipt);
        }
    } catch (error) {
        console.error("❌ Error during registration:", error);
    }
};

// Example usage: Replace with the actual address and username
// Get the address from MetaMask when you're logged in as department
const departmentAddress = process.argv[2] || '0x3e247E66C40e4f21968d3E08C5b862C953d30355'; // Use one of your Ganache accounts
const departmentUsername = process.argv[3] || 'department1';

console.log("Usage: node register_department.js <address> <username>");
console.log(`Registering department: ${departmentUsername} at ${departmentAddress}\n`);

registerDepartment(departmentAddress, departmentUsername);

