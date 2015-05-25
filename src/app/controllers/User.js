// Load required packages
var User = require('../models/User');

// Create endpoint /api/users for POST
exports.postUsers = function(req, res) {
  var user = new User({
    username: req.body.username,
    password: req.body.password
  });

  user.save(function(err) {
    if (err)
      return (err.code && err.code === 11000) ? res.send({ code: err.code, message: 'User already exists'}) :  res.send(err);

    res.json({ code: 0, message: 'New users added!' });
  });
};

// Create endpoint /api/users for GET
exports.getUsers = function(req, res) {
  User.find(function(err, users) {
    if (err)
      return res.send(err);

    res.json(users);
  });
};