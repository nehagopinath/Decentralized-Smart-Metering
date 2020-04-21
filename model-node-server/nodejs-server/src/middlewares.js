"use strict";

const jwt    = require('jsonwebtoken');

const config = require ('./config');

const allowCrossDomain = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', '*,Content-Type, Authorization');

    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
};

const checkAuthentication = (req, res, next) => {

    // check header or url parameters or post parameters for token
    const token = req.headers['x-access-token'];

    if (!token)
        return res.status(401).send({
            error: 'Unauthorized',
            message: 'No token provided in the request'
        });

    // verifies secret and checks exp
    jwt.verify(token, config.JwtSecret, (err, decoded) => {
        if (err) return res.status(401).send({
            error: 'Unauthorized',
            message: 'Failed to authenticate token.'
        });

        // if everything is good, save to request for use in other routes
        req.userId = decoded.id;
        next();
    });


};

module.exports = {
    allowCrossDomain,
    checkAuthentication,
};