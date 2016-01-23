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

var NET_TIMEOUT = 5 * 1000;

function Device(settings) {
    this.proxyUrl = settings.proxyUrl;
    this.proxyPort = settings.proxyPort;
    this.channel = settings.channel;
    this.keepalive = settings.keepalive;
    this.deviceType = settings.deviceType;
    this.log = settings.log;

    this.uid = undefined;

    // This keeps a track of ther controller sequenceNumber.  If a command with a
    // smaller number is received, we drop it.
    this.remoteSeqNum = 0;
    this.mySeqNum = 1;

    if (this.keepalive > 0) {
        this.timeoutHandle = setInterval(this.ping.bind(this), this.keepalive * 1000);
    }

    this.proxyConnection = dgram.createSocket('udp4');

    this.proxyConnection.on('error', function(err) {
        throw new Error('Error sending data to ' + self.proxyIp + ': ', err);
    });

    // Once sent, listen to the results
    var self = this;
    this.proxyConnection.on('message', function(msgComp, remote) {
        // Override global 'ip' variable, this caches our IP address which is faster than url.
        self.proxyIp = remote.address;

        var resMsgObj = common.decompress(msgComp);

        if (!resMsgObj) {
            return;
        }

        // Announce the message has arrived
        self.emit(resMsgObj.type, resMsgObj.data, resMsgObj.seq);

    });

    // Register the device, this announces us.
    this.register();

    EventEmitter.call(this);
}
util.inherits(Device, EventEmitter);


/**
 * Register with the proxy only.  Expect an immediate response from proxy. We
 * send the channel we are on, then expect a UID in return.
 *
 * Note: if 'uid' is set, then we are registered.
 */
Device.prototype.register = function () {

    this.on('register', receiveRegisterResponse);
    this.send('register', this.deviceType);

    var self = this;
    function receiveRegisterResponse(uid) {

        if (!self.uid) {
            this.log('Registered');

            if (typeof uid !== 'string') {
                throw new Error('unable to initailise');
            }
            self.uid = uid;
        }

        cleanUp();
    }

    // Check the registery again in RECHECK_REGISTER seconds if we do not get a response
    var recheckRegisteryTimeout = setTimeout(function checkRegistery() {

        self.log(self.deviceType + ': unable to register with proxy, trying again.');
        self.register();
    }, NET_TIMEOUT);

    function cleanUp() {
        self.removeListener('register', receiveRegisterResponse);
        clearTimeout(recheckRegisteryTimeout);
    }

};


/**
 * Send a ping to the proxy only.  Expect an immediate response from proxy.
 * @param  {function} callback  This function gets called on completion of the ping.
 */
Device.prototype.ping = function(callback) {

    // Can only ping if we are registered
    if (!this.uid) {
        callback(-1);
        return;
    }

    var timeStr = (new Date().getTime()).toString();
    var seqNum = this.mySeqNum;

    this.send('ping', timeStr);

    // Listens for the ping response
    var self = this;
    this.on('ping', function fn(pingSendTime, pingSeqNum) {

        if (seqNum !== pingSeqNum) {
            return;
        }

        var time = (new Date()).getTime() - pingSendTime;

        if (typeof callback === 'function') {
            callback(time);
        }

        self.removeListener('ping', fn);
    });

};


/**
 * Send a status update to the remote proxy - which gets forwarded to the
 * controller(s).
 * @param  {string} type The status update type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.status = function (msgString) {
    this.send('status', msgString);
};


/**
 * Send a command to the remote proxy - which gets forwarded to the
 * receiver(s).
 * @param  {string} type The command type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.command = function (msgString) {

    if (this.deviceType !== 'controller') {
        throw new Error('Only controllers can create commands');
    }

    this.send('command', msgString);
};


/**
 * Send data to the remote proxy.
 * @param  {string} type The message type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.send = function(type, data) {

    var msgObject = {
        type: type,
        seq: this.mySeqNum,
        data: data
    };

    if (type === 'register') {
        msgObject.channel = this.channel;
    } else {
        msgObject.uid = this.uid;
    }

    var msg = common.compress(msgObject).toString();

    // Send the message to the proxy.  Use the IP have we have determined it.
    this.proxyIp = this.proxyIp || this.proxyUrl;
    this.proxyConnection.send(msg, 0, msg.length, this.proxyPort, this.proxyIp, function(err) {
        if (err) {
            console.error('Device.send(): Error sending udp packet to remote host: ', err);
        }
    });
    this.mySeqNum += 1;

};


/**
 * Close all connections.
 */
Device.prototype.close = function() {
    if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
    }
    if (this.proxyConnection) {
        this.proxyConnection.close();
    }
};


module.exports = Device;
