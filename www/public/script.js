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
/* globals Axis, setCalibrationMode, getAxis, unsetCalibrationMode, Notes */

// Based on code from: http://www.inkfood.com/mobile-accelerometer-input/

var NETWORK_UPDATE_FREQ = 5; // How many times per second to update the network (send commands)
var BROWSER_UPDATE_FREQ = 30; // How many times per second to refresh the browser screen
var CONFIG_UPDATE_RATE = 100; // How frequently we update the config value

var Device = require('Device');
var WebClientConnection = require('WebClientConnection');
var controller;

var connectionStatus = 'notconnected';

var x = Axis('slider');
var y = Axis('orientation');


/*****************************************************************************
 *                                                                           *
 *                            Controller Functions                           *
 *                                                                           *
 *****************************************************************************/

function startController(channel) {

    var firstStatusMessage = true;

    controller = new Device({
        deviceType: 'controller',
        channel: channel
    }, WebClientConnection);

    controller.sendNote = function controllerSendNote(note) {
        controller.command({
            action: 'note',
            note: note
        });
    };

    controller.connection.socket.on('connect', function() {

        displayConnectionStatus('connecting');

        controller.on('register', function() {

            displayConnectionStatus('connected');

            setInterval(function() {
                controller.ping(function(t) {
                    logReplaceMessage('Ping (ms): ', t);
                });
            }, 1000);

            controller.on('status', function(status) {

                if (firstStatusMessage) {
                    writeToLogger('Toy is connected.');
                    firstStatusMessage = false;
                }

                if (typeof status === 'object') {
                    displaySensorStatus(status, 'gyro');
                    displaySensorStatus(status, 'compassRaw');
                    displaySensorStatus(status, 'accel');
                    displaySensorStatus(status, 'gps');
                }
                logReplaceMessage('Time diff (ms): ', (new Date().getTime() - status.time));

            });
            controller.on('error', function(err) {
                logError('There was an error: ', err);
            });

            function sendCommand() {

                // Don't bother updating if values have not changed.
                if (x.hasNotChanged() && y.hasNotChanged()) {
                    return;
                }

                controller.command({
                    action: 'move',
                    servo1: x.getValue(),
                    servo2: y.getValue()
                });
            }

            setInterval(sendCommand, 1000 / NETWORK_UPDATE_FREQ);
        });
    });
}


/*****************************************************************************
 *                                                                           *
 *                       Load saved config from localStorage                 *
 *                                                                           *
 *****************************************************************************/

/**
 * On start we restore the config values into the modal.
 */
