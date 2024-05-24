
FROM ubuntu:22.04

# nodejs nvm install (https://stackoverflow.com/a/57546198)

RUN apt-get update && apt-get install -y wget git

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

# include spa frontend

WORKDIR /
RUN mkdir /app

RUN git clone https://github.com/CNTRPRTY/xcpdev-spa.git
WORKDIR /xcpdev-spa
## install and build
RUN npm install
RUN npx tailwindcss -i ./src/input.css -o ./src/output.css
RUN npm run build
## move build to expected spa_build folder
WORKDIR /
RUN mv ./xcpdev-spa/build ./app/spa_build
## cleanup
RUN rm -rf ./xcpdev-spa

# copy app files, install and run

COPY . /app
WORKDIR /app

RUN npm install

EXPOSE 3001
CMD [ "node", "index.js" ]
