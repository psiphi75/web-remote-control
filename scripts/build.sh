#!/bin/bash
#
# This calls Browserify to generate code for the browser.
#

TARGET="web-remote-control.js"

cd ../
SRC_DIR="./src"
WWW_DIR="./www"

mkdir -p $WWW_DIR

BRSFY=`which browserify`

if [ "${BRSFY}" = "" ]; then
    echo "Please install browserify globally (npm install -g browserify)."
fi

# Build web-remote-control
$BRSFY  --require ./index.js:web-remote-control                             \
        --require $SRC_DIR/PingManager.js:PingManager                       \
        --require $SRC_DIR/Device.js:Device                                 \
        --require $SRC_DIR/WebClientConnection.js:WebClientConnection       \
        --require $SRC_DIR/messageHandler.js:messageHandler                 \
        --exclude $SRC_DIR/ClientConnection.js                              \
        --exclude $SRC_DIR/Proxy.js                                         \
        --outfile $WWW_DIR/$TARGET

echo "Built $TARGET"
