var socket = io.connect('http://localhost:8000/');

socket.on('bodyFrame', interpretData);

socket.on('depthFrame', logData);

var depthWidth = 512;
var depthHeight = 424;

function logData(depthFrame){
    console.log(depthFrame);
}

function interpretData(bodyFrame) {
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

        var width = calculateDistance(leftShoulder, rightShoulder);

        var topHeight = calculateDistance(head, neck) + calculateDistance(neck, shoulder) + 
                        calculateDistance(shoulder, midBack) + calculateDistance(midBack, spineBase) +
                        ((calculateDistance(spineBase, leftHip) + calculateDistance(spineBase, rightHip))/2);
        var legHeight = ((calculateDistance(leftHip, leftKnee) + calculateDistance(leftKnee, leftAnkle) +
                        calculateDistance(leftAnkle, leftFoot)) + (calculateDistance(rightHip, rightKnee) + 
                        calculateDistance(rightKnee, rightAnkle) + calculateDistance(rightAnkle, rightFoot)))/2;
        var totalHeight = (topHeight + legHeight).toFixed(2);

        document.getElementById("height").innerHTML = "Height: " + totalHeight + "m";
        document.getElementById("width").innerHTML = "Width: " + width + "m";
        drawDotFigure(bodyFrame);
    }
}

function calculateDistance(joint1, joint2) {
    var distance = Math.sqrt(Math.pow(joint1.cameraX - joint2.cameraX, 2) +
                Math.pow(joint1.cameraY - joint2.cameraY, 2) +
                Math.pow(joint1.cameraZ - joint2.cameraZ, 2))
                return distance;
}

function drawDotFigure(bodyFrame){
    var c = document.getElementById('canvas'); 
    var ctx = c.getContext('2d');

    ctx.clearRect(0, 0, c.width, c.height);

    for(var i = 0;  i < bodyFrame.bodies.length; i++) {
       if(bodyFrame.bodies[i].tracked == true){
           for (var j = 0; j < bodyFrame.bodies[i].joints.length; j++) {
                var joint = bodyFrame.bodies[i].joints[j];                            
                ctx.fillStyle = "#FF0000";
                ctx.beginPath();
                ctx.arc(joint.depthX*400, joint.depthY*400, 10, 0, Math.PI * 2, true); //multiplied with static integer 400 in order to adjust position on canvas as without it skeleton projection formed is only visible in a corner as DepthX values were always less than 1
                ctx.closePath();
                ctx.fill(); //drawing a circle for each joint on the canvas 
            }
       }
   }
}