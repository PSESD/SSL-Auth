'use strict';

process.env.NODE_ENV = 'test';
var expect = require( 'chai' ).expect;
var request = require( 'supertest' );
var cheerio = require( 'cheerio' );
var url = 'http://localhost:3000';
//var url = 'https://auth.cbo.upward.st';
var api_endpoint = 'http://localhost:4000';
var config = require('config');
var dbUri = 'mongodb://'+config.get('db.mongo.host')+'/'+config.get('db.mongo.name');
console.log(dbUri);
var mongoose = require( 'mongoose' )
    , clearDB = require( 'mocha-mongoose' )( dbUri, {noClear: true} );

describe( 'OAuth2', function () {

    var agent1 = request.agent( url );
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
    var userId;

    var username = 'test', password = 'test';

    before( function (done) {
        if (mongoose.connection.db) return done();
        mongoose.connect( dbUri, done );
    } );

    before( function (done) {
        clearDB( done );
    } );

    it( 'should create a new user', function (done) {
        request( url ).post( '/api/users' )
            .send( 'username=test' )
            .send( 'password=test' )
            .send( 'last_name=test' )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                userId = res.body.id;
                console.log('UserID: ' + userId);
            } )
            .end( done );

    } );
    it( 'user should add a new client', function (done) {
        request( url ).post( '/api/clients' )
            .auth( 'test', 'test' )
            .type( 'urlencoded' )
            .send( {
                client_id    : 'client',
                name  : 'client',
                redirect_uri: api_endpoint
            } )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                secretCode = res.body.client_secret;
                console.dir( res.body );
                console.log('SECRET: ', secretCode);
            } )
            .end( done );

    } );
    it( 'user should be able to list clients', function (done) {
        request( url ).get( '/api/clients' )
            //.auth( 'test', 'test' )
            .auth( username, password )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                console.dir( res.body );
            } )
            .end( done );

    } );

    it( 'use access code to get a token', function (done) {
        request( url ).post( '/api/oauth2/token' )
            .auth( username, password )
            .expect( 'Content-Type', /json/ ).type( 'form' )
            .send( {
                grant_type  : 'password',
                username: username,
                password: password
            } )
            .type( 'urlencoded' )
            .expect( 200 )
            .expect( function (res) {
                token = res.body.access_token;
                refreshToken = res.body.refresh_token;
                tokenType = res.body.token_type;
                console.log('Url: ' + api_endpoint + '/user', 'authorization: ' + tokenType + ' ' + token);
            } )
            .end( done );

    } );

    it( 'use token to get a user api end point', function (done) {
        request(api_endpoint)
            .get('/user')
            .set('authorization', tokenType + ' ' + token)
            .expect( function (res) {
                console.dir(res.body);
            } )
            .expect( 200 )
            .end( done );

    } );

    after( function (done) {
        done();
    } )

} );