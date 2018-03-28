// Load libraries
var Kinect2 = require('kinect2'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

// Initialise
var kinect = new Kinect2();

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

    kinect.on('rawDepthFrame', function (rawDepthFrame) {
        io.sockets.emit('rawDepthFrame', rawDepthFrame);
    });

    // Call rawDepthReader
    kinect.openRawDepthReader();

}

