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

var EventEmitter = require('events').EventEmitter;
var util = require('util');

// UDP transport layer
var dgram = require('dgram');
var messageHandler = require('./messageHandler');

/**
 * The connection manager will handle the TCP and UDP transport.  As well as
 * the protocol.
 * @param {object} options (optional)
 */
function ConnectionManager (options) {

    this.log = options.log;

    if (!(options.udp4 === false)) {
        this.setupUDP();
    }

    // if (!(options.tcp === false)) {
    //     // console.error('tcp not yet ready');
    //     this.setupTCP();
    // }
    EventEmitter.call(this);

}
util.inherits(ConnectionManager, EventEmitter);


/**
 * Set up the UDP listener.
 */
ConnectionManager.prototype.setupUDP = function () {

    var self = this;
    this.udp4 = dgram.createSocket('udp4');
    this.udp4.on('error', handleError);
    this.udp4.on('message', function (message, remote) {
        var socketInfo = {
            protocol: 'udp4',
            address: remote.address,
            port: remote.port
        };
        handleMessage.bind(self)(message, socketInfo);
    });

    function handleError(err) {
        console.log(err);
        this.emit('error', err);
    }

    function handleMessage(message, socketInfo) {

        var msgObj;
        try {
            msgObj = messageHandler.parseIncomingMessage(message);
        } catch (ex) {
            this.emit('error', ex);
            return;
        }

        msgObj.socket = socketInfo;
        this.emit(msgObj.type, msgObj);

        this.log(new Date(), socketInfo.address + ':' + socketInfo.port, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);
    }

};


/**
 * Start the UDP server on the given port and address (optional)
 * @param  {number} port    The port number to listen on.
 * @param  {string} address (optional) The IP address to listen on.
 */
ConnectionManager.prototype.listenUDP4 = function(port, address) {
    var self = this;
    this.udp4.on('listening', function () {
        self.emit('listening', port, address);
    });
    this.udp4.bind({
        port: port,
        address: address
    });
};


// ConnectionManager.prototype.setupTCP = function () {
//
//     var self = this;
//     this.udp4 = dgram.createSocket('udp4');
//
//     this.udp4.on('error', handleError);
//     this.udp4.on('message', function (message, remote) {
//         remote.protocol = 'udp4';
//         handleMessage.bind(self)(message, remote);
//     });
//
//     function handleError(err) {
//         console.log(err);
//         this.emit('error', err);
//     }
//
//     function handleMessage(message, remote) {
//
//         var msgObj;
//         try {
//             msgObj = parseMessage(message, remote);
//         } catch (ex) {
//             this.emit('error', ex);
//             return;
//         }
//
//         this.emit(msgObj.type, msgObj, remote);
//
//         this.log(new Date(), remote.address + ':' + remote.port, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);
//     }
// };
//
// ConnectionManager.prototype.listenTCP = function(port, address) {
//
//     var net = require('net');
//
//     this.tcp = net.createServer(function(socket) {
//         socket.on('data', function (data) {
//           console.log(typeof data, data);
//           socket.write(data);
//         });
//     });
//     this.tcp.on('listening', function () {
//         self.emit('listening', port, address);
//     });
//     this.tcp.listen(port, address);
//
//     // var self = this;
//     // this.udp4.on('listening', function () {
//     //     self.emit('listening', port, address);
//     // });
//     // this.udp4.bind({
//     //     port: port,
//     //     address: address
//     // });
// };


/**
 * Close all connections.
 */
ConnectionManager.prototype.closeAll = function() {

    if (this.udp4) {
        this.udp4.close();
    }

    // if (this.tcp) {
    //     this.tcp.close();
    // }

};

/**
 * Sends a message to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
ConnectionManager.prototype.send = function(msgObj) {

    var socketInfo = msgObj.socket;
    var msgComp = messageHandler.packOutgoingMessage(msgObj);

    if (socketInfo.protocol === 'udp4') {
        this.udp4.send(msgComp, 0, msgComp.length, socketInfo.port, socketInfo.address);
        return;
    }

    // if (protocol === 'tcp') {
    //     // this.tcp.send(msgComp, 0, msgComp.length, port, address, handleError);
    //     return;
    // }

};

module.exports = ConnectionManager;
