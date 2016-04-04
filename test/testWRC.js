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

// Allows us to change the tests (UDP vs TCP) from the command line
var UDP = true;
var TCP = false;
if (process.env.PROTOCOL && process.env.PROTOCOL.toUpperCase() === 'TCP') {
    UDP = false;
    TCP = true;
}

// Allows us to test against a remote proxy, from the command line
var PROXY_ADDRESS = 'localhost';
var isLocalProxy = true;
if (process.env.PROXY_ADDRESS) {
    isLocalProxy = false;
    PROXY_ADDRESS = process.env.PROXY_ADDRESS;
}

var test = require('tape');

var messageHandler = require('../src/messageHandler');
var wrc = require('../index');

var channel1 = 'channel-1';


if (isLocalProxy) {

    // This is not dependant on local, but we don't need to over test it.
    test('Compression works', function(t) {
        t.plan(1);

        var obj = { type: 'ping', seq: 1234, uid: '123422', data: '1453020903937' };

        t.deepEqual(messageHandler.parseIncomingMessage(messageHandler.packOutgoingMessage(obj)), obj, 'Can compress and decompress');

    });

    var localProxy = wrc.createProxy({log: function(){}, udp4: UDP, tcp: TCP, socketio: false });
    var localToy;
    var localController = wrc.createController({ channel: channel1, log: function(){}, keepalive: 0, udp4: UDP, tcp: TCP });

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

        localToy = wrc.createToy({ channel: channel1, log: function(){}, keepalive: 0, udp4: UDP, tcp: TCP });

        localToy.on('register', function fnreg(msgUid) {
            t.true(typeof msgUid === 'string', 'the uid is the correct type');
            uid2 = msgUid;

            tests += 1;
            wrapUp();

            localToy.removeListener('register', fnreg);
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

        localController.command(cmdTxt);

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

}  // end of isLocalProxy


var options = { channel: channel1, log: function(){}, keepalive: 0, udp4: UDP, tcp: TCP, proxyUrl: PROXY_ADDRESS };
var controller = wrc.createController(options);
var toy = wrc.createToy(options);


// Wait until both devices are registered
var countRegs = 0;
controller.on('register', regCounter);
toy.on('register', regCounter);
function regCounter () {
    countRegs += 1;
    if (countRegs === 2) {
        startRemainingTests();
    }
}

function startRemainingTests () {

    test('Test we can ping the Proxy and get a result', function(t) {

        t.plan(4);

        controller.ping(function (time) {
            t.true(typeof time === 'number', 'controller: ping time is a number');
            t.true(time >= 0, 'controller: ping time is in the past');
        });

        toy.ping(function (time) {
            t.true(typeof time === 'number', 'toy: ping time is a number');
            t.true(time >= 0, 'toy: ping time is in the past');
        });

    });


    test('Test controller-1 can send commands to toy-1 (text)', function(t) {

        t.plan(1);

        var cmdTxt = 'simon say\'s do this';

        toy.on('command', function fn (respCmdTxt) {

            // Slow things down just a bit
            setTimeout(function() {
                t.equal(respCmdTxt, cmdTxt, 'command received is correct');
                t.end();
            }, 50);

            toy.removeListener('command', fn);
        });

        controller.command(cmdTxt);

    });

    test('Test controller-1 can send commands to toy-1 (object)', function(t) {

        t.plan(1);

        var cmdObj = {
            a: 'simon say\'s do this',
            b: 'c'
        };

        toy.on('command', function fn (respCmdObj) {
            t.deepEqual(respCmdObj, cmdObj, 'command was correct');
            t.end();

            toy.removeListener('command', fn);
        });

        controller.command(cmdObj);

    });


    test('Test toy-1 can send status updates to controller-1 (text)', function(t) {

        t.plan(1);

        var statusTxt = 'Hi, I am here';

        controller.on('status', function fn (respStatusTxt) {
            t.equal(respStatusTxt, statusTxt, 'command was correct');
            t.end();

            controller.removeListener('status', fn);
        });

        toy.status(statusTxt);

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

            toy.close();
            controller.close();

        }, 250);

    });

}
