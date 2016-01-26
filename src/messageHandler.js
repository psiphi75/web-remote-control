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

/**
 * Parse an incoming message and ensure it's valid.  Convert it to an object that
 * can ben sent to other listeners.
 *
 * @param  {[uint8]?} message  The message from the datastream
 * @param  {object} remote   The remote host
 * @param  {string} protocol The protocol we are using
 * @return {object}          The valid object.
 * @throws Error when the message is invalid.
 */
exports.parseIncomingMessage = function(message) {

    var msgObj;

    try {
        msgObj = decompress(message);
    } catch (ex) {
        throw new Error('There was an error parsing the incoming message: ' + ex);
    }

    if (typeof msgObj !== 'object') {
        throw new Error('The incoming message is corrupt');
    }

    /* Check the type is valid */
    var requiresList;
    switch (msgObj.type) {
        case 'register':
            requiresList = ['type', 'seq', 'data'];
            break;
        case 'ping':
        case 'status':
        case 'command':
            requiresList = ['type', 'seq', 'data', 'uid'];
            break;
        default:
            throw new Error('An invalid incoming message arrived: ' + msgObj.toString());
    }

    /* Check the properties are all valid */
    var count = 0;
    for (var key in msgObj) {
        if (msgObj.hasOwnProperty(key) && requiresList.indexOf(key) >= 0) {
            count += 1;
        }
    }
    if (count !== requiresList.length) {
        throw new Error('The message that arrived is not valid, it has too many or two few properties: ' + msgObj.toString());
    }

    return msgObj;
};

exports.packOutgoingMessage = function(msgObj) {

    var cleanMsgObj = {};
    if (msgObj.hasOwnProperty('type')) {
        cleanMsgObj.type = msgObj.type;
    }
    if (msgObj.hasOwnProperty('seq')) {
        cleanMsgObj.seq = msgObj.seq;
    }
    if (msgObj.hasOwnProperty('data')) {
        cleanMsgObj.data = msgObj.data;
    }
    if (msgObj.hasOwnProperty('uid')) {
        cleanMsgObj.uid = msgObj.uid;
    }
    return compress(cleanMsgObj);

};

// TODO: Would be nice to get compression going.  But this did not work nicely.
// var smaz = require('smaz');

var compress = function(data) {
    // console.log(1, data);
    // var str = JSON.stringify(data);
    // console.log(2, str);
    // var c = smaz.compress(str);
    // console.log(3, c);
    // var compressedData = new Buffer(c);
    // console.log(4, compressedData.toString());
    // return compressedData;

    var str = JSON.stringify(data);
    var buf = new Buffer(str);
    return buf;

};

var decompress = function(compressedData) {

    var buf = compressedData;
    var str = buf.toString();
    var data = JSON.parse(str);

    // console.log(4, compressedData.toString());
    // var c = new Uint8Array(compressedData);
    // console.log(3, c);
    // var str = smaz.decompress(c);
    // console.log(2, str);
    // var data = JSON.parse(str);
    // console.log(1, data);


    // var result;
    // try {
    //     console.log()
    //     // console.log(smaz.decompress(data).toString())
    //
    //     result = JSON.parse(smaz.decompress(new Uint8Array(data)));
    // } catch (ex) {
    //     console.error('unable to decompress data');
    // }
    return data;
};
