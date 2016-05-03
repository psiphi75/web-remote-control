#!/bin/bash
#
# This script will start the WebServer and Proxy using forever.
#
# To install forever usr:
#     sudo npm install -g forever
#


CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $CWD
WRC_DIR=`pwd`/../

PROXY_ERROR_LOG="proxyError.log"
PROXY_LOG="proxy.log"
WEB_LOG="wrcWebServer.log"


#
# Start the proxy
#
cd $WRC_DIR
forever start                        \
    --append                         \
    --watchDirectory $WRC_DIR/       \
    --watchDirectory $WRC_DIR/src/   \
    -l $PROXY_LOG                    \
    -e $PROXY_ERROR_LOG              \
    --uid proxy                      \
     runProxy.js


#
# Start the WebServer
#
cd $WRC_DIR/www/
forever start                        \
    --append                         \
    --watchDirectory $WRC_DIR/       \
    --watchDirectory $WRC_DIR/src/   \
    -l ${DIR}/wrcWebServer.log       \
    -e ${DIR}/wrcWebServer.log       \
    --uid www                        \
     WebServer.js
