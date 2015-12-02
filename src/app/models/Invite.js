'use strict';
// Load required packages
var mongoose = require('mongoose');

// Define our token schema
var InviteSchema   = new mongoose.Schema({
  authCode: { type: String, unique: true, required: true, index: true },
  role: { type: String, required: true },
  organization: { type: String, required: true },
  created: {
    type: Date,
    default: Date.now
  }
});

// Export the Mongoose model
module.exports = mongoose.model('Invite', InviteSchema);