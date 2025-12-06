#!/bin/bash

echo "🔄 Resetting Blockchain Data..."
echo ""

# Step 1: Check if Ganache is running
echo "📋 Step 1: Checking Ganache connection..."
if curl -s http://127.0.0.1:7545 > /dev/null 2>&1; then
    echo "✅ Ganache is running on port 7545"
else
    echo "⚠️  Ganache is not running on port 7545"
    echo "   Please start Ganache first (GUI or CLI)"
    echo "   For Ganache CLI: ganache-cli -p 7545"
    echo "   For Ganache GUI: Start it and set port to 7545"
    exit 1
fi

# Step 2: Reset and redeploy contracts
echo ""
echo "📋 Step 2: Resetting and redeploying contracts..."
cd "$(dirname "$0")"
truffle migrate --reset

if [ $? -eq 0 ]; then
    echo "✅ Contracts redeployed successfully"
else
    echo "❌ Contract deployment failed"
    exit 1
fi

# Step 3: Update contract.json files
echo ""
echo "📋 Step 3: Updating contract.json files..."

# Get the new contract address from build/contracts/TrustID.json
CONTRACT_FILE="build/contracts/TrustID.json"
if [ -f "$CONTRACT_FILE" ]; then
    # Extract network ID 1337 address (Ganache default)
    NEW_ADDRESS=$(node -e "
        const data = require('./$CONTRACT_FILE');
        const networkId = Object.keys(data.networks).find(id => 
            data.networks[id].address
        );
        if (networkId && data.networks[networkId].address) {
            console.log(JSON.stringify({
                networkId: networkId,
                address: data.networks[networkId].address
            }));
        } else {
            console.log('{}');
        }
    ")
    
    if [ "$NEW_ADDRESS" != "{}" ]; then
        NETWORK_ID=$(echo $NEW_ADDRESS | node -e "const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d); console.log(j.networkId)")
        ADDRESS=$(echo $NEW_ADDRESS | node -e "const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d); console.log(j.address)")
        
        echo "   Found contract at network $NETWORK_ID: $ADDRESS"
        
        # Update frontend contract.json
        if [ -f "frontend/src/contract.json" ]; then
            node -e "
                const fs = require('fs');
                const data = require('./build/contracts/TrustID.json');
                const contractData = {
                    contractName: data.contractName,
                    abi: data.abi,
                    networks: data.networks
                };
                fs.writeFileSync('frontend/src/contract.json', JSON.stringify(contractData, null, 2));
                console.log('✅ Updated frontend/src/contract.json');
            "
        fi
        
        # Update backend contract.json
        if [ -f "my-app-backend/contract.json" ]; then
            node -e "
                const fs = require('fs');
                const data = require('./build/contracts/TrustID.json');
                const contractData = {
                    contractName: data.contractName,
                    abi: data.abi,
                    networks: data.networks
                };
                fs.writeFileSync('my-app-backend/contract.json', JSON.stringify(contractData, null, 2));
                console.log('✅ Updated my-app-backend/contract.json');
            "
        fi
    else
        echo "⚠️  Could not find contract address in build files"
    fi
else
    echo "⚠️  Contract build file not found: $CONTRACT_FILE"
fi

echo ""
echo "✅ Blockchain reset complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your backend server (if running)"
echo "   2. Refresh your frontend browser"
echo "   3. All blockchain data (NFTs, verifications) has been cleared"
echo "   4. You can now create new accounts and submit new timesheets"

