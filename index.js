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
const jspack = require("jspack");
const utils = require("./utils.js");

const stateHelper = require("./state.js");

//registerFont("./NotoEmoji-Regular.ttf", { family: "Noto Emoji",  weight: 'normal', style: 'normal' });
//registerFont("./CourierPrime-Bold.ttf", { family: "Courier",  weight: 'bold', style: 'normal' });

var options = {
//  key: fs.readFileSync('../stack/letsencrypt/certificates/tropemon.com.key'),
//  cert: fs.readFileSync('../stack/letsencrypt/certificates/tropemon.com.crt')
};

const app = express();
app.use(cookieParser());

app.use(express.static('public'))

// read or initialize the state cookie on each request,
// by reading (or creating) a cookie with an "id" value
app.use(async function (req, res, next) {
	var id = req.cookies.id;
	//console.log("id is", id);
	req.state = await stateHelper.createStateObjectFromID(id);
	await stateHelper.saveState(res, req.state);
	//console.log("state is ", req.state);
	next();
});

var videoStreams = utils.videoStreams;
var pushNewFrame = utils.pushNewFrame;

var dims = [160, 144];

// whenever the user asks for the /screen,
//   create a new entry in `videoStream` object with this kept-open response,
//   indexed by cookie ID, so we can push to it as needed.
// We will never willingly close this response,
//   but it will close when the user navigates away or times out.
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
	
	res.write(`Content-Type:image/svg+xml\n\n`);
	res.write(canvas.toBuffer());
	res.write(`--endofsection\n`);
	
	await scenes.find(req.state.scene).render(req, ctx, canvas);
	
	// debug
	//ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);
	
	res.write(`Content-Type:image/svg+xml\n\n`);
	pushNewFrame(res, canvas);

	// Firefox kills the image feed upon getting any 204 (even a separate request!)
	// so we have to use a redirect-and-reload approach
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

	// look up the the state's current scene and process this input
	await scenes.find(req.state.scene).process(controlMap[req.originalUrl], req, ctx);

	// Firefox kills the image feed upon getting any 204 (even a separate request!)
	// so we have to use a redirect-and-reload approach
	if(!screenRes || req.headers['user-agent'].match(/Firefox/)) {
		await stateHelper.saveState(res, req.state);
		res.redirect(utils.homeURL);
		return;
	}

	// look up the current state (which might have changed) and render state as visual output
	await scenes.find(req.state.scene).render(req, ctx, canvas);
	
	// save mutated state back into the database
	await stateHelper.saveState(res, req.state);

	// debug
	//ctx.fillText(`c${req.state.cursorPos},d${req.state.dialogPos}`, 0, 10);

	if(screenRes) { pushNewFrame(screenRes, canvas); }

	res.status(204).end();
});

// hey, I coded this in like 4 weeks
// if your state is absolutely borked somehow, this endpoint will reset your state
app.get("/escapeHatch", async function controlInput(req, res) {
	const scenes = require("./scenes.js");

	// still in the intro? you can't possibly have messed up your state yet, right??
	// and you might not even have your starter Trope
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

http.createServer(options, app).listen(3000);
//https.createServer(options, app).listen(443);
//http.createServer(options, app).listen(3000);

