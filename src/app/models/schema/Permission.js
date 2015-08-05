/**
 * Created by zaenal on 20/05/15.
 *
 * models:
 * - Student: ACL for the student data
 *
 * operations:
 * - *: can perform all operations (crud)
 * - create
 * - read
 * - update
 * - delete
 *
 * allow:
 * - all: allow operations on all data in the model
 * - own: allow operations on data that the user is assigned to/owned. (currently only on Student).
 * - none: allow no operation
 *
 */
// Load required packages
var mongoose = require('mongoose');

// Define our Permission schema
var PermissionSchema = new mongoose.Schema({
    model: { type: String, required: true, index: true },
    operation: { type: String, required: true, default: '*' },
    allow: { type: String, required: true, default: 'all', index: true }
});

// Export the Mongoose model
module.exports = PermissionSchema;