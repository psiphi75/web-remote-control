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

function SocketTCP (options) {

    this.log = options.log;
    this.port = options.port;

    this.listenTCP();

    EventEmitter.call(this);

}
util.inherits(SocketTCP, EventEmitter);


/**
 * Start the TCP server on the given port and address (optional).
 */
SocketTCP.prototype.listenTCP = function() {

    var net = require('net');
    var split = require('split');
    var self = this;
    this.socket = net.createServer(function(socket) {
        var socketInfo = {
            protocol: 'tcp',
            address: socket.remoteAddress,
            port: socket.remotePort,
            socketId: socket.remoteAddress + ':' + socket.remotePort,
            socket: socket,
            close: function close() {
                try {
                    socket.destroy();
                } catch (ex) {
                    // okay if there is an error - socket may already be closed.
                }
            }
        };
        var stream = socket.pipe(split('\n'));
        stream.on('data', function(message) {
            self.emit('data', message);
            self.handleMessage.bind(self)(message, socketInfo);
        });
        stream.on('close', function() {
            self.emit('socket-close', socketInfo.socketId);
        });
        stream.on('error', self.handleMessage.bind(self));

    });
    this.socket.on('error', this.handleError);
    this.socket.on('listening', function () {
        self.emit('listening', self.port, self.proxyUrl, 'tcp');
    });
    this.socket.listen(self.port);

};

SocketTCP.prototype.handleError = function(err) {
    if (typeof this.log === 'function') {
        this.log(err);
    } else {
        console.error(err);
    }
    this.emit('error', err);
};

/**
 * Close all connections.
 */
SocketTCP.prototype.close = function() {

    this.socket.close();
    this.removeAllListeners();

};

/**
 * Sends a message to the remote device.
 */
SocketTCP.prototype.write = function(data) {

    try {
        this.socket.write(data, undefined, function() {
            self.write
        });
    } catch (ex) {
        this.log('SocketTCP._send():error: ', ex);
    }

};

module.exports = SocketTCP;
