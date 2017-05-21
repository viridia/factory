# A container whose purpose is to provide a development environment and a shell that runs inside
# a Kubernetes pod.
FROM node:7.9-alpine

RUN apk add --no-cache bash sed grep coreutils git curl procps

ENV SRC=/usr/nimble/src
ENV HOST=/usr/src/host
ENV WORK=/usr/src/work

RUN mkdir -p ${HOST}
RUN mkdir -p ${SRC}

WORKDIR ${SRC}

ADD /images/k8shell/bashrc.in /root/.bashrc
ADD /images/k8shell/inputrc.in /etc/inputrc

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# RUN cd ${WORK} && yarn

# Wait forever
ENTRYPOINT ["sleep", "infinity"]
