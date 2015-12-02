'use strict';
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
var _ = require('underscore');

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
    is_super_admin: { type: Boolean, default: false, index: true },
    created: {
        type: Date,
        default: Date.now
    },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
/**
 *
 * @param index
 * @private
 */
UserSchema.methods._checkRole = function(index){
    var role = this._role;
    var isUnRestricted = this.isCaseWorkerUnrestricted();
    var permissions = this.permissions[index].permissions;
    if(permissions.length === 0){
        switch ( role ){
            case 'admin':
            case 'superadmin':
                permissions.push(
                    {
                        "model" : "Student",
                        "allow" : "all",
                        "operation" : "*"
                    }
                );
                break;
            case 'case-worker-restricted':
            case 'case-worker-unrestricted':
                var allow = isUnRestricted ? 'all' : 'own';
                permissions = [{
                    model: 'Student',
                    operation: 'read',
                    allow: allow
                }, {
                    model: 'Student',
                    operation: 'create',
                    allow: allow
                }, {
                    model: 'Student',
                    operation: 'update',
                    allow: allow
                }, {
                    model: 'Student',
                    operation: 'delete',
                    allow: allow
                }];
                break;
        }
    }

    this.permissions[index].permissions = permissions;

};
/**
 *
 * @param user
 * @param organizationId
 * @param role
 * @param cb
 */
UserSchema.methods.saveWithRole = function(user, organizationId, role, cb){


    var currentPermission = this.getCurrentPermission(organizationId);

    var caseWorkerUnrestricted = false;

    if(typeof role === 'function'){
        cb = role;
        role = this._role;
        caseWorkerUnrestricted = this._caseWorkerUnrestricted;
    } else {
        this._role = role;
        this._caseWorkerUnrestricted = caseWorkerUnrestricted = (role === 'case-worker-unrestricted');
    }

    if((''+role).indexOf('case-worker') !== -1) {

        var allow = caseWorkerUnrestricted ? 'all' : 'own';

        for (var i = 0; i < this.permissions.length; i++) {

            this._checkRole(i);

            for (var j = 0; j < this.permissions[i].permissions.length; j++) {

                this.permissions[i].permissions[j].allow = allow;

            }

        }

    }

    if(this.getIndexCurrentPermission() in this.permissions){
        if(typeof role === 'string' && this.permissions[this.getIndexCurrentPermission()].role !== role) {
            this.permissions[this.getIndexCurrentPermission()].role = role;
        }
    }

    // set update time and update by user
    this.last_updated = new Date();

    this.last_updated_by = user.userId;

    var _this = this;

    _this.save(function(err){
        cb(err, _this);
    });

};
/**
 *
 * @param values
 * @param exclude
 * @returns {{}}
 */
UserSchema.statics.crit = function(values, exclude){
    exclude = exclude || [];
    var criteria = {};
    /**
     * Find match
     */
    ['first_name', 'middle_name', 'last_name', 'email'].forEach(function(iterator){
        if(iterator in values && exclude.indexOf(iterator) === -1){
            criteria[iterator] = values[iterator];
        }
    });

    /**
     * Find Match Element
     */

    ['organizationId', 'studentId'].forEach(function(iterator){

        if(iterator in values && exclude.indexOf(iterator) === -1){

            switch (iterator){

                case 'organizationId':

                    criteria.permissions.$elemMatch.organization = values[iterator];
                    break;

                case 'studentId':

                    criteria.permissions.$elemMatch.students = { $in: values[iterator] };
                    break;

                default :

                    criteria[iterator] = { $in : values[iterator] };
                    break;
            }

        }

    });

    return criteria;

};

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
    return crypto.pbkdf2Sync(''+password, this.salt+'', 4096, 512, 'sha256').toString('hex');
};
/**
 *
 * @param code
 * @returns {*}
 */
UserSchema.methods.encryptAuthCode = function (code) {
    return crypto.pbkdf2Sync(''+code, this.salt+'', 4096, 64, 'sha256').toString('hex');
};
/**
 *
 * @param code
 * @returns {*}
 */
UserSchema.methods.encryptForgotPassword = function (code) {
    return crypto.pbkdf2Sync(''+code, this.salt+'', 4096, 32, 'sha256').toString('hex');
};
/**
 * If current user is admin
 * @params organizationId
 * @returns {boolean}
 */
UserSchema.methods.isAdmin = function(organizationId){
    return 'admin' === this.getCurrentPermission(organizationId).role || this.isSuperAdmin();
};

UserSchema.virtual('orgId').set(function(organizationId){
    if(_.isObject(organizationId)) {
        this._organizationId = organizationId.toString();
    } else {
        this._organizationId = organizationId;
    }
}).get(function(){
   return this._organizationId;
});

UserSchema.virtual('role').set(function(role){
    this._role = role;
}).get(function(){
    if(typeof this._role === undefined){
        this.getCurrentPermission();
    }
   return this._role;
});
/**
 *
 * @returns {boolean}
 */
