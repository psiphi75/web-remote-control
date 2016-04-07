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

var test = require('tape');

var DevMan = require('../src/DeviceManager');
var devices = new DevMan();

var deviceType = 'toy';
var channel1 = 'chan1';
var channel2 = 'chan2';
var uid2;
var uid5;

test('Can create a list of devices and add many', function(t) {

    t.plan(6);

    uid2 = devices.add(deviceType, channel1, 'b', 1);
    uid5 = devices.add(deviceType, channel2, 'e', 1);

    t.true(typeof devices.add(deviceType, channel1, 'a', 1) === 'string', 'added a toy');
    t.true(typeof uid2 === 'string', 'added a toy');
    t.true(typeof devices.add(deviceType, channel1, 'c', 1) === 'string', 'added a toy');

    t.true(typeof devices.add(deviceType, channel2, 'd', 1) === 'string', 'added a toy');
    t.true(typeof uid5 === 'string', 'added a toy');

    t.equal(devices.add(), undefined, 'must pass parameters to add');

    t.end();


});

test('Can retreive the toys', function(t) {

    t.plan(2);

    t.deepEqual(devices.get(uid2), {
        deviceType: deviceType,
        channel: channel1,
        socket: 'b',
        seqNum: 1
    });
    t.deepEqual(devices.get(uid5), {
        deviceType: deviceType,
        channel: channel2,
        socket: 'e',
        seqNum: 1
    });

    t.end();

});

test('Can get devices on channel and remove devices', function(t) {

    t.plan(4);

    t.equal(devices.getAll(deviceType, channel1).length, 3);
    t.true(devices.remove(uid2), 'can remove device');
    t.equal(devices.getAll(deviceType, channel1).length, 2);
    t.false(devices.remove(uid2), 'can not remove device');

    t.end();

});

test('Can update a device', function(t) {

    t.plan(1);

    devices.update(uid5, 'x', 3005);

    t.deepEqual(devices.get(uid5), {
        deviceType: deviceType,
        channel: channel2,
        socket: 'x',
        seqNum: 3005
    }, 'device updates correctly');

    t.end();

});


test('Sequence number checks', function(t) {

    t.plan(2);

    devices.update(uid5, 'x', 3005);
    t.ok(devices.isLatestSeqNum(uid5, 3006), 'Sequence numbers increment okay.');

    devices.update(uid5, 'x', 3006);
    t.notOk(devices.isLatestSeqNum(uid5, 3005), 'Old Sequence numbers fail.');

    t.end();

});
