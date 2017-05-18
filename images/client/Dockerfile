# A container whose purpose is to provide the logging agent for worker pods.
FROM node:7.9-alpine
RUN apk add --no-cache bash sed grep coreutils git

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ENV SRC=/usr/nimble/src

RUN mkdir -p ${SRC}

WORKDIR ${SRC}

ADD client/src/ ${SRC}/client/src/
ADD client/nginx/ ${SRC}/client/nginx/
ADD client/index.html ${SRC}/client/index.html
ADD client/package.json ${SRC}/client/package.json
ADD client/tsconfig.json ${SRC}/client/tsconfig.json
ADD client/webpack.config.js ${SRC}/client/webpack.config.js
ADD client/yarn.lock ${SRC}/client/yarn.lock
ADD common/ ${SRC}/common/

RUN cd ${SRC}/client && yarn install --pure-lockfile && yarn build

# Since this docker image merely hosts static files, just wait forever.
ENTRYPOINT ["sleep", "infinity"]
