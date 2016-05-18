#!/bin/bash
#
# This calls Browserify to generate code for the browser.
#

TARGET="web-remote-control.js"

SRC_DIR="../src"
WWW_DIR="../www"

BRSFY=`which browserify`

if [ "${BRSFY}" = "" ]; then
    echo "Please install browserify globally (npm install -g browserify)."
fi

# Build messageHandler
$BRSFY  -r $SRC_DIR/messageHandler.js:messageHandler                 \
        -r $SRC_DIR/PingManager.js:PingManager                       \
        -r $SRC_DIR/Device.js:Device                                 \
        -r $SRC_DIR/WebClientConnection.js:WebClientConnection       \
        --outfile $WWW_DIR/$TARGET

echo "Built $TARGET"
