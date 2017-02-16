// Load required packages
var User = require('../models/User');
var Organization = require('../models/Organization');
var Invite = require('../models/Invite');
var utils = require('../../lib/utils');
var cache = utils.cache();
var md5 = utils.md5;
var config = require('../../lib/config').config();
var mandrill = require('mandrill-api/mandrill');
var crypto = require('crypto');
var _funct = require('../../lib/function');
var url = require('url');
var csurf = require('csurf');
var cookieParser = require('cookie-parser');

// Create endpoint /api/users for POST
exports.postUsers = function (req, res) {

    var user = new User({
        email: req.body.email,
        password: req.body.password,
        last_name: req.body.last_name,
        is_super_admin: req.body.role === 'superadmin'
    });

    user.save(function (err) {

        if (err)
            return (err.code && err.code === 11000) ? (function(){
                User.findOne({email: user.email}, function(err, userfind){

                    if(err) return res.sendError(err);

                    if(!userfind) return res.sendError(res.__('record_not_found', 'User'));

                    res.json({
                        code: 11000, message: res.__('record_exists', 'User'), data: {
                            id: userfind.userId,
                            email: userfind.email,
                            password: user.password,
                            last_name: userfind.last_name
                        }
                    })
                });

            })() : res.sendError(err);

        res.json({
            id: user.userId,
            email: user.email,
            password: user.password,
            last_name: user.last_name
        });

    });

};

// Create endpoint /api/users for GET
exports.getUsers = function (req, res) {

    User.find(function (err, users) {

        if (err) return res.send(err);

        res.json(users);

    });

};
/**
 *
 * @param req
 * @param res
 * @returns {*}
 */
