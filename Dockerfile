# Dockerfile for installing and running Nginx
# Select ubuntu as the base image
FROM ubuntu
MAINTAINER M Bintang <halilintar8@yahoo.com>

#VOLUME ["/src"]
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# Install nginx
RUN apt-get update
RUN apt-get -y install curl unzip git wget
RUN apt-get install -y nginx
#RUN echo "server_tokens off;" >> /etc/nginx/nginx.conf
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

ADD /src /src
ADD default.conf /etc/nginx/sites-available/default
#RUN chown -R www-data:www-data /data/src/html

# Install mongodb
#RUN apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10 \
# && echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' > /etc/apt/sources.list.d/mongodb.list \
# && apt-get update \
# && apt-get install -y mongodb-org-server \
# && sed 's/^bind_ip/#bind_ip/' -i /etc/mongod.conf 

#ADD start /start
#RUN chmod -R 755 /start
#VOLUME ["/var/lib/mongodb"]
#CMD ["/start"]

#RUN \
#   apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10 && \
#   echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list && \
#   apt-get update && \
#   apt-get install -y mongodb-org

#VOLUME ["/data/db"]
#WORKDIR /data

#EXPOSE 27017

#CMD ["mongod"]

RUN apt-get install -y mongodb
ADD mongodb.conf /etc/mongodb.conf
#RUN apt-get install -y supervisor
#ADD Supervisorfile /etc/supervisor/conf.d/
#RUN echo_supervisord_conf > /etc/supervisord.conf
#RUN printf "[include]\nfiles = /var/www/Supervisorfile\n" >> /etc/supervisord.conf

#CMD ["/usr/local/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"] 
#run mkdir -p /data/db
#run mkdir -p /var/log/supervisor
#add supervisord.conf /etc/supervisor/conf.d/supervisord.conf

#RUN \
#  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10 && \
#  echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' > /etc/apt/sources.list.d/mongodb.list && \
#  apt-get update && \
#  apt-get install -y mongodb-org
#VOLUME ["/data/db"]
#WORKDIR /data
#RUN /etc/init.d/mongodb start
#CMD ["mongod"]

# Install Node.js and npm
RUN apt-get install -y nodejs
RUN apt-get install -y npm
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Define working directory.
WORKDIR /src

RUN npm -g update npm
RUN npm install -g forever
RUN npm install
#RUN forever -w -a start app.js
CMD forever -c 'node --harmony' /src/app.js
#CMD forever /src/app.js
#RUN node app.js &

# Publish port 80
EXPOSE 80 443 3000 27017 28017
#CMD ["/usr/bin/mongod", "--config", "/etc/mongodb.conf"] 
#CMD ["usr/bin/mongod", "--smallfiles"]
#CMD ["mongod", "--smallfiles"]

# Start nginx when container starts
ENTRYPOINT /usr/sbin/nginx
#ENTRYPOINT /usr/bin/mongod
#cmd ["/usr/bin/supervisord", "-n"]

