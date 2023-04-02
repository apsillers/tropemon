/*
    Copyright (C) 2023 Andrew Sillers

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const https = require("https");
const http = require("http");
const fs = require("fs");
const cp = require("child_process");
const express = require("express");
const cookieParser = require('cookie-parser');
const { loadImage, createCanvas, registerFont } = require('canvas');
const jspack = require("jspack");
const utils = require("./utils.js");

const stateHelper = require("./state.js");

registerFont("./NotoEmoji-Regular.ttf", { family: "Noto Emoji",  weight: 'normal', style: 'normal' });
registerFont("./CourierPrime-Bold.ttf", { family: "Courier",  weight: 'bold', style: 'normal' });

var options = {
  key: fs.readFileSync('../stack/letsencrypt/certificates/tropemon.com.key'),
  cert: fs.readFileSync('../stack/letsencrypt/certificates/tropemon.com.crt')
};

const app = express();
app.use(cookieParser());

app.use(express.static('public'))

// read or initialize the state cookie
app.use(async function (req, res, next) {
    var id = req.cookies.id;
	//console.log("id is", id);
    req.state = await stateHelper.createStateObjectFromID(id);
	await stateHelper.saveState(res, req.state);
	//console.log("state is ", req.state);
    next();
});

const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 0;

var videoStreams = utils.videoStreams;
var pushNewFrame = utils.pushNewFrame;

var dims = [160, 144];

// whenever the user asks for the /screen...
app.get("/screen", async function(req, res) {
	const scenes = require("./scenes.js");
	videoStreams[req.state.id] = res;

	var [canvas, ctx] = utils.getCanvasAndCtx();

    res.writeHead(200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
        Pragma: 'no-cache',
        Connection: 'close',

        'Content-Type': 'multipart/x-mixed-replace; boundary=--endofsection'
    });
	
	utils.displayBoxText(ctx, "");
	res.write(`Content-Type:image/jpeg\n\n`);
	res.write(canvas.toBuffer("image/jpeg", { quality: 0.1 }));
	res.write(`--endofsection\n`);
	ctx.fillStyle = "white";
    ctx.fillRect(0, 0, dims[0], dims[1]);
	
	await scenes.find(req.state.scene).render(req, ctx, canvas);
	
	// debug
	//ctx.fillStyle = "black";
	//ctx.font = "12pt courier";
	//ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);
	
	res.write(`Content-Type:image/jpeg\n\n`);
	

    pushNewFrame(res, canvas);

	if(req.headers['user-agent'].match(/Firefox/)) {
		res.end();
	}

    // when the HTTP client disconnnects, remove its screen stream
    res.on("close", _=>{
		console.log("closed");
        delete videoStreams[req.state.id];
    });
});

app.get(["/d","/u","/r","/l","/a","/b"], async function controlInput(req, res) {
	const scenes = require("./scenes.js");
	var screenRes = videoStreams[req.state.id];
	var [canvas, ctx] = utils.getCanvasAndCtx();

	var controlMap = { "/d":"down", "/u":"up", "/r":"right", "/l":"left", "/a":"a", "/b":"b" };

	await scenes.find(req.state.scene).process(controlMap[req.originalUrl], req, ctx);

	// Firefox kills the image feed upon getting any 204 (even a separate request!)
	// so we have to use a redirect-and-reload approach
	if(!screenRes || req.headers['user-agent'].match(/Firefox/)) {
		await stateHelper.saveState(res, req.state);
		res.redirect(utils.homeURL);
		return;
	}


	await scenes.find(req.state.scene).render(req, ctx, canvas);
	await stateHelper.saveState(res, req.state);


	// debug
	//ctx.fillStyle = "black";
	//ctx.font = "12pt courier";
	//ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);

	if(screenRes) { pushNewFrame(screenRes, canvas); }

	res.status(204).end();
});

app.get("/escapeHatch", async function controlInput(req, res) {
	const scenes = require("./scenes.js");

	if(scenes.find(req.state.scene) == scenes.INTRO) {
	    res.redirect(utils.homeURL);
    }

	req.state.scene = scenes.MENU;
	req.state.cursorPos = 0;
	req.state.dialogPos = 0;
	req.opponentId = "";
	req.tropeOpponent = [0];
	req.opponenetMove = 99;
	req.opponentNextMove = 99;

	await stateHelper.saveState(res, req.state);
	
	res.redirect(utils.homeURL);
});
	

https.createServer(options, app).listen(3000);
//http.createServer(options, app).listen(3000);


function backupState() {
	fs.writeFile("./state.json", JSON.stringify(stateHelper.state), err=>{
		setTimeout(backupState, 5 * 60 * 1000);
	});
}

