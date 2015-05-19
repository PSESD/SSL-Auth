var express = require("express");
var mongoose = require('mongoose');
var bodyParser  = require("body-parser");
var app  = express();
var ejs = require('ejs');
var session = require('express-session');
var passport = require('passport');
var rollbar = require('rollbar');

function Api(){
    var self = this;
    self.baseDir = __dirname;
    self.controllerDir = self.baseDir + '/app/controllers';
    self.modelDir = self.baseDir + '/app/models';
    self.routeDir = self.baseDir + '/app/routes';
    self.libDir = self.baseDir + '/lib';
    self.config = require('config');
    //console.log('NODE_ENV: ' + self.config.util.getEnv('NODE_ENV'));
    self.mongo = mongoose;
    self.connectDb();
};


/**
 * load controller
 */
Api.prototype.controller = function(name){
    var self = this;
    return require(self.controllerDir + '/' + name);
};
/**
 * load controller
 */
Api.prototype.model = function(name){
    return require(this.modelDir + '/' + name);
};

Api.prototype.lib = function(name){
    return require(this.libDir + '/' + name);
};
/**
 * load router
 */
Api.prototype.route = function(name){
    return require(this.routeDir + '/' + name);
};
/**
 * Connect to database
 */
Api.prototype.connectDb = function() {
    this.mongo.connect('mongodb://'+this.config.get('db.mongo.host')+'/'+this.config.get('db.mongo.name'));
    this.configureExpress(this.db);
    
};
/**
 * Config Express and Register Route
 * @param db
 */
Api.prototype.configureExpress = function(db) {
    var self = this;
    app.set('api', self);
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(bodyParser.json());

    // Set view engine to ejs
    app.set('view engine', 'ejs');
    // Use the passport package in our application
    app.use(passport.initialize());


    // Use the rollbar error handler to send exceptions to your rollbar account
    app.use(rollbar.errorHandler('e0f67e505472424ca9728934a41fc416'));
    // Use express session support since OAuth2orize requires it
    app.use(session({ 
      secret: self.config.get('session.secret'),
      saveUninitialized: self.config.get('session.saveUninitialized'),
      resave: self.config.get('session.resave')
    }));
    var cross = self.config.get('cross');
    if(cross.enable) {
        /**
         * Enable Cross Domain
         */
        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", cross.allow_origin ||  "*");
            res.header("Access-Control-Allow-Headers", cross.allow_headers || "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    var router = express.Router();
    var rest = self.route('rest');
    app.use('/api', router);
    var rest_router = new rest(router,self);
    self.startServer();
};
/**
 * Start Server
 */
Api.prototype.startServer = function() {
    app.listen(process.env.PORT || 3000,function(){
        console.log("All right ! I am alive at Port 3000.");
    });
};
/**
 * Stop Server
 * @param err
 */
Api.prototype.stop = function(err) {
    console.log("ERROR \n" + err);
    process.exit(1);
};

new Api();