#!/bin/bash

cd tests

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
#
# run this script using `PROXY_ADDRESS="your.proxy.com" ./runAll.sh`
#
# Proxy should be started using:
#     var proxy = wrc.createProxy({udp4:true, allowObservers:true});
#
if [ "${PROXY_ADDRESS}" != "" ]; then

    echo "Web-Remote-Control - REMOTE (${PROXY_ADDRESS}) - UDP"
    node testWRC-RemoteProxy.js

    echo "Web-Remote-Control - REMOTE (${PROXY_ADDRESS}) - TCP"
    PROTOCOL=TCP node testWRC-RemoteProxy.js

fi

cd ..
