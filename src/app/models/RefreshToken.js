// Load required packages
var mongoose = require('mongoose');

// Define our token schema
var RefreshTokenSchema   = new mongoose.Schema({
  refreshToken: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  clientId: { type: String, required: true },
  created: {
    type: Date,
    default: Date.now
  }
});

// Export the Mongoose model
module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);