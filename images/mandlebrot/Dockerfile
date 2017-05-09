FROM node:7.9-alpine

RUN apk add --no-cache bash sed grep coreutils

# Create the directory for the worker scripts
ENV WORK=/usr/nimble/factory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Create the directory for the input / output directory which will be shared between workers
ENV SANDBOX=/usr/nimble/sandbox
RUN mkdir -p ${SANDBOX}

# Copy in the scripts we need.
ADD hello.sh ${WORK}/
RUN chmod a+x hello.sh

# Run the command
ENTRYPOINT ["./hello.sh"]
