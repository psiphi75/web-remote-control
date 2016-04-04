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

#
# The following tests require a proxy configured and running on a remote server.
#

# export PROXY_ADDRESS="my.remote.server"
#
# echo "Web-Remote-Control - UDP - Using Remote Proxy"
# node testWRC.js
#
# echo "Web-Remote-Control - TCP - Using Remote Proxy"
# PROTOCOL=TCP node testWRC.js

cd ..
