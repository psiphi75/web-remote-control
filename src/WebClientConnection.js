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
function WebClientConnection(options) {

    var url = window.location.host.split(':')[0];
    if (options && options.proxyUrl) {
        url = options.proxyUrl;
    }

    this.createProxySocket('http://' + url, 33331);

    EventEmitter.call(this);
}
util.inherits(WebClientConnection, EventEmitter);


/**
 * Set up the UDP listener.
 */
WebClientConnection.prototype.createProxySocket = function (address, port) {

    this.remoteAddress = address;
    this.remotePort = port;

    this.socket = window.io(address + ':' + port);
    this.socket.on('connect', function() {
        console.log('connected');
    });
    var self = this;
    this.socket.on('event', function(message) {
        if (message && typeof message.byteLength === 'number') {
            message = String.fromCharCode.apply(null, new Uint8Array(message));
        }
        handleMessage.bind(self)(message);
    });
    this.socket.on('disconnect', function() {});
};


function handleMessage(message) {

    var msgObj;
    try {
        msgObj = messageHandler.parseIncomingMessage(message);
    } catch (ex) {
        this.emit('error', ex);
        return;
    }

    this.emit(msgObj.type, msgObj);

}


/**
 * Sends a message to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
WebClientConnection.prototype.send = function(msgObj) {

    var sendBuffer = messageHandler.packOutgoingMessage(msgObj);

    try {
        this.socket.emit('event', sendBuffer);
    } catch (ex) {
        console.error('WebClientConnection.send(): ', ex);
    }

};

module.exports = WebClientConnection;
