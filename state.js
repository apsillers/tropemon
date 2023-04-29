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

var states = {};
var scenes = exports.scenes = require("./scenes.js");
var tropes = require("./tropes.js")

const { createClient } = require('redis');


/*
This is the ordered list of state fields that represents a player's state
Each field has
  a name (used to name its property in the state object)
  a default value (either a string/number or an array of string/numbers)

We use this to serialize and deserialize between a state sequence (at rest) into a state object (in memory):
 * the `name` of each field is a property name on the state object
 * the order of fields is used to serialize state to (and restore it from) a nameless sequence, to save storage space
*/
var fields = exports.fields = [
  { name:"scene", "default":scenes.INTRO.id, "desc":"number indicating what screen we are on (startup, battle, attacks/item/tropes submenu, item, tropes, world, etc)" },
  { name:"cursorPos", default:0, "desc":"number indicating cursor position (context-dependent *what* the cursor is)" },
  { name:"dialogPos", default:0, "desc":"number indentifying displayed dialogue item" },
  { name:"worldX", default:0, "desc":"player coordinate" },
  { name:"worldY", default:0, "desc":"player coordinate" },
  { name:"whichTropeActive", default:1, "desc":"which trope is active in battle" },
  { name:"trope1", default:[0], desc:"" },
  { name:"trope2", default:[0], desc:"" },
  { name:"trope3", default:[0], desc:"" },
  { name:"trope4", default:[0], desc:"" },
  { name:"trope5", default:[0], desc:"" },
  { name:"trope6", default:[0], desc:"" },
  { name:"tropeOpponent", default:[0], desc:"opponent's active trope" },
  // oponentMove and opponentNextMove are separate because your opponent might go through the attack messages quickly
  // and then queue up a next move while you're still rendering their last one
  { name:"opponentMove", default:99, desc:"attack index chosen by opponent that we are currently animating -- 99 indicates no move yet" },
  { name:"opponentNextMove", default:99, desc:"attack index chosen by opponent that we will animate next -- 99 indicates no move yet" },
  { name:"opponentId", default:"", desc: "UUID of multiplayer opponent" },
]



/*
trope fields:
  tropeNum
  level (this informs attack, defense, speed, max HP, available moves)
  hp
  move1PP, move2PP, move3PP, move4PP
  attackDiff, defenceDiff,
  xp (2 bytes, symbol h),
  special (reserved, currently unused)
*/

exports.newStateObject = function() {
    var state = { id: require("crypto").randomUUID(), opponentId: "" };
	fields.forEach(f=>state[f.name] = f.default&&f.default.slice?f.default.slice():f.default);
	return state;
}

function newClient() {
	const client = createClient({
		user: process.env.REDISUSER,
		password: process.env.REDISPASS,
		socket: {
			host: process.env.REDISHOST,
			port: process.env.REDISPORT
		}
	});
	client.on('error', err => console.log('Redis Client Error', err));
	return client;
}

exports.saveState = async function(res, state) {
	
	for(var i of [1,2,3,4,5,6,"Opponent"]) {
		if(state["trope"+i]) { state["trope"+i] = tropes.serializeTrope(state["trope"+i]); }
	}

	if(typeof state.scene == "object") {
		state.scene = state.scene.id;
	}

	var values = JSON.stringify(fields.map(f=>state[f.name]));
	const client = newClient();
	await client.connect();
	await client.set(state.id, values);

	// try saving the user's id as a cookie
	if(res) {
		try {
			res.cookie('id', state.id, { maxAge: 90000000000, httpOnly: true, sameSite: 'none', secure: true });
		} catch(e) {}
	}

	await client.disconnect();
}

exports.createStateObjectFromID = async function(id) {
	const client = newClient();
	await client.connect();
	
	if(id) {
		var state = { id: id };
		var stateStr = await client.get(id);
		var values = JSON.parse(stateStr);
		
		// turn each value into a field on state object
		fields.forEach((f,i)=>{state[f.name] = values[i];});
	} else {
		var state = exports.newStateObject();
	}
	state.scene = scenes.find(state.scene);
	await client.disconnect();
	return state;
}
