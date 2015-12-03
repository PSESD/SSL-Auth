'use strict';
/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our Program schema
var ProgramSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

ProgramSchema.statics.crit = function(values, exclude){
    exclude = exclude || [];
    var criteria = {};
    /**
     * Find match
     */
    [
        '_id', 'name', 'organization'
    ].forEach(function(iterator){

        if(iterator in values && exclude.indexOf(iterator) === -1){

            if(iterator === 'name') {

                values[iterator] = new RegExp(values[iterator], 'i');

            }

            criteria[iterator] = values[iterator];

        }
    });

    return criteria;

};


// Export the Mongoose model
module.exports = mongoose.model('Program', ProgramSchema);