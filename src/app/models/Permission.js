/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');
var PermissionSchema = require('./schema/Permission');

// Export the Mongoose model
module.exports = mongoose.model('Permission', PermissionSchema);