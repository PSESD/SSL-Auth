/**
 * Created by zaenal on 23/06/15.
 */
'use strict'

var rules = {};
var mongoose = require('mongoose');
var _ = require('underscore');
var collection;
var context;
var currentRole;
var protectFilter;
var _permissions;
var _is_special_case_worker;
var _acl;
var _errorMessage = 'Access Denied';

module.exports = function protector(schema, options) {
    /**
     *
     * @param user
     * @param collection
     */
    function setUser(user, collection) {

        _permissions = [];

        _acl = [];

        _is_special_case_worker = false;

        var _collectionName = collection;
        /**
         * Get current permission by admin
         * @type {{role, is_special_case_worker, organization, students, permissions}}
         * @private
         */
        var _currentPermissions = user.getCurrentPermission();

        console.log('CURRENT ('+_collectionName+') PERMISSIONS: ', _currentPermissions);

        _is_special_case_worker = _currentPermissions.is_special_case_worker;

        if(user && _.isObject(_currentPermissions)) {

            var is = false;

            if (_currentPermissions.permissions.length > 0) {

                _currentPermissions.permissions.forEach(function (perm) {

                    //console.log('FILTERS: ', perm.model, _collectionName, perm.model.toLowerCase(),  _collectionName.indexOf(perm.model.toLowerCase()) !== -1);

                    if (perm.model && _collectionName.indexOf(perm.model.toLowerCase()) !== -1) {

                        _acl.push(perm);

                        is = true;

                    }

                });

            }

            _permissions = _currentPermissions;

        }

        console.log('ROLE (', currentRole, ') ACL Permissions: ', JSON.stringify(_acl));

    }

    /**
     *
     * @param req
     * @returns {{save: Function}}
     */
    schema.methods.protect = function protect(req) {

        currentRole = req;

        collection = this.collection.name;

        var caller = this;

        /**
         *  FYI, THE FOLLOWING SECTION WAS A QUICK HACK TO GET SOMETHING WORKING
         *  I'LL MAKE THIS NICE AND PRETTY AND REFACTORED SHORTLY.
         *
         */
        return {
            /**
             *
             * @param args
             */
            save: function (args) {

                var gotRules = null, inRules = null, role = null, localRules = null;

                var _localDenied = function(){
                    if ("function" === typeof args) {

                        args(_errorMessage);

                    } else {

                        _denied();

                    }
                };
                // this is a new document, does the user have create permission?
                if (caller.isNew) {

                    if(checkAcl('create').denied) return _localDenied();

                    gotRules = getRules(collection);

                    inRules = (typeof gotRules !== "undefined") ? gotRules : [];

                    role = (typeof currentRole !== "undefined") ? currentRole : "";

                    localRules = getRulesForRoleForMethod(inRules, role, 'create');

                    if (localRules) {

                        caller.save(args);

                    } else {

                        _localDenied();
                    }

                }
                // this document is being updated, does the user have update permission?
                else {

                    if(checkAcl('update').denied) return _localDenied();

                    gotRules = getRules(collection);

                    inRules = (typeof gotRules !== "undefined") ? gotRules : [];

                    role = (typeof currentRole !== "undefined") ? currentRole : "";

                    localRules = getRulesForRoleForMethod(inRules, role, 'update');

                    if (localRules) {

                        caller.save(args);

                    } else {

                        _localDenied();

                    }

                }

            }
        }

    };


    /**
     *
     * @param req
     * @param _protectFilter
     * @param user
     * @returns {{find: Function, findOne: Function, save: Function}}
     */
    schema.statics.protect = function (req, _protectFilter, user) {

        context = this;

        currentRole = req;

        collection = this.collection.name;

        protectFilter = _protectFilter || {};

        setUser(user, collection);

        return {
            /**
             *
             * @param args
             * @param callback
             * @returns {{populate, exec}}
             */
            find: function (args, callback) {

                try {

                    return _find(args, callback);

                } catch(e){

                    callback(e);

                }

            },
            /**
             *
             * @param args
             * @param callback
             * @returns {{populate, exec}}
             */
            findOne: function (args, callback) {

                try{

                    return _findOne(args, callback);

                } catch(e){

                    callback(e);

                }

            },
            /**
             * ]
             * @param fn
             * @returns {boolean}
             */
            save: function (fn) {

                console.log('here');

                return true;

            },
            /**
             *
             * @param args
             * @param callback
             * @returns {{exec}}
             */
            remove: function (args, callback) {

                try {

                    return _delete(args, callback);

                } catch(e){

                    callback(e);

                }
            }

        };

    };

    /**
     *
     * @param r
     */
    schema.statics.setRules = function (r) {

        rules[this.collection.name] = r;

    };
    /**
     *
     * @param collection
     */
    function getRules(collection) {

        return JSON.parse(JSON.stringify(rules[collection]));

    }

    /**
     *
     * @param val
     * @returns {*}
     */
    function checkDynamic(val) {

        if (typeof val === "string") {

            var spli = val.split('.');

            if (spli[0] === "$dynamic") {

                return [spli[1]];

            }
        }

        return false;

    }

    /**
     *
     * @param callback
     * @private
     */
    var _save = function (callback) {


    };
    /**
     *
     * @param crit
     * @param allowName
     * @returns {*}
     * @private
     */
    var _buildCrit = function (crit, allowName) {

        var gotRules = getRules(collection);

        allowName = allowName || 'read';

        var inRules = (typeof gotRules !== "undefined") ? gotRules : [];

        var role = (typeof currentRole !== "undefined") ? currentRole : "";

        var localRules = getRulesForRoleForMethod(inRules, role, allowName);
        /**
         * Skipped checked acl if admin user
         */
        if('admin' === currentRole){

            console.log('SKIPPED CHECKED ACL => ', JSON.stringify({fields: localRules.properties, crit: crit}));

            return {fields: localRules.properties, crit: crit};

        }

        var acl = checkAcl(allowName);

        console.log("DATA ACL (", allowName, ")", JSON.stringify(acl), ' FROM => ', JSON.stringify(_acl));

        if(acl.denied){

            console.log("ACCESS-DENIED => ", "ACL-DENIED");

            return _denied();

        }


        if (!localRules) {

            console.log("ACCESS-DENIED => ", "NOT RULES");

            return false;

        }

        if (typeof localRules.where !== "undefined") {

            switch (acl.permission.allow){
                case 'all':
                case '*':
                    //Skip this checked
                    break;
                case 'own':
                case 'owner':

                    console.log('CHECK PERMISSION INDEX OF >> ', collection, ' is ', collection in _permissions);

                    if(collection in _permissions){

                        if(!_.isEmpty(protectFilter) && collection in protectFilter && _permissions[collection].indexOf(protectFilter[collection]) === -1){

                            console.log('ACCESS-DENIED COMPARE USING LIST OF >> ', collection);

                            _denied();

                        }

                        var tmp = _permissions[collection];

                        console.log('LIST OF ', collection, ' is ', tmp);

                        if('_id' in crit){

                            if(crit._id.hasOwnProperty('$in')){

                                crit._id['$in'].forEach(function(id){

                                    tmp.push(id);

                                });

                            } else {

                                tmp.push(crit._id);

                            }

                            delete crit._id;

                        }

                        crit._id = {$in: tmp};

                    } else {

                        console.log('ACCESS-DENIED LIST OWN NOT SET >> ', collection, ' ', JSON.stringify(_permissions));

                        _denied();

                    }

                    break;

                case 'none':
                default:

                    console.log("ACCESS-DENIED => ", "PERMISSION NONE => ", acl.allow);

                    _denied();

                    break;
            }

            for (var attrn in localRules.where) {

                if (localRules.where[attrn].hasOwnProperty('$in')) {

                    var inArray = localRules.where[attrn]['$in'];

                    var projectionArray = [];

                    inArray.forEach(function (val) {

                        var theKey = checkDynamic(val);

                        if (theKey && protectFilter.hasOwnProperty(theKey)) {

                            projectionArray.push(protectFilter[theKey]);

                        }

                    });

                    if (projectionArray.length > 0) {

                        localRules.where[attrn]['$in'] = projectionArray;

                    }

                } else {

                    var key = checkDynamic(localRules.where[attrn]);

                    if (key && protectFilter.hasOwnProperty(key)) {

                        localRules.where[attrn] = protectFilter[key];

                    }

                }

                crit[attrn] = localRules.where[attrn];

            }
        }
        if (localRules.properties.hasOwnProperty('*')) {

            localRules.properties = {};

        }

        var criteria = {fields: localRules.properties, crit: crit};

        console.log('ACL CRITERIA => ', JSON.stringify(criteria), ' RULES: ', JSON.stringify(localRules));

        return criteria;

    };

    /**
     *
     * @param args
     * @param callback
     * @returns {*}
     * @private
     */
    var _find = function (args, callback) {

        var localRules = _buildCrit(args);

        if (localRules !== false) {

            if (typeof callback === "function") {

                context.find(localRules.crit, localRules.fields).where().exec(callback);

            } else {

                return context.find(localRules.crit, localRules.fields);

            }

        } else {

            if (typeof callback === "function") {

                callback(_errorMessage);

            } else {
                // this is pretty hacky
                return {
                    /**
                     *
                     * @param args
                     * @returns {{exec: Function}}
                     */
                    populate: function (args) {

                        return {

                            exec: function (callback) {

                                callback(_errorMessage);

                            }

                        }

                    },
                    /**
                     *
                     * @param callback
                     */
                    exec: function (callback) {

                        callback(_errorMessage);

                    }

                }

            }

        }

    };
    /**
     *
     * @param args
     * @param callback
     * @returns {*}
     * @private
     */
    var _findOne = function (args, callback) {


        var localRules = _buildCrit(args);

        if (localRules !== false) {

            if (typeof callback === "function") {

                context.findOne(localRules.crit, localRules.fields).where().exec(callback);

            } else {

                return context.findOne(localRules.crit, localRules.fields);

            }

        } else {

            if (typeof callback === "function") {

                callback(_errorMessage);

            } else {
                // this is pretty hacky
                return {
                    /**
                     *
                     * @param args
                     * @returns {{exec: Function}}
                     */
                    populate: function (args) {

                        return {
                            /**
                             *
                             * @param callback
                             */
                            exec: function (callback) {

                                callback(_errorMessage);

                            }
                        }
                    },
                    /**
                     *
                     * @param callback
                     */
                    exec: function (callback) {

                        callback(_errorMessage);

                    }

                }

            }

        }

    };
    /**
     * Delete or remove
     * @param args
     * @param callback
     * @returns {*}
     * @private
     */
    var _delete = function (args, callback) {


        var localRules = _buildCrit(args, 'delete');

        if (localRules !== false) {

            if (typeof callback === "function") {

                context.remove(args).where().exec(callback);

            } else {

                return context.remove(args);

            }

        } else {

            if (typeof callback === "function") {

                callback(_errorMessage);

            } else {
                // this is pretty hacky
                return {
                    /**
                     *
                     * @param callback
                     */
                    exec: function (callback) {

                        callback(_errorMessage);

                    }

                }

            }

        }

    };

}; //end export
/**
 *
 * @private
 */
