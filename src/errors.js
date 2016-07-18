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

module.exports = {
    DEVICE_NOT_REGISTERED: {
        type: 'DEVICE_NOT_REGISTERED',
        code: '1001',
        message: 'Device is not registered.'
    },
    ERROR_NOT_FOUND: {
        type: 'ERROR_NOT_FOUND',
        code: '9001',
        message: 'The specified code error was not found.'
    },
    PERMISSION_DENIED: {
        type: 'PERMISSION_DENIED',
        code: '5001',
        message: 'The action is not allowed.'
    },

    getByCode: function (code) {

        switch (typeof code) {
            case 'number':
                code = code.toString();
                break;
            case 'string':
                break;
            default:
                return this.ERROR_NOT_FOUND;
        }

        for (var errType in this) {
            var err = this[errType];
            if (err.code === code) {
                return err;
            }
        }

        return this.ERROR_NOT_FOUND;

    }
};