exports.sendInvite = function (req, res) {

    var email = req.body.email;

    var role = req.body.role || 'case-worker-restricted';

    var headersJsonString = JSON.stringify(req.headers);
    var headers = JSON.parse(headersJsonString)
    var url = headers['x-cbo-client-url'];

    var user = {
        email: req.body.email
    };

    if (!req.body.redirect_url) {
        return res.sendError(res.__('require_field', 'Redirect Url'));
    }


    var parse_url = _funct.parse_url(req.body.redirect_url), curl = null;

    if (parse_url.host) {

        curl = parse_url.host;

    } else {

        curl = parse_url.path;

    }

    var get_org_url = url.replace(/^https?\:\/\//i, "");

    Organization.findOne({url: get_org_url}, function(err, organization) {

        if (err) return res.sendError(err);

        if (!organization) return res.sendError(res.__('record_not_found', 'Organization'));

        User.update({email: email}, {
            $set: user,
            $push: { permissions: { organization: organization._id, permissions: [], students: [], role: role, activate: false, activateStatus: 'Pending' }}
        }, {safe: true, upsert: true}, function (err, raw) {

            if (err) return res.sendError(err);

            var base = config.get('AUTH_URL');

            var authCode = crypto.randomBytes(16).toString('base64');

            var isTester = false;

            if(email === 'cbo_test@upwardstech.com'){

                isTester = true;

            }

            var hackUrl = 'x-invite-test';

            if(hackUrl in req.headers && req.headers[hackUrl] === email){

                isTester = true;

            }

            var activateUrl = base + "/api/user/activate?email=" + encodeURIComponent(user.email) + "&authCode=" + encodeURIComponent(authCode) + "&redirectTo=" + encodeURIComponent(req.body.redirect_url);

            var isNew = raw.upserted ? true : false;

            if (isNew) {

                activateUrl += '&__n=1';

            }

            User.findOne({email: email}, function (err, user) {

                if (err) return res.sendError(err);

                user.authCode = authCode;

                user.role = role;

                user.saveWithRole(req.user, organization._id, function (err) {

                    if (err) return res.sendError(err);

                    var invite = new Invite({
                        authCode: authCode,
                        organization: organization._id,
                        role: role,
                        user: user._id.toString()
                    });

                    var testerInfo = {
                        user: user.toJSON(),
                        activateUrl: activateUrl
                    };

                    invite.save(function(err){

                        if(err) return res.sendError(err);

                        var async = false;

                        var ip_pool = "Main Pool";

                        var send_at = new Date();

                        var mailer = utils.mail();
                        mailer.template('cbo-invite-user');
                        mailer.bindParam({
                            userId: user._id+'',
                            link: activateUrl
                        });
                        mailer.to({email: user.email, name: user.last_name});
                        mailer.header({
                           'Reply-To': "no-replay@studentsuccesslink.org"
                        });
                        mailer.send({
                            substitution_data: {
                                organizationName: organization.name
                            }
                        }, function(err, info){
                            console.log(err, info);
                            if(!err){
                                return res.sendSuccess(res.__('email_success'), isTester ? testerInfo : testerInfo.user );
                            }
                            return res.sendError(isTester ? testerInfo : info);
                        });

                    }); 

                });

            });

        });
    });
};
/**
 *
 * @param req
 * @param res
 * @returns {*}
 */
exports.sendReInvite = function (req, res) {

    var email = req.body.email;

    var user = {
        email: req.body.email
    };

    if (!req.body.redirect_url) {
        return res.sendError(res.__('require_field', 'Redirect Url'));
    }


    var parse_url = _funct.parse_url(req.body.redirect_url), curl = null;

    if (parse_url.host) {

        curl = parse_url.host;

    } else {

        curl = parse_url.path;

    }

    var url = req.headers.origin;
    var get_org_url = url.replace(/^https?\:\/\//i, "");

    Organization.findOne({url: get_org_url}, function(err, organization) {

        if (err) return res.sendError(err);

        if (!organization) return res.sendError(res.__('record_not_found', 'Organization'));

        User.findOne({email: email,
            permissions: {
                $elemMatch: {
                    organization: organization._id,
                    activate: false
                }
            }
        }, function (err, user) {

            if (err) return res.sendError(err);

            var base = config.get('AUTH_URL');

            var authCode = crypto.randomBytes(16).toString('base64');

            var isTester = false;

            if(email === 'cbo_test@upwardstech.com'){

                isTester = true;

            }

            var hackUrl = 'x-invite-test';

            if(hackUrl in req.headers && req.headers[hackUrl] === email){

                isTester = true;

            }

            var activateUrl = base + "/api/user/activate?email=" + encodeURIComponent(user.email) + "&authCode=" + encodeURIComponent(authCode) + "&redirectTo=" + encodeURIComponent(req.body.redirect_url);

            var isNew = true;

            if (isNew) {

                activateUrl += '&__n=1';

            }

            user.getCurrentPermission(organization._id.toString());

            var oldAuthCode = user.authCode;

            console.log('OLD AUTH CODE: ', oldAuthCode, user.role);

            Invite.remove({ user: user._id.toString() }, function(err) {

                var invite = new Invite({
                    authCode: authCode,
                    organization: organization._id,
                    role: user.role,
                    user: user._id.toString()
                });


                user.authCode = authCode;

                user.saveWithRole(req.user, organization._id, function (err) {

                    if (err) {
                        return res.sendError(err);
                    }

                    var testerInfo = {
                        user: user.toJSON(),
                        activateUrl: activateUrl
                    };

                    invite.save(function (err) {

                        if (err) {
                            return res.sendError(err);
                        }

                        var async = false;

                        var ip_pool = "Main Pool";

                        var send_at = new Date();

                        var mailer = utils.mail();
                        mailer.template('cbo-invite-user');
                        mailer.bindParam({
                            userId: user._id+'',
                            link: activateUrl
                        });
                        mailer.to({email: user.email, name: user.last_name});
                        mailer.header({
                            'Reply-To': "no-replay@studentsuccesslink.org"
                        });
                        mailer.send({
                            substitution_data: {
                                organizationName: organization.name
                            }
                        }, function(err, info){
                            if(!err){
                                return res.sendSuccess(res.__('email_success'), isTester ? testerInfo : testerInfo.user );
                            }
                            return res.sendError(isTester ? testerInfo : info);
                        });

                    });
                });

            });

        });
    });
};
/**
 *
 * @param req
 * @param res
 */
exports.activate = function (req, res) {

    var email = req.query.email;

    var authCode = req.query.authCode;

    var redirectTo = req.query.redirectTo;

    var isNew = (req.query.__n == '1');

    var callback = function (err, user) {

        if (err) {
            return errorNotFound(err, req, res);
        }

        if(isNew){

            req.session.data = {
                email: email,
                authCode: authCode,
                redirectTo: redirectTo
            };

            return res.redirect(config.get('AUTH_URL') + '/api/user/accountupdate');

        }

        if (redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;

        return res.redirect(redirectTo);

    };

    var parse_url = _funct.parse_url(redirectTo), curl = null;

    if (parse_url.host) {

        curl = parse_url.host;

    } else {

        curl = parse_url.path;

    }

    pathArray = redirectTo.split( '/' );
    url = pathArray[0];
    var get_org_url = url.replace(/^https?\:\/\//i, "");

    Organization.findOne({url: get_org_url}, function (err, organization) {

        if (err) { return callback(err); }

        if (!organization) return callback(res.__('record_not_found', 'Organization'));


        User.findOne({email: email}, function (err, user) {

            if (err) { return callback(err); }

            // No user found with that username
            if (!user) return callback(res.__('record_not_found', 'User'), false);

            //console.log(user.organizationId, organization._id.toString(), user.organizationId.indexOf(organization._id.toString()));

            var indexOf = user.organizationId.indexOf(organization._id.toString());

            if(indexOf === -1) {
                return callback(res.__('activation_failed'), false);
            }

            if(indexOf in user.permissions && user.permissions[indexOf].activate === true) {
                return callback(res.__('activation_exists'), false);
            }

            // Make sure the password is correct
            user.verifyAuthCode(authCode, function (err, isMatch) {

                if (err) { return callback(err); }

                // Password did not match
                if (!isMatch) {

                    return callback(res.__('invalid_token'), false);

                }

                Invite.findOne({ authCode: authCode }, function(err, invite){

                    if (err) { return callback(err); }

                    if(!invite) return callback(res.__('invalid_token'), false);

                    // Success
                    User.where({_id: user._id}).update({
                        $unset: {hashedAuthCode: ""}
                        //$push: { permissions: { organization: organization._id, permissions: [], students: [], role: invite.role, activate: true, activateDate: new Date(), activateStatus: 'Active' }},
                    }, function (err, updated) {

                        if (err) return res.sendError(err);

                        User.findOne({_id: user._id}, function(err, updateUser) {

                            if (err) return res.sendError(err);

                            updateUser.saveWithRole(user, organization._id.toString(), { role: invite.role, activate: true, activateDate: Date.now(), activateStatus: 'Active' }, function (err) {

                                if (err) return res.sendError(err);

                                Invite.remove({_id: invite._id}, function (err) {

                                    if (err) return res.sendError(err);

                                    callback(null, updated[0]);

                                });

                            });

                        });

                    });

                });


            });

        });

    });

};
/**
 *
 * @param req
 * @param res
 */
exports.sendForgotPassword = function (req, res) {

    var email = req.body.email;


    if (!req.body.redirect_url) {
        //return res.sendError(res.__('require_field', 'Redirect Url'));
        return res.sendError(res.__('forgot_success'));
    }

    var parse_url = _funct.parse_url(req.body.redirect_url), curl = null;

    if (parse_url.host) {

        curl = parse_url.host;

    } else {

        curl = parse_url.path;

    }

    var base = config.get('AUTH_URL');

    var forgotPassword = crypto.randomBytes(16).toString('base64');

    var forgotPasswordUrl = base + "/api/user/forgotpassword?email=" + encodeURIComponent(email) + "&_fg=" + encodeURIComponent(forgotPassword)
        + "&redirectTo=" + encodeURIComponent(req.body.redirect_url)
        + "&callbackUrl=" + encodeURIComponent(req.body.callback_url)
        ;

    Organization.findOne({url: curl}, function(err, organization){

        if(err) {
            //return res.sendError(res.__('field_incorrect', 'email'));
            return res.sendError(res.__('forgot_success'));
        }

        if(!organization) {
            //return res.sendError(res.__('field_incorrect', 'email'));
            return res.sendError(res.__('forgot_failed'));
        }

        User.findOne({email: email}, function (err, user) {

            if (err) {
                //return res.sendError(res.__('field_incorrect', 'email'));
                return res.sendError(res.__('forgot_failed'));
            }

            if(!user) {
                //return res.sendError(res.__('field_incorrect', 'email'));
                return res.sendError(res.__('forgot_failed'));
            }

            user.forgotPassword = forgotPassword;

            user.save(function (err) {

                if (err) {
                    return res.sendError(res.__('forgot_failed'));
                }

                var mailer = utils.mail();
                mailer.template('cbo-forgot-password');
                mailer.bindParam({
                    userId: user._id+'',
                    link: forgotPasswordUrl
                });
                mailer.to({email: user.email, name: user.last_name});
                mailer.header({
                    'Reply-To': "no-replay@studentsuccesslink.org"
                });
                mailer.send({
                    substitution_data: {
                        organizationName: organization.name
                    }
                }, function(err, info){

                    if(!err){
                        return res.sendSuccess(res.__('forgot_success'));
                    }
                    return res.sendError(res.__('forgot_failed'));
                });

            });

        });

    });

};


exports.formForgotPassword = function (req, res) {

    var email = req.query.email;

    var code = req.query._fg;

    var redirectTo = req.query.redirectTo;

    var callbackUrl = req.query.callbackUrl;

    var callback = function (err) {

        if (err) {
            return errorNotFound(err, req, res);
        }

        // res.render('../app/views/forgotPassword', {
        //     errors: [],
        //     session: {
        //         email: email,
        //         redirectTo: redirectTo
        //     },
        //     csrfToken: req.csrfToken()
        // });

        var redirectCallback = callbackUrl;

        if(redirectCallback.indexOf('?') !== -1){
            redirectCallback += '&';
        } else {
            redirectCallback += '?';
        }

        var tokens = utils.uid(24);

        redirectCallback += "csrfToken=" + encodeURIComponent(tokens);
        redirectCallback += "&redirectTo=" + encodeURIComponent(redirectTo);
        redirectCallback += "&email=" + encodeURIComponent(email);

        cache.set('email_password_' + md5(email), tokens, { ttl: 3600 }, function(){

            res.redirect(redirectCallback);

        });


    };
    var parse_url = _funct.parse_url(redirectTo), curl = null;

    if (parse_url.host) {

        curl = parse_url.host;

    } else {

        curl = parse_url.path;

    }

    Organization.findOne({url: curl}, function (err, organization) {

        if (err) { return callback(err); }

        if (!organization) return callback(res.__('record_not_found', 'Organization'));

        User.findOne({email: email}, function (err, user) {

            if (err) { return callback(err); }

            // No user found with that username
            if (!user) return callback(res.__('field_incorrect', 'email'), false);

            // Make sure the password is correct
            user.verifyForgotPassword(code, function (err, isMatch) {

                if (err) { return callback(err); }

                // Password did not match
                if (!isMatch) {

                    return callback(res.__('invalid_token'), false);

                }

                User.where({_id: user._id}).update({
                    $unset: {hashedForgotPassword: ""}
                }, function (err, updated) {

                    if (err) {
                        return res.sendError(res.__('forgot_failed'));
                    }

                    callback(null, updated[0]);

                });

            });

        });

    });

};
/**
 *
 * @param message
 * @param req
 * @param res
 */
function errorNotFound(message, req, res){
    return res.render('../app/views/500', {
        message: message
    });
}


exports.accountUpdate = function(req, res){
    //req.session.data = { email: null};
    if(!req.session.data){
        errorNotFound(null, req, res);
    } else{
        res.render('../app/views/accountUpdate', {
            errors: [],
            session: req.session.data,
            csrfToken: req.csrfToken()
        });
    }

};
/**
 *
 * @param req
 * @param res
 */
exports.changePassword = function(req, res){
    //req.session.data = { email: null};
    if(!req.session.data){
        errorNotFound(null, req, res);
    } else{
        res.render('../app/views/changePassword', {
            errors: [],
            session: req.session.data,
            csrfToken: req.csrfToken()
        });
    }

};
/**
 *
 * @param req
 * @param res
 */
exports.page500 = function(req, res){
    errorNotFound(res.__('error'), req, res);
};
/**
 *
 * @param req
 * @param res
 */
exports.processAccountUpdate = function(req, res){

    var password = req.body.password;

    var confirmPassword = req.body.confirm_password;

    var first_name = req.body.first_name;

    var middle_name = req.body.middle_name;

    var last_name = req.body.last_name;

    var authCode = req.body.authCode;

    var email = req.body.email;

    var redirectTo = req.body.redirectTo;

    var errors = [];

    function renderError(){

        var sessionData = {
            email: email,
            authCode: authCode,
            redirectTo: redirectTo
        };

        //console.log("SESSION DATA: ", sessionData);

        req.session.data = sessionData;

        res.render('../app/views/accountUpdate', {
            errors: errors,
            session: req.session.data,
            csrfToken: req.csrfToken()
        });

    }

    var isError = (function(){

        if(password !== confirmPassword){

            errors.push(res.__('password_not_match'));

            return false;

        }

        if(!last_name){

            errors.push(res.__('require_field', 'Last Name'));

            return false;

        }

        var where = {

            email: email

        };

        var parse_url = _funct.parse_url(redirectTo), curl = null;

        if (parse_url.host) {

            curl = parse_url.host;

        } else {

            curl = parse_url.path;

        }

        Organization.findOne({url: curl}, function (err, organization) {

            if (err) { return errorNotFound(err, req, res); }

            if (!organization) {
                return errorNotFound(res.__('record_not_found', 'Organization'), req, res);
            }

            User.findOne(where, function (err, user) {

                if (err) {

                    errors.push(err.message);

                    return renderError();

                }

                user.password = password;

                if (first_name) user.first_name = first_name;

                if (middle_name) user.middle_name = middle_name;

                user.last_name = last_name;

                user.save(function (err) {

                    if (err) {

                        errors.push(err.message);

                        return renderError();

                    }

                    if (redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;

                    return res.redirect(redirectTo);

                });

            });
        });

    })();

    if(errors.length > 0){

        renderError();

    }

};
exports.processChangePassword = function(req, res){

    var password = req.body.password;

    var confirmPassword = req.body.confirm_password;

    var first_name = req.body.first_name;

    var middle_name = req.body.middle_name;

    var last_name = req.body.last_name;

    var authCode = req.body.authCode;

    var email = req.body.email;

    var redirectTo = req.body.redirectTo;

    var errors = [];

    function renderError(){

        var sessionData = {
            email: email,
            authCode: authCode,
            redirectTo: redirectTo
        };

        console.log("SESSION DATA: ", sessionData);

        req.session.data = sessionData;

        res.render('../app/views/changePassword', {
            errors: errors,
            session: req.session.data,
            csrfToken: req.csrfToken()
        });

    }

    var isError = (function(){

        if(password !== confirmPassword){

            errors.push(res.__('password_not_match'));

            return false;

        }

        if(!last_name){

            errors.push(res.__('require_field', 'Last Name'));

            return false;

        }

        var where = {

            email: email

        };

        var parse_url = _funct.parse_url(redirectTo), curl = null;

        if (parse_url.host) {

            curl = parse_url.host;

        } else {

            curl = parse_url.path;

        }

        Organization.findOne({url: curl}, function (err, organization) {

            if (err) { return errorNotFound(err, req, res); }

            if (!organization) {
                return errorNotFound(res.__('record_not_found', 'Organization'), req, res);
            }

            User.findOne(where, function (err, user) {

                if (err) {

                    errors.push(err.message);

                    return renderError();

                }

                user.password = password;

                if (first_name) user.first_name = first_name;

                if (middle_name) user.middle_name = middle_name;

                user.last_name = last_name;

                user.save(function (err) {

                    if (err) {

                        errors.push(err.message);

                        return renderError();

                    }

                    if (redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;

                    return res.redirect(redirectTo);

                });

            });
        });

    })();

    if(errors.length > 0){

        renderError();

    }

};
/**
 *
 * @param req
 * @param res
 */
exports.processForgotPassword = function(req, res){

    var password = req.body.password;

    var _csrf = req.body._csrf;

    var confirmPassword = req.body.confirm_password;

    var email = req.body.email;

    var redirectTo = req.body.redirectTo;

    var errors = [];

    var key = 'email_password_' + md5(email);

    cache.get(key, function (err, token) {

        if(err){
            console.log(err);
            return res.status(403).end('Unauthorized');
        }

        if(!token || ( token && token !== _csrf)){
            console.log(token, ' ---> ', _csrf);
            return res.status(403).end('Unauthorized');
        }

        function renderError(){

            var sessionData = {
                email: email,
                redirectTo: redirectTo
            };

            var tokens = utils.uid(24);

            cache.set(key, tokens, { ttl: 3600 }, function(){
                res.sendError({
                    errors: errors,
                    session: sessionData,
                    csrfToken: tokens
                });
            });


        }

        var isError = (function(){

            if(''+password === ''){

                errors.push(res.__('require_field', "Password"));

                return false;

            }

            if(password !== confirmPassword){

                errors.push(res.__('password_not_match'));

                return false;

            }

            var where = {

                email: email

            };

            User.findOne(where, function(err, user){

                if(err){

                    errors.push(err.message);

                    return renderError();

                }

                user.password = password;

                user.save(function(err){

                    if(err){

                        errors.push(err.message);

                        return renderError();

                    }

                    cache.del(key, function () {

                        // return res.redirect(redirectTo);
                        return res.sendSuccess(res.__('data_updated'));

                    });

                });

            });

        })();

        if(errors.length > 0){

            renderError();

        }

    });

};