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

var PingManager = require('../src/PingManager');
var settings = {
    log: function () {}
};

test('Can create a few pings', function (t) {

    t.plan(2);

    var pm = new PingManager(settings);
    var fn1 = function () {};
    var fn2 = function () {};
    var fn3 = function () {};
    pm.add(1, fn1);
    pm.add(2, fn2);
    pm.add(3, fn3);

    t.deepEqual(pm.pingList[1].callback, fn1);
    t.deepEqual(pm.pingList[3].callback, fn3);

    clearTimeout(pm.pingList[1].timeoutHandle);
    clearTimeout(pm.pingList[2].timeoutHandle);
    clearTimeout(pm.pingList[3].timeoutHandle);

    t.end();

});

test('Pings timeout (self-destruct)', function (t) {

    t.plan(3);

    var pm = new PingManager(settings);
    pm.MAX_PING_WAIT_TIME = 100;

    var pingResponseTime = 0;
    var fn1 = function (time) {
        pingResponseTime = time;
        t.equal(time, -1, 'pingResponse should return -1 (unsuccessful ping)');
        t.end();
    };
    pm.add(1, fn1);

    t.equal(pingResponseTime, 0, 'pingResponse should not have changed yet');
    t.deepEqual(pm.pingList[1].callback, fn1);

});

test('Pings can be resolved', function (t) {

    t.plan(2);

    var pm = new PingManager(settings);

    var fn1 = function (time) {
        t.equal(time, 123, 'pingResponse should be positive');

        setTimeout(function () {
            t.equal(typeof pm.pingList[1], 'undefined', 'Ping should be removed from list');
            t.end();
        }, 100);
    };
    pm.add(1, fn1);
    pm.handleIncomingPing(1, 123);

});
