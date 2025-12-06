// Script to manually register a payroll account on the blockchain
const Web3 = require('web3').default;
const contractData = require('../build/contracts/TrustID.json');

const web3 = new Web3('http://127.0.0.1:7545');

async function registerPayroll() {
  try {
    const accounts = await web3.eth.getAccounts();
    const ownerAccount = accounts[0];
    
    console.log('Owner account:', ownerAccount);
    console.log('Available accounts:', accounts);
    
    // Get the contract address
    const contractAddress = contractData.networks[1337]?.address || contractData.networks[5777]?.address;
    console.log('Contract address:', contractAddress);
    
    if (!contractAddress) {
      console.error('Contract not found in networks!');
      return;
    }
    
    const contract = new web3.eth.Contract(contractData.abi, contractAddress);
    
    // Address to register (from the console log)
    const payrollAddress = '0x3b2AEde1D8B7454EEDF040A0D8Fc5b0351281D83';
    const payrollName = 'payroll1'; // Change this to match your username
    
    // Check if already registered
    try {
      const isRegistered = await contract.methods.employers(payrollAddress).call();
      console.log('Current registration status:', isRegistered);
      
      if (isRegistered) {
        const name = await contract.methods.getEmployerName(payrollAddress).call();
        console.log('Already registered with name:', name);
        return;
      }
    } catch (err) {
      console.log('Not registered yet, proceeding with registration...');
    }
    
    // Register the payroll
    console.log(`Registering ${payrollName} at address ${payrollAddress}...`);
    const tx = await contract.methods.registerEmployer(payrollAddress, payrollName).send({
      from: ownerAccount,
      gas: 500000,
    });
    
    console.log('✅ Registration successful!');
    console.log('Transaction hash:', tx.transactionHash);
    
    // Verify registration
    const isRegistered = await contract.methods.employers(payrollAddress).call();
    const name = await contract.methods.getEmployerName(payrollAddress).call();
    console.log('Verification - Registered:', isRegistered);
    console.log('Verification - Name:', name);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

registerPayroll();

