const https = require("https");
const fs = require("fs");
const cp = require("child_process");
const express = require("express");
const cookieParser = require('cookie-parser');
const { loadImage, createCanvas, registerFont } = require('canvas');
const jspack = require("jspack");
const utils = require("./utils.js");

const homeURL = "http://localhost:8080";

const stateHelper = require("./state.js");

console.log(stateHelper.formatStr);

registerFont("./NotoEmoji-Regular.ttf", { family: "Noto Emoji",  weight: 'normal', style: 'normal' });

const app = express();
app.use(cookieParser());

app.use(express.static('public'))

// read or initialize the state cookie
app.use(function (req, res, next) {
    var id = req.cookies.id;
	console.log("id is", id);
    req.state = stateHelper.createStateObjectFromID(id);
	stateHelper.saveState(res, req.state);
	console.log("state is ", req.state);
    next();
});

const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 0;

var videoStreams = utils.videoStreams;
var pushNewFrame = utils.pushNewFrame;

var dims = [160, 144];

// whenever the user asks for the /screen...
app.get("/screen", function(req, res) {
	videoStreams[req.state.id] = res;
    console.log("saving screen under id", req.state.id);

	//console.log(videoStreams);
    var [canvas, ctx] = utils.getCanvasAndCtx();

    res.writeHead(200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
        Pragma: 'no-cache',
        Connection: 'keep-alive',

        'Content-Type': 'multipart/x-mixed-replace; boundary=--endofsection'
    });
	
	utils.displayBoxText(ctx, "This might not work in your browser...");
    res.write(`Content-Type:image/jpeg\n\n`);
	res.write(canvas.toBuffer("image/jpeg", { quality: 0.45 }));
	res.write(`--endofsection\n`);
	ctx.fillStyle = "white";
    ctx.fillRect(0, 0, dims[0], dims[1]);
	
	req.state.scene.render(req, ctx, canvas);
	
	res.write(`Content-Type:image/jpeg\n\n`);
	

    pushNewFrame(res, canvas);

    // when the HTTP client disconnnects, remove its screen stream
    res.on("close", _=>{
		console.log("closed");
        delete videoStreams[req.state.id];
    });
});

app.get(["/d","/u","/r","/l","/a","/b"], function controlInput(req, res) {
	var screenRes = videoStreams[req.state.id];
	var [canvas, ctx] = utils.getCanvasAndCtx();

	var controlMap = { "/d":"down", "/u":"up", "/r":"right", "/l":"left", "/a":"a", "/b":"b" };

	req.state.scene.process(controlMap[req.originalUrl], req, ctx);
	req.state.scene.render(req, ctx, canvas);
	stateHelper.saveState(res, req.state);

	if(!screenRes) { res.redirect(homeURL); }
	
	pushNewFrame(screenRes, canvas);
	
	res.status(204).end();
});

app.get("/battle/:id", function(req, res) {
	
});

app.listen(8080);