# A container whose purpose is to provide a development environment and a shell that runs inside
# a Kubernetes pod.
FROM node:7.9-alpine

RUN apk add --no-cache bash sed grep coreutils git

ENV SRC=/usr/nimble/src
ENV HOST=/usr/src/host
ENV WORK=/usr/src/work

RUN mkdir -p ${HOST}
# RUN mkdir -p ${WORK}
RUN mkdir -p ${SRC}
# RUN ln -s ${HOST}/common ${WORK}/common
# RUN ln -s ${HOST}/director ${WORK}/director
# RUN ln -s ${HOST}/scheduler ${WORK}/scheduler

WORKDIR ${SRC}

ADD bashrc.in /root/.bashrc
ADD inputrc.in /etc/inputrc
# ADD package.json ${WORK}/
# ADD tsconfig.json ${WORK}/
# ADD yarn.lock ${WORK}/

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# RUN cd ${WORK} && yarn

# EXPOSE 8087
# VOLUME ["/usr/src/host"]
# VOLUME ["/usr/nimble/src"]

# Wait forever
CMD ["tail", "-f", "/dev/null"]
