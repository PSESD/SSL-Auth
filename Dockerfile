# Dockerfile for installing and running Nginx
# Select ubuntu as the base image
FROM ubuntu
MAINTAINER M Bintang <halilintar8@yahoo.com>

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

#Set Environment Variable
ENV NODE_ENV production
ENV NODE_CONFIG_DIR /src/config

# Install Required Packages
RUN apt-get update
RUN apt-get -y install curl unzip git wget vim nginx nodejs npm
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Setup Nginx
RUN echo "server_tokens off;" >> /etc/nginx/nginx.conf
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
ADD /startup/webserver.pem /etc/ssl/webserver.pem
ADD /startup/webserver.key /etc/ssl/webserver.key
ADD default.conf /etc/nginx/sites-available/default

# Setup NodeJS Application
ADD /src /src
WORKDIR /src
RUN npm -g update npm
RUN npm install

# Publish port
EXPOSE 443

# Run Supervisord
ADD supervisord.conf /etc/supervisord.conf
CMD ["/usr/bin/supervisord -n"]

