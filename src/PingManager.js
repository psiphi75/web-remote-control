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

/**
 * PingManager ensures all pings are matched to a response.  Lost pings are
 * forgotten over time.
 */
function PingManager() {
    this.pingList = {};
    this.MAX_PING_WAIT_TIME = 60 * 1000;
}

/**
 * Add a new ping and handle the callback when it times out.
 * @param  {number}   pingId   The ping sequenceNumber
 * @param  {Function} callback The callback (returns time or -1 on timeoutHandle)
 */
PingManager.prototype.add = function(pingId, callback) {

    if (typeof pingId !== 'number') {
        throw new Error('PingManager.add(): pingId must be a number.');
    }
    if (this.pingList[pingId]) {
        throw new Error('PingManager.add(): pingId has already been supplied.');
    }

    // Create the ping, and make it self destruct.
    var self = this;
    var ping = {
        callback: callback,
        timeoutHandle: setTimeout(function removeStalePing() {
                                      // and delete the stale ping
                                      self.handleIncomingPing(pingId, -1);
                                  }, this.MAX_PING_WAIT_TIME)
    };

    this.pingList[pingId] = ping;

};

/**
 * We call this when we receive a ping.  This will close the ping.  This will
 * run the callback we called with the add() method.
 * @param  {number} pingId The ping sequenceNumber.
 * @param  {number} time   The elapsed time.
 */
PingManager.prototype.handleIncomingPing = function(pingId, time) {
    var ping = this.pingList[pingId];
    if (!ping) {
        throw new Error('PingManager.respond(): pingId not found.');
    }

    clearTimeout(ping.timeoutHandle);

    if (typeof ping.callback === 'function'){
        ping.callback(time);
    }

    try {
        delete this.pingList[pingId];
    } catch (ex) {
        console.error('Did not expect this.');
    }

};

PingManager.prototype.close = function () {
    for (var pingId in this.pingList) {
        this.handleIncomingPing(pingId, -1);
    }
};

module.exports = PingManager;
