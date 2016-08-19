/**
 * Created by zaenal on 08/06/16.
 */
'use strict';

/**
 * RunscopeTrigger
 *
 * @email help@runscope.com
 */
var SCHEME = "https";
var API_HOST = "api.runscope.com";
var RUNSCOPE_HOST = "www.runscope.com";
var TEST_TRIGGER = "trigger";
var TEST_RESULTS = "results";
var TEST_RESULTS_PASS = "pass";
var TEST_RESULTS_WORKING = "working";
var TEST_RESULTS_QUEUED = "queued";
var TEST_RESULTS_FAIL = "fail";
var url;
var resp = null;
var request = require('request');
var async = require('async');
/**
 *
 * @param str
 * @param search
 * @param replacement
 * @returns {string}
 */
var replaceAll = function(str, search, replacement) {
    var target = str + '';
    return target.replace(new RegExp(search, 'g'), replacement);
};
/**
 *
 * @param logger
 * @param url
 * @param accessToken
 * @constructor
 */
function RunscopeTrigger(logger, url, accessToken) {
    this.log = logger;
    this.url = url;
    this.accessToken = accessToken;
}
/**
 *
 * @param time
 * @param callback
 */
function sleep(time, callback) {
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + time) {
        ;
    }
    callback();
}
/**
 *
 * @param cb
 */
RunscopeTrigger.prototype.run = function( cb ) {
    var me = this;
    me.process(me.url, TEST_TRIGGER, function(err, resultsUrl){

        if(err){
            return cb(err);
        }

        me.log("Test Results URL:" + resultsUrl);

        /* TODO: If bucketId or test run detail URI gets added to trigger
         response, use those instead of regex */
        var apiResultsUrl = replaceAll(resultsUrl, RUNSCOPE_HOST + "\\/radar\\/([^\\/]+)\\/([^\\/]+)\\/results\\/([^\\/]+)", API_HOST + "/buckets/$1/radar/$2/results/$3");
        me.log("API URL:" + apiResultsUrl);

        var resp = null;
        async.whilst(
            function(){
                //console.log('IS RESP: ' + resp);
                return TEST_RESULTS_WORKING === resp || TEST_RESULTS_QUEUED === resp || resp === null;
            },
            function(next){
                setTimeout(function(){
                    me.process(apiResultsUrl, TEST_RESULTS, function(err, res){
                        if(err){
                            return next(err);
                        }
                        resp = res;
                        //console.log(' >>>> RESPONSE IN LOOP: ' + resp);
                        if(TEST_RESULTS_WORKING === resp || TEST_RESULTS_QUEUED === resp){
                            var stop = new Date().getTime();
                            while(new Date().getTime() < stop + 1000){
                                ;
                            }
                        }
                        next(null, resp);
                    });
                }, 10000);
            },
            cb
        );

    });

};

/**
 * Method for making HTTP call
 *
 * @param url
 * @param apiEndPoint
 * @param cb
 * @return
 */
RunscopeTrigger.prototype.process = function(url, apiEndPoint, cb) {
    var me = this;
    var options = {
        timeout: 60 * 1000,
        headers: {
            "User-Agent": "runscope-circleci/1.0"
        },
        preambleCRLF: true,
        postambleCRLF: true,
        uri: url,
        method: 'GET',
        auth: {
            bearer: this.accessToken
        }
    };

    request(options, function (error, response, body) {
        // body is the decompressed response body
        //console.log('server encoded the data as: ' , (response || 'identity'));
        //console.log('the error data is: ', error);
        //console.log('the decoded data is: ' + body);
        if (error || (response.statusCode != 200 && response.statusCode != 201)) {
            cb(TEST_RESULTS_FAIL);
        } else {
            cb(null, me.parseJSON(JSON.parse(body), apiEndPoint));
        }
    });
};

/**
 * @param data
 * @param apiEndPoint
 * @return test result
 */
RunscopeTrigger.prototype.parseJSON = function(data, apiEndPoint) {

    this.log("API EndPoint: " + apiEndPoint);

    var dataObject = data.data;

    if (TEST_TRIGGER === apiEndPoint) {
        var runsArray = dataObject.runs;
        var runsObject = runsArray[0];
        return runsObject.url + '';
    }

    var testResult = dataObject.result + '';

    if (TEST_RESULTS_PASS === testResult) {
        this.log("Test run passed successfully");
    } else if (TEST_RESULTS_FAIL === testResult) {
        this.log("Test run failed, marking the build as failed");
    }
    //console.log('TEST RESULT: ', testResult);
    return testResult;
};

module.exports = RunscopeTrigger;