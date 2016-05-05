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

PROXY_ERROR_LOG="${WRC_DIR}/proxyError.log"
PROXY_LOG="${WRC_DIR}/proxy.log"
WEB_LOG="${WRC_DIR}/wrcWebServer.log"


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
    -l ${WEB_LOG}                    \
    -e ${WEB_LOG}                    \
    --uid www                        \
     WebServer.js
