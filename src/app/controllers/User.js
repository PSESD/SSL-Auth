// Load required packages
var User = require('../models/User');
var Organization = require('../models/Organization');
var config = require('config');
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(config.get('mandrill.api_key'));
var crypto = require('crypto');
var php = require('phpjs');
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
  var user = {
    email: req.body.email,
    password: req.body.password,
    last_name: req.body.last_name
  };

  if(!req.body.redirect_url) return res.errJson('Redirect Url is empty');
  
  User.update({ email: email }, { $set: user }, { safe: true, upsert: true }, function(err, raw){
  
    if (err)
      return res.errJson(err);

      User.findOne({ email: email }, function(err, user){
        if(err) return res.errJson(err);
        user.authCode = crypto.randomBytes(16).toString('base64');
        user.save(function(err){
          if(err) return res.errJson(err);
          //var base = 'https://auth.cbo.upward.st/api';
          var base = 'http://localhost:3000/api';
          var message = {
            "html": "<p>"+"Invite members here: "+base+"/user/activate?email="+encodeURIComponent(user.email)+"&authCode="+encodeURIComponent(user.authCode)+"&redirectTo="+encodeURIComponent(req.body.redirect_url)+"</p>",
            "subject": "example subject",
            "from_email": "no-replay@cbo.upward.st",
            "from_name": "Example Name",
            "to": [{email: user.email, name: user.last_name, type: "to"}],
            "headers": {
              "Reply-To": "no-replay@cbo.upward.st"
            }

          };
          var async = false;
          var ip_pool = "Main Pool";
          var send_at = new Date();
          mandrill_client.messages.send({"message": message}, function(result) {

            if(result[0].status == 'sent'){
              return res.okJson("Email was sent");
            } else {
              return res.errJson(result[0].reject_reason);
            }
          }, function(e) {
            // Mandrill returns the error as an object with name and message keys
            console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
            return res.errJson("Email not sent");
            // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
          });
        });
      });

  });

};

exports.activate = function(req, res){
  var email = req.query.email;
  var authCode = req.query.authCode;
  var redirectTo = req.query.redirectTo;
  var callback = function(err, user){
    if(err){
      return res.errJson(err);
    }
    if(redirectTo.indexOf('https://') === -1) redirectTo = 'https://' + redirectTo;
     return res.redirect(redirectTo);
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

      var parse_url = php.parse_url(redirectTo), url = null;
      if(parse_url['host']){
        url = parse_url['host'];
      } else {
        url = parse_url['path'];
      }
      console.log("FIND URL: ", {url: url});
      Organization.findOne({ url: url }, function(err, organization){
        if (err) { return callback(err); }

        if(!organization) return callback(err);
        // Success
        User.where({_id: user._id}).update({ $unset: { hashedAuthCode: "" }, $push: { permissions: { organization: organization._id, permissions: [], students: [] } } }, function(err, updated){
              if(err) return res.errJson(err);

              callback(null, updated[0]);
        });
      })
      
    });
  });
};