/**
 * Created by zaenal on 05/06/15.
 */
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill();


function Mail(){
    this.mandrill = mandrill;
    this.client = mandrill_client;
}

module.exports = Mail;