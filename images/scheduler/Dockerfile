# A container for the scheduler component.
FROM node:7.9-alpine
RUN apk add --no-cache bash sed grep coreutils git

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ENV SRC=/usr/nimble/src

RUN mkdir -p ${SRC}

WORKDIR ${SRC}

ADD common/ ${SRC}/common/
ADD queue/ ${SRC}/queue/
ADD scheduler/ ${SRC}/scheduler/
ADD package.json ${SRC}/
ADD tsconfig.json ${SRC}/
ADD yarn.lock ${SRC}/

RUN cd ${SRC} && yarn install --pure-lockfile

ENTRYPOINT ["yarn", "run", "scheduler"]
