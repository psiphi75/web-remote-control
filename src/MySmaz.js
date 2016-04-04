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

/*****************************************************************************************************
 *
 *                                 Hack the smaz codebook
 *
 * smaz has a codebook, but it does not work well with our implementation.  So we hack it a bit. Now
 * it works a much better with numbers and JSON.  We also take out the 13th char (new line).
 *
 *****************************************************************************************************/

 // We only hack the reverse_codebook, then generate the codebook from that.
 var reverse_codebook = [' ', 'the', 'e', 't', 'a', 'of', 'o', 'and', 'i', 'n',
    '\n', /* We keep the newline in position 0x0A, because it will be used there */
    'e ', 'r', 's',
    ' t', 'in', 'he', 'th', 'h', 'he ', 'to', '\r\n', 'l', 's ', 'd', ' a', 'an","er', 'c', ' o', 'd ',
    'on', ' of', 're', 'of ', 't ', ', ', 'is', 'u', 'at', '   ', 'n ', 'or', 'which', 'f', 'm', 'as',
    'it', 'that', '$', 'was', 'en', '  ', ' w', 'es', ' an', ' i', '\r', 'f ', 'g', 'p', 'nd', ' s',
    'nd ', 'ed ', 'w', 'ed', 'http://', 'for', 'te', 'ing', 'y ', 'The', ' c', 'ti', 'r ', 'his', 'st',
    ' in', 'ar', 'nt', ',', ' to', 'y', 'ng', ' h', 'with', 'le', 'al', 'to ', 'b', 'ou', 'be', 'were',
    ' b', 'se', 'o ', 'ent', 'ha', 'ng ', 'their', '"', 'hi', 'from', ' f', 'in ', 'de', 'ion', 'me',
    'v', '.', 've', 'all', 're ', 'ri', 'ro', 'is ', 'co', 'f t', 'are', 'ea', '. ', 'her', ' m',
    'er ', ' p', 'es ', 'by', 'they', 'di', 'ra', 'ic', 'not', 's, ', 'd t', 'at ', 'ce', 'la', 'h ',
    'ne', 'as ', 'tio', 'on ', 'n t', 'io', 'we', ' a ', 'om', ', a', 's o', 'ur', 'li', 'll', 'ch',
    'had', 'this', 'e t', 'g ', 'e\r\n', ' wh', 'ere', ' co', 'e o', 'a ', 'us', ' d', 'ss', '\n\r\n',
    '\r\n\r', '="', ' be', ' e', 's a', 'ma', 'one', 't t', 'or ', 'but', 'el', 'so', 'l ', 'e s',
    's,', 'no', 'ter', ' wa', 'iv', 'ho', 'e a', ' r', 'hat', 's t', 'ns', 'ch ', 'wh', 'tr', 'ut',
    '/', 'have', 'ly ', 'ta', ' ha', ' on', 'tha', '-', ' l', 'ati', 'en ', 'pe', ' re', 'there',
    'ass', 'si', ' fo', 'wa', 'ec', 'our', 'who', 'its', 'z', 'fo', 'rs', '>', 'ot', 'un', '<', 'im',
    'th ', 'j', '\'', '{"type":"', '"}', '","', '":{"', '":"', '"seq":', '{"type":"status",',
    '{"type":"error",', '{"type":"command",', '{"type":"register",', '{"type":"ping",', ':"', '":',
    '{', '}', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

var smaz = require('smaz');
smaz.codebook = generateCodebook();
smaz.reverse_codebook = reverse_codebook;

module.exports = {

    compress: smaz.compress,
    decompress: smaz.decompress,

    // decompress: function decompress(smazedBuf) {
    //     var s = new Buffer(smazedBuf);
    //     var uncompressedString = smaz.decompress(s);
    //     return uncompressedString;
    // },


    /**
     * Mainly exposed for testing purposes.  This needs to be tested each time an update to the codebook is made.
     * @throws Error if there is an issue with the codebook.
     */
    validateCodebook: function validateCodebook() {
        if (reverse_codebook.length !== 254) {
            throw new Error('reverse_codebook should have 254 characters, yet it has ' + reverse_codebook.length);
        }
        reverse_codebook.forEach(function (value, i) {

            if (typeof value !== 'string') {
                throw new Error('Value is not a string.  value: "' + value + '", index: ' + i);
            }

            // If there are two or more similar entries it will catch one of them.
            if (reverse_codebook.indexOf(value) !== i) {
                throw new Error('Duplicate entry.  value: "' + value + '", index: ' + i);
            }
        });
    }
};


/**
 * Generate the codebook from the reverse_codebook.
 * @return {[string]} The codebook
 */
function generateCodebook() {

    var codebook = {};
    reverse_codebook.forEach(function (value, i) {
        codebook[value] = i;
    });

    return codebook;
}
