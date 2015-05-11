'use strict';

var expect = require( 'chai' ).expect;
var request = require( 'supertest' );
var cheerio = require( 'cheerio' );
var server = 'http://localhost:3000';
var dbURI = 'mongodb://localhost/cbo_test'
    , mongoose = require( 'mongoose' )
    , clearDB = require( 'mocha-mongoose' )( dbURI, {noClear: true} );

describe( 'OAuth2', function () {

    var agent1 = request.agent( server );
    /**
     * Store transaction Id to use in post request
     */
    var transactionId;
    /**
     * Store accessCode to be used to retrive access token
     */
    var accessCode;
    var token;

    before( function (done) {
        if (mongoose.connection.db) return done();
        mongoose.connect( dbURI, done );
    } );

    before( function (done) {
        clearDB( done );
    } );

    it( 'should create a new user', function (done) {
        request( server ).post( '/api/users' )
            .send( 'username=test' )
            .send( 'password=test' )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                console.dir( res.body );
            } )
            .end( done );

    } );
    it( 'user should add a new client', function (done) {
        request( server ).post( '/api/clients' )
            .auth( 'test', 'test' )
            .type( 'urlencoded' )
            .send( {
                id    : 'client',
                name  : 'client',
                secret: 'secret'
            } )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                console.dir( res.body );
            } )
            .end( done );

    } );
    it( 'user should be able to list clients', function (done) {
        request( server ).get( '/api/clients' )
            .auth( 'test', 'test' )
            .expect( 'Content-Type', /json/ )
            .expect( 200 )
            .expect( function (res) {
                console.dir( res.body );
            } )
            .end( done );

    } );

    it( 'user should be able get authorised page', function (done) {
        agent1.get( '/api/oauth2/authorize?client_id=client&response_type=code&approval_prompt=force&redirect_uri='+server )
            .auth( 'test', 'test' )
            .set( 'Accept', 'application/json' )
            .set( 'Accept', 'text/html' )
            .type( 'urlencoded' )
            .expect( function (res) {
                var html = cheerio.load( res.text );
                //cookieId = req.headers['set-cookie'][0]
                transactionId = html( 'input[type="hidden"]' ).val();
            } )
            .expect( 200 )
            .end( done );

    } );

    it( 'user should be able to authorise an access code', function (done) {
        agent1.post( '/api/oauth2/authorize' )
            .auth( 'test', 'test' )
            .type( 'form' )
            .send( {
                transaction_id: transactionId
            } )
            .expect( 302 )
            .expect( function (res) {
                accessCode = res.text.split( 'code=' )[1];
            } )
            .end( done );

    } );

    it( 'use access code to get a token', function (done) {
        request( server ).post( '/api/oauth2/token' )
            .auth( 'client', 'secret' )
            .expect( 'Content-Type', /json/ ).type( 'form' )
            .send( {
                code        : accessCode,
                grant_type  : 'authorization_code',
                redirect_uri: 'http://localhost:3000'
            } )
            .type( 'urlencoded' )
            .expect( 200 )
            .expect( function (res) {
                token = res.body.access_token.value;
            } )
            .end( done );

    } );


    after( function (done) {
        done();
    } )

} );