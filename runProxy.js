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

/*
 * We just run the proxy.
 */

var DISCOVERY_PROXY_NAME = 'web-remote-control-proxy';
var polo = require('polo');
var apps = polo();
apps.put({
    name: DISCOVERY_PROXY_NAME,
	host: getIPAddress(),
    port: 31234
});

var wrc = require('web-remote-control');
wrc.createProxy({
    udp4: true,
    tcp: true,
    socketio: true,
    onlyOneControllerPerChannel: true,
    onlyOneToyPerChannel: true,
    allowObservers: true,
    log: function() {}
});

function getIPAddress() {

    var os = require('os');
    var ifaces = os.networkInterfaces();
	var addresses = [];

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if (iface.family !== 'IPv4' || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
            } else {
                // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
            }
			addresses.push(iface.address);
            alias += 1;

        });
    });

    addresses.sort(function(add) { return (add === '192.168.7.1' ? 1 : -1); });
	return addresses[0];
}
