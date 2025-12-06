const Web3 = require('web3').default;
const contractData = require('./contract.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const checkRequests = async () => {
    try {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractData.networks[networkId] || contractData.networks[1337] || contractData.networks[5777];
        
        if (!deployedNetwork) {
            console.error("Contract not deployed to the current network.");
            return;
        }

        const contract = new web3.eth.Contract(contractData.abi, deployedNetwork.address);
        
        console.log("Contract address:", deployedNetwork.address);
        console.log("\n=== Checking All Verification Requests ===\n");
        
        // Get all EmployerVerificationRequested events
        const events = await contract.getPastEvents("EmployerVerificationRequested", {
            fromBlock: 0,
            toBlock: "latest",
        });
        
        console.log(`Found ${events.length} verification request event(s)\n`);
        
        if (events.length === 0) {
            console.log("❌ No verification requests found.");
            console.log("A department must request verification from a payroll department first.");
            return;
        }
        
        // Check each request
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            console.log(`--- Request #${i + 1} ---`);
            console.log("Token ID:", event.returnValues.tokenId);
            console.log("Payroll Name (employerName):", event.returnValues.employerName);
            console.log("Department Address (institution):", event.returnValues.institution);
            console.log("Department Name (institutionName):", event.returnValues.institutionName);
            console.log("");
        }
        
        // Check registered payrolls
        console.log("\n=== Registered Payroll Departments ===");
        const accounts = await web3.eth.getAccounts();
        for (const account of accounts) {
            try {
                const isRegistered = await contract.methods.employers(account).call();
                if (isRegistered) {
                    const name = await contract.methods.getEmployerName(account).call();
                    console.log(`✅ ${name} at ${account}`);
                }
            } catch (e) {
                // Not registered or error
            }
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

checkRequests();


