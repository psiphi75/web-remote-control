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

/* eslint-env jquery */

// Based on code from: http://www.inkfood.com/mobile-accelerometer-input/

var NETWORK_UPDATE_FREQ = 5; // How many times per second to update the network (send commands)
var BROWSER_UPDATE_FREQ = 30; // How many times per second to refresh the browser screen

var Device = require('Device');
var WebClientConnection = require('WebClientConnection');
var controller;

var connectionStatus = 'notconnected';


/*****************************************************************************
 *                                                                           *
 *                               Logging Functions                           *
 *                                                                           *
 *****************************************************************************/


var COL_GREY = '#555';
var COL_RED = '#d55';

function logMessage(message) {
    writeToLogger(message, COL_GREY);
}

function logError(message) {
    writeToLogger(message, COL_RED);
}

function writeToLogger(message, colour) {
    var el = $('#log>.card-block');
    el.append('<pre><code style="color:' + colour + '">' + message + '</code></pre>');
}


/*****************************************************************************
 *                                                                           *
 *                               Channel Functions                           *
 *                                                                           *
 *****************************************************************************/


/**
 * Update the on-screen connection status
 * @param  {string} status The new status
 */
function updateConnection(status) {
    var newClass;
    var message;
    switch (status) {
        case 'notconnected':
            newClass = 'alert-danger';
            message = 'Not Connected';
            connectionStatus = status;
            break;
        case 'connecting':
            newClass = 'alert-warning';
            message = 'Connecting';
            connectionStatus = status;
            break;
        case 'connected':
            newClass = 'alert-success';
            message = 'Connected';
            connectionStatus = status;
            break;
        case 'disconnected':
            newClass = 'alert-warning';
            message = 'Disconnected';
            connectionStatus = status;
            break;
        default:
            newClass = 'alert-info';
            message = 'Invalid status: ' + status;
    }
    var connEl = $('#txt-connection');

    connEl.parent().removeClass().addClass('alert ' + newClass);
    connEl.text(message);
    logMessage(message);
}

function setChannel(channel) {
    if (connectionStatus === 'connected' && controller && channel === controller.channel) {
        logMessage('Already connected');
        return;
    }

    //
    // Close the old controller and start the new
    //
    if (controller) {
        controller.close();
    }
    startController(channel);

    //
    // Save the channel to local storage.
    //
    localStorage.setItem('channel', channel);
}

function restoreChannel() {
    var channel = localStorage.getItem('channel');
    if (typeof channel === 'string') {
        setChannel(channel);
        $('#txt-channel').val(channel);
    }
}

function setChannelFromTextBox() {
    var channel = $('#txt-channel').val();
    if (typeof channel !== 'string' || channel === '') {
        logError('Need to enter a value for the channel.');
        return;
    }
    setChannel(channel);
}


/*****************************************************************************
 *                                                                           *
 *                            Controller Functions                           *
 *                                                                           *
 *****************************************************************************/

function displayStatus(status, type) {

    if (!status[type]) {
        return;
    }

    var el = $('#' + type);
    if (!el) {
        logMessage('Unable to update: ' + type);
        return;
    }

    var subEls = el.find('li');
    Object.keys(status[type]).forEach(function(key) {
        findAndUpdateLabel(status[type][key], key);
    });

    function findAndUpdateLabel(value, dim) {
        for (var i = 0; i < subEls.length; i += 1) {
            var elementStr = subEls[i].innerText.trim();
            if (elementStr.indexOf(dim) === 0) {
                subEls[i].innerHTML = dim + ': <span class="label label-default label-pill pull-xs-right">' + value + '</span>';
                return;
            }
        }

    }
}

