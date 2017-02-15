'use strict';
// Load required packages
var oauth2orize = require('oauth2orize');
var moment = require('moment');
var User = require('../models/User');
var Client = require('../models/Client');
var Token = require('../models/Token');
var Code = require('../models/Code');
var Organization = require('../models/Organization');
var RefreshToken = require('../models/RefreshToken');
var uid = require('../../lib/utils').uid;
var tokenHash = require('../../lib/utils').tokenHash;
var codeHash = require('../../lib/utils').codeHash;
var calculateExp = require('../../lib/utils').calculateExp;
var expiresIn = require('config').get('token.expires_in');
var exchangePassword = require('../../lib/oauth2/exchange/password');

// Create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient(function (client, callback) {

    return callback(null, client._id);

});

server.deserializeClient(function (id, callback) {

    Client.findOne({_id: id}, function (err, client) {

        if (err) { return callback(err); }

        return callback(null, client);

    });

});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code(function (client, redirectUri, user, ares, callback) {

    // Create a new authorization code
    Client.findOne({_id: client._id.toString()}, function(err, cln){

        if (err) { return callback(err); }

        if(!cln) return callback('Url not match!');

        if((''+cln.redirectUri) === redirectUri){
            console.log('URL MATCH');
        } else{

            try{

                var uri = require('url');

                var parser = uri.parse(redirectUri);

                var uriRegex = ('' + cln.redirectUri);

                var regex = new RegExp(uriRegex, 'i');

                //console.log(regex, redirectUri, parser.host, parser.host.match(regex));
                if(!parser.host.match(regex)) return callback('Url not match!');

            } catch(e){

                console.log(e);

                return callback('Url not match!');

            }
        }

        var code = new Code({
            code: codeHash(uid(16)),
            clientId: client._id,
            redirectUri: redirectUri,
            userId: user._id
        });

        // Save the auth code and check for errors
        code.save(function (err) {

            if (err) { return callback(err); }

            callback(null, code.code);

        });

    });

}));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code(function (client, code, redirectUri, callback) {


    Code.findOne({code: code}, function (err, authCode) {

        if (err) { return callback(err); }

        if (authCode === undefined || authCode === null) {
            return callback(null, false);
        }

        if (client._id.toString() !== authCode.clientId) {
            return callback(null, false);
        }

        if (redirectUri !== authCode.redirectUri) {
            console.log(redirectUri, JSON.stringify(authCode));
            return callback(null, false);
        }

        // Delete auth code now that it has been used
        authCode.remove(function (err) {

            if (err) { return callback(err); }

            var token = uid(256);

            var refreshToken = uid(256);

            var refreshTokenHash = tokenHash(refreshToken);

            var expired = calculateExp(true);

            // Create a new access token
            var tokenModel = new Token({
                token: tokenHash(token),
                ip: '*',
                clientId: authCode.clientId,
                userId: authCode.userId,
                expired: expired
            });

            //Refresh Token Code
            var refreshTokenModel = new RefreshToken({
                refreshToken: refreshTokenHash,
                clientId: authCode.clientId,
                userId: authCode.userId
            });

            // Save the access token and check for errors
            tokenModel.save(function (err) {

                if (err) { return callback(err); }

                refreshTokenModel.save(function (err) {
                    if (err) { return callback(err); }
                    callback(null, token, refreshToken, {expires_in: expiresIn});
                });

            });

        });

    });

}));
/**
 * Exchange user id and password for access tokens.
 *
 * The callback accepts the `client`, which is exchanging the user's name and password
 * from the token request for verification. If these values are validated, the
 * application issues an access token on behalf of the user who authorized the code.
 */
