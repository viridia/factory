# A container whose purpose is to provide the logging agent for worker pods.
FROM node:7.9-alpine
RUN apk add --no-cache bash sed grep coreutils git

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ENV SRC=/usr/nimble/src
ENV LOG=/var/nimble/log

RUN mkdir -p ${SRC}
RUN mkdir -p ${LOG}

WORKDIR ${SRC}

ADD common/ ${SRC}/
ADD queue/ ${SRC}/
ADD scheduler/ ${SRC}/
ADD package.json ${SRC}/
ADD tsconfig.json ${SRC}/
ADD yarn.lock ${SRC}/

RUN cd ${SRC} && yarn install --pure-lockfile

ENTRYPOINT ["yarn", "run", "scheduler"]