function startController(channel) {

    controller = new Device({
        deviceType: 'controller',
        channel: channel
    }, WebClientConnection);

    controller.connection.socket.on('connect', function() {

        updateConnection('connecting');

        controller.on('register', function() {

            updateConnection('connected');

            controller.ping(function(t) {
                logMessage('Ping: ' + t / 1000);
            });

            controller.on('status', function(status) {

                if (typeof status === 'object') {
                    displayStatus(status, 'gyro');
                    displayStatus(status, 'compassRaw');
                    displayStatus(status, 'accel');
                    displayStatus(status, 'gps');
                }

            });
            controller.on('error', function(err) {
                logError('There was an error: ', err);
            });

            var lastX = -100;
            var lastY = -100;

            /**
             * This will get the slider value if one exists, otherwise use the DeviceOrientation data.
             * @param  {string} dim 'x' or 'y' value
             * @return {number}     The rounded x or y value.
             */
            function getValue(dim) {
                var val;
                if (sliderValues[dim] !== null) {
                    val = sliderValues[dim];
                } else {
                    val = offset[dim];
                }
                return Math.round(val * 100) / 100;
            }

            setInterval(function() {
                var thisX = getValue('x');
                var thisY = getValue('y');
                if (lastX === thisX && thisY === lastY) {
                    return;
                }
                lastX = thisX;
                lastY = thisY;

                controller.command({
                    action: 'move',
                    x: calibrate(thisX, XMIN, XCNTR, XMAX),
                    y: calibrate(thisY, YMIN, YCNTR, YMAX)
                });
            }, 1000 / NETWORK_UPDATE_FREQ);
        });
    });
}

var XMIN = -1;
var XCNTR = 0;
var XMAX = 1;
var YMIN = -1;
var YCNTR = 0;
var YMAX = 1;

/**
 * Calibration function - uses simple formula y = m * x + c.
 * @param  {number} val  The number to calibrate.
 * @param  {number} min  The minimum range of the value.
 * @param  {number} cntr The mid point of the number.
 * @param  {number} max  The maximum value in the range.
 * @return {number}      The calibrated value.
 */
var isCalibrationMode = false;
function calibrate(val, min, cntr, max) {
    if (isCalibrationMode) return val;
    if (val <= -1) return min;
    if (val >= 1) return max;
    if (val < 0) {
        return (cntr - min) * val + cntr;
    } else {
        return (max - cntr) * val + cntr;
    }
}


/*****************************************************************************
 *                                                                           *
 *                     Config Button Handling Functions                      *
 *                                                                           *
 *****************************************************************************/

/**
 * On start we restore the config values into the modal.
 */
function restoreConfigValues() {

    NETWORK_UPDATE_FREQ = setCalibrationConfig('net_update_freq') || NETWORK_UPDATE_FREQ;

    XMIN = setCalibrationConfig('x-min') || -1;
    XCNTR = setCalibrationConfig('x-center') || 0;
    XMAX = setCalibrationConfig('x-max') || 1;
    YMIN = setCalibrationConfig('y-min') || -1;
    YCNTR = setCalibrationConfig('y-center') || 0;
    YMAX = setCalibrationConfig('y-max') || 1;

    function setCalibrationConfig(label) {
        var storedValue = localStorage.getItem(label);
        if (storedValue) {

            // Make sure we have extracted a number
            var num = parseFloat(storedValue);
            if (isNaN(num)) {
                localStorage.removeItem(label);
                return null;
            }

            // Set the model configuration values
            var el = $('#' + label + ' input');
            el.val(num);
            return num;
        } else {
            return null;
        }

    }
}

var cfgBtnSetIntervals = {};
var CONFIG_UPDATE_RATE = 100; // How frequently we update the config value

function handleConfigButtonClick(e) {

    var button = $(e.target);
    var label = e.target.parentElement.id;
    var txtElement = $('#' + label + ' input');

    switch (label) {
        case 'net_update_freq':
            saveDetails(txtElement, label);
            break;
        default:
            handleLiveButton(label, button, txtElement);
    }

}

function handleLiveButton(label, button, txtElement) {

    var splitLabel = label.split('-');
    var dim = splitLabel[0];

    if (isChangeButton()) {
        changeConfigButtonToSet();
    } else {
        changeConfigButtonToChange();
    }

    function changeConfigButtonToSet() {

        isCalibrationMode = true;

        //
        // Change the button to 'Set'
        //
        button.removeClass('btn-primary').addClass('btn-warning');
        button.text('Set');

        //
        // Set up realtime updates
        //
        if (cfgBtnSetIntervals[label]) {
            console.error('Did not expect to get here.');
        }
        cfgBtnSetIntervals[label] = setInterval(function updateConfigText() {
            var val = offset[dim];
            txtElement.val(val);
        }, CONFIG_UPDATE_RATE);
    }

    function changeConfigButtonToChange() {

        isCalibrationMode = false;

        //
        // Change the button and remove timeout
        //
        button.removeClass('btn-warning').addClass('btn-primary');
        button.text('Change');
        clearTimeout(cfgBtnSetIntervals[label]);
        delete cfgBtnSetIntervals[label];

        //
        // Save the settings
        //
        saveDetails(txtElement, label);
    }

    function isChangeButton() {
        return button.text() === 'Change';
    }
}

