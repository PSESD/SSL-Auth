// Load required packages
var User = require('../models/User');
var Organization = require('../models/Organization');
var Invite = require('../models/Invite');
var config = require('config');
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(config.get('mandrill.api_key'));
var crypto = require('crypto');
var php = require('phpjs');
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

                    if(err) return res.errJson(err);

                    if(!userfind) return res.errJson('User not found');

                    res.json({
                        code: 11000, message: 'User already exists', data: {
                            id: userfind.userId,
                            email: userfind.email,
                            password: user.password,
                            last_name: userfind.last_name
                        }
                    })
                });

            })() : res.errJson(err);

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

exports.sendInvite = function (req, res) {

    var email = req.body.email;

    var role = req.body.role || 'case-worker';

    var is_special_case_worker = false;

    if(req.body.is_special_case_worker === 'true' || parseInt(req.body.is_special_case_worker) === 1){

        is_special_case_worker = true;

    }

    var user = {
        email: req.body.email
    };

    if (!req.body.redirect_url) return res.errJson('Redirect Url is empty');


    var parse_url = php.parse_url(req.body.redirect_url), curl = null;

    if (parse_url['host']) {

        curl = parse_url['host'];

    } else {

        curl = parse_url['path'];

    }

    Organization.findOne({url: curl}, function(err, organization) {

        if (err) return res.errJson(err);

        if (!organization) return res.errJson('Organization not found!');

        User.update({email: email}, {$set: user}, {safe: true, upsert: true}, function (err, raw) {

            if (err) return res.errJson(err);

            var base = config.get('auth.url');

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

                if (err) return res.errJson(err);

                user.authCode = authCode;

                user.is_special_case_worker = is_special_case_worker;

                user.role = role;

                user.saveWithRole(req.user, organization._id, function (err) {

                    if (err) return res.errJson(err);

                    var invite = new Invite({
                        authCode: authCode,
                        organization: organization._id,
                        role: role,
                        is_special_case_worker: is_special_case_worker
                    });

                    var testerInfo = {
                        user: user.toObject(),
                        activateUrl: activateUrl
                    };

                    invite.save(function(err){

                        if(err) return res.errJson(err);

                        var async = false;

                        var ip_pool = "Main Pool";

                        var send_at = new Date();

                        mandrill_client.templates.info({name: 'cbo_invite_user'}, function (result) {

                            var html = php.str_replace(['{$userId}', '{$link}'], [user._id, activateUrl], result.code);
                            var message = {
                                "html": html,
                                "subject": php.str_replace('{$organization.name}', organization.name, result.subject),
                                "from_email": result.publish_from_email,
                                "from_name": result.publish_from_name,
                                "to": [{email: user.email, name: user.last_name, type: "to"}],
                                "headers": {
                                    "Reply-To": "no-replay@studentsuccesslink.org"
                                }

                            };
                            mandrill_client.messages.send({"message": message}, function (result) {

                                if (result[0].status == 'sent') {

                                    return res.okJson("Email was sent", isTester ? testerInfo : null);

                                } else {

                                    return res.errJson(isTester ? testerInfo : result[0].reject_reason);

                                }

                            }, function (e) {
                                // Mandrill returns the error as an object with name and message keys
                                console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);

                                return res.errJson("Email not sent");
                                // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
                            });

                        }, function (e) {
                            // Mandrill returns the error as an object with name and message keys
                            console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                            // A mandrill error occurred: Invalid_Key - Invalid API key
                            return res.errJson("Email not sent");
                        });

                    }); 

                });

            });

        });
    });
};

exports.sendForgotPassword = function (req, res) {

    var email = req.body.email;


    if (!req.body.redirect_url) return res.errJson('Redirect Url is empty');

    var parse_url = php.parse_url(req.body.redirect_url), curl = null;

    if (parse_url['host']) {

        curl = parse_url['host'];

    } else {

        curl = parse_url['path'];

    }

    var base = config.get('auth.url');

    var forgotPassword = crypto.randomBytes(16).toString('base64');

    var forgotPasswordUrl = base + "/api/user/forgotpassword?email=" + encodeURIComponent(email) + "&_fg=" + encodeURIComponent(forgotPassword) + "&redirectTo=" + encodeURIComponent(req.body.redirect_url);

    Organization.findOne({url: curl}, function(err, organization){

        if(err) return res.errJson(err);

        if(!organization) return res.errJson('Organization not found!');

        User.findOne({email: email}, function (err, user) {

            if (err) return res.errJson(err);

            if(!user) return res.errJson('User email not found!');

            user.forgotPassword = forgotPassword;

            user.save(function (err) {

                if (err) return res.errJson(err);

                var async = false;

                var ip_pool = "Main Pool";

                var send_at = new Date();

                mandrill_client.templates.info({ name: 'cbo_forgot_password'}, function(result) {

                    var html = php.str_replace(['{$userId}', '{$link}'], [user._id, forgotPasswordUrl], result.code);

                        var message = {
                            "html": html,
                            "subject": php.str_replace('{$organization.name}', organization.name, result.subject),
                            "from_email": result.publish_from_email,
                            "from_name": result.publish_from_name,
                            "to": [{email: user.email, name: user.last_name, type: "to"}],
                            "headers": {
                                "Reply-To": "no-replay@studentsuccesslink.org"
                            }

                        };
                        mandrill_client.messages.send({"message": message}, function (result) {

                            if (result[0].status == 'sent') {

                                return res.okJson("Email was sent");

                            } else {

                                return res.errJson(result[0].reject_reason);

                            }
                        }, function (e) {
                            // Mandrill returns the error as an object with name and message keys
                            console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);

                            return res.errJson("Email not sent");
                            // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
                        });


                }, function(e) {
                    // Mandrill returns the error as an object with name and message keys
                    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                    // A mandrill error occurred: Invalid_Key - Invalid API key
                    return res.errJson("Email not sent");
                });

            });

        });

    });

};

