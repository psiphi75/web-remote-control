#!/bin/bash

cd test

echo "DeviceManager"
node testDevMan.js

echo "PingManager"
node testPingMan.js

echo "Web-Remote-Control"
node testWRC.js

cd ..
