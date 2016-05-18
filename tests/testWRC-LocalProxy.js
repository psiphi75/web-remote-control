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


var proxy = createProxy();
var toy;
var controller;

function createProxy() {
    return wrc.createProxy({log: logging,
                            udp4: UDP,
                            tcp: TCP,
                            socketio: false,
                            onlyOneControllerPerChannel: true,
                            onlyOneToyPerChannel: true });
}
function createController() {
    return wrc.createController({ channel: channel1, log: logging, keepalive: 0, udp4: UDP, tcp: TCP });
}
function createToy() {
    return wrc.createToy({ channel: channel1, log: logging, keepalive: 0, udp4: UDP, tcp: TCP });
}


test('Test Proxy can be created and a toy can be registered', function(t) {

    t.plan(4);
    var tests = 0;

    var uid1;
    var uid2;

    proxy.once('register', function fn(msgObj) {
        t.equal(msgObj.type, 'register', 'message is correct type');
        uid1 = msgObj.uid;
        t.true(typeof msgObj.uid === 'string', 'the uid is the correct type');

        tests += 2;
        wrapUp();
    });

    toy = createToy();
    toy.once('register', function fnReg(msgUid) {
        t.true(typeof msgUid === 'string', 'the uid is the correct type');
        uid2 = msgUid;

        tests += 1;
        wrapUp();
    });

    function wrapUp() {
        if (tests === 3) {
            t.equal(uid1, uid2, 'The UIDs are the same');
            t.end();
        }
    }

});

test('Test controller can send commands to proxy', function(t) {

    t.plan(2);

    var cmdTxt = 'simon say\'s do this';

    proxy.once('command', function fn (cmdObj) {
        t.equal(cmdObj.type, 'command', 'message is correct type');
        t.equal(cmdObj.data, cmdTxt, 'command was correct');
        t.end();
    });

    controller = createController();
    controller.once('register', function fnReg() {
        controller.command(cmdTxt);
    });

});


test('toy-x registers, proxy crashes, then toy-1 pings and gets error and re-registers', function(t) {

    t.plan(2);

    // "Crash" the proxy - we simulate by removing the toy from DevMan
    delete proxy.devices.list[toy.uid];

    toy.once('error', function() {
        t.pass('proxy sent an error response, as expected');
    });

    toy.once('register', function(msgUid) {
        t.true(typeof msgUid === 'string', '... and we re-registered okay');
        t.end();
    });

    toy.ping();

});

test('The sequence numbers are handled and passed from device to toy', function(t) {

    // Seq Plan, item '1003' should be dropped by proxy and not heard by controller.
    var seqPlan = [1001, 1002, 1004, 1003, 1005];
    var seqPlanCnt = 0;

    toy.on('command', fnToy);
    controller.on('status', fnCtrlr);
    controller.command('start');

    toy.mySeqNum = seqPlan[seqPlanCnt];

    // Handle all commands
    function fnToy (cmdObj) {

        if (seqPlanCnt >= seqPlan.length) {
            wrapUp();
            return;
        }

        switch (seqPlanCnt) {

            case 0:
            case 1:
            case 2:
            case 4:
                t.pass('Toy sequence number increments okay.');
                break;

            case 3:
                t.equal(cmdObj, 'dummy', 'Dummy command passed through okay.');
                break;

            default:
                t.fail('We really should never reach this.');
        }

        // Fabricate the sequence number to simulate slow packets
        toy.mySeqNum = seqPlan[seqPlanCnt];
        toy.status('' + seqPlan[seqPlanCnt]);

        seqPlanCnt += 1;
    }

    function fnCtrlr (toySeq) {

        switch (toySeq) {

            case '1001':
            case '1002':
            case '1004':
            case '1005':
                t.pass('In order sequences arrive at controller.');
                break;

            case '1003':
                t.fail('Out of order sequences should not arrive at controller.');
                break;

            default:
                t.fail('We really should never reach this.');
        }

        controller.command(toySeq);

        // Need to push through another command - since the status won't reach
        if (seqPlanCnt === 2) {
            controller.command('dummy');
        }
    }

    function wrapUp() {
        toy.removeListener('command', fnToy);
        controller.removeListener('status', fnCtrlr);

        t.end();
    }

});


test('There can be only one device per channel', function(t){
    t.plan(4);



    t.equal(proxy.devices.getAll('toy', channel1).length, 1, 'There is only one toy to start with.');
    var toy2 = createToy();
    toy2.once('register', function() {
        t.equal(proxy.devices.getAll('toy', channel1).length, 1, 'There is only one toy to end with.');
        toy2.close();
    });

    t.equal(proxy.devices.getAll('controller', channel1).length, 1, 'There is only one controller to start with.');
    var controller2 = createController();
    controller2.once('register', function() {
        t.equal(proxy.devices.getAll('controller', channel1).length, 1, 'There is only one controller to end with.');
        controller2.close();
    });

});


test.onFinish(function () {

    setTimeout(function () {
        proxy.close();
        toy.close();
        controller.close();
    }, 100);

});
