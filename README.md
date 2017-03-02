
# Secure Data Portal for community-based organizations (CBO's) [![Code Climate](https://codeclimate.com/repos/565edd74a7512d251d001692/badges/164f3c9621ded8bdf249/gpa.svg)](https://codeclimate.com/repos/565edd74a7512d251d001692/feed) [![Test Coverage](https://codeclimate.com/repos/565edd74a7512d251d001692/badges/164f3c9621ded8bdf249/coverage.svg)](https://codeclimate.com/repos/565edd74a7512d251d001692/coverage) [![Issue Count](https://codeclimate.com/repos/565edd74a7512d251d001692/badges/164f3c9621ded8bdf249/issue_count.svg)](https://codeclimate.com/repos/565edd74a7512d251d001692/feed) 

## Overview
Handles user authorization and management for Student Success Link.

The authorization sequence begins when your application redirects a browser to a CBO api URL; the URL includes query parameters that indicate the type of access being requested. As in other scenarios, CBO api server handles user authentication, session selection, and user consent. The result is an authorization code, which api returns to your application in a query string.

After receiving the authorization code, your application can exchange the code (along with a client ID and client secret) for an access token and, in some cases, a refresh token.

Node.js client library for [Oauth2](http://oauth.net/2/).

The URL used when authenticating a user is`http://<domain>:<port>/api/oauth2/authorize`.

## Requirements

You need to have installed Node.js and MongoDB.

## Installation


To install dependencies enter project folder and run following command:

    $ npm install

Install the client library using git:

    $ git clone https://github.com/PSESD/SSL-Auth.git
    $ cd SSL-Auth
    $ npm install


## Getting started


Create a file in `/src` named `.env` with the following values:

    AUTH_URL=http://url-of-srx-services-ssl-auth //ie, http://localhost:3000, do not include the "/api"
    DB_HOST=mongoDbName:password@url.com:port
    DB_MONGO_OPTIONS= //not necessary
    DB_NAME=mongoDBName
    MAILGUN_API_KEY=mailgun-key
    MAILGUN_DOMAIN=whatever.mailgun.org
    ROLLBAR_ACCESS_TOKEN=token-for-rollbar-account
    SALT=should-match-value-in-API
    SESSION_SECRET=should-match-value-in-API

**Start your app server:**

Run server:

    $ cd src && npm start

Run server with environment `test`:

    $ cd src && npm test

Run Unit Test:

    $ cd src && mocha




### Configurations

CBO OAuth2 accepts an object with the following valid params.

* `client_id` - Required registered Client ID.
* `redirect_uri` - One of the redirect URIs.
* `grant_type` - Defined in the OAuth 2.0 specification, this field must contain a value of `authorization_code`.



## Contributing

Fork the repo on github and send a pull requests with topic branches. Do not forget to
provide specs to your contribution.


### Running specs

* Fork and clone the repository (`dev` branch).
* Run `npm install` for dependencies.
* Run `npm start` to start server.
* Run `npm test` to start server with env `test`.

## Tools used

[mailgun](https://www.mailgun.com) - used to send emails (such as forgot password and new user links).

[httpie](https://github.com/jkbr/httpie) - command line HTTP client

## Make Requests

#### Register a new user

```
$ http POST http://localhost:3000/api/users email=test password=your_password last_name=your_last_name
```
#### User add a new client

```
$ http -a test:your_password POST http://localhost:3000/api/clients client_id=client name=client redirect_uri=http://localhost:3000
```

#### User get authorised page

```
$ http -a test:your_password GET http://localhost:3000/api/oauth2/authorize client_id==client response_type==code redirect_uri==http://localhost:3000
```

#### User should be able to authorise an access code

```
$ http -a test:your_password -f POST http://localhost:3000/api/oauth2/authorize transaction_id=<transaction_id>
```

#### Use access code to get a token

```
$ http -a <clientKey>:<secretKey> -f POST http://localhost:3000/api/oauth2/token code=<accessCode> grant_type=authorization_code redirect_uri=http://localhost:3000
```
###### Response:
```
{
    "access_token": "o1K60GNC2OiN9K67IUi9wpxj93Swr3NJ4lOgtC3N9iSJDHs14ue9dOcyzoA8tsf2aY6O11tc9ncEJItQ43ABPyunO6fDBNrPIRYz6JPCjv5l9qBiPrX9n8FIlPfzvYxED5wJRrx37jkn16ItOgK520cL0fZwShW23QsmdNA1m3wQRao8pxFDqhlVkqvcEWuqidgmD6GA7r90CjomgInREnIjVViMB6dkYVhcprKKvP8amZtGnT8st29ZtvgDH3Qh",
    "refresh_token": "DposMi6lpOVyrZirrjGjPMRyiXeXvWy7PlrtMS5G4aUyJtCNMNzAfnCxZiNI5uxO4h7xYPGzsuf2smVMBDKvDRy9ce4Iu2X8aumhyFPf0BC8cF9WmoOJ4dBDId4ybtBOCrNj7VYMPB6kf0MAht06ZhD5wzJi9gY3B7zq01Bq4qfKonasH1ObjggNNZcptVpYJiwiwyWSsJVowR0T64rg9fkm6qAFirpoGVj5cOm0CZd2kc1QcuJqXX60lteVYk4b",
    "expires_in": 3600,
    "token_type": "Bearer"
}
```

#### Use refresh token to get a token

```
$ http -a client:secret -f POST http://localhost:3000/api/oauth2/token grant_type=refresh_token refresh_token=<refresh_token>

```
###### Response:
```
{ 
   access_token: 'yjqVyVCSdTZwpqousI61znj4cvKl3JxMWVGkXGJtOdmngjvLMTGfqKDNSj6t8ANFNv0rQXw5c8epJRtU10iqY0im8cHyBLaGDCkXrbjoC0JZjKL9qRYPmqkr1SKybwkhVvYNJaNHjwPD4QPbzIPyPNBXmonifZPbIAEqfBiWheofl5fGLMZ2CCdi9NGx7CAuhWYUKPLwaNkiHql4OUHiTeSY5m2sU2LBrlHZyroAnz4IglJLvcS5ns4UGIsXCLno',
  refresh_token: 'Wp7kxGgZpGykAmvtQK54r0vYjsrvwE9UaeUV5pVXtB6uUGKbvuOPzkd2t6LZHZoJqCAmycR658FMe4BCPCqKhebJ6UG1jhFz8AqBcggqd4x9oR8KwdUjCHgYzrFfjJKflS80ytOJHonRN4Dhnp9vkg73E8aNqTVdR8Qfz8pstIeUXO7nUE9VzDE9gnJOBeinZAV0BcMyi7kED8tPxkVQTwitdL1zCJlgCPYxu1gaKMce2dXXlFoeSvBkwGBdglr4',
  expires_in: 3600,
  token_type: 'Bearer'
}
```

### For application, we can use client credentials to request a token:
#### Client Credentials to get a token
Here I'll show how to test Authorization Server with the grant type of Client Credentials.
References from the RFC:
[Client Credentials](http://tools.ietf.org/html/rfc6749#section-1.3.4)
[Client Credentials Grant](http://tools.ietf.org/html/rfc6749#section-4.4)
```
$ http -a <clientKey>:<secretKey> -f POST http://localhost:3000/api/oauth2/token grant_type=client_credentials
```
###### Response:
```
{
    "access_token": "3AF0u9-45VsWqALaaY7TomzW6zbU17Bl0J.2s5D62pd406yX8IF9zzt5vIoFWL3EGhKQgBO", 
    "token_type": "Bearer"
}

```
#### Use access token to get a user api end point

```
$ http GET http://localhost:4000/organizations x-cbo-client-url:http://<organizationUri> authorization:"Bearer <access_token>"

```
###### Response:
```
{
    "_links": {
        "self": {
            "href": "/organizations"
        }
    }, 
    "data": [
        {
            "__v": 0, 
            "_id": "<organizationId>", 
            "addresses": [
                {
                    "_id": "<addressId>", 
                    "address_line": "<address_line>", 
                    "address_type": "<address_type>", 
                    "city": "<city>", 
                    "country": "<country>", 
                    "location": {
                        "accuracy": "<accuracy>", 
                        "latitude": <latitude>, 
                        "longitude": <longitude>
                    }, 
                    "state": "<state>", 
                    "venue": "<venue>", 
                    "zip": "<zip>"
                }
            ], 
            "authorizedEntityId": 2, 
            "created": "2016-03-04T08:58:32.457Z", 
            "description": null, 
            "externalServiceId": 5, 
            "last_updated": "2016-03-04T08:58:32.457Z", 
            "name": "Organization Name", 
            "personnelId": null, 
            "url": "<organizationUri>", 
            "website": "<organizationUri>"
        }
    ], 
    "success": true, 
    "total": 1
}
```




## Coding guidelines

Follow [github](https://github.com/styleguide/) guidelines.


## Feedback

Use the [issue tracker](https://github.com/PSESD/CBO-Portal-Auth/issues) for bugs.
[Mail](mailto:support@upwardstech.com) us
for any idea that can improve the project.


## Links

* [GIT Repository](https://github.com/PSESD/CBO-Portal-Auth)
* [Documentation](https://github.com/PSESD/CBO-Portal-Auth)


## Authors

--- 


## Contributors

Special thanks to the following people for submitting patches.


## Changelog

See [CHANGELOG](https://github.com/PSESD/CBO-Portal-Auth/master/CHANGELOG.md)


## Copyright

Copyright (c) 2015

This project is released under the [MIT License](http://opensource.org/licenses/MIT).