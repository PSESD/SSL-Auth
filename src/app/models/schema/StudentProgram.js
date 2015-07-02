/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our StudentProgram schema
var StudentProgramSchema = new mongoose.Schema({
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    active: { type: Boolean, required: true, default: true }, // Whether the student is currently active in the program or not.
    participation_start_date: { type: Date },
    participation_end_date: { type: Date },
    cohort: { type: String },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Export the Mongoose model
module.exports = StudentProgramSchema;