function saveDetails(el, label) {
    var value = parseFloat(el.val());
    localStorage.setItem(label, value);

    // There are more efficient ways of doing the following:
    restoreConfigValues();
}


/*****************************************************************************
 *                                                                           *
 *                              Animation functions                          *
 *                                                                           *
 *****************************************************************************/


if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = createAnimationFrame();
}

function createAnimationFrame() {

    return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };

}


/*****************************************************************************
 *                                                                           *
 *                             Fullscreen functions                          *
 *                                                                           *
 *****************************************************************************/

// Find the right method, call on correct element
function launchIntoFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
 }

// Whack fullscreen
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
}

function toggleFullscreen() {
    var fullscreenDisabled = document.fullscreenElement === null || document.mozFullScreenElement === null || document.webkitFullscreenElement === null;

    if (fullscreenDisabled) {
        launchIntoFullscreen(document.documentElement);
    } else {
        exitFullscreen();
    }
}


/*****************************************************************************
 *                                                                           *
 *                                   Initailise                              *
 *                                                                           *
 *****************************************************************************/


var ball;
var w;
var h;
var center;
var offset;

var sliderValues = {
    x: null,
    y: null
};

// This a workaround for an old Firefox bug.  See:
// https://bugzilla.mozilla.org/show_bug.cgi?id=771575
function init() { // eslint-disable-line no-unused-vars
    setTimeout(delayedInit, 20);

    // Restore configuration settings
    restoreChannel();
    restoreConfigValues();

    // Channel change button.
    $('#btn-change-channel').on('click', setChannelFromTextBox);

    // Configuration form - any of the submit events.  This will
    // capture all the button clicks.
    $('.form-inline>button').on('click', handleConfigButtonClick);

    // Channel change button.
    $('#btn-fullscreen').on('click', toggleFullscreen);

    // We use the bootstrap slider: https://github.com/seiyria/bootstrap-slider
    $('#slider-y').slider();
    $('#slider-y').on('slide', function(slideEvt) {
        // $('').text(slideEvt.value);
        // console.log()
        sliderValues.y = slideEvt.value;
    });

    function delayedInit() {

        ball = document.getElementById('ball');

        // TODO: It would be nice to have this full screen
        // document.requestFullscreen()

        w = window.innerWidth;
        h = window.innerHeight;

        ball.style.left = (w / 2) - 50 + 'px';
        ball.style.top = (h / 2) - 50 + 'px';
        center = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        offset = {
            x: 0,
            y: 0
        };
        ball.position = {
            x: center.x,
            y: center.y
        };

        if (window.DeviceOrientationEvent) {

            window.addEventListener('deviceorientation', function(event) {

                // FIXME: When the device is tipped to vertical, then just a bit more (upside down)
                // these numbers will flip around.
                offset = {
                    x: scale(event.gamma, 70),
                    y: scale(event.beta, 70)
                };
                ball.position.x = center.x + offset.x * center.x;
                ball.position.y = center.y + offset.y * center.x;

            });

        } else {
            window.alert('Could not find accelerometer'); // eslint-disable-line
        }

        update();
    }

}


/**
 * Scale a number from -min_max to +min_max (from -1.0 to 1.0)
 * @param  {number} val     The number to scale
 * @param  {number} min_max The min (-ve) and max (+ve) value
 * @return {number}         The scaled value.
 */
function scale(val, min_max) {
    if (val < -min_max) return -1.0;
    if (val > min_max) return 1.0;
    return val / min_max;
}

function update() {

    ball.style.top = ball.position.y + 'px';
    ball.style.left = ball.position.x + 'px';

    setTimeout(update, 1000 / BROWSER_UPDATE_FREQ); //KEEP ANIMATING
}
