#!/bin/bash

cd test

echo "Compression"
node testCompression.js

echo "DeviceManager"
node testDevMan.js

echo "PingManager"
node testPingMan.js

echo "Web-Remote-Control - LOCAL - UDP"
node testWRC-LocalProxy.js

echo "Web-Remote-Control - LOCAL - TCP"
PROTOCOL=TCP node testWRC-LocalProxy.js

#
# The following tests require a proxy configured and running on a remote server.
#

export PROXY_ADDRESS="your.remote.proxy.com"

if [ "${PROXY_ADDRESS}" != "" ]; then

    echo "Web-Remote-Control - REMOTE (${PROXY_ADDRESS}) - UDP"
    node testWRC-RemoteProxy.js

    echo "Web-Remote-Control - REMOTE (${PROXY_ADDRESS}) - TCP"
    PROTOCOL=TCP node testWRC-RemoteProxy.js

fi

cd ..
