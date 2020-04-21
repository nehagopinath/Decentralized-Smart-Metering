/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

require('onnxjs');

// uncomment the following line to enable ONNXRuntime node binding
// require('onnxjs-node');

const {FileSystemWallet, Gateway} = require('fabric-network');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', 'connection-org1.json');

const fs = require('fs');

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log('An identity for the user "user1" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {wallet, identity: 'user1', discovery: {enabled: true, asLocalhost: true}});

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('model');

       // Create an ONNX inference session with WebAssembly backend.
        /*const session = new onnx.InferenceSession({backendHint: 'wasm'});
        // Load an ONNX model. This model takes two tensors of the same size and return their sum.
        await session.loadModel("./resnet.onnx");
        console.log('Model has been loaded');*/

        const model = fs.readFileSync('model1.onnx')
        console.log('Model is being read')

        await contract.submitTransaction('addModel', 'MODEL4', 'firstModel', model.toString());
        console.log('Transaction has been submitted');

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
