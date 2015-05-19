#! /bin/bash
 
# HEADS UP! Make sure to use '*' or a valid hostname for the FDQN prompt
 
echo 01 > ca.srl
openssl genrsa -des3 -out ca-key.pem
openssl req -new -x509 -days 365 -key ca-key.pem -out ca.pem
 
openssl genrsa -des3 -out server-key.pem
openssl req -new -key server-key.pem -out server.csr
 
openssl x509 -req -days 365 -in server.csr -CA ca.pem -CAkey ca-key.pem -out server-cert.pem
 
openssl genrsa -des3 -out client-key.pem
openssl req -new -key client-key.pem -out client.csr
 
echo extendedKeyUsage = clientAuth > extfile.cnf
 
openssl x509 -req -days 365 -in client.csr -CA ca.pem -CAkey ca-key.pem -out client-cert.pem -extfile extfile.cnf
 
openssl rsa -in server-key.pem -out server-key.pem
openssl rsa -in client-key.pem -out client-key.pem
 
# server
# sudo docker -d --tlsverify --tlscacert=ca.pem --tlscert=server-cert.pem --tlskey=server-key.pem -H=0.0.0.0:4243
 
# client -- note that this uses --tls instead of --tlsverify, which I had trouble with 
# docker --tls --tlscacert=ca.pem --tlscert=client-cert.pem --tlskey=client-key.pem -H=dns-name-of-docker-host:4243

