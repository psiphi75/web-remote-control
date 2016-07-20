# Communication Protocol

In case you want to build your own client/server (device/proxy) in another language the Protocol for web-remote-control
is described below.

## Overview

The devices (toys, controllers and observers) communicate with each other through the proxy.  A proxy must be available with the
network ports set and correct UDP/TCP/SocketIO protocols enabled both on the devices and the proxy.  The proxy can
communicate in any of the network protocols (UDP/TCP/SocketIO), while a device can only use one protocol.

The devices register on a channel, the channel can be any valid JavaScript string.  For a given channel there can be
only one toy and only one controller.  There can be any number of observers.  The proxy will disconnect the last toy/controller if a new toy/controller
registers.  All devices on a channel can only talk between themselves.

## The Protocol

This section describes the protocol in detail.  All messages are JSON strings and passed over the respective network
 layer:
 - UDP the packet must fit into one UDP packet. See the *Note on UDP and smaz* section below.
 - A TCP socket
 - Socket.io is used for web browser to proxy communication.  Because web browser communication does not support
   raw TCP or UDP.

Below is the structure of all messages.  The `Unique ID` is not always present.
```JSON
{
  "type": [String: Message type],
  "seq": [Integer: Sequence Number],
  "uid": [Number: Unique ID],
  "data": [any: Data]
}
[NEWLINE]
```

The message needs to be standard JSON format, so white space does not matter.  For all
examples in the documentation whitespace is included for clarity.

A newline character must be at the end of every message.  This helps seperate messages
when communciating over Socket.io, although it is required for all protocols.

No acknowledgment packets are sent at all, this is left up to the network layer.

### Message fields

The fields in the JSON message are described below.

**type:**  Message Type

This string defines the type of message being received.  The value must be one of the following:
 - `register` - sent by all devices and by proxy as response.
 - `command` - sent by controller devices.
 - `status` - sent by toy devices.
 - `ping` - sent by devices.
 - `error` - sent by proxy.

**seq:**  Sequence Number

This number defines the number of packet sent by the Device.  It allows old packets
to be dropped.  Because when you are controlling devices in real time, old packets contain old information that is likely not relevant.

**uid:**  Unique ID

This string is the unique ID of the device provided by the proxy, it provides a
light authentication method.  It will be in the response message on registration.
It must be in every message type (except 'register') sent by the device to the proxy.

**data:**  Data

This field can be any type.  It is the payload from the sender to the recipient.
The recipient may be another device or the proxy.

### Message types

#### register

This type of message only occurs once, it must be the first communication point.

* *Senders*: toy, controller, observer, proxy
* *Final recipient*: proxy or the sending device
* *Mandatory fields*: `type`, `seq`, `data`
* *Data*: The `data` field must contain an object with the following fields:
    * `deviceType`: String (mandatory):  this must be one of `toy`, `controller`, `observer`.
    * `channel`: String (optional): the channel to register on.  If not provided the proxy will create a default channel.
* *Response from proxy to sender*: After the request is received a `register` or `error` message is returned by the proxy.  The `register` message indicates success and will contain the following:
    * `type`: "register".
    * `seq`: will be the same sequence number as in the request message.
    * `uid`: The Unique ID string.  This must be stored for future requests.

Example message to proxy:
```JSON
{
    "type": "register",
    "seq": 1,
    "data": {
        "deviceType": "toy",
        "channel": 1
    }
}\n
```

Example response from proxy.
```JSON
{
    "type": "register",
    "seq": 1,
    "uid":"S1ebSunv"
}\n
```

#### command

This type of message is sent by contoller devices and propagated to toy devices.

* *Senders*: controller
* *Final recipient*: toy (via proxy)
* *Mandatory fields*: `type`, `seq`, `uid`, `data`
* *Data*: The `data` field can contain any valid JSON type
* *Response from proxy to sender*: none

Example request from controller to proxy (which forwards to toy):
```JSON
{
    "type": "command",
    "seq": 199,
    "data": "This is my command",
    "uid": "S1ebSunv"
}\n
```

Example from proxy to toy (based on `command` example above):
```JSON
{
    "type": "command",
    "seq": 199,
    "data": "This is my command",
    "uid": "HkrJt_nv"
}\n
```


#### status

This type of message is sent by toy devices and propagated to controller and observer devices.

* *Senders*: toy
* *Final recipient*: controller, observer
* *Mandatory fields*: `type`, `seq`, `uid`, `data`
* *Data*: The `data` field can contain any valid JSON type
* *Response from proxy to sender*: none

Example request from toy to proxy (which forwards to controller / observer):
```JSON
{
    "type": "status",
    "seq": 1045,
    "data": {
        "any-old-value": "This is my any-old-status"
    },
    "uid": "HkrJt_nv"
}\n
```

Example from proxy to controller (based on `status` example above):
```JSON
{
    "type": "status",
    "seq": 1045,
    "data": {
        "any-old-value": "This is my any-old-status"
    },
    "uid": "S1ebSunv"
}\n
```

#### ping

This type of message is only between the device and proxy.  It can occur any number of times.
It can be used to keep the network connection active, which may be necessary for some networks.

* *Senders*: toy, controller, observer, proxy
* *Final recipient*: The sending device
* *Mandatory fields*: `type`, `seq`, `uid`, `data`
* *Data*: The `data` field can contain any valid JSON type.  
* *Response from proxy to sender*: On receving a ping the proxy
          will return the the message immediately.  The fields returned are:
    * `type`: "ping".
    * `seq`: Same value as in the request message.
    * `uid`: Same value as in the request message.
    * `data`: Same value as in the request message.

Note: you can send a time value and then calcuate the round trip time.

Example message to proxy:
```JSON
{
    "type": "ping",
    "seq": 999,
    "uid": "S1ebSunv",
    "data": 1234567890
}\n
```

Example response from proxy.
```JSON
{
    "type": "ping",
    "seq": 999,
    "uid": "S1ebSunv",
    "data": 1234567890
}\n
```


#### error

This message is sent by the proxy only, and always in response to a mesasge from the device.

* *Senders*: proxy, on a request from a device
* *Final recipient*: The sending device
* *Mandatory fields*: n/a
* *Data*: The `data` field can contain any valid JSON type.  
* *Response from proxy to sender*: On receving a ping the proxy will return the the message immediately.  The fields returned are:
    * `type`: "error".
    * `seq`: Same value as in the request message.
    * `uid`: null
    * `data`: Error code (see [errors.js](https://github.com/psiphi75/web-remote-control/blob/master/src/errors.js) for all error codes).

Example error from proxy.
```JSON
{
    "type": "error",
    "seq": 123,
    "uid": null,
    "data": 1001
}\n
```


## Note on UDP and smaz

Currently for the UDP protocol a customised [smaz](https://github.com/antirez/smaz) algorithm is used.  The purpose of this is to reduce the size of the data transmitted.  General purpose compression algorithms usually are very poor for small payloads.  The smaz algorithm is used and generally obtains compression ratios of around 50%.  A custom built smaz map is used.  How this works is not currently documented, you will need to read the code.
