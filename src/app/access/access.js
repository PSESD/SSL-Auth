'use strict';
/**
 * Created by zaenal on 22/07/15.
 */
var User = require('./../models/User');
var Organization = require('./../models/Organization');
var php = require('phpjs');
var _ = require('underscore');
var ObjectId = require('mongoose').Types.ObjectId;

var log = console.log;

var instance = null;
/**
 *
 * @constructor
 */
function Access(user, organizationId){

    if(user) {
        this.user = user;
    }

    if(organizationId) {
        this.organizationId = organizationId;
    }

}
/**
 *
 * @param user
 */
Access.prototype.setUser = function(user){
  this.user = user;
};
/**
 *
 * @param organizationId
 */
Access.prototype.setOrganizationId = function(organizationId){
    this.organizationId = organizationId;
};
/**
 *
 * @param options
 * @returns {*}
 */
Access.prototype.grant = function(options){

    if(this.hasPermission(options)){

        if('onSuccess' in options && typeof options.onSuccess === 'function'){

            return options.onSuccess();

        }

    } else {

        if('onError' in options && typeof options.onError === 'function'){

            return options.onError();

        }

    }

};
/**
 *
 * @param options
 * @returns {*}
 * @private
 */
Access.prototype.hasPermission = function(options){

    var currentUser = this.user;

    if(!_.isObject(options)) {
        options = {};
    }

    if('user' in options && options.user instanceof User){

        currentUser = options.user;

    }

    if(!currentUser) {
        return false;
    }

    if(currentUser.isSuperAdmin()) {
        return true;
    }

    var organizationId = this.organizationId;

    if(!organizationId) {
        return false;
    }


    if('organizationId' in options && String.valueOf(options.organizationId).length > 0){

        organizationId = options.organizationId;

    }

    if(!organizationId) {
        return false;
    }

    var orgid = currentUser.organizationId;

    var isMatch = orgid.indexOf(organizationId + '') !== -1;

    log(
        ' USER: ' + JSON.stringify(currentUser.email) +
        ' USER ORG: ' + JSON.stringify(orgid) +
        ' CURR ORG: ' + JSON.stringify(organizationId) +
        ' TYPEOF ORG: ' + (typeof organizationId) +
        ' MATCH: ' + isMatch

    );

    if('onCheck' in options && typeof options.onCheck === 'function'){

        return options.onCheck(isMatch);

    }

    return isMatch;

};

Access.hasAccess = function(req, res, next){
    /**
     * Check if there is empty user
     */
    if(!req.user){

        log('Dont have permission because not "user" and skip by middleware');

        return res.errUnauthorized();

    }

    var crit = {};

    if(req.params.organizationId){

        crit = { _id: ObjectId(req.params.organizationId) };


    } else {

        var curl = null;

        var clientUrl = req.headers.origin;

        var hackUrl = 'x-cbo-client-url';

        if(hackUrl in req.headers){

            clientUrl = req.headers[hackUrl];

        }

        var parse_url = php.parse_url(clientUrl);

        if (parse_url['host']) {

            curl = parse_url['host'];

        } else {

            curl = parse_url['path'];

        }


        crit = { url: curl };

    }

    Organization.findOne(crit, function(err, organization){

        if(err) {

            res.sendError(err);

            return res.end();

        }

        if(!organization) {

            log('Dont have "Organization not found" and skip by middleware => ' + JSON.stringify(crit));

            return res.errUnauthorized();

        }

        req.organization = organization;

        req.user.orgId = organization._id.toString();

        req.user.getCurrentPermission();

        var access = new Access(req.user, req.user.orgId);

        if(!access.hasPermission()){

            log('Dont have "permission" and skip by middleware');

            return res.errUnauthorized();

        }

        next();

    });

};

Access.isAdmin = function(req, res, next){

    /**
     * Check if there is empty user
     */
    if(!req.user){

        log('Dont have permission because not "user" and skip by middleware');

        return res.errUnauthorized();

    }

    if(!req.user.isAdmin()){

        log('Dont have permission because not "admin user" and skip by middleware');

        return res.errUnauthorized();

    }

    next();

};
/**
 *
 * @param user
 * @param organizationId
 * @returns {*}
 */
Access.getInstance = function(user, organizationId){

    if(!instance) instance = new Access(user, organizationId);

    return instance;
};
/**
 *
 * @type {Access}
 */
module.exports = Access;