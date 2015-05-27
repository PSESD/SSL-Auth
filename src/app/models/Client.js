// Load required packages
var mongoose = require('mongoose');
var preg_quote = require('../../lib/utils').preg_quote;

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


// middleware
ClientSchema.pre('save', function (next) {
    this.redirectUri = preg_quote(this.redirectUri);
    next();
});


// Export the Mongoose model
module.exports = mongoose.model('Client', ClientSchema);