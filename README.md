[//]: # (SPDX-License-Identifier: CC-BY-4.0)

## Steps to run the application

 Set-up the Hyperledger Fabric network:
```bash
cd model_application
Run ./startFabric.sh 

```

Enroll the admin of the network and register a sample user to interact with the ledger:

```bash
cd model
npm install
node enrollAdmin.js 
node registerUser.js
```

To run all the functionalities via the hyperledger client application:

```bash
cd model
node worker1.js //store the gradients obtained from training performed on worker1
node worker2.js //store the gradients obtained from training performed on worker2
node query.js //to query all the data stored on the ledger
node merger.js //to retrieve the gradients stored on the ledger by all the participating workers. Merge the gradients by averaging and apply the gradients to the latest weight matrix stored on the ledger. Push the latest weight matrix to the ledger to be used for the next iteration.
```
To run all the functionalities via rest api:

```bash
cd model-node-server/nodejs-server
npm install
npm run devstart //runs on port 4300

To get all the data stored on the ledger
GET localhost:4300/decentralisedAI/queryModel

To store the gradients obtained from training performed on worker1
POST localhost:4300/decentralisedAI/worker1/gradients?gradients=0.0026, -0.0122, -0.0162

To store the gradients obtained from training performed on worker2
POST localhost:4300/decentralisedAI/worker2/gradients?gradients=0.0026, -0.0122, -0.0162

To retrieve the gradients stored on the ledger by all the participating workers. Merge the gradients by averaging and apply the gradients to the latest weight matrix stored on the ledger. Push the latest weight matrix to the ledger to be used for the next iteration
POST localhost:4300/decentralisedAI/merge






```
 