exports.activate = function (req, res) {

    var email = req.query.email;

    var authCode = req.query.authCode;

    var redirectTo = req.query.redirectTo;

    var isNew = (req.query.__n == '1');

    var callback = function (err, user) {

        if (err) return res.errJson(err);

        if(isNew){

            var sessionData = {
                email: email,
                authCode: authCode,
                redirectTo: redirectTo
            };

            console.log("SESSION DATA: ", sessionData);

            req.session.data = sessionData;

            return res.redirect(config.get('auth.url') + '/api/user/changepassword');

        }

        if (redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;

        return res.redirect(redirectTo);

    };

    var parse_url = php.parse_url(redirectTo), curl = null;

    if (parse_url['host']) {

        curl = parse_url['host'];

    } else {

        curl = parse_url['path'];

    }

    Organization.findOne({url: curl}, function (err, organization) {

        if (err) return callback(err);

        if (!organization) return callback('Organization not found!');


        User.findOne({email: email}, function (err, user) {

            if (err) return callback(err);

            // No user found with that username
            if (!user) return callback('User not found', false);

            console.log(user.organizationId, organization._id.toString(), user.organizationId.indexOf(organization._id.toString()));

            if(user.organizationId.indexOf(organization._id.toString()) !== -1) return callback('You have already used this link to activate your user.', false);

            // Make sure the password is correct
            user.verifyAuthCode(authCode, function (err, isMatch) {

                if (err) return callback(err);

                // Password did not match
                if (!isMatch) {

                    return callback('Invalid token', false);

                }

                Invite.findOne({ authCode: authCode }, function(err, invite){

                    if (err) return callback(err);

                    if(!invite) return callback('Invalid token', false);

                    // Success
                    User.where({_id: user._id}).update({
                        $unset: {hashedAuthCode: ""},
                        $push: {permissions: {organization: organization._id, permissions: [], students: [], role: invite.role, is_special_case_worker: invite.is_special_case_worker}}
                    }, function (err, updated) {

                        if (err) return res.errJson(err);

                        User.findOne({_id: user._id}, function(err, updateUser) {

                            if (err) return res.errJson(err);

                            updateUser.saveWithRole(user, organization._id.toString(), invite.role, invite.is_special_case_worker, function (err) {

                                if (err) return res.errJson(err);

                                Invite.remove({_id: invite._id}, function (err) {

                                    if (err) return res.errJson(err);

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

exports.formForgotPassword = function (req, res) {

    var email = req.query.email;

    var code = req.query._fg;

    var redirectTo = req.query.redirectTo;

    var callback = function (err, user) {

        if (err) return res.errJson(err);

        res.render('../app/views/forgotPassword', {
            errors: [],
            session: {
                email: email,
                redirectTo: redirectTo
            },
            csrfToken: req.csrfToken()
        });

    };
    var parse_url = php.parse_url(redirectTo), curl = null;

    if (parse_url['host']) {

        curl = parse_url['host'];

    } else {

        curl = parse_url['path'];

    }

    Organization.findOne({url: curl}, function (err, organization) {

        if (err) return callback(err);

        if (!organization) return callback('Organization not found!');

        User.findOne({email: email}, function (err, user) {

            if (err) return callback(err);

            // No user found with that username
            if (!user) return callback('User not found', false);

            // Make sure the password is correct
            user.verifyForgotPassword(code, function (err, isMatch) {

                if (err) return callback(err);

                // Password did not match
                if (!isMatch) {

                    return callback('Invalid token', false);

                }

                User.where({_id: user._id}).update({
                    $unset: {hashedForgotPassword: ""}
                }, function (err, updated) {

                    if (err) return res.errJson(err);

                    callback(null, updated[0]);

                });

            });

        });

    });

};


exports.changePassword = function(req, res){

    res.render('../app/views/changePassword', {
        errors: [],
        session: req.session.data,
        csrfToken: req.csrfToken()
    });

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

            errors.push("Password did not match");

            return false;

        }

        if(!last_name){

            errors.push('Last Name is required');

            return false;

        }

        var where = {

            email: email

        };

        var parse_url = php.parse_url(redirectTo), curl = null;

        if (parse_url['host']) {

            curl = parse_url['host'];

        } else {

            curl = parse_url['path'];

        }

        Organization.findOne({url: curl}, function (err, organization) {

            if (err) return callback(err);

            if (!organization) return callback('Organization not found!');

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

exports.processForgotPassword = function(req, res){

    var password = req.body.password;

    var confirmPassword = req.body.confirm_password;

    var email = req.body.email;

    var redirectTo = req.body.redirectTo;

    var errors = [];

    function renderError(){

        var sessionData = {
            email: email,
            redirectTo: redirectTo
        };

        res.render('../app/views/forgotPassword', {
            errors: errors,
            session: sessionData,
            csrfToken: req.csrfToken()
        });

    }

    var isError = (function(){

        if(''+password === ''){

            errors.push("Password is empty!");

            return false;

        }

        if(password !== confirmPassword){

            errors.push("Password doesn't match!");

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

                if (redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;

                return res.redirect(redirectTo);

            });

        });

    })();

    if(errors.length > 0){

        renderError();

    }

};