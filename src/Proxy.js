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

var dgram = require('dgram');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var common = require('./common');
var DevMan = require('./DeviceManager');


/**
 * This is the proxy server.  It is the "man in the middle".  Devices (toys and
 * controllers) connect to the proxy server.
 * @param {object} settings (optional) Settings as defined by the help.
 */
function Prox(settings) {

    var self = this;

    this.log = settings.log;
    this.devices = new DevMan();
    this.server = dgram.createSocket('udp4');

    // As soon as the server is ready to receive messages, handle it with this handler
    this.server.on('listening', function () {
        if (this.log) {
            var address = self.server.address();
            this.log('Web-Remote-Control Proxy Server listening on ' + address.address + ':' + address.port);
        }
    });

    this.server.on('error', function(err) {
        console.error('Prox: There was an error with the proxy: ', err);
    });

    this.server.on('message', function(message, remote) {
        self.handleIncomingMessage(message, remote);
    });

    this.server.bind(settings.proxyPort);

    EventEmitter.call(this);

}
util.inherits(Prox, EventEmitter);


/**
 * Close all connections.
 */
Prox.prototype.close = function() {
    this.server.close();
};


/**
 * This method is run for all incoming messages.
 * @param  {Buffer} message The incomming buffer message.
 * @param  {object} remote  Details of the remote connection.
 */
Prox.prototype.handleIncomingMessage = function(message, remote) {

    var msgObj;

    try {
        msgObj = common.decompress(message);
    } catch (ex) {
        console.error('There was an error parsing the incoming message: ', ex);
        return;
    }

    if (typeof msgObj !== 'object') {
        console.error('The incoming message is corrupt.');
        return;
    }

    if (this.log) {
        this.log(new Date(), remote.address + ':' + remote.port, msgObj.type, msgObj.channel || msgObj.uid, msgObj.seq, msgObj.data);
    }

    switch (msgObj.type) {
        case 'register':
            this.registerDevice(msgObj, remote);
            break;
        case 'ping':
            this.respondToPing(msgObj, remote);
            break;
        case 'status':
            this.forwardStatus(msgObj, remote);
            break;
        case 'command':
            this.forwardCommand(msgObj, remote);
            break;
        default:
            console.error('An invalid incoming message arrived: ', message.toString());
            return;
    }

};


/**
 * Register a new device on a given channel.
 * @param  {object} msgObj Message object with channel info in the 'data' parameter.
 * @param  {object} remote The sender socket
 */
Prox.prototype.registerDevice = function(msgObj, remote) {

    if (!this.devices.validDeviceType(msgObj.data)) {
        console.error('Invalid device type: ', msgObj.data);
        this.sendError('error registering device', remote);
        return;
    }

    if (typeof msgObj.channel === 'undefined') {
        console.error('registerDevice: device channel is undefined');
        return;
    }

    var uid = this.devices.add(msgObj.data, msgObj.channel, remote.address, remote.port);
    msgObj.uid = uid;
    msgObj.data = uid;

    this.emit(msgObj.type, msgObj);
    this.send(msgObj, this.devices.get(uid));
};


/**
 * Return a ping to a toy/controller.
 * @param  {object} msgObj The message object sent by the toy/controller.
 * @param  {object} remote The sender socket
 */
Prox.prototype.respondToPing = function(msgObj, remote) {

    var device = this.devices.update(msgObj.uid, remote.address, remote.port);

    if (!device) {
        console.error('Unable to find the device: ', msgObj);
        return;
    }

    this.emit(msgObj.type, msgObj);
    this.send(msgObj, device);
};


/**
 * Forward a command from a controller to a device.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardCommand = function(msgObj, remote) {
    this.forward('toy', msgObj, remote);
};


/**
 * Forward a command from a toy to a controller.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardStatus = function(msgObj, remote) {
    this.forward('controller', msgObj, remote);
};


/**
 * Forward a command from a controller/toy to a toy/controller.  This will
 * forward to all toys/contollers on the given channel.
 *
 * @param  {string} forwardToType The type of item we are forwarding to.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forward = function(forwardToType, msgObj, remote) {

    var self = this;
    var controller = this.devices.update(msgObj.uid, remote.address, remote.port);

    if (!controller) {
        console.error('Prox.forwardCommand(): \'contoller\' not found: ', msgObj.uid);
        return;
    }
    var uidList = this.devices.getAll(forwardToType, controller.channel);

    uidList.forEach(function(uid) {
        self.send(msgObj, self.devices.get(uid));
    });

    this.emit(msgObj.type, msgObj);

};

/**
 * This will send a message to the remote device.
 * @param  {object} msgObj The object to send as JSON.
 * @param  {object} device The device to send this to.
 */
Prox.prototype.send = function(msgObj, device) {

    var msgComp = common.compress(msgObj);
    this.server.send(msgComp, 0, msgComp.length, device.port, device.address, function stdCBErr(err) {
        if (err) {
            console.error(err);
        }
    });
};

/**
 * Sends and error to the remote device.
 * @param  {string} err    The error string
 * @param  {object} remote The remote device / connection.
 */
Prox.prototype.sendError = function(err, remote) {

    // Note send expects a "device", but we send it "remote", the structure
    // is the same.
    this.send(err, remote);

};

module.exports = Prox;
