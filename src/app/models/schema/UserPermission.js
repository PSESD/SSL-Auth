/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');
var Permission = require('./Permission');

// Define our token schema
var UserPermissionSchema   = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    permissions: [ Permission ]
});

// Export the Mongoose model
module.exports = UserPermissionSchema;