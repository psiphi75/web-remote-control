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

var msgHandler = require('../src/messageHandler');

var mySmaz = require('../src/MySmaz');

test('Smaz codebook hack is valid', function(t) {
    t.plan(1);
    t.doesNotThrow(mySmaz.validateCodebook, undefined, 'Codebook Validation');
    t.end();
});

messageHandlerCompUncomp(true);
messageHandlerCompUncomp(false);


function messageHandlerCompUncomp(enable_compression) {

    // This is not dependant on local, but we don't need to over test it.
    test('messageHandler compress and uncompresses', function(t) {
        t.plan(3);

        var obj = { type: 'ping', seq: 1234, uid: '123422', data: '1453020903937' };
        var o = msgHandler.parseIncomingMessage(msgHandler.packOutgoingMessage(obj, enable_compression), enable_compression);
        t.deepEqual(o, obj, 'Can compress and decompress');

        obj.data = { 'moredata': { 'yetmore': {} } };
        o = msgHandler.parseIncomingMessage(msgHandler.packOutgoingMessage(obj, enable_compression), enable_compression);
        t.deepEqual(o, obj, 'Can compress and decompress nested objects');

        obj.data.newline = { 'yetmoredata': 'data wi\nth newlines\n' };
        o = msgHandler.parseIncomingMessage(msgHandler.packOutgoingMessage(obj, enable_compression), enable_compression);
        t.deepEqual(o, obj, 'Can compress and decompress with newline characters');

        t.end();

    });
}

// This is not dependant on local, but we don't need to over test it.
test('Compression actually compresses', function(t) {
    t.plan(1);

    var obj = { type: 'ping', seq: 1234, uid: '123422', data: '1453020903937' };
    obj.data = { 'moredata': { 'yetmore': {} } };
    obj.data.newline = { 'yetmoredata': 'data wi\nth newlines\n' };

    var objStr = JSON.stringify(obj);

    var lenBefore = objStr.length;
    var lenAfter = mySmaz.compress(objStr).length;
    t.true(lenAfter < lenBefore * 0.7, 'Size is smaller after compression.');

    console.log('Bytes before: ', lenBefore);
    console.log('Bytes after: ', lenAfter);

    t.end();

});


// This is not dependant on local, but we don't need to over test it.
test('(De)Compression works', function(t) {

    var tests = [
        'This is a simple test',
        '',
        'And\nsome new\n lines\n',
        '%9823h&3j*jd',
        '\t'
    ];

    t.plan(tests.length);

    tests.forEach(function (str, i) {
        t.equal(mySmaz.decompress(mySmaz.compress(str)), str, 'Test string #' + (i + 1));
    });

    t.end();

});
