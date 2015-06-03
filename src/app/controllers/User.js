// Load required packages
var User = require('../models/User');
var mandrill = require('node-mandrill')('LtGcuu3JRPmav8Itt85rfQ');
var crypto = require('crypto');
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

exports.sendInvite = function(req, res){
  var email = req.body.email;
  var name = req.body.name;
  var user = new User({
    email: req.body.email,
    password: req.body.password,
    last_name: req.body.last_name,
    code: crypto.randomBytes(16).toString('base64')
  });

  user.save(function(err) {

    if (err)
      return (err.code && err.code === 11000) ? res.send({ code: err.code, message: 'User already exists', data: {
        id: user.userId,
        email: user.email,
        password: user.password,
        last_name: user.last_name
      } }) :  res.send(err);

    mandrill('/messages/send', {
      message: {
        to: [{email: user.email, name: user.last_name}],
        from: 'hendra@upwardstech.com',
        subject: "Hey, what's up?",
        text: "Hallo http://auth.cbo.upward.st/activate?email="+user.email+"&authCode="+user.authCode+"&redirectTo="+req.body.redirect_url
      }
    }, function(error, response)
    {
      //uh oh, there was an error
      if (error) res.send( JSON.stringify(error) );

      //everything's good, lets see what mandrill said
      else res.send(response);
    });
  });

};

exports.activate = function(req, res){
  var email = req.query.email;
  var authCode = req.query.authCode;
  var redirectTo = req.query.redirectTo;
  var callback = function(err, user){
    if(err){
      return res.json(err);
    }
    res.redirect(redirectTo);
  };

  User.findOne({ email: email }, function (err, user) {
    if (err) { return callback(err); }

    // No user found with that username
    if (!user) { return callback(null, false); }

    // Make sure the password is correct
    user.verifyAuthCode(authCode, function(err, isMatch) {
      if (err) { return callback(err); }

      // Password did not match
      if (!isMatch) { return callback(null, false); }

      // Success
      return callback(null, user);
    });
  });
};