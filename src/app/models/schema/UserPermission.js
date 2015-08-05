/**
 * Created by zaenal on 20/05/15.
 * Last updated by abegodong on 02/06/15.
 *
 *
 */
// Load required packages
var mongoose = require('mongoose');
var Permission = require('./Permission');

// Define our token schema
var UserPermissionSchema   = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    students: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Student' } ],
    permissions: [ Permission ],
    role: { type: String, default: 'case-worker' },
    is_special_case_worker: { type: Boolean, default: false, index: true }
});

// Export the Mongoose model
module.exports = UserPermissionSchema;