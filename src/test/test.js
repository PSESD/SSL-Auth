'use strict';

process.env.NODE_ENV = 'test';
var expect = require('chai').expect;
var request = require('supertest');
var cheerio = require('cheerio');
var querystring = require('querystring');
var php = require('phpjs');
var _ = require('underscore');
var url = 'http://localhost:3000';

//var url = 'https://auth.cbo.upward.st';
var api_endpoint = 'http://localhost:4000';
var config = require('config');
var dbUri = 'mongodb://' + config.get('db.mongo.host') + '/' + config.get('db.mongo.name');
console.log(dbUri);
var mongoose = require('mongoose')
    , clearDB = require('mocha-mongoose')(dbUri, {noClear: true});

var assert = require('assert');
/**
 *
 * @param post
 * @param url
 * @param token
 */
function http_build_query(post, uri, token) {
    console.log(uri + ' ' + token +' %j', php.http_build_query(post));
}
describe('All-Test', function () {

    var agent1 = request.agent(url);
    /**
     * Store transaction Id to use in post request
     */
    var transactionId;
    /**
     * Store accessCode to be used to retrive access token
     */
    var accessCode;
    var token;
    var refreshToken;
    var tokenType;
    var secretCode;
    var grantToken;


    var profileData = {};

    var organizationId = null;

    var orgData = {
        "name": "FC CBO",
        "addresses": [
            {
                "country": "US",
                "zip": "98002",
                "state": "WA",
                "city": "Federal Way",
                "address_line": "30611 16th Ave S2",
                "venue": "",
                "address_type": "Mailing",
                "location": {
                    "accuracy": "Approximate",
                    "longitude": -0.4185710000000000,
                    "latitude": 0.0950210000000000
                }
            },
            {
                "country": "US",
                "zip": "98005",
                "state": "WA",
                "city": "Renton",
                "address_line": "30611 16th Ave S5",
                "venue": "",
                "address_type": "Mailing",
                "location": {
                    "accuracy": "Approximate",
                    "longitude": -0.8049260000000000,
                    "latitude": 0.4436020000000000
                }
            },
            {
                "country": "US",
                "zip": "98006",
                "state": "WA",
                "city": "Seattle",
                "address_line": "30611 16th Ave S6",
                "venue": "",
                "address_type": "Mailing",
                "location": {
                    "accuracy": "Approximate",
                    "longitude": -0.6203090000000000,
                    "latitude": 0.3607280000000000
                }
            }
        ],
        "description": null,
        "website": "localhost",
        "url": "localhost",
        "externalServiceId": 5,
        "personnelId": 1,
        "authorizedEntityId": 2
    };

    var studentData = {
        "first_name": "Abraham",
        "last_name": "Tester",
        //"district_student_id": "9999999999",
        "district_student_id": "xsreSample1",
        "school_district": "highline",
        "programs": [],
        "addresses": []
    };

    var userId,userId1, userId2, userId3, userId4, studentId, studentProgramId, studentProgramData = {
        programId: null,
        active: true, // Whether the student is currently active in the program or not.
        participation_start_date: new Date(Date.parse('May 8, 2015')).toString(),
        participation_end_date: new Date(Date.parse('Jul 8, 2015')).toString(),
        cohort: 'Test'
    };

    var newUser = {
        email: 'support@upwardstech.com',
        password: 'demo',
        last_name: 'Upwardstech',
        role: 'case-worker',
        is_super_admin: true
    };

    var newUser2 = {
        email: 'admin@upwardstech.com',
        password: 'demo',
        last_name: 'Upwardstech2',
        role: 'admin'
    };

    var newUser3 = {
        email: 'support3@upwardstech.com',
        password: 'demo',
        last_name: 'Upwardstech3',
        role: 'case-worker'
    };

    var newUser4 = {
        email: 'support4@upwardstech.com',
        password: 'demo',
        last_name: 'Upwardstech4',
        role: 'case-worker'
    };


    var email = 'test@test.com', password = 'test';

    before(function (done) {
        if (mongoose.connection.db) return done();
        mongoose.connect(dbUri, done);
    });

    before(function (done) {
        clearDB(done);
    });

    describe('Oauth2', function () {
        it('should create a new user', function (done) {
            request(url).post('/api/users')
                .send('email=' + email)
                .send('password=' + password)
                .send('last_name=test')
                .send('role=superadmin')
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {
                    assert.equal(res.body.email, email);
                    userId = res.body.id;
                    assert.ok(userId);
                })
                .end(done);

        });
        it('user should add a new client', function (done) {
            request(url).post('/api/clients')
                .auth(email, password)
                .type('urlencoded')
                .send({
                    client_id: 'client',
                    name: 'client',
                    redirect_uri: '^localhost:4000$'
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {

                    secretCode = res.body.client_secret;

                    assert.equal('client', res.body.client_id);
                    assert.equal('client', res.body.name);
                    assert.equal('^localhost:4000$', res.body.redirect_uri);
                    assert.ok(secretCode);
                })
                .end(done);

        });
        it('user should be able to list clients', function (done) {
            request(url).get('/api/clients')
                .auth(email, password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {
                    var o = res.body[0];
                    assert.equal('client', o.client_id);
                    assert.equal('client', o.name);
                    assert.equal('^localhost:4000$', o.redirect_uri);
                })
                .end(done);

        });

        // it('user should be able get authorised page', function (done) {
        //     var target = '/api/oauth2/authorize?client_id=client&response_type=code&redirect_uri=' + api_endpoint;
        //     agent1.get(target)
        //         .auth(email, password)
        //         .set('Accept', 'application/json')
        //         .set('Accept', 'text/html')
        //         .type('urlencoded')
        //         .expect(function (res) {
        //             var html = cheerio.load(res.text);
        //             transactionId = html('input[type="hidden"]').val();
        //             assert.ok(transactionId);
        //         })
        //         .expect(200)
        //         .end(done);

        // });

        // it('user should be able to authorise an access code', function (done) {
        //     agent1.post('/api/oauth2/authorize')
        //         .auth(email, password)
        //         .type('form')
        //         .send({
        //             transaction_id: transactionId
        //         })
        //         .expect(302)
        //         .expect(function (res) {
        //             accessCode = res.text.split('code=')[1];
        //             assert.ok(accessCode);
        //         })
        //         .end(done);

        // });

        // it('use access code to get a token', function (done) {
        //     request(url).post('/api/oauth2/token')
        //         .auth('client', secretCode)
        //         .expect('Content-Type', /json/).type('form')
        //         .send({
        //             code: accessCode,
        //             grant_type: 'authorization_code',
        //             redirect_uri: api_endpoint
        //         })
        //         .type('urlencoded')
        //         .expect(200)
        //         .expect(function (res) {

        //             token = res.body.access_token;
        //             refreshToken = res.body.refresh_token;
        //             tokenType = res.body.token_type;
        //             grantToken = tokenType + ' ' + token;
        //             assert.ok(token);
        //             assert.ok(refreshToken);
        //             assert.ok(tokenType);
        //         })
        //         .end(done);

        // });

        it('use password to get a token', function (done) {
            request(url).post('/api/oauth2/token')
                .auth('client', secretCode)
                .expect('Content-Type', /json/).type('form')
                .send({
                    username: email,
                    password: password,
                    grant_type: 'password',
                    scope: 'offline_access'
                })
                .type('urlencoded')
                .expect(200)
                .expect(function (res) {

                    token = res.body.access_token;
                    refreshToken = res.body.refresh_token;
                    tokenType = res.body.token_type;
                    grantToken = tokenType + ' ' + token;
                    assert.ok(token);
                    assert.ok(refreshToken);
                    assert.ok(tokenType);
                })
                .end(done);

        });

        it('use refresh_token to get a token', function (done) {
            request(url).post('/api/oauth2/token')
                .auth('client', secretCode)
                .expect('Content-Type', /json/).type('form')
                .send({
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                    scope: 'offline_access'
                })
                .type('urlencoded')
                .expect(200)
                .expect(function (res) {

                    token = res.body.access_token;
                    refreshToken = res.body.refresh_token;
                    tokenType = res.body.token_type;
                    grantToken = tokenType + ' ' + token;
                    assert.ok(token);
                    assert.ok(refreshToken);
                    assert.ok(tokenType);
                })
                .end(done);

        });
    });


    after(function (done) {
        done();
    })

});