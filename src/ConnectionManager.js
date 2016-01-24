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

var DEFAULTS = {
    port: 33330,
    udp: true,
    tcp: true,
    log: console.log
};

var EventEmitter = require('events').EventEmitter;
var util = require('util');

// UDP transport layer
var dgram = require('dgram');
var common = require('./common');

/**
 * The connection manager will handle the TCP and UDP transport.  As well as
 * the protocol.
 * @param {object} options (optional)
 */
function ConnectionManager (options) {

    if (!options) {
        options = DEFAULTS;
    }
    this.port = options.port || DEFAULTS.port;
    this.log = options.log || DEFAULTS.log;
    this.isServer = options.isServer;

    if (!(options.udp4 === false)) {
        this.setupUPD();
    }

    if (!(options.tcp4 === false)) {
        console.error('tcp not yet ready');
    //     this.setupTCP();
    }
    EventEmitter.call(this);

}
util.inherits(ConnectionManager, EventEmitter);


/**
 * Set up the UDP listener.
 */
ConnectionManager.prototype.setupUPD = function () {

    var self = this;
    this.udp = dgram.createSocket('udp4');

    if (this.isServer) {
        this.udp.on('listening', function () {
            var address = self.udp.address();
            self.emit('listening', address.address, address.port);
        });
        this.udp.bind(this.port);
    }

    this.udp.on('error', handleError);
    this.udp.on('message', function (message, remote) {
        remote.protocol = 'udp4';
        handleMessage.bind(self)(message, remote);
    });


    function handleError(err) {
        console.log(err);
        this.emit('error', err);
    }

    function handleMessage(message, remote) {

        var msgObj;
        try {
            msgObj = parseMessage(message, remote);
        } catch (ex) {
            this.emit('error', ex);
            return;
        }

        this.emit(msgObj.type, msgObj, remote);

        if (typeof this.log === 'function') {
            this.log(new Date(), remote.address + ':' + remote.port, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);
        }
    }
};

/**
 * Parse an incoming message and ensure it's valid.  Convert it to an object that
 * can ben sent to other listeners.
 *
 * @param  {[uint8]?} message  The message from the datastream
 * @param  {object} remote   The remote host
 * @param  {string} protocol The protocol we are using
 * @return {object}          The valid object.
 * @throws Error when the message is invalid.
 */
function parseMessage(message, remote) {

    var msgObj;

    try {
        msgObj = common.decompress(message);
    } catch (ex) {
        throw new Error('There was an error parsing the incoming message: ' + ex);
    }

    if (typeof msgObj !== 'object') {
        throw new Error('The incoming message is corrupt from remote' + remote.address + ':' + remote.port);
    }

    switch (msgObj.type) {
        case 'register':
        case 'ping':
        case 'status':
        case 'command':
            break;
        default:
            throw new Error('An invalid incoming message arrived: ', msgObj.toString());
    }

    // Add the protocol as well
    msgObj.protocol = remote.protocol;

    return msgObj;
}

/**
 * Close all connections.
 */
ConnectionManager.prototype.closeAll = function() {

    if (this.udp) {
        this.udp.close();
    }

    if (this.tcp) {
        this.tcp.close();
    }

};

/**
 * Sends a message to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
ConnectionManager.prototype.send = function(protocol, msgObj, port, address) {

    var msgComp = common.compress(msgObj);

    if (protocol === 'udp4') {
        this.udp.send(msgComp, 0, msgComp.length, port, address, handleError);
        return;
    }

    if (protocol === 'tcp4') {
        // this.tcp.send(msgComp, 0, msgComp.length, port, address, handleError);
        return;
    }

    function handleError(err) {
        if (err) {
            console.error(err);
        }
    }
};

/**
 * Sends an error to the remote device.
 * @param  {string} err    The error string
 * @param  {string} address The remote address.
 * @param  {number} remote The remote port.
 */
ConnectionManager.prototype.sendError = function(err, remote) {

    this.send(remote.protocol, err, remote.port, remote.address);

};

module.exports = ConnectionManager;
