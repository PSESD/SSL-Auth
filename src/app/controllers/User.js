// Load required packages
var User = require('../models/User');

// Create endpoint /api/users for POST
exports.postUsers = function(req, res) {
  var user = new User({
    email: req.body.email,
    password: req.body.password,
    last_name: req.body.last_name
  });

  user.save(function(err) {
    
    if (err)
      return (err.code && err.code === 11000) ? res.send({ code: err.code, message: 'User already exists', data: {
      id: user.userId,
      email: user.email,
      password: user.password,
      last_name: user.last_name
    } }) :  res.send(err);
    
    res.json({
      id: user.userId,
      email: user.email,
      password: user.password,
      last_name: user.last_name
    });
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