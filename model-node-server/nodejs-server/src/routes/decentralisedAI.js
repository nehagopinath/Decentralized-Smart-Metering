"use strict";

const express        = require('express');
const router         = express.Router();

const ModelController = require('../controllers/modelController')

//Endpoint - Query all Models
router.get('/queryModel', ModelController.queryModel);
//Endpoint - load models
router.post('/loadModel', ModelController.loadModel);
//Endpoint - worker1
router.post('/worker1/:gradients', ModelController.worker1);
//Endpoint - worker2
router.post('/worker2/:gradients', ModelController.worker2);
//Endpoint - merger
router.post('/merge', ModelController.merger);


module.exports = router;