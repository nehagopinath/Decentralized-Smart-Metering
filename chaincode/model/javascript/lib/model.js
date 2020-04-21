/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

require('onnxjs');

const {Contract} = require('fabric-contract-api');
const fs = require('fs');
const assert = require('assert');
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

//todo: Implement all calls as MPI blocking calls
//todo: keep a continuously incrementing counter with the chaincode
//todo: updateParam: wait for 'n' workers to send gradients before updating the parameter

class Model extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const models = [
            {
                modelName: 'sampleModel1',
                model: '123'
            },
            {
                modelName: 'sampleModel2',
                model: '987'
            },
            {
                modelName: 'gradients',
                worker1: [0,0,0],
                worker2: [0,0,0]
            },
            {
                modelName: 'weightMatrix',
                feature: "0.3696, 0.5303,0.4714"

            }

        ];

        for (let i = 0; i < models.length; i++) {
            models[i].docType = 'model';
            await ctx.stub.putState('MODEL' + i, Buffer.from(JSON.stringify(models[i])));
            console.info('Added <--> ', models[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async queryModel(ctx, modelNumber) {
        const modelAsBytes = await ctx.stub.getState(modelNumber); // get the model from chaincode state
        if (!modelAsBytes || modelAsBytes.length === 0) {
            throw new Error(`${modelNumber} does not exist`);
        }
        const full_model = JSON.parse(modelAsBytes.toString());
        //const model = full_model.model;
        const model = full_model.feature;
        // console.log(modelAsBytes.toString());
        // return modelAsBytes.toString();
        return model;
    }

    async addModel(ctx,modelNumber,modelName, model) {
        console.info('============= START : Add Model ===========');

        const added_model = {
            modelName,
            docType: 'model',
            model
        };

        await ctx.stub.putState(modelNumber, Buffer.from(JSON.stringify(added_model)));
        console.info('============= END : Add Model ===========');
    }

    async mergeModel(ctx, modelNumber1, modelNumber2) {
        console.info('============= START : Merge Model ===========');
        const modelAsBytes1 = await ctx.stub.getState(modelNumber1); // get the model from chaincode state
        const modelAsBytes2 = await ctx.stub.getState(modelNumber2); // get the model from chaincode state

        if (!modelAsBytes1 || modelAsBytes1.length === 0) {
            throw new Error(`${modelNumber1} does not exist`);
        }
        if (!modelAsBytes2 || modelAsBytes2.length === 0) {
            throw new Error(`${modelNumber2} does not exist`);
        }
        const full_model1 = JSON.parse(modelAsBytes1.toString());
        const model1 = full_model1.model;
        const full_model2 = JSON.parse(modelAsBytes2.toString());
        const model2 = full_model2.model;
        /*const buffer1 = new Buffer(model1, 'binary');
        const buffer2 = new Buffer(model2, 'binary');*/

        fs.writeFile('/model1.onnx', model1 , function(err) {

            if(err) {
                return console.log(err);
            }

            console.log('The first file was saved!');
        });
        fs.writeFile('/model2.onnx', model2 , function(err) {

            if(err) {
                return console.log(err);
            }

            console.log('The second file was saved!');
        });
        /*console.log('Calling Python script')
        let spawn = require('child_process').spawn,
            py    = spawn('python', ['/mergeModel.py']);
        const data = '';
        py.stdout.on('data', (data) => {
            console.log('Data is' + data);
        });
        py.stdin.write(JSON.stringify(data));
        py.stdin.end();
        console.log('outside python script'); */

        // Create an ONNX inference session with WebAssembly backend.
        const session1 = new onnx.InferenceSession({backendHint: 'wasm'});
        // Load an ONNX model. This model does an AND operation on 2D
        await session1.loadModel('/model1.onnx');
        console.log('Model has been loaded');

        const x = new Uint8Array(3*4).fill(5)
        const y = new Uint8Array(3*4).fill(0)
        const tensorX = new onnx.Tensor(x, 'bool',[3,4]);
        const tensorY = new onnx.Tensor(y, 'bool',[3,4]);

        // Run model with Tensor inputs and get the result by output name defined in model.
        const outputMap1 = await session1.run([tensorX, tensorY]);
        const outputData1 = outputMap1.get('and');

        // Check if result is expected.
        assert.deepEqual(outputData1.dims, [3, 4]);
        console.log(`Got an Tensor of size ${outputData1.data.length} with all elements being ${outputData1.data[0]}`);

        // Create an ONNX inference session with WebAssembly backend.
        const session2 = new onnx.InferenceSession({backendHint: 'wasm'});
        // Load an ONNX model. This model does an AND operation on 3D
        await session2.loadModel('/model2.onnx');
        console.log('Model has been loaded');

        const a = new Uint8Array(3*4*5).fill(5)
        const b = new Uint8Array(3*4*5).fill(5)
        const tensorA = new onnx.Tensor(a, 'bool',[3,4,5]);
        const tensorB = new onnx.Tensor(b, 'bool',[3,4,5]);

        // Run model with Tensor inputs and get the result by output name defined in model.
        const outputMap2 = await session2.run([tensorA, tensorB]);
        const outputData2 = outputMap2.get('and');

        // Check if result is expected.
        assert.deepEqual(outputData2.dims, [3, 4, 5]);
        console.log(`Got an Tensor of size ${outputData2.data.length} with all elements being ${outputData2.data[0]}`);

        console.info('============= END : Merge Model ===========');
    }

    async queryAllModels(ctx) {
        const startKey = 'MODEL0';
        const endKey = 'MODEL999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString('utf8');
                }
                allResults.push({Key, Record});
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    async updateWeightMatrix(ctx, modelNumber, newValue) {
        console.info('============= START : UpdateParam ===========');

        const modelAsBytes = await ctx.stub.getState(modelNumber); // get the model from chaincode state
        if (!modelAsBytes || modelAsBytes.length === 0) {
            throw new Error(`${modelNumber} does not exist`);
        }
        const model = JSON.parse(modelAsBytes.toString());
        model.feature = newValue;

        await ctx.stub.putState(modelNumber, Buffer.from(JSON.stringify(model)));
        console.info('============= END : UpdateParam ===========');
    }

    async updateGradients(ctx, modelNumber, newValue, workerNumber) {
        console.info('============= START : UpdateGradient ===========');

        const modelAsBytes = await ctx.stub.getState(modelNumber); // get the model from chaincode state
        if (!modelAsBytes || modelAsBytes.length === 0) {
            throw new Error(`${modelNumber} does not exist`);
        }

        const model = JSON.parse(modelAsBytes.toString());

        if (workerNumber == "worker1") {
            model.worker1 = newValue;
        } else if (workerNumber == "worker2") {
            model.worker2 = newValue;

        }

        await ctx.stub.putState(modelNumber, Buffer.from(JSON.stringify(model)));

        console.info('============= END : UpdateGradient ===========');


    }


    async getGradients(ctx, modelNumber, workerNumber) {
        const modelAsBytes = await ctx.stub.getState(modelNumber); // get the model from chaincode state
        if (!modelAsBytes || modelAsBytes.length === 0) {
            throw new Error(`${modelNumber} does not exist`);
        }
        const full_model = JSON.parse(modelAsBytes.toString());

        if(workerNumber == "worker1") {
            var gradient1 = full_model.worker1;
            return gradient1;
        }


        if(workerNumber == "worker2") {
            var gradient2 = full_model.worker2;
            return gradient2;

        }

    }

    async getWeightMatrix(ctx, modelNumber) {
        const modelAsBytes = await ctx.stub.getState(modelNumber); // get the model from chaincode state
        if (!modelAsBytes || modelAsBytes.length === 0) {
            throw new Error(`${modelNumber} does not exist`);
        }
        const full_model = JSON.parse(modelAsBytes.toString());

        var weights = full_model.feature;
        return weights;

    }

    async mergeAndUpdate(ctx) {

        console.info('============= START : mergeAndUpdate ===========');

        var gradient1 = await this.getGradients(ctx, 'MODEL2', 'worker1');
        var gradient2 = await this.getGradients(ctx, 'MODEL2', 'worker2');

        console.log(`Gradients from worker 1: ${gradient1.toString()}`);
        console.log(`Gradients from worker 2: ${gradient2.toString()}`);

        var strArr1 = gradient1.toString().split(',').map(Number);
        console.log(`Gradients from worker 1 array: ${strArr1}`);

        var strArr2 = gradient2.toString().split(',').map(Number);
        console.log(`Gradients from worker 2 array: ${strArr2}`);

        var weight = await this.getWeightMatrix(ctx, 'MODEL3');

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

        await this.updateWeightMatrix(ctx, 'MODEL3', updatedWeightMatrix.toString());

        console.info('============= END : mergeAndUpdate ===========');

    }


}

module.exports = Model;
