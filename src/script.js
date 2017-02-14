/**
 * Created by zaenal on 31/05/16.
 */
'use strict';
/**
 *
 */
var what = process.argv.slice(2)[0];

if(process.env.CIRCLE_BRANCH === 'develop'){
    var SSH_USERNAME = process.env.DEV_SSH_USERNAME;
    var SSH_PASSWORD = process.env.DEV_SSH_PASSWORD;
    var SSH_HOST = process.env.DEV_SSH_HOST;
    var DOCKER_EMAIL = process.env.DEV_DOCKER_EMAIL;
    var DOCKER_USER = process.env.DEV_DOCKER_USER;
    var DOCKER_PASS = process.env.DEV_DOCKER_PASS;
    var SSH = require('simple-ssh');
    var ssh = new SSH({
        host: SSH_HOST,
        user: SSH_USERNAME,
        pass: SSH_PASSWORD
    });
    if(what === 'build') {
        ssh
            .exec('cd /home/cbo/docker/auth', {
                out: console.log.bind(console)
            })
            .exec('git fetch', {
                out: console.log.bind(console)
            })
            .exec('git reset --hard origin/develop', {
                out: console.log.bind(console)
            })
            .exec('docker build -t psesd/ssl-auth:develop .', {
                out: console.log.bind(console)
            })
            .exec('docker rm -f auth', {
                out: console.log.bind(console)
            })
            .exec('docker run -d --name auth -p 104.192.103.13:443:443 -e "NODE_ENV=development" -e "NODE_CONFIG_DIR=/config" -v /config:/config psesd/ssl-auth:develop', {
                out: console.log.bind(console)
            })
            .exec('echo "DONE"', {
                exit: function (code) {
                    process.exit(0);
                }
            });
    } else {
        ssh
            .exec('cd /home/cbo/docker/api', {
                out: console.log.bind(console)
            })
            .exec('docker login -e "' + DOCKER_EMAIL + '" -u "' + DOCKER_USER + '" -p "' + DOCKER_PASS + '"', {
                out: console.log.bind(console)
            })
            .exec('docker push psesd/ssl-auth:develop', {
                out: console.log.bind(console)
            })
            .exec('echo "DONE"', {
                exit: function (code) {
                    process.exit(0);
                }
            })
    }
    ssh.start();

} else {
    throw 'Not valid environment';
}