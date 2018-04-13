// Load libraries
var Kinect2 = require('kinect2'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

// Initialise
var kinect = new Kinect2();

var currentFrame;

// Power up Kinect
if (kinect.open()) {
    // Start server
    server.listen(8000);
    console.log('Server listening on port 8000');
    console.log('Point your browser to http://localhost:8000');

    // Serve index.html file
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/public/index.html');
    });

    io.on("connection", function (socket) {
        socket.on("open", function () {
            // Call reader
            kinect.openMultiSourceReader({
                frameTypes: Kinect2.FrameType.rawDepth | Kinect2.FrameType.body
            });
            // Listen for frames
            kinect.on('multiSourceFrame', function (multiSourceFrame) {
                currentFrame = multiSourceFrame;
                io.sockets.emit('currentFrame', currentFrame.body);
            });
        });
        socket.on("close", function () {
            kinect.closeMultiSourceReader();
        });
        socket.on("capture", capture);
    });
}

function capture() {

    var bodyFrame = currentFrame.body;
    var totalHeight;
    var width;

            var user = null;
            for (i = 0; i < 6; i++) {
                if (bodyFrame.bodies[i].tracked == true) {
                    user = bodyFrame.bodies[i];
                } else {
                    //console.log(bodyFrame.bodies[i].tracked);
                }
            }
            if (user != null) {
                var head = user.joints[3];
                var neck = user.joints[2];
                var shoulder = user.joints[20];
                var midBack = user.joints[1];
                var spineBase = user.joints[0];
                var leftHip = user.joints[12];
                var rightHip = user.joints[16];
                var leftKnee = user.joints[13];
                var rightKnee = user.joints[17];
                var leftAnkle = user.joints[14];
                var rightAnkle = user.joints[18];
                var leftFoot = user.joints[15];
                var rightFoot = user.joints[19];
                var leftShoulder = user.joints[4];
                var rightShoulder = user.joints[8];
                width = calculateDistance(leftShoulder, rightShoulder);
                //find(rightShoulder, depthData);
                var topHeight = calculateDistance(head, neck) + calculateDistance(neck, shoulder) +
                    calculateDistance(shoulder, midBack) + calculateDistance(midBack, spineBase) +
                    ((calculateDistance(spineBase, leftHip) + calculateDistance(spineBase, rightHip)) / 2);
                var legHeight = ((calculateDistance(leftHip, leftKnee) + calculateDistance(leftKnee, leftAnkle) +
                    calculateDistance(leftAnkle, leftFoot)) + (calculateDistance(rightHip, rightKnee) +
                    calculateDistance(rightKnee, rightAnkle) + calculateDistance(rightAnkle, rightFoot))) / 2;
                totalHeight = (topHeight + legHeight).toFixed(2);
            }
    var output = {
        height: totalHeight,
        width: width
    };
    io.sockets.emit("output", output);
}

function calculateDistance(joint1, joint2) {
    var distance = Math.sqrt(Math.pow(joint1.cameraX - joint2.cameraX, 2) +
        Math.pow(joint1.cameraY - joint2.cameraY, 2) +
        Math.pow(joint1.cameraZ - joint2.cameraZ, 2))
    return distance;
}