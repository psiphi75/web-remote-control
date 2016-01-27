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

var NET_TIMEOUT = 5 * 1000;

function Device(settings, Connection) {
    this.proxyUrl = settings.proxyUrl;
    this.port = settings.port;
    this.channel = settings.channel || '1';
    this.keepalive = settings.keepalive;
    this.deviceType = settings.deviceType || 'controller';
    this.log = settings.log || function() {};

    this.pingManager = new PingManager();
    this.connection = new Connection(settings);

    this.uid = undefined;
    // This keeps a track of ther controller sequenceNumber.  If a command with
    // a smaller number is received, we drop it.
    this.remoteSeqNum = 0;
    this.mySeqNum = 1;

    if (this.keepalive > 0) {
        this.timeoutHandle = setInterval(this.ping.bind(this), this.keepalive);
    }

    var self = this;
    this.connection.on('error', function(err) {
        self.emit('error', 'Device: There was an error: ' + err);
    });
    this.connection.on('register', handleRegisterResponse.bind(this));
    this.connection.on('status', reEmit.bind(this));
    this.connection.on('command', reEmit.bind(this));
    this.connection.on('ping', function fn(msgObj) {
        var pingTime = (new Date()).getTime() - parseInt(msgObj.data);
        self.pingManager.handleIncomingPing(msgObj.seq, pingTime);
    });

    // Register the device, this announces us.
    this.register();

    function reEmit(responseMsgObj) {
        this.emit(responseMsgObj.type, responseMsgObj.data, responseMsgObj.seq);
    }

    function handleRegisterResponse(responseMsgObj) {

        if (!this.uid) {
            this.log('Registered');

            if (typeof responseMsgObj.uid !== 'string') {
                throw new Error('unable to initailise');
            }
            this.uid = responseMsgObj.uid;
        }

        clearTimeout(this.recheckRegisteryTimeout);
        reEmit.bind(this)(responseMsgObj);
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

    this.send('register', {
        deviceType: this.deviceType,
        channel: this.channel
    });

    // Check the registery again in RECHECK_REGISTER seconds if we do not get a response
    var self = this;
    this.recheckRegisteryTimeout = setTimeout(function checkRegistery() {

        self.log(self.deviceType + ': unable to register with proxy, trying again.');
        self.register();

    }, NET_TIMEOUT);

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
    this.send('ping', timeStr);

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
        throw new Error('Only controllers can send commands.');
    }

    this.send('command', msgString);
};


/**
 * Send data to the remote proxy.
 * @param  {string} type The message type we are sending.
 * @param  {string} data The data, it must be a string.
 */
Device.prototype.send = function(type, data) {

    var msgObj = {
        type: type,
        uid: this.uid,
        seq: this.mySeqNum,
        data: data
    };

    // Send the message to the proxy.  Use the IP have we have determined it.
    this.connection.send(msgObj);
    this.mySeqNum += 1;

};


/**
 * Close all connections.
 */
Device.prototype.close = function() {
    if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
    }
    if (this.connection) {
        this.connection.closeAll();
    }
};


module.exports = Device;