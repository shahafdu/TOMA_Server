ARG http_proxy=http://webproxy:8080 
ARG https_proxy=http://webproxy:8080 
ARG no_proxy=*.example.com,localhost

FROM node:20-bullseye-slim AS builder

# Build proxy configuration
ENV PROXY_HOST=webproxy.example.com 
        PROXY_PORT=8080 
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
    NO_PROXY='localhost,registry.local'
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN apt-get update -qq && 
    apt-get install ca-certificates wget -y
# Certificate download URL removed - configure via environment

RUN npm config set proxy $PROXY && 
    npm config set https-proxy $PROXY && 
    npm config set strict-ssl false && 
    npm config set loglevel "info"
RUN npm install pm2 -g

ENV NODE_OPTIONS=--openssl-legacy-provider


WORKDIR /code
ADD package.json .
ADD package-lock.json .
RUN npm install --force --include=dev # ci
ADD . .
RUN npm run build-docker
CMD ["npm", "start"]


FROM httpd as production
COPY --from=builder /code/dist/* /usr/local/apache2/htdocs/
EXPOSE 8080