//server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, callback) {
server.exchange(exchangePassword(function (client, username, password, scope, params, callback) {
    var errorLogin = 'Wrong email or password';

    /**
     *
     * @param params
     * @param expiresIn
     * @param token
     * @param refreshToken
     * @param currentUser
     * @param organization
     */
    function loginEmbeded(params, expiresIn, token, refreshToken, currentUser, organization){

        var organization_id = organization._id;
        var status = '';
        var role = '';
        if(currentUser.permissions.length > 0) {
            currentUser.permissions.forEach(function(list_org) {
                var compare_organization_id = list_org.organization;
                if(compare_organization_id.equals(organization_id) && list_org.activate === true)
                {
                    status = list_org.activate;
                    role = list_org.role;
                }
            });
        }

        var embeded = {
            expires_in: expiresIn,
            embeded: {
                organization: {
                    id: organization_id,
                    name: organization.name
                },
                users: {
                    id: currentUser._id,
                    email: currentUser.email,
                    first_name: currentUser.first_name,
                    middle_name: currentUser.middle_name,
                    last_name: currentUser.last_name,
                    status: status,
                    role: role
                }
            }
        };

        callback(null, token, refreshToken, embeded);

        // var criteria = { permissions: { $elemmatch: { organization: organization._id, activate: true }}};
        //
        // User.find(criteria, function (err, users) {
        //
        //     if (err)  {
        //         return callback(null, token, refreshToken, embeded);
        //     }
        //
        //     users.forEach(function(user){
        //
        //         // var permission = user.getCurrentPermission(organization._id.toString());
        //
        //         var obj = user.toJSON();
        //
        //         if(obj.userId.toString() !== currentUser.userId.toString()){
        //
        //             delete obj.permissions;
        //
        //         }
        //         else {
        //
        //             obj.permissions.forEach(function(permission) {
        //
        //                 delete permission.students;
        //
        //             });
        //
        //         }
        //
        //         embeded.embeded.users.data.push(obj);
        //         embeded.embeded.users.total++;
        //
        //     });
        //
        //     callback(null, token, refreshToken, embeded);
        //
        // });

    }

    Organization.findOne({ url: params.organizationUrl }, function(err, organization) {

        if (err) {
            return callback(errorLogin);
        }

        // No user found with that username
        if (!organization) {
            return callback(errorLogin, false);
        }

        //Validate the user
        User.findOne({email: username}, function (err, user) {
            if (err) {
                return callback(errorLogin);
            }

            // No user found with that username
            if (!user) {
                return callback(errorLogin, false);
            }

            // Make sure the password is correct
            user.verifyPassword(password, function (err, isMatch) {
                if (err) {
                    return callback(errorLogin);
                }

                // Password did not match
                if (!isMatch) {
                    return callback(errorLogin, false);
                }

                var permission = user.getCurrentPermission(organization._id.toString());

                if (!permission.role || !permission.activate) {
                    return callback(errorLogin, false);
                }

                var token = uid(256);

                var expired = calculateExp();

                // Create a new access token
                var tokenModel = new Token({
                    token: tokenHash(token),
                    ip: params.clientIp,
                    clientId: client.id,
                    userId: user.userId,
                    scope: scope,
                    expired: expired
                });
                // Save the access token and check for errors
                tokenModel.save(function (err) {

                    if (err) {
                        return callback(err);
                    }

                    var refreshToken = uid(256);

                    var refreshTokenHash = tokenHash(refreshToken);

                    //Refresh Token Code
                    var refreshTokenModel = new RefreshToken({
                        refreshToken: refreshTokenHash,
                        clientId: client.id,
                        userId: user.userId
                    });

                    if (scope && scope.indexOf("offline_access") === 0) {

                        refreshTokenModel.save(function (err) {

                            if (err) {
                                return callback(err);
                            }

                            // callback(null, token, refreshToken, {expires_in: expiresIn});
                            loginEmbeded(params, expired, token, refreshToken, user, organization);

                        });

                    } else {
                        refreshToken = null;

                        // callback(null, token, refreshToken, {expires_in: expiresIn});
                        loginEmbeded(params, expired, token, refreshToken, user, organization);
                    }

                });

            });

        });

    });

}));

/**
 * Exchange the client id and password/secret for an access token.
 *
 * The callback accepts the `client`, which is exchanging the client's id and
 * password/secret from the token request for verification. If these values are validated, the
 * application issues an access token on behalf of the client who authorized the code.
 */
server.exchange(oauth2orize.exchange.clientCredentials(function (client, scope, callback) {

    var token = uid(256);

    var expired = new Date(moment().add(100, 'years').valueOf()); // set 100th from now

    var tokenModel = new Token({
        token: tokenHash(token),
        clientId: client.id,
        ip: '*',
        userId: client.userId,
        scope: scope,
        expired: expired
    });

    //Pass in a null for user id since there is no user when using this grant type
    tokenModel.save(function (err) {

        if (err) { return callback(err); }

        callback(null, token, null, {});

    });

}));
/**
 * Exchange the refresh token for an access token.
 *
 * The callback accepts the `client`, which is exchanging the client's id from the token
 * request for verification.  If this value is validated, the application issues an access
 * token on behalf of the client who authorized the code
 */
server.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, callback) {

    var refreshTokenHash = tokenHash(refreshToken);

    RefreshToken.findOne({refreshToken: refreshTokenHash}, function (err, token) {

        if (err) { return callback(err); }

        if (!token) return callback(null, false);

        if (''+client.id !== ''+token.clientId) return callback(null, false);

        var newAccessToken = uid(256);

        var accessTokenHash = tokenHash(newAccessToken);

        var expired = calculateExp();

        Token.update({userId: token.userId}, {
            $set: {
                token: accessTokenHash,
                scope: scope,
                expired: expired
            }
        }, function (err) {

            if (err) { return callback(err); }

            callback(null, newAccessToken, refreshToken, {expires_in: expiresIn});

        });

    });

}));
// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary accross
// implementations.  Once validated, the `callback` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

exports.authorization = [

    server.authorization(function (clientId, redirectUri, callback) {

        Client.findOne({id: clientId}, function (err, client) {

            if (err) { return callback(err); }

            return callback(null, client, redirectUri);

        });

    }),

    function(err, req, res, next){
        if(err){
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.sendError(err);
            } else {
                return res.render('../app/views/500', {
                    message: err.message
                });
            }

        }
        next();
    },

    function (req, res) {

        res.render('../app/views/dialog', {
            transactionID: req.oauth2.transactionID,
            user: req.user,
            client: req.oauth2.client
        });

    }

];

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

module.exports.decision = [

    server.decision()

];

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [

    server.token(),

    server.errorHandler({ mode: 'indirect' }),

    function(err, req, res, next){
        if(err){
            return res.sendError(err);
        }
        next();
    }

];
