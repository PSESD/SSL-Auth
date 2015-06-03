// Load required packages
var mongoose = require('mongoose');
var crypto = require('crypto');
var UserPermission = require('./schema/UserPermission');

// Define our user schema
var UserSchema = new mongoose.Schema({
    hashedAuthCode: { type: String },
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
    first_name: { type: String, trim: true },
    middle_name: { type: String, trim: true },
    last_name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, unique: true, required: true, index: true, minlength: 6 },
    permissions: [ UserPermission ], // Store a permission a user has, by each organization.
    created: {
        type: Date,
        default: Date.now
    },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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
 * @param password
 * @returns {String|string|*}
 */
UserSchema.methods.encryptAuthCode = function(code){
  return crypto.pbkdf2Sync(code, this.salt, 4096, 64, 'sha256').toString('hex');
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

UserSchema.virtual('authCode')
    .set(function(code) {
      var password = crypto.randomBytes(12).toString('base64');
      this._plainAuthCode = code;
      this._plainPassword = password;
      this.salt = crypto.randomBytes(128).toString('base64');
      this.hashedPassword = this.encryptPassword(password);
      this.hashedAuthCode = this.encryptAuthCode(code);
    })
    .get(function() { return this._plainAuthCode; });
/**
 *
 * @param password
 * @param cb
 */
UserSchema.methods.verifyPassword = function(password, cb) {
  if(!this.salt){
    cb(null, false);
  } else {
    cb(null, this.encryptPassword(password) === this.hashedPassword);
  }
};

UserSchema.methods.verifyAuthCode = function(code, cb) {
  if(!this.salt){
    cb(null, false);
  } else {
    cb(null, this.encryptAuthCode(code) === this.hashedAuthCode);
  }
};

UserSchema.set('toJSON', { hide: 'hashedPassword' });

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
