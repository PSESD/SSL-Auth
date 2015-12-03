'use strict';
/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Export the Mongoose model
module.exports = mongoose.model('UserPermission', require('./schema/UserPermission'));