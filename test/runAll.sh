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

cd ..
