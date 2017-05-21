# A container whose purpose is to serve the frontend files for the client.
FROM nginx:1.13

ENV HTML=/usr/share/nginx/html

RUN mkdir -p ${HTML}

WORKDIR ${HTML}

# Copy frontend content - note it must be built first.
ADD client/index.html ${HTML}/
ADD client/dist/ ${HTML}/dist/

# Copy nginx config
ADD images/client/nginx.factory.conf /etc/nginx/conf.g/
