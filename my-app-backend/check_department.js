const Web3 = require('web3').default;
const contractData = require('./contract.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const checkDepartment = async (accountAddress) => {
    try {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractData.networks[networkId] || contractData.networks[1337] || contractData.networks[5777];
        
        if (!deployedNetwork) {
            console.error("Contract not deployed to the current network.");
            return;
        }

        const contract = new web3.eth.Contract(contractData.abi, deployedNetwork.address);
        
        console.log("Checking registration for address:", accountAddress);
        console.log("Contract address:", deployedNetwork.address);
        
        const isRegistered = await contract.methods.institutions(accountAddress).call();
        console.log("\nRegistration status:", isRegistered);
        
        if (isRegistered) {
            try {
                const name = await contract.methods.getInstitutionName(accountAddress).call();
                console.log("Registered name:", name);
            } catch (e) {
                console.log("Could not fetch name:", e.message);
            }
        } else {
            console.log("\n❌ This address is NOT registered as a department.");
            console.log("To register, run:");
            console.log(`node register_department.js ${accountAddress} <username>`);
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

// Get address from command line or use default
const address = process.argv[2];
if (!address) {
    console.log("Usage: node check_department.js <address>");
    console.log("\nChecking all Ganache accounts...\n");
    
    web3.eth.getAccounts().then(accounts => {
        accounts.forEach(addr => {
            console.log(`\n--- Checking ${addr} ---`);
            checkDepartment(addr);
        });
    });
} else {
    checkDepartment(address);
}


