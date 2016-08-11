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

var PingManager = require('./PingManager');
var errors = require('./errors.js');

var NET_TIMEOUT = 5 * 1000;

function Device(settings, ClientConnection) {

    this.proxyUrl = settings.proxyUrl;
    this.port = settings.port;

    switch (typeof settings.channel) {
        case 'undefined':
            this.channel = '1';
            break;
        case 'number':
            this.channel = parseFloat(settings.channel);
            break;
        case 'string':
            this.channel = settings.channel;
            break;
        default:
            throw new Error('Channel has an invalid type: ', typeof settings.channel);
    }

    this.keepalive = settings.keepalive;
    this.deviceType = settings.deviceType || 'controller';
    this.log = settings.log || function() {};

    this.pingManager = new PingManager();
    this.connection = new ClientConnection(settings);
    this.uid = undefined;

    // This keeps a track of ther controller sequenceNumber.  If a command with
    // a smaller number is received, we drop it.
    this.remoteSeqNum = 0;
    this.mySeqNum = 1;

    if (this.keepalive > 0) {
        this.timeoutHandle = setInterval(this.ping.bind(this), this.keepalive);
    }

    var self = this;
    this.connection.on('error', handleCommError);
    this.connection.on('register', handleRegisterResponse);
    this.connection.on('status', reEmit);
    this.connection.on('command', reEmit);
    this.connection.on('ping', handlePing);

    // Register the device, this announces us.
    this.register();

    function reEmit(responseMsgObj) {
        self.emit(responseMsgObj.type, responseMsgObj.data, responseMsgObj.seq);
    }

    function handleRegisterResponse(responseMsgObj) {

        if (!self.uid) {
            if (typeof responseMsgObj.uid !== 'string') {
                throw new Error('unable to initailise');
            }
            self.log('Registered.  UID:', responseMsgObj.uid);
            self.uid = responseMsgObj.uid;
        }

        clearTimeout(self.recheckRegisteryTimeout);
        reEmit(responseMsgObj);
    }

    function handlePing(responseMsgObj) {
        var pingTime = (new Date()).getTime() - parseInt(responseMsgObj.data);
        self.pingManager.handleIncomingPing(responseMsgObj.seq, pingTime);
    }

    function handleCommError(responseMsgObj) {
        var errorCode = responseMsgObj.data;
        var error = errors.getByCode(errorCode);
        if (error.type === 'DEVICE_NOT_REGISTERED') {
            // Need to re-register
            self.uid = undefined;
            self.register();
        }
        self.emit('error', new Error('Device: There was an error: ' + JSON.stringify(responseMsgObj)));
    }

    // Make ourself an emiter
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

    this.clearRegisterTimeout();

    this._send('register', {
        deviceType: this.deviceType,
        channel: this.channel
    });

    // Check the registery again in RECHECK_REGISTER seconds if we do not get a response
    var self = this;
    this.recheckRegisteryTimeout = setTimeout(function checkRegistery() {
        self.log(self.deviceType + ': unable to register with proxy (timeout), trying again. (' + self.proxyUrl + ' on "' + self.channel + '")');
        self.register();
    }, NET_TIMEOUT);

};

Device.prototype.clearRegisterTimeout = function () {
    if (!this.recheckRegisteryTimeout) {
        return;
    }
    clearTimeout(this.recheckRegisteryTimeout);
};


/**
 * Send a ping to the proxy only.  Expect an immediate response from proxy.
 * @param  {function} callback  This function gets called on completion of the ping.
 */
Device.prototype.ping = function(callback) {

    // Can only ping if we are registered
    if (!this.uid && typeof callback === 'function') {
        callback(-1);
        return;
    }

    this.pingManager.add(this.mySeqNum, callback);

    var timeStr = (new Date().getTime()).toString();
    this._send('ping', timeStr);

};


/**
 * Send a status update to the remote proxy - which gets forwarded to the
 * controller(s).
 * @param  {string} type The status update type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.status = function (msgString) {
    this._send('status', msgString);
};


/**
 * Send a status to the remote proxy that is sticky - which gets forwarded to the
 * receiver(s).  A sticky status will be held on the proxy on the given channel until
 * the next message comes through.
 * @param  {string} type The sticky type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.stickyStatus = function (msgString) {
    this._send('status', msgString, {sticky: true});
};


/**
 * Send a command to the remote proxy - which gets forwarded to the
 * receiver(s).
 * @param  {string} type The command type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.command = function (msgString) {

    if (this.deviceType !== 'controller') {
        throw new Error('Only controllers can send commands.');
    }

    this._send('command', msgString);
};

/**
 * Send a command to the remote proxy that is sticky - which gets forwarded to the
 * receiver(s).  A sticky command will be held on the proxy on the given channel until
 * the next message comes through.
 * @param  {string} type The command type we are sending.
 * @param  {string} data The data, it must be a string.
 * @param  {object} options Additional options - read the code.
 */
Device.prototype.stickyCommand = function (msgString) {

    if (this.deviceType !== 'controller') {
        throw new Error('Only controllers can send commands.');
    }

    this._send('command', msgString, {sticky: true});
};


/**
 * Send data to the remote proxy.
 * @param  {string} type The message type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype._send = function(type, data, options) {

    if (!this.uid && type !== 'register') {
        this.log('Device._send(): Not yet registered.');
        return;
    }

    var msgObj = {
        type: type,
        uid: this.uid,
        seq: this.mySeqNum,
        data: data
    };

    if ((type === 'status' || type === 'command') && options && options.sticky === true) {
        msgObj.sticky = true;
    }

    // Send the message to the proxy.  Use the IP have we have determined it.
    this.connection._send(msgObj);
    this.mySeqNum += 1;
};


/**
 * Close all connections.
 */
Device.prototype.close = function() {
    this.uid = undefined;
    this.clearRegisterTimeout();
    if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
    }
    if (this.connection && typeof this.connection.closeAll === 'function') {
        this.connection.closeAll();
    }
    this.removeAllListeners();
    this.connection.removeAllListeners();
    this.pingManager.close();
};

/**
 * Checks if the device is registered or not.
 */
Device.prototype.isRegistered = function() {
    return typeof this.uid === 'string';
};


module.exports = Device;
