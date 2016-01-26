#!/bin/bash

cd test

echo "DeviceManager"
node testDevMan.js

echo "PingManager"
node testPingMan.js

echo "Web-Remote-Control - UDP"
node testWRC.js

echo "Web-Remote-Control - TCP"
PROTOCOL=TCP node testWRC.js

# The following tests require a proxy configured and running on a remote server.
#
# echo "Web-Remote-Control - UDP - Using Remote Proxy"
# PROXY_ADDRESS="my.remote.server" node testWRC.js
#
# echo "Web-Remote-Control - TCP - Using Remote Proxy"
# PROXY_ADDRESS="my.remote.server" PROTOCOL=TCP node testWRC.js

cd ..
