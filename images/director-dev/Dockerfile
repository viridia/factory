FROM node:7.9-alpine

RUN apk add --no-cache bash sed grep coreutils

ENV HOST=/usr/src/host
ENV WORK=/usr/src/work

RUN mkdir -p ${HOST}
RUN mkdir -p ${WORK}
RUN ln -s ${HOST}/common ${WORK}/common
RUN ln -s ${HOST}/director ${WORK}/director
RUN ln -s ${HOST}/scheduler ${WORK}/scheduler

WORKDIR ${WORK}

ADD images/director-dev/bashrc.in /root/.bashrc
ADD images/director-dev/inputrc.in /etc/inputrc
ADD package.json ${WORK}/
ADD tsconfig.json ${WORK}/
ADD yarn.lock ${WORK}/

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

RUN cd ${WORK} && yarn

EXPOSE 8087

# VOLUME ["/usr/src/host"]

# Wait forever
CMD ["tail", "-f", "/dev/null"]
# CMD ["yarn", "start"]
