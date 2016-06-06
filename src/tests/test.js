/**
 * Created by zaenal on 03/06/16.
 */
'use strict';

process.env.NODE_ENV = 'test';
var expect = require('chai').expect;
var request = require('supertest');
var cheerio = require('cheerio');
var querystring = require('querystring');
var _funct = require('../lib/function');
var _ = require('underscore');
var url = 'https://auth.cbo.upward.st';
var api_endpoint = 'https://api.cbo.upward.st';
var config = require('config');
var assert = require('assert');
/**
 *
 * @param post
 * @param uri
 * @param token
 */
function http_build_query(post, uri, token) {
    console.log(uri + ' ' + token +' %j', _funct.http_build_query(post));
}
describe('All-Test', function () {


    before(function (done) {
        console.log('Before event call');
        done();
    });


    describe('API-User', function () {

        var grantToken = null;

        it('GET /api', function (done) {
            http_build_query({}, url + '/api', grantToken);
            request(api_endpoint)
                .get('/api')
                .set('authorization', grantToken)
                .set('x-cbo-client-url', url)
                .expect(function (res) {
                    console.log(res.body);
                })
                .expect(200)
                .end(done);

        });

    });


    after(function (done) {
        done();
    })

});