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

var makeUID = require('shortid').generate;


/**
 * The DeviceManager manages toys and controllers (devices).  Devices operate on
 * a given channel, both the toy and controller require the same channel.  There
 * can be multiple toys and controllers on the same channel.
 */
function DeviceManager(settings) {
    settings = settings ? settings : {};
    this.onlyOneControllerPerChannel = settings.onlyOneControllerPerChannel === true ? true : false;
    this.onlyOneToyPerChannel = settings.onlyOneToyPerChannel === true ? true : false;
    this.allowObservers = settings.allowObservers === true ? true : false;
    this.list = {};
}


/**
 * Add a new toy/controller to the device manager.
 * @param  {string} deviceType    'toy' or 'controller' or 'observer'.
 * @param  {string} channel The channel to operate on (this is provided by the device).
 * @param  {object} socket  The socket details.
 * @param  {number} seqNum  The sequence number from the device.
 * @param  {string} protocol 'tcp' or 'udp4'
 * @return {uid}            The UID of the device.
 */
DeviceManager.prototype.add = function(deviceType, channel, socket, seqNum) {

    switch (undefined) { // eslint-disable-line default-case
        case deviceType:
        case channel:
        case socket:
        case seqNum:
            console.error('DeviceManager.add(): one of the inputs are undefined.');
            return undefined;
    }

    if (!this.validDeviceType(deviceType)) {
        console.error('DeviceManager.getAll(): "deviceType" should be "toy" or "controller" or "observer" (if allowObserver is true), not: ', deviceType);
        return undefined;
    }

    // Remove the controller / toy that already exists
    if ((deviceType === 'controller' && this.onlyOneControllerPerChannel) ||
        (deviceType === 'toy' && this.onlyOneToyPerChannel)) {
         var devUID = this.findByDeviceTypeAndChannel(deviceType, channel);
         if (devUID) {
             this.remove(devUID);
         }
    }

    var uid = makeUID();
    this.list[uid] = {
        deviceType: deviceType,
        channel: channel,
        socket: socket,
        seqNum: seqNum
    };
    return uid;

};


/**
 * Remove a device from the device manager.
 * @param  {string} uid The UID
 * @return {boolean}     true if successful, otherwise false.
 */
DeviceManager.prototype.remove = function(uid) {

    var dev = this.list[uid];

    if (typeof dev === 'undefined') {
        return false;
    }

    try {
        dev.socket.close();
    } catch (ex) {
        // okay if there is an error - socket may already be closed.
    }

    try {
        delete this.list[uid];
    } catch (ex) {
        return false;
    }
    return true;
};


/**
 * Checks if the device is allowed the given action
 * @param  {string} uid         The UID of the device
 * @param  {string} actionType  The action to test
 * @return {boolean}     true if action is allowed, otherwise false.
 */
DeviceManager.prototype.isAllowedAction = function(uid, actionType) {

    var dev = this.list[uid];

    if (typeof dev === 'undefined') {
        return false;
    }

    if (dev.deviceType === 'toy' && actionType === 'status') return true;
    if (dev.deviceType === 'controller' && actionType === 'command') return true;

    return false;

};


/**
 * Remove a device from the device manager.
 * @param  {string} uid The UID
 * @return {boolean}     true if successful, otherwise false.
 */
DeviceManager.prototype.removeBySocketId = function(socketId) {

    var uid = this.findBySocketId(socketId);
    return this.remove(uid);

};


DeviceManager.prototype.findByDeviceTypeAndChannel = function(deviceType, channel) {
    var self = this;
    var foundUid = null;
    Object.keys(this.list).forEach( function(uid) {
        var dev = self.list[uid];
        if (dev.deviceType === deviceType && dev.channel === channel) {
            foundUid = uid;
        }
    });
    return foundUid;
};


DeviceManager.prototype.findBySocketId = function(socketId) {
    var self = this;
    var foundUid = null;
    Object.keys(this.list).forEach( function(uid) {
        var dev = self.list[uid];
        if (dev.socket.socketId === socketId) {
            foundUid = uid;
        }
    });
    return foundUid;
};


/**
 * Get a device from a UID.
 * @param  {string} uid The UID.
 * @return {object}     The device details.
 */
DeviceManager.prototype.get = function(uid) {
    return this.list[uid];
};


/**
 * Get a socket from the device with the given UID.
 * @param  {string} uid The UID.
 * @return {object}     The socket details.
 */
DeviceManager.prototype.getSocket = function(uid) {
    return this.list[uid].socket;
};


/**
 * Get all devices on a channel.  But only by device type (toy/controller).
 * @param  {string} deviceType    'toy' or 'controllers'
 * @param  {string} channel The channel.
 * @return {array}          An array of UID strings.
 */
DeviceManager.prototype.getAll = function(deviceType, channel) {

    if (!this.validDeviceType(deviceType)) {
        console.error('DeviceManager.getAll(): "deviceType" should be "toy" or "controller" or "observer" (if allowObserver is true), not: ', deviceType);
        return undefined;
    }

    var devList = [];
    var self = this;
    Object.keys(this.list).forEach( function(uid) {
        var dev = self.list[uid];
        if (dev.deviceType === deviceType && dev.channel === channel) {
            devList.push(uid);
        }
    });
    return devList;
};


/**
 * Update the device with the given ip and port parameters.  Then return the
 * device.
 * @param  {string} uid  The UID for the device.
 * @param  {string} ip   The IP the device was last seen on.
 * @param  {number} port The port the device was last seen on.
 * @return {object}      The updated device details.
 */
DeviceManager.prototype.update = function(uid, socket, seqNum) {

    if (isNaN(seqNum)) {
        console.error('DeviceManager.update(): provided "seqNum" is not a number');
        return undefined;
    }

    var device = this.list[uid];
    if (!device) {
        return undefined;
    }

    device.socket = socket || device.socket;
    device.seqNum = seqNum;
    return device;
};


/**
 * Make sure the sequence number is okay.
 * @param  {string} uid    UID for the device
 * @param  {number} seqNum The seqNum to check
 * @return {boolean}       True or false
 */
DeviceManager.prototype.isLatestSeqNum = function(uid, seqNum) {

    if (isNaN(seqNum)) {
        console.error('DeviceManager.isLatestSeqNum(): provided "seqNum" is not a number');
        return false;
    }

    var device = this.list[uid];
    if (!device) {
        return false;
    }
    if (device.seqNum > seqNum) {
        return false;
    }
    return true;
};


/**
 * Confirm the device type is correct.
 * @param  {string} type The name of the device to check.
 * @return {boolean}     True if the device type is valid.
 */
DeviceManager.prototype.validDeviceType = function(deviceType) {
    switch (deviceType) {
        case 'toy':
        case 'controller':
            return true;
        case 'observer':    // observer only valid if allowObserver === true
            return this.allowObservers;
        default:
            return false;
    }
};

module.exports = DeviceManager;
