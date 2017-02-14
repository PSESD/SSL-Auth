/**
 * Created by zaenal on 13/05/16.
 */
var config = require('config');
var nodemailer = require('nodemailer');
var sparkPostTransport = require('nodemailer-sparkpost-transport');
var mandrillTransport = require('nodemailer-mandrill-transport');
var _ = require('underscore');
/**
 *
 * @constructor
 */
function Mailer(){
    this.current = config.get('mailer.default');
    if(!config.has('mailer.' + this.current)){
        throw new Error('We can\'t find any config mailer "' + this.current + '"');
    }
    this.config = config.get('mailer.' + this.current);
    this._message = null;
    this._html = null;
    this._headers = {};
    this._from = { name: null, email: null };
    this._to = [];
    this._bcc = [];
    this._bindParam = {};
    this._template = null;
}
/**
 *
 * @param client
 * @param mailOptions
 * @param done
 */
var sender = function(client, mailOptions, done){
    var transporter = nodemailer.createTransport(client);

    transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
            done(err);
        } else {
            done(null, info);
        }
    });
};
/**
 *
 * @param param
 * @returns {Function}
 */
Mailer.prototype.bindParam = function(param){

    if(_.isUndefined(param)){
        return this._bindParam;
    }

    this._bindParam = _.extend(this._bindParam, param);
};
/**
 *
 * @param template
 * @returns {null|*}
 */
Mailer.prototype.template = function(template){

    if(_.isUndefined(template)){
        return this._template;
    }

    this._template = template;
};
/**
 *
 * @param header
 * @param unbind
 * @returns {{}|*}
 */
Mailer.prototype.header = function(header, unbind){

    if(_.isUndefined(header)){
        return this._headers;
    }

    var me = this;
    if(_.isArray(header)){
        header.forEach(function(head){
            me._headers = _.extend(me._headers, head);
        });
    } else {
        if(unbind && header in me._headers){
            delete me._headers[header];
        } else {
            me._headers = _.extend(me._headers, header);
        }
    }
};
/**
 *
 * @param from
 * @returns {Function}
 */
Mailer.prototype.from = function(from){

    if(_.isUndefined(from)){
        return this._from;
    }

    if(_.isString(from)){
        this._from = {
            name: null,
            email: from
        };
    }

    if(_.isObject(from)){
        this._from.name = 'name' in from ? from.name : null;
        this._from.email = 'email' in from ? from.email : null;
    }
};
/**
 *
 * @param to
 * @returns {Function}
 */
Mailer.prototype.to = function(to){

    if(_.isUndefined(to)){
        return this._to;
    }

    if(_.isString(to)){
        this._to.push({
            name: null,
            email: to
        });
    }

    if(_.isObject(to)){
        var name = 'name' in to ? to.name : null;
        var email = 'email' in to ? to.email : null;
        if(email){
            this._to.push({name: name, email: email});
        }
    }

    if(_.isArray(to)){
        var me = this;
        to.forEach(function(t){
            var name = 'name' in t ? t.name : null;
            var email = 'email' in t ? t.email : null;
            if(email){
                me._to.push({name: name, email: email});
            }
        });
    }
};
/**
 *
 * @param bcc
 * @returns {Function}
 */
Mailer.prototype.bcc = function(bcc){

    if(_.isUndefined(bcc)){
        return this._bcc;
    }

    if(_.isString(bcc)){
        this._bcc.push({
            name: null,
            email: bcc
        });
    }

    if(_.isObject(bcc)){
        var name = 'name' in bcc ? bcc.name : null;
        var email = 'email' in bcc ? bcc.email : null;
        if(email){
            this._bcc.push({name: name, email: email});
        }
    }

    if(_.isArray(bcc)){
        var me = this;
        bcc.forEach(function(t){
            var name = 'name' in b ? b.name : null;
            var email = 'email' in b ? b.email : null;
            if(email){
                me._bcc.push({name: name, email: email});
            }
        });
    }
};
/**
 *
 * @param html
 * @returns {*}
 */
Mailer.prototype.html = function(html){

    if(_.isUndefined(html)){
        return this._html;
    }
    this._html = html;
};
/**
 *
 * @param message
 * @returns {*}
 */
Mailer.prototype.message = function(message){

    if(_.isUndefined(message)){
        return this._message;
    }
    this._message = message;
};
/**
 *
 * @returns {*}
 */
Mailer.prototype.getConfig = function(){
    return this.config;
};
/**
 *
 * @returns {*}
 */
Mailer.prototype.getCurrent = function(){
    return this.current;
};
/**
 *
 * @param options
 * @param done
 */
Mailer.prototype.sparkpost = function(options, done){
    if(!this.config.apiKey){
        throw new Error('Unknown API Key');
    }
    var opts = {
        "sparkPostApiKey": this.config.apiKey,
        "options": {
            "open_tracking": true,
            "click_tracking": true,
            "transactional": false
        }
    };

    if(options.campaign_id){
        opts.campaign_id = options.campaign_id;
    }
    if(options.substitution_data){
        opts.substitution_data = options.substitution_data;
    }
    if(options.template_id || this.template()){
        opts.content = {
          template_id: options.template_id || this.template()
        };
    }

    if(this.bindParam()){
        opts.metadata = this.bindParam();
    }

    var mailOptions = {
        from: this.from()
    };

    if(options.subject){
        mailOptions.subject = options.subject;
    }

    if(this.message()){
        mailOptions.text = this.message();
    } else if(this.html()){
        mailOptions.html = this.html();
    }

    mailOptions.recipients = [];

    this.to().forEach(function(to){
        mailOptions.recipients.push({
            address: {
                name: to.name,
                email: to.email
            }
        });
    });

    sender( sparkPostTransport(opts), mailOptions, done);
};
/**
 *
 * @param options
 * @param done
 */
Mailer.prototype.mandrill = function(options, done){
    if(!this.config.apiKey){
        throw new Error('Unknown API Key');
    }
    var opts = {
        auth: {
            apiKey: this.config.apiKey
        }
    };

    var mailOptions = {
        from: this.from,
        mandrillOptions: {
            message: {
                auto_text: true,
                inline_css: true
            }
        }
    };

    if(options.subject){
        mailOptions.subject = options.subject;
    }

    if(options.template_id || this.template()){
        mailOptions.mandrillOptions = _.extend(mailOptions.mandrillOptions, {
            template_name: options.template_id || this.template(),
            template_content: []
        });
    }

    if(this.message()){
        mailOptions.mandrillOptions.message.text = this.message();
    } else if(this.html()){
        mailOptions.mandrillOptions.message.html = this.html();
    }

    mailOptions.mandrillOptions.message.to = this.to();

    if(this.header()){
        mailOptions.mandrillOptions.message.headers = this.header();
    }

    if(this.bindParam()){
        mailOptions.mandrillOptions.message.merge = true;
        mailOptions.mandrillOptions.message.merge_language = "handlebars";
        mailOptions.mandrillOptions.message.global_merge_vars = [];
        _.each(this.bindParam(), function(value, key) {
            mailOptions.mandrillOptions.message.global_merge_vars.push({
                name: key,
                content: value
            });
        });
    }

    sender(mandrillTransport(opts), mailOptions, done);
};
/**
 *
 * @param mailOptions
 * @param done
 */
Mailer.prototype.send = function(mailOptions, done){
    var me = this;
    switch(me.getCurrent()){
        case 'sparkpost':
            me.sparkpost(mailOptions, done);
            break;
        case 'mandrill':
            me.mandrill(mailOptions, done);
            break;

    }
};
/**
 *
 * @type {Mailer}
 */
module.exports = Mailer;