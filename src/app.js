var express = require("express");
var mongoose = require('mongoose');
var bodyParser  = require("body-parser");
var app  = express();
var ejs = require('ejs');
var session = require('express-session');
var passport = require('passport');
var rollbar = require('rollbar');
var methodOverride = require('method-override');
var port = process.env.PORT || 3000;
var config = require('config');
var rollbarAccessToken = config.get('rollbar.access_token');
if(rollbarAccessToken) {
    // Use the rollbar error handler to send exceptions to your rollbar account
    app.use(rollbar.errorHandler(rollbarAccessToken, {handler: 'inline'}));
}
function Api(){
    var self = this;
    self.baseDir = __dirname;
    self.controllerDir = self.baseDir + '/app/controllers';
    self.modelDir = self.baseDir + '/app/models';
    self.routeDir = self.baseDir + '/app/routes';
    self.libDir = self.baseDir + '/lib';
    self.config = config;
    //console.log('NODE_ENV: ' + self.config.util.getEnv('NODE_ENV'));
    self.mongo = mongoose;

    self.connectDb();
};
/**
 *
 * @param type
 * @param message
 * @param cb
 * send message to rollbar
 * @link https://rollbar.com
 */
Api.prototype.sendMessage = function(type, message, cb){
    rollbar.reportMessage(message, type || 'debug', function(rollbarErr) {
        if(cb) cb(rollbarErr);
    });
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
 * Scan route and register
 */
Api.prototype.registerRoute = function(){
    var router = express.Router();
    var self = this;
    var fs = require('fs');
    var path = require('path');
    var routers = fs.readdirSync(self.routeDir);
    routers.forEach(function(file){
        var basename = path.basename(file, '.js');
        var rest = self.route(basename);
        if(basename === 'rest'){
            basename = 'api';
        }
        app.use('/'+basename, router);
        var rest_router = new rest(router,self);
    });
    app.get('/heartbeat', function(req, res) {
        res.send('OK');
    });
};
/**
 * Connect to database
 */
Api.prototype.connectDb = function() {
    var dbUri = 'mongodb://'+this.config.get('db.mongo.host')+'/'+this.config.get('db.mongo.name');
    console.log("DB URI: " + dbUri);
    this.mongo.connect(dbUri);
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

    app.use(methodOverride());

    // Set view engine to ejs
    app.set('view engine', 'ejs');
    // Use the passport package in our application
    app.use(passport.initialize());


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
    /**
     * Register Route
     */
    self.registerRoute();
    /**
     * Start Server
     */
    self.startServer();
};
/**
 * Start Server
 */
Api.prototype.startServer = function() {
    app.listen(port,function(){
        console.log("All right ! I am alive at Port "+port+".");
    });
};
/**
 * Stop Server
 * @param err
 */
Api.prototype.stop = function(err) {
    console.log("ERROR \n" + err);
    rollbar.reportMessage("ERROR \n"+err);
    process.exit(1);
};

try {
    new Api();
} catch(e){
    console.log(e);
    rollbar.reportMessage(e.message, 'error', function(rollbarErr) {
        console.log('CALL ROLLBAR: ' + rollbarErr);
    });
}
