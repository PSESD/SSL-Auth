/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our Permission schema
var PermissionSchema = new mongoose.Schema({
    operation: { type: String, required: true, default: '*' },
    allow: { type: Boolean, required: true, default: true, index: true }
});

// Export the Mongoose model
module.exports = PermissionSchema;