FROM node:20-bullseye-slim

# SIRC proxy configuration [debian/ubuntu]
# Copied from <PLACEHOLDER_SNIPPET_URL>
# if you still run into network issues, try building the image on a different server :)
ENV PROXY_HOST=<PLACEHOLDER_PROXY_HOST> 
        PROXY_PORT=<PLACEHOLDER_PROXY_PORT> 
        PROXY_PROTOCOL=http
ENV PROXY $PROXY_PROTOCOL://$PROXY_HOST:$PROXY_PORT
RUN echo "Acquire::http::Proxy "$PROXY";" >> /etc/apt/apt.conf; 
    echo 'Acquire::https::Verify-Peer "false";' >> /etc/apt/apt.conf; 
    echo "[http]
sslverify = false
# proxy = $PROXY" >> /root/.gitconfig
ENV HTTP_PROXY=$PROXY 
    http_proxy=$PROXY 
    HTTPS_PROXY=$PROXY 
    https_proxy=$PROXY 
    NO_PROXY='<PLACEHOLDER_NO_PROXY>'
ENV NODE_TLS_REJECT_UNAUTHORIZED=0


RUN apt-get update -qq && 
    apt-get install ca-certificates wget -y && 
    wget <PLACEHOLDER_CA_CERT_URL> -P /usr/local/share/ca-certificates/ && 
    update-ca-certificates

RUN npm config set proxy $PROXY && 
    npm config set https-proxy $PROXY && 
    npm config set strict-ssl false && 
    npm config set loglevel "info"
RUN npm install -g 
  # prod server
  pm2 
  # dev server
  nodemon


WORKDIR /code

ADD package.json package-lock.json ./
RUN npm ci
ADD . .

ENV NODE_ENV=production
CMD [ "pm2-runtime", "start", "coma-server.js", "-i", "2" ]