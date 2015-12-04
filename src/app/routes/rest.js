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

    this.router = router;

    this.Api = Api;
    
    this.indexController = this.Api.controller('Index');

    this.userController = this.Api.controller('User');

    this.authController = this.Api.controller('Auth');

    this.oauth2Controller = this.Api.controller('OAuth2');

    this.clientController = this.Api.controller('Client');

    this.handleRoutes();
}
/**
 * Handle Route from Request
 */
Rest.prototype.handleRoutes = function () {

    var ratelimiter = limiter.middleware(this.Api.config.ratelimiter);

    this.router.get('/', this.indexController.index);

    // Create endpoint handlers for /users
    this.router.route('/users')
        .post(this.userController.postUsers)
        .get(this.authController.isAuthenticated, this.userController.getUsers);

    this.router.route('/user/invite')
        .post(this.authController.isBearerAuthenticated, this.authController.hasAccess, this.authController.isAdmin, this.userController.sendInvite);

    this.router.route('/user/send/forgotpassword')
        .post(this.userController.sendForgotPassword);

    this.router.get('/user/changepassword', this.Api.csrfProtection, this.userController.changePassword);

    this.router.post('/user/changepassword', this.Api.parseForm, this.Api.csrfProtection, this.userController.processChangePassword);

    this.router.get('/user/forgotpassword', this.Api.csrfProtection, this.userController.formForgotPassword);

    this.router.post('/user/forgotpassword', this.Api.parseForm, this.Api.csrfProtection, this.userController.processForgotPassword);

    // Create endpoint handlers for /clients
    this.router.route('/clients')
        .post(this.authController.isAuthenticated, this.clientController.postClients)
        .get(this.authController.isAuthenticated, this.clientController.getClients);

    // Create endpoint handlers for oauth2 authorize
    this.router.route('/oauth2/authorize')
        .get(this.authController.isAuthenticated, this.oauth2Controller.authorization)
        .post(this.authController.isAuthenticated, this.oauth2Controller.decision);

    // Create endpoint handlers for oauth2 token
    this.router.route('/oauth2/token')
        .post(ratelimiter, this.authController.isClientAuthenticated, this.oauth2Controller.token);

    this.router.post('/logout', this.authController.logout);
    this.router.get('/user/activate', this.userController.activate);

};
/**
 *
 * @type {Rest}
 */
module.exports = Rest;