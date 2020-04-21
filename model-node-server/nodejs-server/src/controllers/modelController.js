"use strict";

require('onnxjs');

// uncomment the following line to enable ONNXRuntime node binding
// require('onnxjs-node');

const { FileSystemWallet, Gateway } = require('fabric-network');

const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..','..', '..','first-network', 'connection-org1.json');

// Create a new file system based wallet for managing identities.
const walletPath = path.resolve(__dirname, '../../../../model_application/model/wallet');
console.log(walletPath);
const wallet = new FileSystemWallet(walletPath);
console.log(`Wallet path: ${walletPath}`);


const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise
            .resolve(fn(req, res, next))
            .catch((e) => {
                res.status(500);
                res.json({
                    success: false,
                    message: 'Server error has occured: ' + e
                });
            });
    };


// loadModel
//todo: send an onnx file as a parameter and read it in the logic.
const loadModel = asyncMiddleware(async (req, res) => {
   // var modelNumber = req.params.modelNumber;
   // var modelName = req.params.modelName;
   // var modelContent = req.params.model;

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

    console.log('Loading Model now!');

    const model = fs.readFileSync('/Users/nehagopinath/Documents/WiSe19-20/Thesis/Decentralised_AI/new_code/decentralised-smart-metering/model-node-server/nodejs-server/src/controllers/model2.onnx')
    console.log('Model is being read')

    await contract.submitTransaction('addModel', 'MODEL5', 'secondModel', model.toString());
    console.log('Transaction has been submitted');

    // Disconnect from the gateway.
    await gateway.disconnect();
});

// QUERY MODEL
const queryModel = asyncMiddleware(async (req, res) => {

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

    console.log('going to get all models now!');

    // Evaluate the specified transaction.
    // queryModel transaction - requires 1 argument, ex: ('queryModel', 'MODEL1')
    // queryAllModels transaction - requires no arguments, ex: ('queryAllModels')
    const result = await contract.evaluateTransaction('queryAllModels');
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
});


// WORKER 1 : Gets the gradients via parameters and send sends the gradients to be stored on the BC
const worker1 = asyncMiddleware(async (req, res) => {

    var gradients = req.query.gradients.split(',');

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

    //console.log('Getting the latest model');

    //await contract.submitTransaction('getWeightMatrix');

    console.log('Storing the gradients on the Blockchain');

    //send the gradients to the ledger
    await contract.submitTransaction('updateGradients', 'MODEL2',gradients.toString(),'worker1');
    console.log('Transaction has been submitted');

});

// WORKER 2 : Gets the gradients via parameters and send sends the gradients to be stored on the BC
const worker2 = asyncMiddleware(async (req, res) => {

    var gradients = req.query.gradients.split(',');

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

    console.log('Storing the gradients on the Blockchain')

    //var gradients = [0.0025, -0.0121, -0.0161];

    //send the gradients to the ledger
    await contract.submitTransaction('updateGradients', 'MODEL2',gradients.toString(),'worker2');
    console.log('Transaction has been submitted');


    //the last worker after storing the gradients on the BC will call the merge and update to update the weight matrix stored on the BC
    await contract.submitTransaction('mergeAndUpdate');
    console.log('Transaction has been submitted');

});


// Merger : Takes the stored gradients on the BC. Averages the gradients and applies them to the weights stored on the BC.
const merger = asyncMiddleware(async (req, res) => {

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
    var weightMatrix = weight.toString().split(',').map(Number)
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


});




module.exports = {
    loadModel,
    queryModel,
    worker1,
    worker2,
    merger
};
