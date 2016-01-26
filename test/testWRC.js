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

var test = require('tape');

var messageHandler = require('../src/messageHandler');
var wrc = require('../index');
var proxy = wrc.createProxy({log: function(){} });

var channel1 = 'channel-1';
var toy1;
var controller1 = wrc.createController({ channel: channel1, log: function(){}, keepalive: 0 });


test('Compression works', function(t) {
    t.plan(1);

    var obj = { type: 'ping', seq: 1234, uid: '123422', data: '1453020903937' };

    t.deepEqual(messageHandler.parseIncomingMessage(messageHandler.packOutgoingMessage(obj)), obj, 'Can compress and decompress');

});


test('Test Proxy can be created and a toy can be registered', function(t) {

    t.plan(4);
    var tests = 0;

    var uid1;
    var uid2;

    proxy.on('register', function fn(msgObj) {
        t.equal(msgObj.type, 'register', 'message is correct type');
        uid1 = msgObj.uid;
        t.true(typeof msgObj.uid === 'string', 'the uid is the correct type');

        tests += 2;
        wrapUp();

        proxy.removeListener('register', fn);
    });

    toy1 = wrc.createToy({ channel: channel1, log: function(){}, keepalive: 0 });

    toy1.on('register', function fnreg(msgUid) {
        t.true(typeof msgUid === 'string', 'the uid is the correct type');
        uid2 = msgUid;

        tests += 1;
        wrapUp();

        toy1.removeListener('register', fnreg);
    });

    function wrapUp() {
        if (tests === 3) {
            t.equal(uid1, uid2, 'The UIDs are the same');
            t.end();
        }
    }

});

test('Test we can ping the proxy and get a result', function(t) {

    t.plan(4);

    controller1.ping(function (time) {
        t.true(typeof time === 'number', 'controller: ping time is a number');
        t.true(time >= 0, 'controller: ping time is in the past');
    });

    toy1.ping(function (time) {
        t.true(typeof time === 'number', 'toy: ping time is a number');
        t.true(time >= 0, 'toy: ping time is in the past');
    });

});

test('Test controller-1 can send commands to proxy', function(t) {

    t.plan(2);

    var cmdTxt = 'simon say\'s do this';

    proxy.on('command', function fn (cmdObj) {
        t.equal(cmdObj.type, 'command', 'message is correct type');
        t.equal(cmdObj.data, cmdTxt, 'command was correct');
        t.end();

        proxy.removeListener('command', fn);

    });

    controller1.command(cmdTxt);

});

test('Test controller-1 can send commands to toy-1 (text)', function(t) {

    t.plan(1);

    var cmdTxt = 'simon say\'s do this';

    toy1.on('command', function fn (respCmdTxt) {

        // Slow things down just a bit
        setTimeout(function() {
            t.equal(respCmdTxt, cmdTxt, 'command was correct');
            t.end();
        }, 50);

        toy1.removeListener('command', fn);
    });

    controller1.command(cmdTxt);

});

test('Test controller-1 can send commands to toy-1 (object)', function(t) {

    t.plan(1);

    var cmdObj = {
        a: 'simon say\'s do this',
        b: 'c'
    };

    toy1.on('command', function fn (respCmdObj) {
        t.deepEqual(respCmdObj, cmdObj, 'command was correct');
        t.end();

        toy1.removeListener('command', fn);
    });

    controller1.command(cmdObj);

});


test('Test toy-1 can send status updates to controller-1 (text)', function(t) {

    t.plan(1);

    var statusTxt = 'Hi, I am here';

    controller1.on('status', function fn (respStatusTxt) {
        t.equal(respStatusTxt, statusTxt, 'command was correct');
        t.end();

        controller1.removeListener('status', fn);
    });

    toy1.status(statusTxt);

});

test.onFinish(function () {

    setTimeout(function () {
        proxy.close();
        toy1.close();
        controller1.close();

    }, 100);

});
