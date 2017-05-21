# A container for the director component.
FROM node:7.9-alpine
RUN apk add --no-cache bash sed grep coreutils git

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ENV SRC=/usr/nimble/src

RUN mkdir -p ${SRC}

WORKDIR ${SRC}

ADD common/ ${SRC}/common/
ADD queue/ ${SRC}/queue/
ADD director/ ${SRC}/director/
ADD package.json ${SRC}/
ADD tsconfig.json ${SRC}/
ADD yarn.lock ${SRC}/

RUN cd ${SRC} && yarn install --pure-lockfile

ENTRYPOINT ["yarn", "run", "director"]