function restoreConfigValues() {

    NETWORK_UPDATE_FREQ = setCalibrationConfig('net_update_freq') || NETWORK_UPDATE_FREQ;
    x.scale = setCalibrationConfig('x-scale') || x.scale;
    y.scale = setCalibrationConfig('y-scale') || y.scale;

    x.min = setCalibrationConfig('x-min') || -1;
    x.cntr = setCalibrationConfig('x-center') || 0;
    x.max = setCalibrationConfig('x-max') || 1;
    y.min = setCalibrationConfig('y-min') || -1;
    y.cntr = setCalibrationConfig('y-center') || 0;
    y.max = setCalibrationConfig('y-max') || 1;

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

/*****************************************************************************
 *                                                                           *
 *                     Config Button Handling Functions                      *
 *                                                                           *
 *****************************************************************************/

var cfgBtnSetIntervals = {};
function handleConfigButtonClick(e) {

    var button = $(e.target);
    var label = e.target.parentElement.id;
    var txtElement = $('#' + label + ' input');

    switch (label) {
        case 'net_update_freq':
        case 'x-scale':
        case 'y-scale':
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

        if (!setCalibrationMode(dim)) {
            return;
        }

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
            var val = getAxis(dim).getRawValue();
            txtElement.val(val);
        }, CONFIG_UPDATE_RATE);
    }

    function changeConfigButtonToChange() {

        unsetCalibrationMode(dim);

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
 *                                   UI Stuff                                *
 *                                                                           *
 *****************************************************************************/


function updateBallPosition() {

     ball.position.x = window.innerWidth / 2 + x.getRawValue() * window.innerWidth / 2;
     ball.position.y = window.innerHeight / 2 + y.getRawValue() * window.innerHeight / 2;

     // Limit the ball to the screen
     if (ball.position.x < 0) {
         ball.position.x = 0;
     }
     if (ball.position.x > window.innerWidth - ball.position.radius * 2) {
         ball.position.x = window.innerWidth - ball.position.radius * 2;
     }

     if (ball.position.y < 0) {
         ball.position.y = 0;
     }
     if (ball.position.y > window.innerHeight - ball.position.radius * 2) {
         ball.position.y = window.innerHeight - ball.position.radius * 2;
     }

     ball.style.left = ball.position.x + 'px';
     ball.style.top = ball.position.y + 'px';

     setTimeout(updateBallPosition, 1000 / BROWSER_UPDATE_FREQ); //KEEP ANIMATING
}

/*****************************************************************************
 *                                                                           *
 *                               Logging Functions                           *
 *                                                                           *
 *****************************************************************************/

var COL_GREY = '#555';
var COL_RED = '#d55';

function clearLog() {       // eslint-disable-line no-unused-vars
    var el = $('#log>.card-block');
    el.html('');
}

function logReplaceMessage(key, value) {
    value = value.toString();
    var re = new RegExp('>' + key.replace('(', '\\(').replace(')', '\\)') + '[\\-0-9a-zA-Z]*<', 'g');

    var el = $('#log>.card-block');
    var matches = el.html().match(re);

    if (matches === null) {
        logMessage(key + value);
    } else {
        var newHtml = el.html().replace(re, '>' + key + value + '<');
        el.html(newHtml);
    }

}

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
function displayConnectionStatus(status) {
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


/**
 * Display the status of a specific sensor (e.g. gyro or gps).
 * @param  {object} status The object values
 * @param  {string} type   The name of the object
 */
function displaySensorStatus(status, type) {

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

// This a workaround for an old Firefox bug.  See:
// https://bugzilla.mozilla.org/show_bug.cgi?id=771575
function init() { // eslint-disable-line no-unused-vars
    setTimeout(delayedInit, 20);

    // Restore configuration settings
    restoreChannel();
    restoreConfigValues();

    // Channel change button.
    $('#btn-change-channel').on('click', setChannelFromTextBox);

    // Set up the note text boxes
    Notes('note-1');
    Notes('note-2');
    Notes('note-3');
    Notes('note-4');

    // Configuration form - any of the submit events.  This will
    // capture all the button clicks.
    $('.form-inline>button').on('click', handleConfigButtonClick);

    // Channel change button.
    $('#btn-fullscreen').on('click', toggleFullscreen);

    // We use the bootstrap slider: https://github.com/seiyria/bootstrap-slider
    $('#slider-x').slider();
    $('#slider-x').on('slide', function(slideEvt) {
        x.setValFromSlider(slideEvt.value);
    });
    $('#slider-x').on('change', function(slideEvt) {
        if (slideEvt.value && !isNaN(slideEvt.value.newValue)) {
            x.setValFromSlider(slideEvt.value.newValue);
        }
    });


    function delayedInit() {

        ball = document.getElementById('ball');

        ball.style.left = (window.innerWidth / 2) - 50 + 'px';
        ball.style.top = (window.innerHeight / 2) - 50 + 'px';
        ball.position = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            radius: parseFloat($('#ball').css('height').replace('px', '')) / 2
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', collectDeviceOrientation);
        } else {
            window.alert('Could not find accelerometer'); // eslint-disable-line
        }

        updateBallPosition();
    }

    function collectDeviceOrientation(event) {

        // FIXME: When the device is tipped to vertical, then just a bit more (upside down) these numbers will flip around.
        x.setValFromOrientation(event.gamma);
        y.setValFromOrientation(event.beta);

    }

}
