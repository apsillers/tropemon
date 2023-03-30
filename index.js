const https = require("https");
const fs = require("fs");
const cp = require("child_process");
const express = require("express");
const cookieParser = require('cookie-parser');
const { loadImage, createCanvas, registerFont } = require('canvas');
const jspack = require("jspack");
const utils = require("./utils.js");

const stateHelper = require("./state.js");

registerFont("./NotoEmoji-Regular.ttf", { family: "Noto Emoji",  weight: 'normal', style: 'normal' });

const app = express();
app.use(cookieParser());

app.use(express.static('public'))

// read or initialize the state cookie
app.use(function (req, res, next) {
    var id = req.cookies.id;
	//console.log("id is", id);
    req.state = stateHelper.createStateObjectFromID(id);
	stateHelper.saveState(res, req.state);
	//console.log("state is ", req.state);
    next();
});

const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 0;

var videoStreams = utils.videoStreams;
var pushNewFrame = utils.pushNewFrame;

var dims = [160, 144];

// whenever the user asks for the /screen...
app.get("/screen", function(req, res) {
	const scenes = require("./scenes.js");
	videoStreams[req.state.id] = res;

    var [canvas, ctx] = utils.getCanvasAndCtx();

    res.writeHead(200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
        Pragma: 'no-cache',
        Connection: 'keep-alive',

        'Content-Type': 'multipart/x-mixed-replace; boundary=--endofsection'
    });
	
	utils.displayBoxText(ctx, "This might not work in your browser...");
    res.write(`Content-Type:image/jpeg\n\n`);
	res.write(canvas.toBuffer("image/jpeg", { quality: 0.1 }));
	res.write(`--endofsection\n`);
	ctx.fillStyle = "white";
    ctx.fillRect(0, 0, dims[0], dims[1]);
	
	scenes.find(req.state.scene).render(req, ctx, canvas);
	
	ctx.fillStyle = "black";
	ctx.font = "12pt courier";
	ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);
	
	res.write(`Content-Type:image/jpeg\n\n`);
	

    pushNewFrame(res, canvas);

    // when the HTTP client disconnnects, remove its screen stream
    res.on("close", _=>{
		console.log("closed");
        delete videoStreams[req.state.id];
    });
});

app.get(["/d","/u","/r","/l","/a","/b"], function controlInput(req, res) {
	const scenes = require("./scenes.js");
	var screenRes = videoStreams[req.state.id];
	var [canvas, ctx] = utils.getCanvasAndCtx();

	var controlMap = { "/d":"down", "/u":"up", "/r":"right", "/l":"left", "/a":"a", "/b":"b" };

	scenes.find(req.state.scene).process(controlMap[req.originalUrl], req, ctx);
	
	if(!screenRes) { res.redirect(utils.homeURL); }
	
	scenes.find(req.state.scene).render(req, ctx, canvas);
	stateHelper.saveState(res, req.state);

	ctx.fillStyle = "black";
    ctx.font = "12pt courier";
	ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);
	
	pushNewFrame(screenRes, canvas);
	
	res.status(204).end();
});

app.get("/escapeHatch", function controlInput(req, res) {
	const scenes = require("./scenes.js");
	
	if(scenes.find(req.state.scene) == scenes.INTRO) {
	    res.redirect(utils.homeURL);
    }
	
	req.state.scene = scenes.MENU;
	req.state.cursorPos = 0;
	req.state.dialogPos = 0;
	
	stateHelper.saveState(res, req.state);
	
	res.redirect(utils.homeURL);
});
	

app.listen(8080);


function backupState() {
	fs.writeFile("./state.json", JSON.stringify(stateHelper.state), err=>{
		setTimeout(backupState, 5 * 60 * 1000);
	});
}

