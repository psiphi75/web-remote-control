# Web Remote Control
Remote control an IoT (Internet of Things) device from the web.  This also has a proxy which makes this solution ideal for controlling devices on the cellular network (i.e where you cannot directly access by an IP).  It uses the UDP protocol instead of TCP by default to make the communication more efficient.  Note: UPD protocol is only available for node.js, currently no browsers support UDP for standard webpages.

Three components are provided:
- Proxy - needs to be run on a server accessible to the Controller and Toy.
- Controller - this can be via web or node.js.
- Toy - the device being controlled (this should run node.js).

Connection methods are:
- TCP - between node.js client and proxy.
- UDP - between node.js client and proxy.
- Socket.io - between Browser client and proxy.

## Install

```bash
$ npm install web-remote-control
```

## Basic Usage
**The Proxy:**

The proxy is required to relay `command`s from the controller to device. It also accepts `ping`s and relays `status` messages from the device/controller to the controller/device.

The default port is 33330.

```javascript
var wrc = require('web-remote-control');
var proxy = wrc.createProxy();
```

**The Device (node.js):**

The device is what is being controlled.  It accepts `command`s, `message`s, and `ping` responses.  It can send `ping`s and `message`s.

```javascript
var wrc = require('web-remote-control');
var toy = wrc.createToy({ proxyUrl: 'your proxy url'});

// Should wait until we are registered before doing anything else
toy.on('register', function() {

    // Ping the proxy and get the response time (in milliseconds)
    toy.ping(function (time) {
        console.log(time);
    });

    // Send a status update to the controller
    toy.status('Hi, this is a message to the controller.');

});

// Listens to commands from the controller
toy.on('command', function(cmd) {
    console.log('The controller sent me this command: ', cmd);
});
```


**The Controller (browser):**

See ./www/public/index.html for the below example in action.

_Note: you need to run the `build.sh` script to build the browser based JavaScript code.  This relies on a globally installed browserify runtime._

```html
<script src="./web-remote-control.js"></script>
<script src="https://cdn.socket.io/socket.io-1.4.4.js"></script>
<script>
    var Device = require('Device');
    var controller = new Device({ proxyUrl: 'localhost', deviceType:'controller' }, require('WebClientConnection'));

    controller.connection.socket.on('connect', function() {
        controller.on('register', function() {
            controller.ping(function(t) {
                console.log('pinged: ', t);
            })
            controller.command('do this!!!');
            controller.on('status', function(status) {
                console.log('Controller: Toy said: ', status);
            })
        });
    });
</script>
```


**The Controller (node.js):**

The controller is what controls the device via a `command`.  It accepts `status`s and `ping` responses.  It can send `command`s and `status` updates.

```javascript
var wrc = require('web-remote-control');
var controller = wrc.createController({ proxyUrl: 'your proxy url' });

// Should wait until we are registered before doing anything else
controller.on('register', function() {

    controller.command('Turn Left');

});

controller.on('status', function (status) {
    console.log('I got a status message: ', status);
});
```

# More Advanced Usage

The default values are shown below.  This can be found in `index.js`.

```javascript
var defaults = {

  // This is the URL were the proxy is located.  Only Toys and
  // Controllers can configure this.
  proxyUrl: 'localhost',

  // This is the port of the proxy.  All three components (proxy,
  // controller and toy) need to be configured on the same port.
  port: 33330,

  // This is the channel to use.  The proxy will ensure that only devices
  // on the same channel can communicate together.  The controller and
  // toy need to be on the same channel.  You can make the channel a
  // unique string.
  channel: 1,

  // How often the device pings the proxy.  This helps ensure the
  // connection is kept alive.  You can disable this by setting it to
  // 0 (zero).
  keepalive: 30 * 1000,

  // This determines the logging to use.  By default it logs to the
  // standard console.  Set this to `function () {}` if you wish to not
  // log anything.
  log: console.log,

  // Use the TCP Protocol - only the proxy can use both TCP and UDP.
  tcp: false,

  // Use the UDP protocol - only the proxy can use both TCP and UDP.
  udp4: true

};
```

Below is an example for creating a custom proxy.

```javascript
var wrc = require('web-remote-control');
var settings = {
    port: 12345,
    log: function () {}  // turn logging off
};
var proxy = wrc.createProxy(settings);
```

## Known Issues and To-Do items

Below are known issues, feel free to fix them.

- Out of order packets are not handled, we should only use the most recent command packet.
- Compression currently does not work.  Because the packet length is so short (can be less than 50 bytes) standard compression algorithms don't work, in-fact the make the data payload bigger.  [smaz](https://www.npmjs.com/package/smaz) is a neat library that accommodates this and can compress short strings.  However, when I send packets with smaz they don't decompress properly. Although the same data compresses and decompresses fine when it is not transmitted.
- Integrate the static fileserver (WebServer.js) with the proxy.  This simplifies the creation of the whole web-remote-control functionality.
- **Done**: The web component needs creating and documented.
- **Fixed**: TCP functionality missing.
- **Fixed**: If we are not registered, try again in 30 seconds.
- **Fixed**: Each ping creates a new listener.

## License

Copyright 2016 Simon M. Werner

Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.  See the NOTICE file distributed with this work for additional information regarding copyright ownership.  The ASF licenses this file to you under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.  You may obtain a copy of the License at

  [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.
