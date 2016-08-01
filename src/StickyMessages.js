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

function StickyMessages() {
    this.status = {};
    this.command = {};
}

StickyMessages.prototype.set = function(channel, type, msgObj) {
    if (type !== 'command' && type !== 'status') return;
    if (msgObj.sticky !== true) return;
    this[type][channel] = {
        type: type,
        seq: msgObj.seq,
        data: msgObj.data
    };
};

StickyMessages.prototype.get = function(channel, deviceType, msgObj) {
    var type;
    if (deviceType === 'controller' || deviceType === 'observer') {
        type = 'status';
    } else {
        type = 'command';
    }
    var stickyObj = this[type][channel];
    if (stickyObj === undefined) return undefined;
    return {
        type: type,
        seq: stickyObj.seq,
        data: stickyObj.data,
        uid: msgObj.uid,
        socket: msgObj.socket
    };
};

module.exports = StickyMessages;
