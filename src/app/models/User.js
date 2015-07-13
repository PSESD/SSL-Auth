// Load required packages
var mongoose = require('mongoose');
var crypto = require('crypto');
var UserPermission = require('./schema/UserPermission');
var Organization = require('./Organization');
var Code = require('./Code');
var Client = require('./Client');
var Student = require('./Student');
var Program = require('./Program');
var ObjectId = mongoose.Types.ObjectId;

// Define our user schema
var UserSchema = new mongoose.Schema({
    hashedAuthCode: { type: String },
    hashedPassword: {
        type: String
    },
    hashedForgotPassword: String,
    hashedForgotPasswordExpire: { type: Date, default: Date.now },
    /**
    * Store salt as plain text
    */
    salt: {
        type: String
    },
    first_name: { type: String, trim: true },
    middle_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    email: { type: String, trim: true, unique: true, required: true, index: true, minlength: 6 },
    permissions: [ UserPermission ], // Store a permission a user has, by each organization.
    created: {
        type: Date,
        default: Date.now
    },
    role: { type: String, default: 'case-worker' },
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
UserSchema.methods.encryptPassword = function (password) {
    return crypto.pbkdf2Sync(''+password, this.salt, 4096, 512, 'sha256').toString('hex');
};
/**
 *
 * @param code
 * @returns {*}
 */
UserSchema.methods.encryptAuthCode = function (code) {
    return crypto.pbkdf2Sync(''+code, this.salt, 4096, 64, 'sha256').toString('hex');
};
/**
 *
 * @param code
 * @returns {*}
 */
UserSchema.methods.encryptForgotPassword = function (code) {
    return crypto.pbkdf2Sync(''+code, this.salt, 4096, 32, 'sha256').toString('hex');
};
/**
 * If current user is admin
 * @returns {boolean}
 */
UserSchema.methods.isAdmin = function(){
  return 'admin' === this.role;
};
/**
 * If current user is case worker
 * @returns {boolean}
 */
UserSchema.methods.isCaseWorker = function(){
    return 'case-worker' === this.role;
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
    .set(function (code) {
        var password = crypto.randomBytes(12).toString('base64');
        this._plainAuthCode = code;
        this._plainPassword = password;
        this.salt = crypto.randomBytes(128).toString('base64');
        this.hashedPassword = this.encryptPassword(password);
        this.hashedAuthCode = this.encryptAuthCode(code);
    })
    .get(function () {
        return this._plainAuthCode;
    });

UserSchema.virtual('forgotPassword')
    .set(function (code) {
        this._plainForgotPassword = code;
        this.hashedForgotPassword = this.encryptForgotPassword(code);
        this.hashedForgotPasswordExpire = new Date(new Date().getTime() + (86400 * 1000)); // set to 24 hour
    })
    .get(function () {
        return this._plainForgotPassword;
    });

/**
 * User organization id
 */
UserSchema.virtual('organizationId').get(function(){
  var _id = [];
  if(this.permissions.length > 0){
      
      this.permissions.forEach(function(organization){
          _id.push(organization.organization.toString());
      });
  }
  return _id;
});

UserSchema.virtual('allPermissions').get(function(){
    var _permissions = [];
    if(this.permissions.length > 0){

        this.permissions.forEach(function(perm){
            _permissions.push(perm.permissions);
        });
    }
    return _permissions;
});

UserSchema.virtual('allPermissionsByOrganization').get(function(){
    var _permissions = {};
    if(this.permissions.length > 0){

        this.permissions.forEach(function(perm){
            if(!_permissions.hasOwnProperty(perm.organization)){
                _permissions[perm.organization] = [];
            }
            _permissions[perm.organization].push(perm.permissions);
        });
    }
    return _permissions;
});

UserSchema.virtual('allStudents').get(function(){
    var _students = [];
    if(this.permissions.length > 0){

        this.permissions.forEach(function(perm){
            _students.push(perm._students);
        });
    }
    return _students;
});

UserSchema.virtual('allStudentsByOrganization').get(function(){
    var _students = {};
    if(this.permissions.length > 0){

        this.permissions.forEach(function(perm){
            if(!_students.hasOwnProperty(perm.organization)){
                _students[perm.organization] = [];
            }
            _students[perm.organization].push(perm.students);
        });
    }
    return _students;
});


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

UserSchema.methods.verifyAuthCode = function (code, cb) {
    if (!this.salt) {
        cb(null, false);
    } else {
        cb(null, this.encryptAuthCode(code) === this.hashedAuthCode);
    }
};

UserSchema.methods.verifyForgotPassword = function (code, cb) {
    if (!this.salt) {
        cb(null, false);
    } else {
        cb(null, (this.encryptForgotPassword(code) === this.hashedForgotPassword && new Date() < this.hashedForgotPasswordExpire));
    }
};

/**
 *
 */
UserSchema.statics.removeDeep = function(userId, done){
    Client.remove({ userId: userId }, done);
    Code.remove({ userId: userId }, done);
    Program.remove({ creator: userId }, done);
    Student.remove({ creator: userId }, done);
    Organization.remove({ creator: userId }, done);
    this.model('User').remove({_id: userId}, done);
    console.log('REMOVE CALL');
};


UserSchema.set('toJSON', { hide: 'hashedPassword', virtuals: true });
UserSchema.set('toObject', { hide: 'hashedPassword', virtuals: true });

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
