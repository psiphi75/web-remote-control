# Web Remote Control

This module allows you to control an IoT (Internet of Things) device from the web (e.g. your mobile phone). This is a complete remote control solution that includes the following components:

- A Proxy - runs on a server and needs to be accessible to the Controller and Toy.
- The Controller - this can be via web or node.js.
- The Toy - the device being controlled (this should run node.js).

This solution is ideal for controlling devices over a cellular network (i.e where you cannot directly access by an IP). It uses the UDP protocol instead of TCP by default to make the communication more efficient. Note: UDP protocol is only available for node.js, currently no browsers support UDP for standard webpages.

Connection methods are:

- TCP - between node.js client/controller and proxy.
- UDP - between node.js client/controller and proxy. This protocol is optimised with a compression protocol using [smaz](https://www.npmjs.com/package/smaz).
- Socket.io - between Browser client and proxy.

## Installing from npmjs.org

```bash
npm install web-remote-control
```

## Installing from github

```bash
git clone https://github.com/psiphi75/web-remote-control

# Run the following commands if you want the web-remote-control.js for use in the browser.
sudo npm install -g browserify
cd scripts
build.sh
```


## Basic Usage

**The Proxy:**

The proxy is required to relay `command`s from the controller to device. It also accepts `ping`s and relays `status` messages from the device/controller to the controller/device.

The default port for TCP and UDP is 33330 and for socket.io it's 33331.

```javascript
var wrc = require('web-remote-control');
var proxy = wrc.createProxy();
```

**The Device (node.js):**

The device is what is being controlled. It accepts `command`s, `message`s, and `ping` responses. It can send `ping`s and `message`s.

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

**The Controller (from browser):**

```html
<script src="./web-remote-control.js"></script>
<script src="https://cdn.socket.io/socket.io-1.4.4.js"></script>
<script>

    var wrc = require('web-remote-control');
    var controller = wrc.createController({ proxyUrl: 'your proxy url' });

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

**The Controller (from node.js):**

The controller is what controls the device via a `command`. It accepts `status`s and `ping` responses. It can send `command`s and `status` updates.

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

The default values are shown below. This can be found in `index.js`.

```javascript
var defaults = {

    // This is the URL were the proxy is located.  Only Toys and Controllers can
    // configure this.
    proxyUrl: 'localhost',

    // This is the port of the proxy.  All three components (proxy, controller,
    // and toy) need to be configured on the same port.
    port: 33330,

    // This is the channel to use.  The proxy will ensure that only devices on
    // the same channel can communicate together.  The controller and toy need
    // to be on the same channel.  You can make the channel a unique string.
    channel: '1',

    // How often the device pings the proxy.  This helps ensure the connection
    // is kept alive.  You can disable this by setting it to 0 (zero). Time is
    // in milliseconds.
    keepalive: 30 * 1000,

    // This determines the logging to use.  By default it logs to the standard
    // console.
    log: console.log,

    // Use the TCP Protocol - only the proxy can use both TCP and UDP.
    tcp: true,

    // Use the UDP protocol - only the proxy can use both TCP and UDP.
    udp4: true,

    // Allow connections to proxy via Socket.IO
    socketio: true

    // Options for the proxy - should there be only one device (toy/controller) per channel?
    onlyOneControllerPerChannel: false,
    onlyOneToyPerChannel: false

    // A listener is can only see the Toy's status.  It cannot send control commands.
    allowObservers: false,

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

## Sticky messages

It is possible to create sticky messages of type 'command' and 'status' using `stickyCommand()` and `stickyStatus()`. A sticky message will be held by the proxy for a given channel and by provided to all devices registering on that channel. Only one sticky message will be kept at a time, new sticky messages will overwrite the old.

## Communication Protocol

In case you want to build your own client/server (Device/Proxy) in another language the Protocol for web-remote-control has been described [here](https://github.com/psiphi75/web-remote-control/blob/master/Protocol.md).

## Known Issues and To-Do items

Below are known issues, feel free to fix them.

- Proxy default of UDP, fallback to TCP.
- Refactor Socket connections - seperate the socket open, write and close from ServerConnection.js.
- TCP sockets may be crash the system when two TCP write events occur at the same time.  Need to wait for TCP drain event.
- **Done**: Sticky messages added.
- **Done**: Create observer device that can't remote control the device.
- **Done**: Allow only one controller per channel.
- **Done**: Integrate the static fileserver (WebServer.js) with the proxy. This simplifies the creation of the whole web-remote-control functionality.
- **Done**: Out of order packets are not handled, we should only use the most recent command packet.
- **Done**: Add the creation of "web-remote-control.js" to the install (need to run build.sh) and include browserify as a global.
- **Done**: The web component needs creating and documented.
- **Done** (for UDP): Compression currently does not work. Because the packet length is so short (can be less than 50 bytes) standard compression algorithms don't work, in-fact the make the data payload bigger. [smaz](https://www.npmjs.com/package/smaz) is a neat library that accommodates this and can compress short strings.
- **Fixed**: TCP functionality missing.
- **Fixed**: If we are not registered, try again in 30 seconds.
- **Fixed**: Each ping creates a new listener.

## License

Copyright 2016 Simon M. Werner

Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. The ASF licenses this file to you under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
