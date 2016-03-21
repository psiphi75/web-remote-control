// Based on code from: http://www.inkfood.com/mobile-accelerometer-input/


// TODO: The ball does not reach the limits of the screen (in Firefox).
// TODO: Tidy code
// TODO: Only simple status update given.  Could make it neater.

var NETWORK_UPDATE_FREQ = 15;      // How many times per second to update the network (send commands)
var BROWSER_UPDATE_FREQ = 30;     // How many times per second to refresh the browser screen

var Device = require('Device');
var controller = new Device({ deviceType: 'controller' }, require('WebClientConnection'));


controller.connection.socket.on('connect', function() {
    controller.on('register', function() {
        document.getElementById('connection').innerHTML = '<p>Registered on channel: ' + controller.channel + ' with UID: ' + controller.uid + '</p>';
        controller.ping(function(t) {
            console.log('pinged: ', t);
        });
        controller.on('status', function(status) {

            if (typeof status === 'object') {
                var html = '';
                html += '<ul>\n';
                html += '    <li><b>Gyro:</b> ';
                html += '        <ul>';
                html += '            <li>x: ' + status.gyro.x + '</li>';
                html += '            <li>y: ' + status.gyro.y + '</li>';
                html += '            <li>z: ' + status.gyro.z + '</li>';
                html += '        </ul>';
                html += '    </li>';
                html += '    <li><b>Accel:</b> ';
                html += '        <ul>';
                html += '            <li>x: ' + status.accel.x + '</li>';
                html += '            <li>y: ' + status.accel.y + '</li>';
                html += '            <li>z: ' + status.accel.z + '</li>';
                html += '        </ul>';
                html += '    </li>';
                html += '    <li><b>Compass (heading):</b> ' + status.compass + '</li>';
                html += '    <li><b>Compass (x, y, z):</b> ';
                html += '        <ul>';
                html += '            <li>x: ' + status.compassRaw.x + '</li>';
                html += '            <li>y: ' + status.compassRaw.y + '</li>';
                html += '            <li>z: ' + status.compassRaw.z + '</li>';
                html += '        </ul>';
                html += '    </li>';
                html += '    <li><b>GPS:</b> ' + status.gps + '</li>';
                html += '</ul>';
            } else {
                html = '<p>' + status + '</p>';
            }
            document.getElementById('status').innerHTML = html;

            console.log('Controller: Toy said: ', status);
        });
        controller.on('error', function(err) {
            document.getElementById('connection').innerHTML = '<p>' + err + '</p>';
            console.log('There was an error: ', err);
        });

        var lastX = -100;
        var lastY = -100;
        setInterval(function() {
            var thisX = Math.round(offset.x * 100) / 100;
            var thisY = Math.round(offset.y * 100) / 100;
            if (lastX === thisX && thisY === lastY) {
                return;
            }
            lastX = thisX;
            lastY = thisY;
            controller.command({
                action: 'move',
                x: thisX,
                y: thisY
            });
        }, 1000 / NETWORK_UPDATE_FREQ);
    });
});

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = createAnimationFrame();
}

function createAnimationFrame () {

    return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };

}

var ball;
var w;
var h;
var center;
var offset;

// This a workaround for an old Firefox bug.  See:
// https://bugzilla.mozilla.org/show_bug.cgi?id=771575
function init() {  // eslint-disable-line no-unused-vars
    setTimeout(delayedInit, 20);
}

function delayedInit () {
    document.getElementById('connection').innerHTML = '<p>Connecting</p>';

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

            offset = {
                x: scale(event.gamma, 70),
                y: scale(event.beta, 70)
            };
            ball.position.x = center.x + offset.x * center.x;
            ball.position.y = center.y + offset.y * center.x;

        });

    } else {
        window.alert('Could not find accelerometer');  // eslint-disable-line
    }

    update();
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

    document.getElementById('position').innerHTML = '<p> x = ' + offset.x + '</p>';
    document.getElementById('position').innerHTML += '<p> y = ' + offset.y + '</p>';

    setTimeout(update, 1000 / BROWSER_UPDATE_FREQ); //KEEP ANIMATING
}
