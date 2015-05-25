// Load required packages
var mongoose = require('mongoose');

// Define our token schema
var TokenSchema   = new mongoose.Schema({
  token: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  scope: { type: String },
  clientId: { type: String, required: true },
  created: { type: Date, required: true, default: Date.now },
  expired: { type: Date, required: true }
});

// Export the Mongoose model
module.exports = mongoose.model('Token', TokenSchema);