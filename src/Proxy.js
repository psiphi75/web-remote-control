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
var ConnectionManager = require('./ConnectionManager');

/**
 * This is the proxy server.  It is the "man in the middle".  Devices (toys and
 * controllers) connect to the proxy server.
 * @param {object} settings (optional) Settings as defined by the help.
 */
function Prox(settings) {

    var self = this;
    this.log = settings.log;

    this.devices = new DevMan();
    this.server = new ConnectionManager(settings);
    this.server.listenUDP4(settings.port);

    this.server.on('listening', function (localPort, localAddress) {
        self.log('Web-Remote-Control Proxy Server listening on ' + localAddress + ':' + localPort);
    });

    this.server.on('error', function(err) {
        console.error('Proxy: There was an error: ', err);
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
};


/**
 * Register a new device on a given channel.
 * @param  {object} msgObj Message object with channel info in the 'data' parameter.
 * @param  {object} remote The sender socket
 */
Prox.prototype.registerDevice = function(msgObj, remote) {

    if (!this.devices.validDeviceType(msgObj.data)) {
        console.error('Invalid device type: ', msgObj.data);
        // this.server.sendError(remote.protocol, 'error registering device', remote);
        return;
    }

    if (typeof msgObj.channel === 'undefined') {
        console.error('registerDevice: device channel is undefined');
        return;
    }

    var uid = this.devices.add(msgObj.data, msgObj.channel, remote.address, remote.port, msgObj.protocol);
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
 * forward to all toys/controllers on the given channel.
 *
 * @param  {string} forwardToType The type of item we are forwarding to.
 * @param  {object} msgObj The message object we are forwarding.
 * @param  {object} remote The sender socket.
 */
Prox.prototype.forward = function(forwardToType, msgObj, remote) {

    var self = this;
    var controller = this.devices.update(msgObj.uid, remote.address, remote.port);

    if (!controller) {
        console.error('Prox.forwardCommand(): \'controller\' not found: ', msgObj.uid);
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
    this.server.send(device.protocol, msgObj, device.port, device.address);
};


module.exports = Prox;
