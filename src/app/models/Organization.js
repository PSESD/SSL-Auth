/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');
var Address = require('./schema/Address');

// Define our Organization schema
var OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    url: { type: String, required: true }, // The unique URL where the site lives
    website: { type: String }, // The CBO Main Website, not related with the app
    description: { type: String },
    addresses: [ Address ],
    externalServiceId: { type: Number, required: true },
    personnelId: { type: Number },
    authorizedEntityId: { type: Number, required: true },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});


OrganizationSchema.statics.crit = function(values, exclude){
    exclude = exclude || [];
    var criteria = {};
    /**
     * Find match
     */
    [
        '_id', 'name', 'url', 'website', 'description',
        'externalServiceId', 'personnelId', 'authorizedEntityId'
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



OrganizationSchema.virtual('Id')
.get(function(){
    return this.id;
});

/**
 *
 * @param user
 * @param crit
 * @param done
 */
OrganizationSchema.statics.findByUser = function(user, crit, done){
    crit = crit || {};
    if(user.permissions.length > 0){
        var _id = [];
        user.permissions.forEach(function(organization){
            _id.push(organization.organization);
        });
        /**
         * If has permission
         * Filter here
         */
        crit._id = { $in: _id };
    }
    this.find(crit, done);
};

// Export the Mongoose model
module.exports = mongoose.model('Organization', OrganizationSchema);