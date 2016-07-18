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

var defaults = {
    // This is the URL were the proxy is located.  Only Toys and Controllers can
    // configure this.
    proxyUrl: 'localhost',

    // This is the port of the proxy.  All three components (proxy, controller,
    // and toy) need to be configured on the same port.
    port: 33330,

    // This is the channel to use.  The proxy will ensure that only devices on
    // the same channel can communicate together.  The controller and toy need
    // to be on the same channel.  You can make the channel a unique string.
    channel: '1',

    // How often the device pings the proxy.  This helps ensure the connection
    // is kept alive.  You can disable this by setting it to 0 (zero). Time is
    // in milliseconds.
    keepalive: 30 * 1000,

    // This determines the logging to use.  By default it logs to the standard
    // console.
    log: console.log,

    // Use the TCP Protocol - only the proxy can use both TCP and UDP.
    tcp: true,

    // Use the UDP protocol - only the proxy can use both TCP and UDP.
    udp4: true,

    // Allow connections to proxy via Socket.IO
    socketio: true,

    // Options for the proxy - should there be only one device (toy/controller) per channel?
    onlyOneControllerPerChannel: false,
    onlyOneToyPerChannel: false,

    // A listener is can only see the Toy's status.  It cannot send control commands.
    allowObservers: false,

};

// The proxy is the go-between server
exports.createProxy = init('proxy');

// The controller and contolled device (toy) use the same functionality.
exports.createToy = init('toy');
exports.createController = init('controller');
exports.createObserver = init('observer');


/**
 * Helper function to create an initialised device or proxy server.
 * @param  {string} type 'proxy', 'toy', or 'controller'.
 * @return {function}    The initialisation function that can be called later.
 */
function init(type) {

    return function(params) {
        if (!params) {
            params = {};
        }

        var settings = {
            proxyUrl: params.proxyUrl || defaults.proxyUrl,
            channel: params.channel || defaults.channel,
            keepalive: parseFalsey(params.keepalive, defaults.keepalive),
            port: params.port || defaults.port,
            log: params.log || defaults.log,
            tcp: parseFalsey(params.tcp, defaults.tcp),
            udp4: parseFalsey(params.udp4, defaults.udp4),
            socketio: parseFalsey(params.socketio, defaults.socketio),
            onlyOneControllerPerChannel: parseFalsey(params.onlyOneControllerPerChannel, defaults.onlyOneControllerPerChannel),
            onlyOneToyPerChannel: parseFalsey(params.onlyOneToyPerChannel, defaults.onlyOneToyPerChannel),
            allowObservers: parseFalsey(params.allowObservers, defaults.allowObservers),
            deviceType: type
        };

        if (typeof params.log !== 'function') {
            params.log = defaults.log;
        }

        switch (type) {

            case 'proxy':
                var Proxy = require('./src/Proxy');
                return new Proxy(settings);

            case 'toy':
            case 'controller':
            case 'observer':
                var Device = require('./src/Device');
                return new Device(settings);

            default:
                throw new Error('Could not determine server type.');
        }

    };
}

function parseFalsey(val1, val2) {
    if (typeof val1 === 'undefined') {
        return val2;
    }
    return val1;
}
