require('dotenv').load()
'use strict';

module.exports.config = function() {
    var cfg = require('config');
    // console.log(process.env);
    for (var prop in process.env) {
        if (cfg[prop] != process.env[prop]) {
            cfg[prop] = process.env[prop]; 
        }
    }
    return cfg;
}