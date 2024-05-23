
FROM ubuntu:22.04

# nodejs nvm install (https://stackoverflow.com/a/57546198)

RUN apt-get update && apt-get install -y wget

ENV HOME /root
WORKDIR /

ENV NODE_VERSION=20.11.0
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

# copy app files, install and run

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN npm install

EXPOSE 3001
CMD [ "node", "index.js" ]
