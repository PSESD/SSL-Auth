/**
 * Created by zaenal on 03/07/15.
 */
/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');
var _ = require('underscore');
var natural = require('natural'),
    tokenizer = new natural.WordTokenizer(),
    slug = require('slug');

// Define our Tag schema
var TagSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

TagSchema.statics.crit = function(values, exclude){
    exclude = exclude || [];
    var criteria = {};
    /**
     * Find match
     */
    [
        '_id', 'name', 'organization'
    ].forEach(function(iterator){

            if(iterator in values && exclude.indexOf(iterator) === -1){

                criteria[iterator] = values[iterator];

            }
        });

    return criteria;

};
/**
 *
 * @param organizationId
 * @param title
 */
TagSchema.statics.addTag = function(organizationId, title){
    var TagModel = this.model('Tag');
    var tokens = !_.isArray(title) ? tokenizer.tokenize(title) : title;
    _.each(tokens, function(token){
        TagModel.update({ name: token, organization: organizationId}, { name: token, organization: organizationId, slug: slug(token)}, { multi: true, upsert: true }, function(err, raw){
            if(err) console.log(err);
        });
    });
};

// Export the Mongoose model
module.exports = mongoose.model('Tag', TagSchema);