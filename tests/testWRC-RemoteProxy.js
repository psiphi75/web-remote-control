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


//
//        Imports
//


var test = require('tape');
var wrc = require('../index');


//
//        Configuration
//

var channel1 = 'channel-1';

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


//
//        Tests
//


var options = {
    channel: channel1,
    log: logging,
    keepalive: 0,
    udp4: UDP,
    tcp: TCP,
    proxyUrl: process.env.PROXY_ADDRESS
};
var controller = wrc.createController(options);
var toy = wrc.createToy(options);

// Wait until both devices are registered
var countRegs = 0;
controller.once('register', regCounter);
toy.once('register', regCounter);
function regCounter () {
    countRegs += 1;
    if (countRegs === 2) {
        startTests();
    }
}

function startTests () {


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

        toy.once('command', function(respCmdTxt) {

            // Slow things down just a bit
            setTimeout(function() {
                t.equal(respCmdTxt, cmdTxt, 'command received is correct');
                t.end();
            }, 50);

        });

        controller.command(cmdTxt);

    });

    test('Test controller-1 can send commands to toy-1 (object)', function(t) {

        t.plan(1);

        var cmdObj = {
            a: 'simon say\'s do this',
            b: 'c'
        };

        toy.once('command', function(respCmdObj) {
            t.deepEqual(respCmdObj, cmdObj, 'command was correct');
            t.end();
        });

        controller.command(cmdObj);

    });


    test('Test toy-1 can send status updates to controller-1 (text)', function(t) {

        t.plan(1);

        var statusTxt = 'Hi, I am here';

        controller.once('status', function fn (respStatusTxt) {
            t.equal(respStatusTxt, statusTxt, 'command was correct');
            t.end();
        });

        toy.status(statusTxt);

    });

    test.onFinish(function () {

        setTimeout(function () {

            toy.close();
            controller.close();

        }, 250);

    });

}
