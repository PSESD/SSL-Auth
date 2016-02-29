var uri = require('url');
var redirectUri = 'https://helpinghand.cbo.upward.st';

var parser = uri.parse(redirectUri);
console.log(parser);
//var regex = new RegExp("\\*\\.cbo\\.upwardst\\.st", 'i');
var regex = new RegExp('(http:\/\/)?(([^.]+)\.)?cbo\.upwardst\.st', 'i');

console.log(regex, redirectUri, parser.host, parser.host.match(regex), regex.test(parser.host), parser.host.match(/(([^.]+)\.)?cbo\.upwardst\.st/i));
if(!parser.host.match(regex)) return console.log('Url not match 1!');