UserSchema.virtual('caseWorkerRestricted').set(function(caseWorkerRestricted){
    this._caseWorkerUnrestricted = !caseWorkerRestricted;
    this._role = (caseWorkerRestricted) ? 'case-worker-restricted' : 'case-worker-unrestricted';
}).get(function(){
    if(typeof this._caseWorkerUnrestricted === undefined){
        this.getCurrentPermission();
    }
    return this._caseWorkerUnrestricted ? true : false;
});
/**
 *
 * @param organizationId
 * @returns {*}
 */
UserSchema.methods.getCurrentPermission = function(organizationId){

    if(organizationId) {
        this.orgId = organizationId;
    }

    if(typeof this._currentPermission !== 'object'){
        this._currentPermission = {};
    }

    if(this.orgId in this._currentPermission) {
        return this._currentPermission[this.orgId];
    }

    for(var i = 0; i < this.permissions.length; i++){
        if((this.permissions[i].organization+'') === (this.orgId+'')){
            this._currentPermission[this.orgId] = this.permissions[i];
            this._indexCurrentPermission = i;
            break;
        }
    }

    if(this.orgId in this._currentPermission) {
        this._role = this._currentPermission[this.orgId].role;
        this._caseWorkerUnrestricted = this._currentPermission[this.orgId].role === 'case-worker-unrestricted';
    } else {
        this._role = undefined;
        this._caseWorkerUnrestricted = undefined;
        return {
            role: undefined,
            organization: undefined,
            students: [],
            permissions: []
        };
    }
    return this._currentPermission[this.orgId];
};
/**
 *
 * @returns {number|*|i}
 */
UserSchema.methods.getIndexCurrentPermission = function(){
  return this._indexCurrentPermission;
};
/**
 *
 * @param organizationId
 * @returns {boolean}
 */
UserSchema.methods.isSuperAdmin = function(organizationId){
    return this.is_super_admin;
};
/**
 *
 * @param organizationId
 * @returns {boolean}
 */
UserSchema.methods.isCaseWorkerRestricted = function(organizationId){
    return this.getCurrentPermission(organizationId).role === 'case-worker-restricted';
};
/**
 *
 * @param organizationId
 * @returns {boolean}
 */
UserSchema.methods.isCaseWorkerUnrestricted = function(organizationId){
    return this.getCurrentPermission(organizationId).role === 'case-worker-unrestricted';
};
/**
 * If current user is case worker
 * @param organizationId
 * @returns {boolean}
 */
UserSchema.methods.isCaseWorker = function(organizationId){
    return (this.getCurrentPermission(organizationId).role+'').indexOf('case-worker') !== -1;
};
/**
 *
 */
UserSchema.virtual('password')
    .set(function(password) {
        if(!_.isEmpty(password)) {
            this._plainPassword = password;
            if(!this.salt) {
                this.salt = crypto.randomBytes(128).toString('base64');
            }
            this.hashedPassword = this.encryptPassword(password);
        }
    })
    .get(function() { return this._plainPassword; });
/**
 *
 */
UserSchema.virtual('authCode')
    .set(function (code) {

        this._plainAuthCode = code;
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

    if(!this.orgId) {
        return _permissions;
    }

    if(this.permissions.length > 0){

        var orgId = this.orgId;

        this.permissions.forEach(function(perm){

            if(orgId === perm.organization.toString()){
                _permissions = perm;
            }

        });

    }
    return _permissions;
});

UserSchema.virtual('allStudents').get(function(){
    var _students = [];
    if(this.permissions.length > 0){

        this.permissions.forEach(function(perm){
            _students.push(perm.students);
        });
    }
    return _students;
});

UserSchema.virtual('allStudentsByOrganization').get(function(){
    var _students = [];
    if(!this.orgId) {
        return _students;
    }

    if(this.permissions.length > 0){

        var orgId = this.orgId;

        this.permissions.forEach(function(perm){

            if(orgId === perm.organization.toString() && perm.students.length > 0 ) {
                _students = perm.students;
            }
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
    cb(null, this.encryptAuthCode(code) === this.hashedAuthCode);
};

UserSchema.methods.verifyForgotPassword = function (code, cb) {
    cb(null, (this.encryptForgotPassword(code) === this.hashedForgotPassword && new Date() < this.hashedForgotPasswordExpire));
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

UserSchema.method('toJSON', function(){
    var user = this.toObject();
    delete user.salt;
    delete user.hashedPassword;
    delete user.allPermissions;
    delete user.permissions;
    delete user.allStudents;
    delete user.organizationId;
    delete user.hashedForgotPasswordExpire;
    delete user.__v;
    delete user.is_super_admin;
    var fullname = [];

    if(user.first_name) {
        fullname.push(user.first_name);
    }
    if(user.middle_name) {
        fullname.push(user.middle_name);
    }
    if(user.last_name) {
        fullname.push(user.last_name);
    }

    if(fullname.length === 0){
        fullname.push('n/a');
        user.last_name = 'n/a';
    }

    user.full_name = fullname.join(' ');

    return user;
});

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
