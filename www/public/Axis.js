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

/* globals x,y */

/**
 * Create an axis object that can store state and calibrate itself.
 * @param {string} method 'slider' or 'orientation'.
 */
function Axis(method) {  // eslint-disable-line no-unused-vars

    'use strict';

    var SCALE_ORIENTATION = 70;
    var lastRawValue = null;
    var isPaused = false;
    var calibrationMode = false;
    var isSlider;
    var rawValue = 0;

    switch (method) {
        case 'slider':
            isSlider = true;
            break;
        case 'orientation':
            isSlider = false;
            break;
        default:
            console.error('Axis(): method is not valid: ', method);
            return null;
    }

    var axis = {
        min: -1,
        cntr: 0,
        max: 1,
        scale: 1,

        /**
         * Has the value changed since the last time we called 'getValue'
         */
        hasNotChanged: function() {
            var roundedRawVal = Math.round(rawValue * 100) / 100;
            return roundedRawVal === lastRawValue;
        },

        /**
         * Get the rounded, scaled and calibrated value.
         */
        getValue: function() {
            var roundedRawVal = Math.round(rawValue * 100) / 100;
            lastRawValue = roundedRawVal;

            return getCalibratedValue();
        },

        getRawValue: function() {
            return rawValue;
        },

        /**
         * Is the input a slider or the orientation device?
         * @return {boolean} True if it is a slider.
         */
        isSlider: function() {
            return isSlider;
        },

        /**
         * Scale a number from -SCALE_ORIENTATION to +SCALE_ORIENTATION (from -1.0 to 1.0, respectively)
         * @param  {number} orientationVal     The number to as coming from the orientation device
         * @param  {number} min_max The min (-ve) and max (+ve) value
         * @return {number}         The scaled value.
         */
        setValFromOrientation: function(orientationVal) {
            if (isSlider && !calibrationMode) {
                return;
            }
            if (isPaused) {
                return;
            }
            if (orientationVal < -SCALE_ORIENTATION) {
                rawValue = -1.0;
            } else if (orientationVal > SCALE_ORIENTATION) {
                rawValue = 1.0;
            } else {
                rawValue = orientationVal / SCALE_ORIENTATION;
            }
        },

        setValFromSlider: function(sliderVal) {
            if (!isSlider) {
                return;
            }
            if (isPaused) {
                return;
            }
            rawValue = sliderVal;
        },

        /****************************
         *   Calibration functions
         ****************************/
        pause: function () {
            if (isPaused || calibrationMode) {
                throw new Error('Already in calibrationMode');
            }
            isPaused = true;
        },
        resume: function () {
            isPaused = false;
        },
        startCalibration: function () {
            if (isPaused || calibrationMode) {
                throw new Error('Already in calibrationMode');
            }
            calibrationMode = true;
        },
        stopCalibration: function () {
            calibrationMode = false;
        }

    };

    /**
     * Calibration function - uses simple formula y = m * x + c.
     */
    function getCalibratedValue() {
        /* When calibrating, only send data for the active channel */
        if (calibrationMode) {
            return rawValue;
        }
        var val;
        if (rawValue < 0) {
            val = (axis.cntr - axis.min) * rawValue * axis.scale + axis.cntr;
        } else {
            val = (axis.max - axis.cntr) * rawValue * axis.scale + axis.cntr;
        }
        if (val < axis.min) return axis.min;
        if (val > axis.max) return axis.max;
        return val;
    }

    return axis;
}


function setCalibrationMode(dim) {  // eslint-disable-line no-unused-vars
    var a = getAxis(dim);
    var b = getOtherAxis(dim);

    try {
        a.startCalibration();
        b.pause();
    } catch (ex) {
        a.stopCalibration();
        return false;
    }
    return true;
}


function unsetCalibrationMode(dim) {  // eslint-disable-line no-unused-vars
    getAxis(dim).stopCalibration();
    getOtherAxis(dim).resume();
}

function getAxis(dim) {
    if (dim === 'x') return x;
    if (dim === 'y') return y;
    return null;
}
function getOtherAxis(dim) {
    if (dim === 'x') return y;
    if (dim === 'y') return x;
    return null;
}
