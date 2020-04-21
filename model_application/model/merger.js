/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', 'connection-org1.json');

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
        await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('model');

        //query the ledger for the gradients sent by the different workers
        var result1 = await contract.evaluateTransaction('getGradients','MODEL2', 'worker1');
        var result2 = await contract.evaluateTransaction('getGradients','MODEL2', 'worker2');

        console.log(`Gradients from worker 1: ${result1.toString()}`);
        console.log(`Gradients from worker 2: ${result2.toString()}`);

        var strArr1 = result1.toString().split(',').map(Number);
        console.log(`Gradients from worker 1 array: ${strArr1}`);

        var strArr2 = result2.toString().split(',').map(Number);
        console.log(`Gradients from worker 2 array: ${strArr2}`);

        var weight = await contract.evaluateTransaction('getWeightMatrix','MODEL3');
        var weightMatrix = weight.toString().split(',').map(Number);
        console.log(`Weight Matrix: ${weightMatrix}`);

        var avgRes = [];

         //average the gradients
         for(var i = 0; i < strArr2.length; i++) {

             var res = (strArr1[i] + strArr2[i])/2;
             avgRes.push(res);
         }

        console.log(`Average Gradients: ${avgRes}`);

         //apply the averaged gradients to the weight matrix


        var updatedWeightMatrix = [];

        for(var i = 0; i < weightMatrix.length; i++) {

            var updatedWeight = weightMatrix[i] - avgRes[i] * 0.01;
            updatedWeightMatrix.push(updatedWeight);

        }

        console.log(`Updated weight matrix: ${updatedWeightMatrix}`);

        //update the model with the new weight matrix
        await contract.submitTransaction('updateWeightMatrix', 'MODEL3', updatedWeightMatrix.toString());
        console.log('Transaction has been submitted');


        // Disconnect from the gateway.
        await gateway.disconnect();


    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

main();
