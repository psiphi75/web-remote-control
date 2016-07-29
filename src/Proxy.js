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

var DeviceManager = require('./DeviceManager');
var ServerConnection = require('./ServerConnection');
var errors = require('./errors.js');

/**
 * This is the proxy server.  It is the "man in the middle".  Devices (toys,
 * controllers and observers) connect to the proxy server.
 * @param {object} settings (optional) Settings as defined by the help.
 */
function Prox(settings) {

    var self = this;
    this.log = settings.log;

    this.devices = new DeviceManager(settings);
    this.server = new ServerConnection(settings);

    this.server.on('listening', function (localPort, localAddress, protocol) {
        self.log('Web-Remote-Control Proxy Server listening to "' + protocol + '" requests on ' + localAddress + ':' + localPort);
    });

    this.server.on('error', this.handleError.bind(this));

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

    var uid = this.devices.add(deviceType, channel, msgObj.socket, msgObj.seq);
    msgObj.uid = uid;
    msgObj.data = {
        channel: channel,
        uid: uid
    };

    this._send(msgObj, this.devices.get(uid));
    this.emit(msgObj.type, msgObj);
};


/**
 * Return a ping to a toy/controller/observer.
 * @param  {object} msgObj The message object sent by the toy/controller/observer.
 * @param  {object} remote The sender socket
 */
Prox.prototype.respondToPing = function(msgObj) {

    var device = this.devices.update(msgObj.uid, msgObj.socket, msgObj.seq);

    if (!device) {
        this.respondError(msgObj, errors.DEVICE_NOT_REGISTERED);
        this.log('Unable to find the device to update: ', msgObj);
        return;
    }

    this._send(msgObj);
    this.emit(msgObj.type, msgObj);
};


/**
 * Forward a command from a controller to a device.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardCommand = function(msgObj) {
    this.forward('command', 'toy', msgObj);
};


/**
 * Forward a status update from a toy to a controller/observer.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forwardStatus = function(msgObj) {
    this.forward('status', 'controller', msgObj);
    this.forward('status', 'observer', msgObj);
};


/**
 * Forward a command from a controller/toy to a toy/controller.  This will
 * forward to all toys/controllers on the given channel.
 *
 * @param  {string} forwardToType The type of item we are forwarding to.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forward = function(actionType, forwardToType, msgObj) {

    var self = this;

    var sendingDevice = this.devices.get(msgObj.uid);
    if (!sendingDevice) {
        this.respondError(msgObj, errors.DEVICE_NOT_REGISTERED);
        this.log('Prox.forwardCommand(): remote device not found: ', msgObj.uid);
        return;
    }

    // Check the device is allowed this type of action
    if (!this.devices.isAllowedAction(msgObj.uid, actionType)) {
        this.respondError(msgObj, errors.PERMISSION_DENIED);
        this.log('Prox.forwardCommand(): Action not allowed for ' + sendingDevice.deviceType + ': ', msgObj.uid);
        return;
    }

    // Drop the packet if it's not the latest (highest seqNum)
    if (!this.devices.isLatestSeqNum(msgObj.uid, msgObj.seq)) {
        this.log('Dropped a packet from: ' + msgObj.uid);
        return;
    }

    this.devices.update(msgObj.uid, msgObj.socket, msgObj.seq);

    var uidList = this.devices.getAll(forwardToType, sendingDevice.channel);

    uidList.forEach(function(uid) {
        var receivingDevice = {
            type: msgObj.type,
            seq: msgObj.seq,
            uid: uid,
            data: msgObj.data,
            socket: self.devices.getSocket(uid)
        };

        self._send(receivingDevice);
    });

    this.emit(msgObj.type, msgObj);

};


/**
 * This will send a message to the remote device.
 * @param  {object} msgObj The object to send as JSON.
 * @param  {object} device The device to send this to.
 */
Prox.prototype._send = function(msgObj) {
    this.server._send(msgObj);
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
    this._send(responseObj);
};

Prox.prototype.handleError = function(err) {
    var errMsg = 'Proxy: There was an error:\t' + JSON.stringify(err);
    this.log(errMsg);
    this.emit(errMsg);
};

module.exports = Prox;
