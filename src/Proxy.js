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

var DevMan = require('./DeviceManager');
var ServerConnection = require('./ServerConnection');
var errors = require('./errors.js');

/**
 * This is the proxy server.  It is the "man in the middle".  Devices (toys and
 * controllers) connect to the proxy server.
 * @param {object} settings (optional) Settings as defined by the help.
 */
function Prox(settings) {

    var self = this;
    this.log = settings.log;

    this.devices = new DevMan();
    this.server = new ServerConnection(settings);

    this.server.on('listening', function (localPort, localAddress, protocol) {
        self.log('Web-Remote-Control Proxy Server listening to "' + protocol + '" requests on ' + localAddress + ':' + localPort);
    });

    this.server.on('error', handleError.bind(this));

    this.server.on('socket-close', function (socketId) {
        self.devices.removeBySocketId(socketId);
    });

    this.server.on('register', this.registerDevice.bind(this));
    this.server.on('ping', this.respondToPing.bind(this));
    this.server.on('status', this.forwardStatus.bind(this));
    this.server.on('command', this.forwardCommand.bind(this));

    EventEmitter.call(this);

}
util.inherits(Prox, EventEmitter);


/**
 * Close all connections.
 */
Prox.prototype.close = function() {
    this.server.closeAll();
    this.removeAllListeners();
};


/**
 * Register a new device on a given channel.
 * @param  {object} msgObj Message object with channel info in the 'data' parameter.
 * @param  {object} remote The sender socket
 */
Prox.prototype.registerDevice = function(msgObj) {

    if (!msgObj.data) {
        this.log('msgObj has no data: ', msgObj);
        return;
    }

    var deviceType = msgObj.data.deviceType;
    var channel = msgObj.data.channel;

    if (!this.devices.validDeviceType(deviceType)) {
        this.log('Invalid device type: ', deviceType);
        return;
    }

    if (typeof channel === 'undefined') {
        this.log('registerDevice: device channel is undefined');
        return;
    }

    var uid = this.devices.add(deviceType, channel, msgObj.socket);
    msgObj.uid = uid;
    msgObj.data = uid;

    this.send(msgObj, this.devices.get(uid));
    this.emit(msgObj.type, msgObj);
};


/**
 * Return a ping to a toy/controller.
 * @param  {object} msgObj The message object sent by the toy/controller.
 * @param  {object} remote The sender socket
 */
Prox.prototype.respondToPing = function(msgObj) {

    var device = this.devices.update(msgObj.uid, msgObj.socket);

    if (!device) {
        this.respondError(msgObj, errors.DEVICE_NOT_REGISTERED);
        this.log('Unable to find the device to update: ', msgObj);
        return;
    }

    this.send(msgObj);
    this.emit(msgObj.type, msgObj);
};


/**
 * Forward a command from a controller to a device.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardCommand = function(msgObj) {
    this.forward('toy', msgObj);
};


/**
 * Forward a command from a toy to a controller.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardStatus = function(msgObj) {
    this.forward('controller', msgObj);
};


/**
 * Forward a command from a controller/toy to a toy/controller.  This will
 * forward to all toys/controllers on the given channel.
 *
 * @param  {string} forwardToType The type of item we are forwarding to.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forward = function(forwardToType, msgObj) {

    var self = this;
    var remoteDevice = this.devices.update(msgObj.uid, msgObj.socket);

    if (!remoteDevice) {
        this.respondError(msgObj, errors.DEVICE_NOT_REGISTERED);
        console.error('Prox.forwardCommand(): remote device not found: ', msgObj.uid);
        return;
    }
    var uidList = this.devices.getAll(forwardToType, remoteDevice.channel);

    uidList.forEach(function(uid) {
        var sendToDevice = {
            type: msgObj.type,
            seq: msgObj.seq,
            uid: uid,
            data: msgObj.data,
            socket: self.devices.getSocket(uid)
        };

        self.send(sendToDevice);
    });

    this.emit(msgObj.type, msgObj);

};


/**
 * This will send a message to the remote device.
 * @param  {object} msgObj The object to send as JSON.
 * @param  {object} device The device to send this to.
 */
Prox.prototype.send = function(msgObj) {
    this.server.send(msgObj);
};


/**
 * Respond to the given socket with an error.
 * @param  {object} msgObj    The outgoing message deatils.
 * @param  {object} errorType The error to send
 */
Prox.prototype.respondError = function (msgObj, errorType) {
    var responseObj = {
        type: 'error',
        seq: msgObj.seq,
        uid: null,
        data: errorType.code,
        socket: msgObj.socket
    };
    this.send(responseObj);
};

function handleError(err) {
    var errMsg = 'Proxy: There was an error:\t' + JSON.stringify(err);
    self.log(errMsg);
    self.emit(errMsg);
}

module.exports = Prox;
