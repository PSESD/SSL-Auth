'use strict';
var Limiter = require('express-rate-limiter');
var MemoryStore = require('express-rate-limiter/lib/memoryStore');
var limiter = new Limiter({ db : new MemoryStore() });
/**
 *
 * @param router
 * @param Api
 * @constructor
 */
function Rest(router, Api) {
    var self = this;
    self.handleRoutes(router, Api);
}
/**
 * Handle Route from Request
 * @param router
 * @param Api
 */
Rest.prototype.handleRoutes = function (router, Api) {

    var indexController = Api.controller('Index');

    var userController = Api.controller('User');

    var authController = Api.controller('Auth');

    var oauth2Controller = Api.controller('OAuth2');

    var clientController = Api.controller('Client');

    var ratelimiter = limiter.middleware();

    router.get('/', ratelimiter, indexController.index);

    // Create endpoint handlers for /users
    router.route('/users')
        .post(ratelimiter, userController.postUsers)
        .get(ratelimiter, authController.isAuthenticated, userController.getUsers);

    router.route('/user/invite')
        .post(ratelimiter, authController.isBearerAuthenticated, authController.hasAccess, authController.isAdmin, userController.sendInvite);

    router.route('/user/send/forgotpassword')
        .post(ratelimiter, userController.sendForgotPassword);

    router.get('/user/changepassword', ratelimiter, Api.csrfProtection, userController.changePassword);

    router.post('/user/changepassword', ratelimiter, Api.parseForm, Api.csrfProtection, userController.processChangePassword);

    router.get('/user/forgotpassword', ratelimiter, Api.csrfProtection, userController.formForgotPassword);

    router.post('/user/forgotpassword', ratelimiter, Api.parseForm, Api.csrfProtection, userController.processForgotPassword);

    // Create endpoint handlers for /clients
    router.route('/clients')
        .post(ratelimiter, authController.isAuthenticated, clientController.postClients)
        .get(ratelimiter, authController.isAuthenticated, clientController.getClients);

    // Create endpoint handlers for oauth2 authorize
    router.route('/oauth2/authorize')
        .get(ratelimiter, authController.isAuthenticated, oauth2Controller.authorization)
        .post(ratelimiter, authController.isAuthenticated, oauth2Controller.decision);

    // Create endpoint handlers for oauth2 token
    router.route('/oauth2/token')
        .post(ratelimiter, authController.isClientAuthenticated, oauth2Controller.token);

    router.post('/logout', ratelimiter, authController.logout);
    router.get('/user/activate', ratelimiter, userController.activate);

};
/**
 *
 * @type {Rest}
 */
module.exports = Rest;