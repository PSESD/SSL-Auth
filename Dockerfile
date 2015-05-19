# Dockerfile for installing and running Nginx

# Select ubuntu as the base image
FROM ubuntu
MAINTAINER Bintang <halilintar8@yahoo.com>

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# Install nginx
RUN apt-get update
RUN apt-get install -y nginx
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Publish port 80
EXPOSE 80

# Start nginx when container starts
ENTRYPOINT /usr/sbin/nginx

