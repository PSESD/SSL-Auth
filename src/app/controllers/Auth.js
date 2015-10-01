// Load required packages
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var User = require('../models/User');
var Client = require('../models/Client');
var Access = require('../access/access');
var Token = require('../models/Token');
var Code = require('../models/Code');
var RefreshToken = require('../models/RefreshToken');
var tokenHash = require('../../lib/utils').tokenHash;

passport.use(new BasicStrategy(
    
  function(username, password, callback) {

    User.findOne({ email: username }, function (err, user) {

      if (err) return callback(err);

      // No user found with that username
      if (!user) return callback(null, false);

      // Make sure the password is correct
      user.verifyPassword(password, function(err, isMatch) {

        if (err) return callback(err);

        // Password did not match
        if (!isMatch) return callback(null, false);

        // Success
        return callback(null, user);

      });

    });

  }

));


passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(username, password, callback) {

    User.findOne({ email: username }, function (err, user) {

      if (err) return callback(err);

      // No user found with that username
      if (!user) return callback(null, false);

      // Make sure the password is correct
      user.verifyPassword(password, function(err, isMatch) {

        if (err) return callback(err);

        // Password did not match
        if (!isMatch) return callback(null, false);

        // Success
        return callback(null, user);

      });

    });

  }

));

passport.use(new ClientPasswordStrategy(

    function(clientId, clientSecret, done) {

      Client.findOne({ id: clientId }, function(err, client) {

        if (err) return done(err);

        if (!client) return done(null, false);

        if (client.secret != clientSecret) return done(null, false);

        return done(null, client);

      });

    }

));

passport.use('client-basic', new BasicStrategy(
    
  function(username, password, callback) {
    
    Client.findOne({ id: username }, function (err, client) {
    
      if (err) return callback(err);

      // No client found with that id or bad password
      if (!client || client.secret !== password) return callback(null, false);

      // Success
      return callback(null, client);

    });

  }

));

passport.use(new BearerStrategy(

  function(accessToken, callback) {

    var accessTokenHash = tokenHash(accessToken);

    Token.findOne({ token: accessTokenHash }, function (err, token) {

      if (err) return callback(err);

      // No token found
      if (!token) return callback(null, false);

      //check for expired token
      if (new Date() > token.expired) {

        token.remove(function (err) {

          if (err) return callback(err);

          callback(null, false, { message: 'Token expired' });

        });

      } else {

        User.findOne({ _id: token.userId }, function (err, user) {

          if (err) return callback(err);

          // No user found
          if (!user) return callback(null, false);

          // Simple example with no scope
          callback(null, user, { scope: '*' });

        });

      }

    });

  }

));

/**
 * Logout
 * @param req
 * @param res
 */
exports.logout = function (req, res) {
  /**
   * Remove token, refresh_token and auth code
   */
  var accessToken = req.query.token || req.body.token;
  var refreshToken = req.query.refresh_token || req.body.refresh_token;

  if(accessToken){

    var accessTokenHash = tokenHash(accessToken);

    Token.findOne({ token: accessTokenHash }, function(err, token){

      if(err) return req.logout();

      if(token){

        var crit = { clientId: token.clientId, userId: token.userId };

        Code.remove(crit, function(err){

          token.remove(function(err){

            if(refreshToken){

              RefreshToken.remove({ refreshToken: tokenHash(refreshToken) }, function(err){

                req.logout();

              });

            } else {

              req.logout();

            }

          });

        });

      }

    });

  } else {

    req.logout();

  }

  res.redirect('/');

};

exports.isAuthenticated = passport.authenticate(['basic', 'bearer'], { session : false });

exports.isClientAuthenticated = passport.authenticate('client-basic', { session : false });

exports.hasAccess = Access.hasAccess;

exports.isAdmin = Access.isAdmin;

exports.isBearerAuthenticated = passport.authenticate('bearer', { session: false });