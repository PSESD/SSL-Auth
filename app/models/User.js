// Load required packages
var mongoose = require('mongoose');
var crypto = require('crypto');

// Define our user schema
var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  hashedPassword: {
    type: String,
    required: true
  },
  /**
   * Store salt as plain text
   */
  salt: {
    type: String
  },
  created: {
    type: Date,
    default: Date.now
  }
});

UserSchema.virtual('userId')
    .get(function(){
      return this.id;
    });
/**
 *
 * @param password
 * @returns {*}
 */
UserSchema.methods.encryptPassword = function(password){
  return crypto.pbkdf2Sync(password, this.salt, 4096, 512, 'sha256').toString('hex');
};
/**
 *
 */
UserSchema.virtual('password')
    .set(function(password) {
      this._plainPassword = password;
      this.salt = crypto.randomBytes(128).toString('base64');
      this.hashedPassword = this.encryptPassword(password);
    })
    .get(function() { return this._plainPassword; });
/**
 *
 * @param password
 * @param cb
 */
UserSchema.methods.verifyPassword = function(password, cb) {
  cb(null, this.encryptPassword(password) === this.hashedPassword);
};

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);