'use strict';
var express = require("express");
var i18n = require("i18n");
var mongoose = require('mongoose');
var bodyParser  = require("body-parser");
var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });

var app  = express();
var ejs = require('ejs');
var engine = require('ejs-locals');
var session = require('express-session');
var passport = require('passport');
var rollbar = require('rollbar');
var _ = require('underscore');
var methodOverride = require('method-override');
var port = process.env.PORT || 3000;
var config = require('config');
var hal = require('hal');

var rollbarAccessToken = config.get('rollbar.access_token');
var compress = require('compression');
i18n.configure({
    locales:['en'],
    directory: __dirname + '/resource/lang'
});
app.use(compress());

if (rollbarAccessToken) {

      // Use the rollbar error handler to send exceptions to your rollbar account
      app.use(rollbar.errorHandler(rollbarAccessToken, {handler: 'inline'}));
      var rollbarEnv = config.util.getEnv('NODE_ENV');
      // Configure the library to send errors to api.rollbar.com
      rollbar.init(rollbarAccessToken, {
            environment: rollbarEnv
      });
      rollbar.handleUncaughtExceptions(rollbarAccessToken, { exitOnUncaughtException: true });

}

/**
 *
 * @constructor
 */
function Api() {

    var self = this;

    self.baseDir = __dirname;

    self.controllerDir = self.baseDir + '/app/controllers';

    self.modelDir = self.baseDir + '/app/models';

    self.routeDir = self.baseDir + '/app/routes';

    self.libDir = self.baseDir + '/lib';

    self.middlewareDir = self.baseDir + '/app/middlewares';

    self.config = config;

    self.mongo = mongoose;

    self.csrfProtection = csrfProtection;

    self.parseForm = parseForm;

    self.env = app.get('env');

    self.connectDb();

    i18n.configure({
        // setup some locales - other locales default to en silently
        locales:['en'],

        // you may alter a site wide default locale
        defaultLocale: 'en',

        // sets a custom cookie name to parse locale settings from  - defaults to NULL
        cookie: '__lang',

        // where to store json files - defaults to './locales' relative to modules directory
        directory: __dirname + '/app/locales',

        // whether to write new locale information to disk - defaults to true
        updateFiles: false,

        // what to use as the indentation unit - defaults to "\t"
        indent: "\t",

        // setting extension of json files - defaults to '.json' (you might want to set this to '.js' according to webtranslateit)
        extension: '.json',

        // setting prefix of json files name - default to none '' (in case you use different locale files naming scheme (webapp-en.json), rather then just en.json)
        prefix: 'lang-',

        // enable object notation
        objectNotation: true
    });

}
/**
 *
 * @param type
 * @param message
 * @param cb
 * send message to rollbar
 * @link https://rollbar.com
 */
Api.prototype.sendMessage = function (type, message, cb) {

    if (!rollbarAccessToken) {

        return;

    }

    rollbar.reportMessage(message, type || 'debug', function (rollbarErr) {

        if (cb) {
            cb(rollbarErr);
        }

    });

};
/**
 * load controller
 */
Api.prototype.controller = function (name, newInstance) {

    var self = this;

    var obj = require(self.controllerDir + '/' + name);

    if (newInstance) {

        return new obj();

    }

    return obj;

};
/**
 * load middleware
 */
Api.prototype.middleware = function (name) {

    return require(this.middlewareDir + '/' + name);

};
/**
 * load controller
 */
Api.prototype.model = function (name) {

    return require(this.modelDir + '/' + name);

};

Api.prototype.lib = function (name) {

    return require(this.libDir + '/' + name);

};
/**
 * load router
 */
Api.prototype.route = function (name) {

    return require(this.routeDir + '/' + name);

};
/**
 * Scan route and register
 */
Api.prototype.registerRoute = function (cb) {

    var router = express.Router();

    var self = this;

    var fs = require('fs');

    var path = require('path');

    var routers = fs.readdirSync(self.routeDir);

    routers.forEach(function (file) {

        var basename = path.basename(file, '.js');

        var rest = self.route(basename);

        if (basename === 'rest') {

            basename = 'api';

        }

        app.use('/' + basename, router);

        var rest_router = new rest(router, self);

    });

    if (cb) {

        cb();

    }

    app.get('/heartbeat', function(req, res) {

        res.send('OK');

    });

};
/**
 * Connect to database
 */
Api.prototype.connectDb = function () {


    var dbUri = this.config.get('db.mongo');
    if(_.isObject(dbUri) && this.config.has('db.mongo.host') && this.config.has('db.mongo.name')){
        dbUri = 'mongodb://' + this.config.get('db.mongo.host') + '/' + this.config.get('db.mongo.name');
    }
    this.mongo.connect(dbUri, this.config.has('db.mongo_options') ? this.config.get('db.mongo_options') : {});

    this.mongo.connection.once('open', function (callback) {

        console.log("[%s] DB URI: " + dbUri, app.get('env'));

    });

    //this.mongo.set('debug', app.get('env') === 'test');

    this.configureExpress(this.db);
    
};
/**
 * Config Express and Register Route
 * @param db
 */
