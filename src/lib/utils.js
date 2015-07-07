/**
 * Created by zaenal on 12/05/15.
 */
var crypto = require('crypto');
var config = require('config');
var rollbar = require('rollbar');
var saltStatic = config.get('salt');

var utils = {

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

        var buf = []
            , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            , charlen = chars.length;

        /**
         * Return a random int, used by `uid()`
         *
         * @param {Number} min
         * @param {Number} max
         * @return {Number}
         * @api private
         */
        var getRandomInt = function (min, max) {

            return Math.floor(Math.random() * (max - min + 1)) + min;

        };

        for (var i = 0; i < len; ++i) {

            buf.push(chars[getRandomInt(0, charlen - 1)]);

        }

        return buf.join('');

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
    calculateExp: function(){

        return new Date(new Date().getTime() + (require('config').get('token.expires_in') * 1000));

    },
    /**
     *
     */
    preg_quote: function(str, delimiter) {

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
    log: function(message, type, callback){

        var rollbarAccessToken = config.get('rollbar.access_token');

        if(message instanceof Error){

            message = message.stack.split("\n");

        }

        if(rollbarAccessToken){

            rollbar.reportMessage(message, type || 'info', callback);

        }

        console.log(message);

    }

};
/**
 *
 * @type {{cache: Function, uid: Function, tokenHash: Function, secretHash: Function, codeHash: Function, calculateExp: Function, preg_quote: Function, log: Function}}
 */
module.exports = utils;