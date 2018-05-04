// Load libraries
var Kinect2 = require('kinect2'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

// Initialise
var kinect = new Kinect2();

var depthWidth = 512;
var depthHeight = 424;
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
        width = calculateDistance(leftShoulder, shoulder) + calculateDistance(shoulder, leftShoulder);
        //depthToM(leftShoulder.cameraZ, currentFrame.rawDepth.buffer);
        //mapCoordinates(leftShoulder, rightShoulder, currentFrame.rawDepth.buffer);
        //console.log("Left Shoulder Frame: "  + "(" + leftShoulder.cameraX + "," + leftShoulder.cameraY + "," + leftShoulder.cameraZ + ")");
        //console.log("LSF converted: "  + "(" + leftShoulder.cameraX + "," + leftShoulder.cameraY + "," + leftShoulder.cameraZ + ")");
        //var pointPos = depthToPointCloudPos(leftShoulder.cameraX, leftShoulder.cameraY, leftShoulder.cameraZ);
        //console.log("Depth After: " + "(" + pointPos[0] + "," + pointPos[1] + "," + pointPos[2] + ")");
        //calculateDepth(leftShoulder, rightShoulder, currentFrame.rawDepth.buffer);
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

//calculte the xyz camera position based on the depth data
function depthToPointCloudPos(x, y, z) {
    var point = [];
    z = (z);
    x = (x - 254.878) * z / 365.456;
    y = (y - 205.395) * z / 365.456;
    point.push(x);
    point.push(y);
    point.push(z);
    return point;
}

function calculateDepth(leftShoulder, rightShoulder, depthData) {
    for (var x = 0; x < depthWidth; x++) {
        for (var y = 0; y < depthHeight; y++) {
            var offset = x + y * 512;
            var d = depthData[offset];
            console.log("Depth Before: " + "(" + x + "," + y + "," + d + ")");
            var pointPos = depthToPointCloudPos(x, y, d);
            console.log("Depth After: " + "(" + pointPos[0] + "," + pointPos[1] + "," + pointPos[2] + ")");

           /* if (point.z < getThreshold(leftShoulder, rightShoulder)[0] || point.z > getThreshold(leftShoulder, rightShoulder)[1]) {
                //geometry.vertices[count] = point;
                console.log(point);
            } */

        }
    }
}

function getThreshold(leftShoulder, rightShoulder) {
    var array = [];
    if (leftShoulder.cameraZ > rightShoulder.cameraZ) {
        array[0] = (leftShoulder.cameraZ * 1000);
        array[1] = (rightShoulder.cameraZ * 1000);
    } else {
        array[0] = (rightShoulder.cameraZ * 1000);
        array[1] = (leftShoulder.cameraZ * 1000);
    }
    return array;
}

function getImageSize(HFOV, VFOV) {
    //Assuming depth (f value) of 4.5m - red tape on floor
    var f = 4.5;
    var h = 2 * (f * Math.tan(HFOV/2));
    var v = 2 * (f * Math.tan(VFOV/2));
    return [h, v];
}

function mapCoordinates(leftShoulder, rightShoulder, depth) {
    var HFOV = 70.6;
    var VFOV = 60;
    var imageSize = getImageSize(HFOV, VFOV); // returns array containing height and width of image in meters

    console.log(imageSize);

    // finds how far in from the edge of the image the joint is as a percentage
    var xLeftCoordinate = 100 - Math.round(100 * (Math.abs(leftShoulder.cameraX / imageSize[0])));
    var yLeftCoordinate = 100 - Math.round(100 * (Math.abs(leftShoulder.cameraY / imageSize[1])));

    // Find which pixel is at the percentage of the image in the depth frame
    var x = Math.round(512 / 100 * xLeftCoordinate);
    var y = Math.round(424 / 100 * yLeftCoordinate);

    //Locate it and compare depth values in output 
    //should be same if 100% accurate conversion or within a similar range if close
    var depthZ = depth[x + y * 512];
    var cameraZ = leftShoulder.cameraZ;

    console.log(depthZ + ", " + cameraZ);
}

function depthToM(i, depthData){
    // i range is 0<i<2048 -- kinect v2 would be 4500?
    // where is i coming from?
    var fv = i/2048; 
    var a = 0.142846048164583; // recalculate?
    var b = 0.00768043410597597; // recalculate?   
    
    var depth_to_meter = (1/a) * fv^(1/b);
    
    var solve_pov = a * (depth_to_meter)+b

    for (var x = 300; x < 312; x++) {
        for (var y = 0; y < depthHeight; y++) {
            var offset = x + y * 512;
            var d = depthData[offset];
            console.log("Before: " + "(" + x + "," + y + "," + d + ")");
            console.log("After: " + "(" + x*depth_to_meter + "," + y*depth_to_meter + "," + d + ")");
        }
    }

    //console.log(x*solve_pov + ", " + y*solve_pov + "," + z);

    // ex ) -320 < x < 320 , -240 < y < 240
        // this is using 640 x 480 image -- kinect v2 is 512 * 424
    // so, (x,y,z) -> (x*solve_pov,y*solve_pov,z)
}