const Web3 = require('web3').default;
const contractData = require('./contract.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const checkResumes = async () => {
    try {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractData.networks[networkId] || contractData.networks[1337] || contractData.networks[5777];
        
        if (!deployedNetwork) {
            console.error("Contract not deployed to the current network.");
            return;
        }

        const contract = new web3.eth.Contract(contractData.abi, deployedNetwork.address);
        
        console.log("Contract address:", deployedNetwork.address);
        console.log("\n=== Checking All Resumes on Blockchain ===\n");
        
        // Get all NFTMinted events
        const events = await contract.getPastEvents("NFTMinted", {
            fromBlock: 0,
            toBlock: "latest",
        });
        
        console.log(`Found ${events.length} NFT(s) minted\n`);
        
        if (events.length === 0) {
            console.log("❌ No resumes found on the blockchain.");
            console.log("Make sure an employee has submitted a resume.");
            return;
        }
        
        // Check each resume
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const tokenId = event.returnValues.tokenId || event.returnValues[1];
            const applicant = event.returnValues.applicant || event.returnValues[0];
            const employerName = event.returnValues.employerName || event.returnValues[2];
            
            console.log(`--- Resume #${i + 1} ---`);
            console.log(`Token ID: ${tokenId}`);
            console.log(`Employee Address: ${applicant}`);
            console.log(`Department Name (from event): ${employerName}`);
            
            try {
                // Get resume data by tokenId
                const resumeData = await contract.methods.getResumeByTokenId(tokenId).call();
                console.log(`Employee Name: ${resumeData[0]}`);
                console.log(`Resume Hash: ${resumeData[1]}`);
                console.log(`Department Name (from contract): ${resumeData[2]}`);
                
                // Check verification status
                const deptVerified = await contract.methods.isVerifiedByInstitution(tokenId).call();
                const payrollVerified = await contract.methods.isVerifiedByEmployer(tokenId).call();
                console.log(`Department Verified: ${deptVerified}`);
                console.log(`Payroll Verified: ${payrollVerified}`);
            } catch (error) {
                console.log(`Error fetching resume data: ${error.message}`);
            }
            
            console.log("");
        }
        
        // Check registered departments
        console.log("\n=== Registered Departments ===");
        const accounts = await web3.eth.getAccounts();
        for (const account of accounts) {
            try {
                const isRegistered = await contract.methods.institutions(account).call();
                if (isRegistered) {
                    const name = await contract.methods.getInstitutionName(account).call();
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

checkResumes();


