/**
 * Created by zaenal on 01/06/15.
 */
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

    var email = 'test@test.com', password = 'test';

    before( function (done) {
        if (mongoose.connection.db) return done();
        mongoose.connect( dbUri, done );
    } );

    before( function (done) {
        clearDB( done );
    } );

    it( 'should create a new user', function (done) {
        request( url ).post( '/api/users' )
            .send( 'email=test@test.com' )
            .send( 'password=test' )
            .send( 'last_name=test' )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                console.dir( res.body );
            } )
            .end( done );

    } );
    it( 'user should add a new client', function (done) {
        request( url ).post( '/api/clients' )
            .auth( email, password )
            .type( 'urlencoded' )
            .send( {
                client_id    : 'client',
                name  : 'client',
                redirect_uri: '^localhost:4000$'
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
            .auth( email, password )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                //console.dir( res.body );
            } )
            .end( done );

    } );

    it( 'user should be able get authorised page', function (done) {
        var target = '/api/oauth2/authorize?client_id=client&force=true&response_type=code&redirect_uri='+api_endpoint;
        console.log(url+target);
        agent1.get( target )
            .auth( email, password )
            .set( 'Accept', 'application/json' )
            .set( 'Accept', 'text/html' )
            .type( 'urlencoded' )
            .expect( function (res) {
                console.log('RESPONSE', res);
                //var html = cheerio.load( res.text );
                ////cookieId = req.headers['set-cookie'][0]
                //transactionId = html( 'input[type="hidden"]' ).val();
            } )
            .expect( 200 )
            .end( done );

    } );

    //it( 'user should be able to authorise an access code', function (done) {
    //    agent1.post( '/api/oauth2/authorize' )
    //        .auth( email, password )
    //        .type( 'form' )
    //        .send( {
    //            transaction_id: transactionId
    //        } )
    //        .expect( 302 )
    //        .expect( function (res) {
    //            accessCode = res.text.split( 'code=' )[1];
    //            console.log('Code: ' + accessCode);
    //        } )
    //        .end( done );
    //
    //} );

    it( 'use access code to get a token', function (done) {
        request( url ).post( '/api/oauth2/token' )
            .auth( 'client', secretCode )
            .expect( 'Content-Type', /json/ ).type( 'form' )
            .send( {
                code        : accessCode,
                grant_type  : 'authorization_code',
                redirect_uri: api_endpoint
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
    it( 'use refresh token to get a token', function (done) {

        var rfParam = {
            grant_type  : 'refresh_token',
            refresh_token: refreshToken,
            //client_id: 'client',
            //client_secret: 'secret'
        };

        var out = [];
        Object.keys(rfParam).forEach(function(key) {
            out.push(key+'='+encodeURIComponent(rfParam[key]));
        });
        console.log(url+'/api/oauth2/token', out.join("&"));

        request( url ).post( '/api/oauth2/token' )
            .auth( 'client', secretCode )
            .expect( 'Content-Type', /json/ ).type( 'form' )
            .send( rfParam )
            .type( 'urlencoded' )
            .expect( 200 )
            .expect( function (res) {
                console.dir(res.body);
            } )
            .end( done );

    } );


    after( function (done) {
        done();
    } )

} );