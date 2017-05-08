FROM node:7.9-alpine

RUN apk add --no-cache bash sed grep coreutils

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# Wait forever
# CMD ["tail", "-f", "/dev/null"]
CMD ["echo", "Hello, world!" ">" "output.txt"]
