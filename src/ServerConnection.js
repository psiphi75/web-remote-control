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

var messageHandler = require('./messageHandler');
var SOCKET_IO_PORT = 33331;

/**
 * The connection manager will handle the TCP and UDP transport.  As well as
 * the protocol.
 * @param {object} options (optional)
 */
function ServerConnection (options) {

    this.log = options.log;
    this.port = options.port;
    this.proxyUrl = options.proxyUrl;

    if (!(options.udp4 === false)) {
        this.listenUDP4();
    }
    if (!(options.tcp === false)) {
        this.listenTCP();
    }
    if (!(options.socketio === false)) {
        this.listenSocketIO();
    }

    EventEmitter.call(this);

}
util.inherits(ServerConnection, EventEmitter);

/**
 * Start the SocketII server on the given port and address (optional)
 * @param  {number} port    The port number to listen on.
 * @param  {string} address (optional) The IP address to listen on.
 */
ServerConnection.prototype.listenSocketIO = function() {

    var socketio = require('socket.io');
    var self = this;
    this.socketio = socketio();
    this.socketio.on('connection', function(socket) {
        var socketInfo = {
            protocol: 'socketio',
            address: socket.client.conn.remoteAddress,
            port: '????',
            socketId: socket.id,
            socket: socket
        };
        socket.on('event', function(message) {

            // Socket.IO sends messages a bit different
            if (message && message.type === 'Buffer') {
                message = new Buffer(message.data);
            }

            handleMessage.bind(self)(message, socketInfo);
        });
        socket.on('close', function() {
            self.emit('socket-close', socketInfo.socketId);
        });
    });
    this.socketio.on('error', handleError);
    this.socketio.listen(SOCKET_IO_PORT);


    // Wait until the event listener is attached to THIS.
    setTimeout(function () {
        self.emit('listening', SOCKET_IO_PORT, self.proxyUrl, 'socketio');
    }, 100);

};


/**
 * Start the UDP server on the given port and address (optional).
 */
ServerConnection.prototype.listenUDP4 = function() {

    var dgram = require('dgram');
    this.udp4 = dgram.createSocket('udp4');
    this.udp4.on('error', handleError);

    var self = this;
    this.udp4.on('message', function (message, remote) {
        var socketInfo = {
            protocol: 'udp4',
            address: remote.address,
            port: remote.port,
            socketId: remote.address + ':' + remote.port
        };
        handleMessage.bind(self)(message, socketInfo);
    });

    this.udp4.on('listening', function () {
        self.emit('listening', self.port, self.proxyUrl, 'udp4');
    });
    this.udp4.bind(self.port);
};


/**
 * Start the TCP server on the given port and address (optional).
 */
ServerConnection.prototype.listenTCP = function() {

    var net = require('net');
    var split = require('split');
    var self = this;
    this.tcp = net.createServer(function(socket) {
        var socketInfo = {
            protocol: 'tcp',
            address: socket.remoteAddress,
            port: socket.remotePort,
            socketId: socket.remoteAddress + ':' + socket.remotePort,
            socket: socket
        };
        var stream = socket.pipe(split('\n'));
        stream.on('data', function(message) {
            handleMessage.bind(self)(message, socketInfo);
        });
        stream.on('close', function() {
            self.emit('socket-close', socketInfo.socketId);
        });

    });
    this.tcp.on('error', handleError);
    this.tcp.on('listening', function () {
        self.emit('listening', self.port, self.proxyUrl, 'tcp');
    });
    this.tcp.listen(self.port);

};

function handleError(err) {
    console.log(err);
    this.emit('error', err);
}

function handleMessage(message, socketInfo) {

    var enable_compression = socketInfo.protocol === 'udp4';
    var msgObj;
    try {
        msgObj = messageHandler.parseIncomingMessage(message, enable_compression);
    } catch (ex) {
        this.emit('error', ex);
        return;
    }

    // Empty packet arrived, this happens when remote closes connection
    if (msgObj === null) {
        return;
    }

    msgObj.socket = socketInfo;
    this.emit(msgObj.type, msgObj);

    this.log(new Date(), socketInfo.address + ':' + socketInfo.port, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);
}


/**
 * Close all connections.
 */
ServerConnection.prototype.closeAll = function() {

    if (this.udp4) {
        this.udp4.close();
    }

    if (this.tcp) {
        this.tcp.close();
    }

    this.removeAllListeners();

};

/**
 * Sends a message to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
ServerConnection.prototype.send = function(msgObj) {

    var socketInfo = msgObj.socket;
    var enable_compression = socketInfo.protocol === 'udp4';
    var msgComp = messageHandler.packOutgoingMessage(msgObj, enable_compression);

    if (socketInfo.protocol === 'udp4') {
        this.udp4.send(msgComp, 0, msgComp.length, socketInfo.port, socketInfo.address);
        return;
    }

    if (socketInfo.protocol === 'tcp') {
        try {
            socketInfo.socket.write(msgComp);
        } catch (ex) {
            console.error('ServerConnection.send():error: ', ex);
        }
        return;
    }

    if (socketInfo.protocol === 'socketio') {
        socketInfo.socket.emit('event', msgComp);
        return;
    }

};

module.exports = ServerConnection;
