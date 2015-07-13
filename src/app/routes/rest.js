

function Rest(router, Api) {
    var self = this;
    self.handleRoutes(router, Api);
}
/**
 * Handle Route from Request
 * @param router
 * @param Api
 */
Rest.prototype.handleRoutes= function(router, Api) {

	var indexController = Api.controller('Index');

	var userController = Api.controller('User');

	var authController = Api.controller('Auth');

	var oauth2Controller = Api.controller('OAuth2');

	var clientController = Api.controller('Client');

	router.get('/', indexController.index);

	// Create endpoint handlers for /users
	router.route('/users')
	  .post(userController.postUsers)
	  .get(authController.isAuthenticated, userController.getUsers);

	router.route('/user/invite')
		.post(userController.sendInvite);

	router.route('/user/send/forgotpassword')
		.post(userController.sendForgotPassword);

	router.get('/user/changepassword', Api.csrfProtection, userController.changePassword);

	router.post('/user/changepassword', Api.parseForm, Api.csrfProtection, userController.processChangePassword);

	router.get('/user/forgotpassword', Api.csrfProtection, userController.formForgotPassword);

	router.post('/user/forgotpassword', Api.parseForm, Api.csrfProtection, userController.processForgotPassword);

	// Create endpoint handlers for /clients
	router.route('/clients')
	  .post(authController.isAuthenticated, clientController.postClients)
	  .get(authController.isAuthenticated, clientController.getClients);

	// Create endpoint handlers for oauth2 authorize
	router.route('/oauth2/authorize')
	  .get(authController.isAuthenticated, oauth2Controller.authorization)
	  .post(authController.isAuthenticated, oauth2Controller.decision);

	// Create endpoint handlers for oauth2 token
	router.route('/oauth2/token')
	  .post(authController.isClientAuthenticated, oauth2Controller.token);

	router.post('/logout', authController.logout);
	router.get('/user/activate', userController.activate);

};
/**
 *
 * @type {Rest}
 */
module.exports = Rest;