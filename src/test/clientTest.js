'use strict';

var expect = require( 'chai' ).expect;
var request = require( 'supertest' );
var cheerio = require( 'cheerio' );
var dbURI = 'mongodb://localhost/cbo_test'
    , mongoose = require( 'mongoose' );

describe( 'Client Test', function () {

    var Client = require('../app/models/Client');

    before( function (done) {
        if (mongoose.connection.db) return done();
        mongoose.connect( dbURI, done );
    } );



    it( 'Create a client', function (done) {
        var client = new Client();
        // Set the client properties that came from the POST data
        client.id = 'zaenal_id';
        client.name = 'Zaenal1';
        client.userId = '55656964ef7223ea2228921e';
        client.redirectUri = 'zaenal@upwardstech.com|mzaenalm@gmail.com';
        // Save the client and check for errors
        client.save(function(err) {
            if (err)
                return (err.code && err.code === 11000) ? console.log({ code: err.code, message: 'Client already exists', data: client}) :  console.log(err);

            console.log({ code: 0, message: 'Client added to the locker!', data: client });
            done();
        });

        Client.findOne({_id: client._id}, function(err, client){
            console.log("UPDATE HERE");
            client.redirectUri += 'i';
            client.save(function(e){
                console.log('CLIENT UPDATE: ')
            });
        });

        Client.remove({name: 'Zaenal1'}, function(err){});

    } );


    after( function (done) {
        done();
    } )

} );