function _denied () {

    throw new Error(_errorMessage);

}
/**
 *
 * @param method
 * @returns {{denied: boolean, permission: null}}
 */
function checkAcl(method){

    if(!_acl) return {
        denied: true,
        permission: null
    };

    if(currentRole === 'admin' || currentRole === 'superadmin'){

        return {
            denied: false,
            permission: {
                allow: 'all',
                operation: '*'
            }
        };

    }

    var operation = [ '*', method ];

    var i = 0, acl = null;

    do {

        acl = _acl[i];

        if(operation.indexOf(acl.operation) !== -1){

            return {
                denied: false,
                permission: acl
            };

        }

        i++;

    } while(i < _acl.length);

    return {
        denied: true,
        permission: null
    };

}
/**
 *
 * @param rules
 * @param roleName
 * @param method
 * @returns {*}
 */
function getRulesForRoleForMethod(rules, roleName, method) {

    for (var i = 0; i < rules.length; i++) {

        if (rules[i].role.name == roleName) {

            if (typeof rules[i].role.allow !== "undefined") {

                if (rules[i].role.allow.hasOwnProperty("*")) {

                    return {properties: {}, where: {}};

                } else if (rules[i].role.allow.hasOwnProperty(method)) {

                    return rules[i].role.allow[method];

                }

            }

        }

    }

    return false;

}