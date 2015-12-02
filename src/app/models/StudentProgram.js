'use strict';
/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our StudentProgram schema
var StudentProgramSchema = require('./schema/StudentProgram');

// Export the Mongoose model
module.exports = mongoose.model('StudentProgram', StudentProgramSchema);