// Load required packages
var Client = require('../models/Client');
var secretHash = require('../../lib/utils').secretHash;
/**
 *
 * @param err
 * @param res
 */
function errorClient(err, res) {

    return (err.code && err.code === 11000) ? res.send({
        code: err.code,
        message: res.__('record_exists', 'Client')
    }) : res.send(err);

}
// Create endpoint /api/client for POST
exports.postClients = function (req, res) {

    // Create a new instance of the Client model
    var client = new Client();

    // Set the client properties that came from the POST data
    client.name = req.body.name;

    client.id = req.body.client_id;

    client.userId = req.user._id;

    client.redirectUri = req.body.redirect_uri;

    // Save the client and check for errors
    client.save(function (err) {

        if (err) {

            return errorClient(err, res);

        }

        var set = { secret: secretHash('' + client._id) };

        Client.findByIdAndUpdate(client._id, { $set: set }, function (err, newClient) {

            if (err) {

                return errorClient(err, res);

            }

            res.json({
                userId: newClient.userId,
                client_id: newClient.id,
                client_secret: set.secret,
                name: newClient.name,
                redirect_uri: newClient.redirectUri
            });

        });

    });

};

// Create endpoint /api/clients for GET
exports.getClients = function (req, res) {

    // Use the Client model to find all clients
    Client.find({userId: req.user._id}, function (err, clients) {

        if (err) {

            return res.send(err);

        }

        var response = [];

        clients.forEach(function(client){

            response.push({
                userId: client.userId,
                client_id: client.id,
                client_secret: client.secret,
                name: client.name,
                redirect_uri: client.redirectUri
            });

        });

        res.json(response);

    });

};