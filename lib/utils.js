/**
 * Created by zaenal on 12/05/15.
 */
var crypto = require('crypto');
var saltStatic = require('config').get('salt');
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
        }
        for (var i = 0; i < len; ++i) {
            buf.push(chars[getRandomInt(0, charlen - 1)]);
        }

        return buf.join('');
    },
    /**
     *
     * @param secret
     * @param salt
     * @returns {*}
     */
    tokenHash: function (token) {
        return crypto.pbkdf2Sync(token, saltStatic, 4096, 512, 'sha256').toString('hex');
    },
    /**
     *
     * @param code
     * @returns {*}
     */
    codeHash: function (code) {
        return crypto.pbkdf2Sync(code, saltStatic, 4096, 100, 'sha256').toString('hex');
    }

};

module.exports = utils;