Api.prototype.configureExpress = function (db) {

    var self = this;

    app.set('api', self);

    app.set('log', require('./lib/utils').log);

    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(cookieParser());

    app.use(i18n.init);

    app.use(bodyParser.json());

    app.use(methodOverride());

    // Set view engine to ejs
    app.engine('ejs', engine);
    app.set('view engine', 'ejs');

    // Use static public
    app.use(express.static(__dirname + '/public'));

    // Use the passport package in our application
    app.use(passport.initialize());


    // Use express session support since OAuth2orize requires it
    app.use(session({
        secret: self.config.get('session.secret'),
        saveUninitialized: self.config.get('session.saveUninitialized'),
        resave: self.config.get('session.resave')
    }));

    app.use(function (req, res, next) {


        var resource = null;
        /**
         *
         * @param rstatus
         */
        res.errUnauthorized = function(rstatus){

            res.statusCode = rstatus || 403;

            return res.end('Unauthorized');

        };
        /**
         *
         * @param req
         * @param res
         * @param data
         * @returns {*}
         */
        function sendFormat(req, res, data){

            var format = req.params.format;

            switch( format ){

                case 'json':

                    return res.json(data);

                case 'xml':
                    //if(res.bigXml){
                    //    return res.send(utils.js2xml(data, res.xmlOptions));
                    //}

                    return res.send(xmlmodel(data, res.xmlOptions || 'response'));

            }

            return res.send(data);

        }

        res.sendFormat = sendFormat;


        res.sendSuccess = function (message, data, key, collection) {

            if(!req.params.format) {
                req.params.format = 'json';
            }

            var format = req.params.format;

            if(format === 'xml' && res.xmlKey && !key){

                key = res.xmlKey;

            }

            /**
             * If message is object will direct return
             */
            //console.log('CLASS: ', message.constructor.name);

            if (_.isObject(message)) {

                if (typeof message.toJSON === 'function') {

                    message = message.toJSON();

                }

                resource = new hal.Resource(message, req.originalUrl);

                return sendFormat(req, res, resource.toJSON());

            }

            /**
             * populate response
             * @type {{success: boolean}}
             */
            var response = { success: true };

            if (message) {

                response.message = message;

            }

            if (data) {

                if (_.isArray(data)) {

                    response.total = data.length;

                    if (key) {

                        response[key] = data;

                    } else {

                        response.data = data;

                    }

                } else {

                    if (key) {

                        response[key] = data;

                    } else {

                        response.info = data;

                    }

                }

            }

            resource = new hal.Resource(response, req.originalUrl);

            if (typeof collection === 'function') {

                resource = collection(resource);

            }

            return sendFormat(req, res, resource.toJSON());

        };

        res.sendError = function (err) {

            if(!req.params.format) {

                req.params.format = 'json';

            }

            if(err === 'Access Denied' || err === 'Permission Denied') {

                return res.errUnauthorized();

            }

            /**
             * Mongoose error duplicate
             */
            if(typeof err === 'object' && err.code && (err.code === 11000 || err.code === 11001)){

                err = {
                    code: err.code,
                    message: res.__('errors.' + err.code)
                };

            }

            if(typeof err !== 'string'){

                for(var o in err){

                    if(o !== 'code' && o !== 'message'){

                        delete err[o];

                    }
                }

            }

            var response = { success: false, error: err };

            resource = new hal.Resource(response, req.originalUrl);

            return sendFormat(req, res, resource.toJSON());

        };

        next();

    });

    var cross = self.config.get('cross');

    if (cross.enable) {

        /**
         * Enable Cross Domain
         */
        app.use(function (req, res, next) {

            res.header("Access-Control-Allow-Origin", cross.allow_origin || "*");

            res.header("Access-Control-Allow-Headers", cross.allow_headers || "Origin, X-Requested-With, Content-Type, Accept");

            res.header("Access-Control-Allow-Methods", cross.allow_method || "POST, GET, PUT, OPTIONS, DELETE");

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

    //self.forkingStart();

};
/**
 * Start Server
 */
Api.prototype.startServer = function () {

    app.listen(port, function () {

        console.log("All right ! I am alive at Port " + port + ".");

    });

};
/**
 * Forking server
 */
Api.prototype.forkingStart = function(){

    var me = this;

    var cluster = require('cluster');

    var workers = process.env.WORKERS || require('os').cpus().length;

    if (cluster.isMaster) {

        console.log('start cluster with %s workers', workers);

        for (var i = 0; i < workers; ++i) {

            var worker = cluster.fork().process;

            console.log('worker %s started.', worker.pid);

        }

        cluster.on('exit', function(worker) {

            console.log('worker %s died. restart...', worker.process.pid);

            cluster.fork();

        });

    } else {

        me.startServer();

    }

    process.on('uncaughtException', function (err) {

        console.error((new Date()).toUTCString() + ' uncaughtException:', err.message);

        me.stop(err);

    });
};
/**
 * Stop Server
 * @param err
 */
Api.prototype.stop = function (err) {

    console.log("ERROR \n" + err.stack);

    if (rollbarAccessToken) {

        rollbar.reportMessage("ERROR \n" + err);

    }

    process.exit(1);

};
/**
 *
 * @param ex
 */
Api.errorStack = function (ex) {

    if (rollbarAccessToken) {

        rollbar.handleError(ex);

    }

};

new Api();