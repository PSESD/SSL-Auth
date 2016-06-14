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
var RunscopeTrigger = require('../runscope');

/**
 * RUNSCOPE LIST TO TRIGGER
 */
var triggers = [
    'https://api.runscope.com/radar/e30197f9-28b9-476e-a8cf-748b7008fc5f/trigger?runscope_environment=75f89d4e-d87c-41bd-8061-c66919d0fd2c', //Hearbeat
    'https://api.runscope.com/radar/e08a5622-1e08-46a8-a103-aa3f33b58b21/trigger?runscope_environment=827c0b90-4eef-492e-a83f-7f0e397205f7', //Helping Hand - API Admin Tests
    'https://api.runscope.com/radar/44f6f182-24d0-4a14-bb44-9a449b03e71a/trigger?runscope_environment=9b00c2fb-3a3e-48b8-a41a-a0a3126291f5', //Helping Hand - API Non Restricted CaseWorker Tests
    'https://api.runscope.com/radar/bdacae89-8685-4fa5-b32c-1ce66837ed49/trigger?runscope_environment=d1867e72-1d9a-4765-a7e0-0903ce28d1b7' //Helping Hand - API Restricted CaseWorker Tests
];

var access_token = '6e77c6b7-7c39-4a03-af79-315317a851ae';

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
        //console.log('Before event call');
        done();
    });


    describe('API-User', function () {

        var grantToken = null;

        it('GET /api', function (done) {
            http_build_query({}, url + '/api', grantToken);
            request(url)
                .get('/api')
                .set('authorization', grantToken)
                .set('x-cbo-client-url', url)
                .expect(function (res) {
                    assert.ok(res.body);
                })
                .expect(200)
                .end(done);

        });

    });

    describe('Runscope-Test', function () {

        it('Hearbeat', function (done) {
            var runscope = new RunscopeTrigger(function(mesg){}, triggers[0], access_token);
            runscope.run(function(err, response){
                assert.equal(response, 'pass');
                done();
            });
        });

        it('Helping Hand - API Admin Tests', function (done) {
            var runscope = new RunscopeTrigger(function(mesg){}, triggers[1], access_token);
            runscope.run(function(err, response){
                assert.equal(response, 'pass');
                done();
            });
        });

        it('Helping Hand - API Non Restricted CaseWorker Tests', function (done) {
            var runscope = new RunscopeTrigger(function(mesg){}, triggers[2], access_token);
            runscope.run(function(err, response){
                assert.equal(response, 'pass');
                done();
            });
        });

        it('Helping Hand - API Restricted CaseWorker Tests', function (done) {
            var runscope = new RunscopeTrigger(function(mesg){}, triggers[3], access_token);
            runscope.run(function(err, response){
                assert.equal(response, 'pass');
                done();
            });
        });

    });


    after(function (done) {
        done();
    })

});