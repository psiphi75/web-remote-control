/*********************************************************************
 *                                                                   *
 *   Copyright 2016 Simon M. Werner                                  *
 *                                                                   *
 *   Licensed to the Apache Software Foundation (ASF) under one      *
 *   or more contributor license agreements.  See the NOTICE file    *
 *   distributed with this work for additional information           *
 *   regarding copyright ownership.  The ASF licenses this file      *
 *   to you under the Apache License, Version 2.0 (the               *
 *   "License"); you may not use this file except in compliance      *
 *   with the License.  You may obtain a copy of the License at      *
 *                                                                   *
 *      http://www.apache.org/licenses/LICENSE-2.0                   *
 *                                                                   *
 *   Unless required by applicable law or agreed to in writing,      *
 *   software distributed under the License is distributed on an     *
 *   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY          *
 *   KIND, either express or implied.  See the License for the       *
 *   specific language governing permissions and limitations         *
 *   under the License.                                              *
 *                                                                   *
 *********************************************************************/

'use strict';

var messageHandler = require('./messageHandler');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * The connection manager will handle the TCP and UDP transport.  As well as
 * the protocol.
 */
function UniSocket() {
    EventEmitter.call(this);
}
util.inherits(UniSocket, EventEmitter);

/**
 * Set up the UDP listener.
 */
UniSocket.prototype.createProxySocket = function (protocol, address, port) {

    this.remoteAddress = address;
    this.remotePort = port;
    var self = this;

    switch (protocol) {
        case 'udp4':
            var dgram = require('dgram');
            this.udp4 = dgram.createSocket('udp4');
            this.udp4.on('error', handleError.bind(this));
            this.udp4.on('message', function (message, remote) {
                this.remoteAddress = remote.address;
                handleMessage.bind(self)(message, remote);
            });
            break;

        case 'tcp':
            var net = require('net');

            this.tcp = new net.Socket();
            this.tcp.connect(this.remotePort, this.remoteAddress);
            // this.tcp.setEncoding('uint8');
            this.tcp.on('error', handleError.bind(this));
            this.tcp.on('data', handleMessage.bind(this));
            this.tcp.on('close', function() {
                delete self.tcp;
            });
            break;

        default:
            throw new Error('invalid protocol: ', protocol);
    }
};

function handleError(err) {
    console.log(err);
    this.emit('error', err);
}

function handleMessage(message) {
    console.log(typeof message, message.toString())
    var msgObj;
    try {
        msgObj = messageHandler.parseIncomingMessage(message);
    } catch (ex) {
        this.emit('error', ex);
        return;
    }

    this.emit(msgObj.type, msgObj);

    // console.log(new Date(), remote.address + ':' + remote.remotePort, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);

}

// function handleMessageTCP(message) {
//     handleMessage.bind(this)(message);
// }
//
// function handleMessageUDP(message, remote) {
//
//     // This gets the IP remote address, which is faster to send packets, than a domain name.
//     this.remoteAddress = remote.address;
//
//     handleMessage.bind(this)(message);
//
// }


/**
 * Close all connections.
 */
UniSocket.prototype.closeAll = function() {

    if (this.udp4) {
        this.udp4.close();
    }

    if (this.tcp) {
        self.tcp.destroy();
    }

};

/**
 * Sends a message to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
UniSocket.prototype.send = function(msgObj) {

    var msgOut = messageHandler.packOutgoingMessage(msgObj);

    if (this.udp4) {
        this.udp4.send(msgOut, 0, msgOut.length, this.remotePort, this.ip);
        return;
    }

    if (this.tcp) {
        this.tcp.write(msgOut);
        return;
    }

    throw new Error('Trying to send a message when a protocol has not been configured.');

};

module.exports = UniSocket;
