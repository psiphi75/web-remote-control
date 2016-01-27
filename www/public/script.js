
// How often to send update signals
var updateFrequency = 200;

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
setTimeout(init, 5);

function init () {  // eslint-disable-line no-unused-vars
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
                x: Math.round(event.gamma * 10),
                y: Math.round(event.beta * 10)
            };
            ball.position.x = center.x + offset.x;
            ball.position.y = center.y + offset.y;

            document.getElementById('text').innerHTML = '<p> x = ' + offset.x + '</p>';
            document.getElementById('text').innerHTML += '<p> y = ' + offset.y + '</p>';

        });
    } else {
        window.alert('Could not find accelerometer');  // eslint-disable-line
    }

    update();
}

function update() {

    ball.style.top = ball.position.y + 'px';
    ball.style.left = ball.position.x + 'px';

    requestAnimationFrame(update); //KEEP ANIMATING
}
