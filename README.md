Content goes here...[![Build Status](https://travis-ci.org/PSESD/cbo-data-portal.svg?branch=master)](https://travis-ci.org/PSESD/cbo-data-portal)
[![Dependency Status](https://gemnasium.com/PSESD/cbo-data-portal.svg)](https://gemnasium.com/PSESD/cbo-data-portal)

# Secure Data Portal for community-based organizations (CBO's)

## Overview
The authorization sequence begins when your application redirects a browser to a CBO api URL; the URL includes query parameters that indicate the type of access being requested. As in other scenarios, CBO api server handles user authentication, session selection, and user consent. The result is an authorization code, which api returns to your application in a query string.

After receiving the authorization code, your application can exchange the code (along with a client ID and client secret) for an access token and, in some cases, a refresh token.

Node.js client library for [Oauth2](http://oauth.net/2/).

The URL used when authenticating a user is`http://<domain>:<port>/api/oauth2/authorize`.

## Requirements

You need to have installed Node.js and MongoDB

## Installation


To install dependencies enter project folder and run following command:

    $ npm install

Install the client library using git:

    $ git clone https://github.com/PSESD/cbo-data-portal.git
    $ cd cbo-data-portal
    $ npm install


## Getting started

Run server:

    $ npm start

Run server with environment `test`:

    $ NODE_ENV=test npm start

Run Unit Test:

    $ mocha test/auth/oauth2.js




### Configurations

CBO OAuth2 accepts an object with the following valid params.

* `clientID` - Required registered Client ID.
* `clientSecret` - Required registered Client secret.
* `redirect_uri` - One of the redirect URIs.
* `grant_type` - Defined in the OAuth 2.0 specification, this field must contain a value of `authorization_code`.



## Contributing

Fork the repo on github and send a pull requests with topic branches. Do not forget to
provide specs to your contribution.


### Running specs

* Fork and clone the repository (`dev` branch).
* Run `npm install` for dependencies.
* Run `npm start` to start server.
* Run `NODE_ENV=test npm start` to start server with env `test`.

## Tools used

[httpie](https://github.com/jkbr/httpie) - command line HTTP client

## Make Requests

#### Register a new user

```
$ http POST http://localhost:3000/api/users username=test password=your_password
```
#### User add a new client

```
$ http -a test:your_password POST http://localhost:3000/api/clients client_id=client name=client client_secret=secret
```

#### User get authorised page

```
$ http -a test:your_password GET http://localhost:3000/api/oauth2/authorize?client_id=client&response_type=code&redirect_uri=http://localhost:3000
```

#### User to authorise an access code

```
$ http -a test:your_password -f POST http://localhost:3000/api/oauth2/authorize transaction_id: <transaction_id>
```

#### User access code to get a token

```
$ http -a client:secret -f POST http://localhost:3000/api/oauth2/authorize code=<accessCode> grant_type=authorization_code redirect_uri=http://localhost:3000
```

## Coding guidelines

Follow [github](https://github.com/styleguide/) guidelines.


## Feedback

Use the [issue tracker](https://github.com/PSESD/cbo-data-portal/issues) for bugs.
[Mail](mailto:support@upwardstech.com) us
for any idea that can improve the project.


## Links

* [GIT Repository](https://github.com/PSESD/cbo-data-portal)
* [Documentation](https://github.com/PSESD/cbo-data-portal)


## Authors

--- 


## Contributors

Special thanks to the following people for submitting patches.


## Changelog

See [CHANGELOG](https://github.com/PSESD/cbo-data-portal/master/CHANGELOG.md)


## Copyright

Copyright (c) 2015

This project is released under the [MIT License](http://opensource.org/licenses/MIT).