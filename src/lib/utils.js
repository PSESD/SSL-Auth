'use strict';
/**
 * Created by zaenal on 12/05/15.
 */
var crypto = require('crypto');
var justlog = require('justlog');
/**
 *
 * @returns {Config|exports|module.exports}
 */
function getConfig() {
    //return require('config-uncached')(true);
    return require('config');
}

var config = getConfig();
var rollbar = require('rollbar');
var saltStatic = config.get('salt');
var cacheManager = require('cache-manager');
var xml2js = require('xml2js');
var _ = require('underscore');
var php = require('phpjs');
var parseString = require('xml2js').parseString;
// Nodejs encryption with CTR
var algorithm = 'aes-256-ctr',
    password = 'ssl-encrypted-827192';

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(config.get('mandrill.api_key'));
/**
 *
 * @type {{cache: Function, uid: Function, tokenHash: Function, secretHash: Function, codeHash: Function, calculateExp: Function, preg_quote: Function, log: Function}}
 */
var utils = {

    /**
     *
     * @param text
     * @returns {*}
     */
    encrypt: function (text) {
        return text;
        //try{
        //    var cipher  = crypto.createCipher(algorithm, password);
        //    var crypted = cipher.update(text, 'utf8', 'hex');
        //    crypted += cipher.final('hex');
        //    return crypted;
        //} catch(ex){
        //    return '';
        //}
    },
    /**
     *
     * @param text
     * @returns {*}
     */
    decrypt: function (text) {
        return text;
        //try{
        //    var decipher = crypto.createDecipher(algorithm, password);
        //    var dec      = decipher.update(text, 'hex', 'utf8');
        //    dec += decipher.final('utf8');
        //    return dec;
        //} catch(ex){
        //    return '';
        //}
    },

    /**
     *
     * @returns cache-manager
     */
    cache: function () {

        var cache = config.get('cache');

        var caches = [];

        var options = {};

        if (!cache.enable) {

            var self = {};
            /**
             * Looks for an item in cache tiers.
             * When a key is found in a lower cache, all higher levels are updated.
             *
             * @param {string} key
             * @param {function} cb
             */
            self.getAndPassUp = function (key, cb) {

                cb(null, false);

            };

            /**
             * Wraps a function in one or more caches.
             * Has same API as regular caching module.
             *
             * If a key doesn't exist in any cache, it gets set in all caches.
             * If a key exists in a high-priority (e.g., first) cache, it gets returned immediately
             * without getting set in other lower-priority caches.
             * If a key doesn't exist in a higher-priority cache but exists in a lower-priority
             * cache, it gets set in all higher-priority caches.
             *
             * @param {string} key - The cache key to use in cache operations
             * @param {function} work - The function to wrap
             * @param {object} [options] - options passed to `set` function
             * @param {function} cb
             */
            self.wrap = function (key, work, options, cb) {

                if (typeof options === 'function') {

                    cb = options;

                    options = {};

                }

                cb(null, false);

            };

            /**
             * Set value in all caches
             *
             * @function
             * @name set
             *
             * @param {string} key
             * @param {*} value
             * @param {object} [options] to pass to underlying set function.
             * @param {function} [cb]
             */
            self.set = function (key, value, options, cb) {

                cb(null);

            };

            /**
             * Get value from highest level cache that has stored it.
             *
             * @function
             * @name get
             *
             * @param {string} key
             * @param {object} [options] to pass to underlying get function.
             * @param {function} cb
             */
            self.get = function (key, options, cb) {

                if (typeof options === 'function') {

                    cb = options;

                    options = {};

                }

                cb(null, false);

            };

            /**
             * Delete value from all caches.
             *
             * @function
             * @name del
             *
             * @param {string} key
             * @param {object} [options] to pass to underlying del function.
             * @param {function} cb
             */
            self.del = function (key, options, cb) {

                if (typeof options === 'function') {

                    cb = options;

                    options = {};

                }

                cb(null);

            };

            return self;
        }

        var getCache = function (name) {

            switch (name) {

                case 'redis':

                    var redisStore = require('cache-manager-redis');
                    options = {
                        store: redisStore,
                        host: cache.redis.host,
                        port: cache.redis.port,
                        ttl: cache.redis.ttl
                    };

                    return cacheManager.caching(options);

                case 'memory':
                case 'memcache':

                    options = {};

                    options = cache[name];

                    options.store = name;

                    return cacheManager.caching(options);

            }
        };

        caches.push(getCache(cache.adapter));

        caches.push(getCache(cache.backup));

        return cacheManager.multiCaching(caches);

    },
    /**
     *
     * @param data
     * @param options
     */
    js2xml: function (data, options) {

        var root = 'response';

        if (_.isString(options)) {

            root = options;

            options = {};

        }

        return require('js2xmlparser')(root, data, options);

    },
    /**
     *
     * @param body
     * @param callback
     */
    xml2js: function (body, callback) {
        parseString(body, {
            normalize: true,
            explicitArray: false,
            parseBooleans: true,
            parseNumbers: true,
            stripPrefix: true,
            firstCharLowerCase: true,
            ignoreAttrs: true
        }, callback);
    },
    /**
     *
     * @param value
     */
    md5: function (value) {

        return crypto.createHash('md5').update(value).digest('hex');

    },
    /**
     *
     * @param useCache
     * @returns {*}
     */
    config: getConfig,
    /**
     * Return a unique identifier with the given `len`.
     *
     *     uid(10);
     *     // => "FDaS435D2z"
     *
     * @param {Number} len
     * @return {String}
     * @api private
     */
    uid: function (len) {

        var chars = '+?*er*F+AY%vJ,tmwt$e[AzIy|(}(;W7]-Gw}Nazr}iD}--vA}+Jq%+$LCPsP#J#';
        /**
         *
         * @param howMany
         * @param chars
         * @returns {string}
         */
        var randomValueHex = function (howMany, chars) {
            var rnd = crypto.randomBytes(howMany), value = new Array(howMany), len = chars.length;

            for (var i = 0; i < howMany; i++) {
                value[i] = chars[rnd[i] % len];
            }

            return new Buffer(value.join('')).toString('hex');

        };

        return randomValueHex(len, chars);

    },
    /**
     *
     * @param token
     * @returns {*}
     */
    tokenHash: function (token) {

        return crypto.pbkdf2Sync(token, saltStatic, 4096, 100, 'sha256').toString('hex');

    },
    /**
     *
     * @param secret
     * @returns {String|string|*}
     */
    secretHash: function (secret) {

        return crypto.pbkdf2Sync(secret, saltStatic, 4096, 30, 'sha256').toString('hex');

    },
    /**
     *
     * @param code
     * @returns {*}
     */
    codeHash: function (code) {

        return crypto.pbkdf2Sync(code, saltStatic, 4096, 60, 'sha256').toString('hex');

    },
    /**
     *
     * @returns {Date}
     */
    calculateExp: function(forever) {

        if(forever === true){
            return new Date(new Date().getTime() + 315360000/*(10 * 365 * 24 * 60 * 60)*/);//set 10year
        }

        return new Date(new Date().getTime() + (config.get('token.expires_in') * 1000));

    },
    /**
     *
     * @param body
     * @param subject
     */
    mailDev: function (body, subject, done) {
        var cfg = config.get('devMail');
        var mails = [];
        if (body instanceof Error) {

            body = body.stack.split("\n");

        }

        mandrill_client.templates.info(cfg.options, function (result) {

            var html = php.str_replace('{$html}', body, result.code);
            var message = {
                "html": html,
                "subject": subject || result.subject,
                "from_email": result.publish_from_email,
                "from_name": result.publish_from_name,
                "to": cfg.emails,
                "headers": cfg.headers

            };
            mandrill_client.messages.send({"message": message}, function (result) {

                if (result[0].status == 'sent') {
                    utils.log('Email was sent ' + message.subject, 'info');
                    if (done) done();
                } else {

                    utils.log('A mandrill error occurred: ' + result[0].reject_reason, 'error');
                    if (done) done('A mandrill error occurred: ' + result[0].reject_reason);
                }

            }, function (e) {
                // Mandrill returns the error as an object with name and message keys
                utils.log('A mandrill error occurred: ' + e.name + ' - ' + e.message, 'error');
                if (done) done('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
            });

        }, function (e) {
            // Mandrill returns the error as an object with name and message keys
            utils.log('A mandrill error occurred: ' + e.name + ' - ' + e.message, 'error');
            if (done) done('A mandrill error occurred: ' + e.name + ' - ' + e.message);
            // A mandrill error occurred: Invalid_Key - Invalid API key
        });
    },
    /**
     *
     */
    preg_quote: function (str, delimiter) {

        //  discuss at: http://phpjs.org/functions/preg_quote/
        // original by: booeyOH
        // improved by: Ates Goral (http://magnetiq.com)
        // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // improved by: Brett Zamir (http://brett-zamir.me)
        // bugfixed by: Onno Marsman
        //   example 1: preg_quote("$40");
        //   returns 1: '\\$40'
        //   example 2: preg_quote("*RRRING* Hello?");
        //   returns 2: '\\*RRRING\\* Hello\\?'
        //   example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
        //   returns 3: '\\\\\\.\\+\\*\\?\\[\\^\\]\\$\\(\\)\\{\\}\\=\\!\\<\\>\\|\\:'

        return String(str)
            .replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
    },
    /**
     * Logging to API
     */
    log: function (message, type, callback) {

        var rollbarAccessToken = config.get('rollbar.access_token');

        if (message instanceof Error) {

            message = message.stack.split("\n");

        }

        console.log(message);

        if (rollbarAccessToken) {
            rollbar.reportMessage(message, type || 'info', null, callback);

        }

    },

    benchmark: function () {
        var log = justlog({
            file: {
                pattern: '{fulltime} [{level}] {msg}' // use custom pattern
            },
            stdio: {
                //pattern : '{fulltime} [{level}] {msg} {timestamp} {mstimestamp}' // use predefined pattern
                pattern: 'color' // use predefined pattern
            }
        });
        return log;
    },
    /**
     *
     * Get current URI Client
     */
    getOrganizationUri: function (req) {

        var clientUrl = req.headers.origin;

        var hackUrl = 'x-cbo-client-url';

        var redirectUri = '';

        if (hackUrl in req.headers) {

            clientUrl = req.headers[hackUrl];

        }

        var parse_url = php.parse_url(clientUrl);

        if (parse_url.host) {

            redirectUri = parse_url.host;

        } else {

            redirectUri = parse_url.path;

        }
        return redirectUri;
    }

};
/**
 *
 * @type {{cache: Function, uid: Function, tokenHash: Function, secretHash: Function, codeHash: Function, calculateExp: Function, preg_quote: Function, log: Function}}
 */
module.exports = utils;