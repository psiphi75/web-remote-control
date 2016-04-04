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
var wrc = require('../index');


//
//        Configuration
//


// Allows us to change the tests (UDP vs TCP) from the command line
var UDP = true;
var TCP = false;
if (process.env.PROTOCOL && process.env.PROTOCOL.toUpperCase() === 'TCP') {
    UDP = false;
    TCP = true;
}

// Enable detailed logging
var ENABLE_LOGGING = false;
var logging;
if (!ENABLE_LOGGING) {
    logging = function() {};
}

var channel1 = 'channel-1';


//
//        Tests
//


var localProxy = wrc.createProxy({log: logging, udp4: UDP, tcp: TCP, socketio: false });
var localToy;
var localController;

test('Test Proxy can be created and a toy can be registered', function(t) {

    t.plan(4);
    var tests = 0;

    var uid1;
    var uid2;

    localProxy.on('register', function fn(msgObj) {
        t.equal(msgObj.type, 'register', 'message is correct type');
        uid1 = msgObj.uid;
        t.true(typeof msgObj.uid === 'string', 'the uid is the correct type');

        tests += 2;
        wrapUp();

        localProxy.removeListener('register', fn);
    });

    localToy = wrc.createToy({ channel: channel1, log: logging, keepalive: 0, udp4: UDP, tcp: TCP });

    localToy.on('register', function fnReg(msgUid) {
        t.true(typeof msgUid === 'string', 'the uid is the correct type');
        uid2 = msgUid;

        tests += 1;
        wrapUp();

        localToy.removeListener('register', fnReg);
    });

    function wrapUp() {
        if (tests === 3) {
            t.equal(uid1, uid2, 'The UIDs are the same');
            t.end();
        }
    }

});

test('Test localController can send commands to localProxy', function(t) {

    t.plan(2);

    var cmdTxt = 'simon say\'s do this';

    localProxy.on('command', function fn (cmdObj) {
        t.equal(cmdObj.type, 'command', 'message is correct type');
        t.equal(cmdObj.data, cmdTxt, 'command was correct');
        t.end();

        localProxy.removeListener('command', fn);

    });

    localController = wrc.createController({ channel: channel1, log: logging, keepalive: 0, udp4: UDP, tcp: TCP });
    localController.on('register', function fnReg() {
        localController.command(cmdTxt);
        localController.removeListener('command', fnReg);
    });

});

test('toy-x registers, proxy crashes, then toy-1 pings and gets error and re-registers', function(t) {

    t.plan(2);

    // "Crash" the proxy - we simulate by removing the toy from DevMan
    localProxy.devices.remove(localToy.uid);

    localToy.on('error', function fn1 () {
        t.pass('proxy sent an error response, as expected');
        localToy.removeListener('error', fn1);
    });

    localToy.on('register', function fn2 (msgUid) {
        t.true(typeof msgUid === 'string', '... and we re-registered okay');
        t.end();

        localToy.removeListener('register', fn2);
    });

    localToy.ping();

});


test.onFinish(function () {

    setTimeout(function () {
        if (localProxy) {
            localProxy.close();
        }
        if (localToy) {
            localToy.close();
        }
        if (localController) {
            localController.close();
        }

    }, 250);

});
