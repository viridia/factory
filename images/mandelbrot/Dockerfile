FROM golang

RUN apt-get update && apt-get install bc

# Create the directory for the worker scripts
ENV WORK=/usr/nimble/factory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Create the directory for the input / output directory which will be shared between workers
ENV SANDBOX=/usr/nimble/sandbox
RUN mkdir -p ${SANDBOX}

# Copy in the sources we need.
ADD images/mandelbrot/mandelbrot.go ${WORK}/
run go build mandelbrot.go

ADD start.sh ${WORK}/
run chmod a+x start.sh

# Run the command
ENTRYPOINT ["/usr/nimble/factory/start.sh"]
