/**
 * Created by zaenal on 19/05/15.
 */
'use strict';

var expect = require( 'chai' ).expect;
var request = require( 'supertest' );
var cheerio = require( 'cheerio' );
var rollbar = require('rollbar');
var config = require('config');

describe( 'Rollbar', function () {


    before( function (done) {
        rollbar.init(config.get('rollbar.access_token'));
        done();
    } );

    it( 'hallo world test, My name is zaenal', function (done) {
        rollbar.reportMessage("Hello world!, My name is zaenal");
        done();
    } );

    after( function (done) {
        done();
    } )

} );