

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
};

module.exports = Rest;