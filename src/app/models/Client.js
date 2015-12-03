'use strict';
// Load required packages
var mongoose = require('mongoose');

// Define our Client schema
var ClientSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  id: { type: String, required: true },
  secret: String,
  userId: { type: String, required: true },
  redirectUri: { type: String, required: true }
});
ClientSchema.virtual('clientId')
    .get(function(){
      return this._id;
 });

 ClientSchema.virtual('clientSecret')
    .get(function(){
      return this.secret;
 });

ClientSchema.path('redirectUri').validate(function (value) {
    try{
      return require('util').isRegExp(new RegExp(value));
    } catch(e){
      return false;
    }

}, 'Invalid regular expression');


// Export the Mongoose model
module.exports = mongoose.model('Client', ClientSchema);