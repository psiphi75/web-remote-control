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
function DeviceManager() {
    this.list = {};
}

/**
 * Add a new toy/controller to the device manager.
 * @param  {string} type    'toy' or 'controller'.
 * @param  {string} channel The channel to operate on (this is provided by the device).
 * @param  {string} address The IP address.
 * @param  {number} port    The port number
 * @param  {string} protocol 'tcp4' or 'udp4'
 * @return {uid}            The UID of the device.
 */
DeviceManager.prototype.add = function(type, channel, address, port, protocol) {

    switch (undefined) { // eslint-disable-line default-case
        case type:
        case channel:
        case address:
        case port:
        case protocol:
            console.error('DeviceManager.add(): one of the inputs are undefined.'/*, new Error().stack*/);
            return undefined;
    }

    if (!this.validDeviceType(type)) {
        console.error('DeviceManager.getAll(): "type" should be "toy" or "controller", not: ', type);
        return undefined;
    }

    var uid = makeUID();
    this.list[uid] = {
        type: type,
        channel: channel,
        address: address,
        port: port,
        protocol: protocol
    };
    return uid;

};

/**
 * Remove a device from the device manager.
 * @param  {string} uid The UID
 * @return {boolean}     true if successful, otherwise false.
 */
DeviceManager.prototype.remove = function(uid) {

    if (typeof this.list[uid] === 'undefined') {
        return false;
    }

    try {
        delete this.list[uid];
    } catch (ex) {
        return false;
    }
    return true;
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
 * Get all devices on a channel.  But only by device type (toy/controller).
 * @param  {string} type    'toy' or 'controllers'
 * @param  {string} channel The channel.
 * @return {array}          An array of UID strings.
 */
DeviceManager.prototype.getAll = function(type, channel) {

    if (!this.validDeviceType(type)) {
        console.error('DeviceManager.getAll(): "type" should be "toy" or "controller", not: ', type);
        return undefined;
    }

    var devList = [];
    var self = this;
    Object.keys(this.list).forEach( function(uid) {
        var dev = self.list[uid];
        if (dev.type === type && dev.channel === channel) {
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
DeviceManager.prototype.update = function(uid, address, port) {
    if (!this.list[uid]) {
        return undefined;
    }
    this.list[uid].address = address || this.list[uid].address;
    this.list[uid].port = port || this.list[uid].port;
    return this.list[uid];
};


/**
 * Confirm the device type is correct.
 * @param  {string} type The name of the device to check.
 * @return {boolean}     True if the device type is valid.
 */
DeviceManager.prototype.validDeviceType = function(type) {
    switch (type) {
        case 'toy':
        case 'controller':
            return true;
        default:
            return false;
    }
};

module.exports = DeviceManager;
