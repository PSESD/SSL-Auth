/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our Program schema
var ProgramSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Export the Mongoose model
module.exports = mongoose.model('Program', ProgramSchema);