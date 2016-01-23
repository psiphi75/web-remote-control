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

// TODO: Would be nice to get compression going.  But this did not work nicely.
// var smaz = require('smaz');

exports.compress = function(data) {
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

exports.decompress = function(compressedData) {

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
