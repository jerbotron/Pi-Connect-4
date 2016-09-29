// Author: Jeremy Wang

var express = require('express')
var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 80;

var fs      = require('fs');
var PUBNUB = require('pubnub');

// ExpressJS app 
app.use(express.static('public', { index: false })); // serve public directory; don't auto-serve index.html

app.get('/', function (req, res) {
   fs.readFile('public/html/controller.html', function (err, data) {
      if (err) return res.status(500).send('An internal error occured.');
      res.send(data.toString());
   });
});

// replace 5000 with port number when deploying
server.listen(5000, function () {
   console.log('listening on port: ' + 5000 + '...');
});


/*
 * Connect 4 Communication Handlers
*/

// Initialize PubNub
var pubnub = PUBNUB.init({
    publish_key    : 'pub-c-4eb11ea9-5b88-48c9-b43a-9e85200f6197',
    subscribe_key  : 'sub-c-eac89748-8135-11e6-974e-0619f8945a4f',
    uuid: 'SERVER',
    error: function (error) {
        console.log('PubNub Error:', error);
    }
})

/* 
 * Channel Subscriptions
*/

// Variable Declarations

// Channels
var CHNLS = {
	LOBBY : "lobby",
	GAME : "game"
};

var MSG = {
   ACK            : 'ack',
   REQUEST_JOIN   : 'request_join',
   JOIN_SUCCESS   : 'join_success',
   JOIN_FAIL   	  : 'join_fail',
   PLAYER_LEFT    : 'player_left',
   START_GAME     : 'start_game',
   REQUEST_TURN   : 'request_turn',
   WAIT_YOUR_TURN : 'wait_your_turn',
   MOVE_CUR_LEFT  : 'move_cur_left',
   MOVE_CUR_RIGHT : 'move_cur_right',
   DROP           : 'drop',
   LEAVE_GAME     : 'leave_game',
   GAME_OVER      : 'game_over'
};

// Player numbers to be assigned to calling clients
var player_numbers = ['1', '2'];
var active_players = {};

// Subscribe to LOBBY channel and GAME channel

///////////////////
// LOBBY Channel //
pubnub.subscribe({
    channel  : CHNLS.LOBBY,
    message  : function(m) {
    	handleLobbyRequests(m);
    },
    presence : function(m) {
    	// On timeout, if timed out player was an active player, 
    	// replenenish their player number
    	console.log("presence: " + m.action + " , occupancy: " + m.occupancy);
    	if ((m.action === "timeout" || m.action === "leave") && active_players.hasOwnProperty(m.uuid)) 
    	{
    		handleLeaveRequest(m.uuid, active_players[m.uuid]);
    	}
    },
    connect  : function(m) {
    	console.log("SERVER > LOBBY channel connected to PubNub Cloud");
    	// publishMessage(CHNLS.LOBBY, {msg : "SERVER lobby channel connected to PubNub Cloud"});
    }
});

//////////////////
// GAME Channel //
pubnub.subscribe({
	channel : CHNLS.GAME,
	message : handleGameRequests,
	connect : function(m) {
		console.log("SERVER > GAME channel connected to PubNub Cloud");
		// publishMessage(CHNLS.GAME, {msg : "SERVER game channel connected to PubNub Cloud"});
	}
});

function publishMessage(channelName, message) {
	pubnub.publish({
		channel : channelName,
		message : message
	});
};

function handleLobbyRequests(message) {
	/*
		Allow server to handle client requests to join/leave game
		* If there are still existing player numbers to give out,
		  publish them to client upon REQUEST_JOIN
		* Push player number back to server container when a client
		  sends LEAVE_GAME request
		* If there are no more available game slots, then send back
		  JOIN_FAIL message to client
	*/
	switch (message.msg) {
		case MSG.REQUEST_JOIN: {
			handleJoinRequest(message.uuid); // player uuid
			break;
		}
	}
};

function handleGameRequests(message) {
	switch (message.msg) {
		case MSG.LEAVE_GAME: {
			// player uuid, player number
			handleLeaveRequest(message.uuid, message.playerNumber);
			break;
		}
	}
}

function printActivePlayers() {
	console.log("player numbers remaining: [" + player_numbers + "]");
	for (var player in active_players) {
		if (active_players.hasOwnProperty(player)) {
			console.log(player + ": " + active_players[player]);
		}
	}
};

function replenishPlayerNumber(playerNumber) {
	console.log("player_number on leave = " + playerNumber);
	// if not found, add to player_numbers pool
	if (player_numbers.indexOf(playerNumber) == -1) 
	{
		if (playerNumber === "1")
			player_numbers.unshift(playerNumber);
		else
			player_numbers.push(playerNumber);
	}
};

function handleJoinRequest(userId) {
	if (player_numbers.length > 0) 
	{
		var player_number = player_numbers.shift();
		active_players[userId] = player_number;
		publishMessage(CHNLS.LOBBY, {msg : MSG.JOIN_SUCCESS, uuid : userId, playerNumber : player_number});
	} 
	else 
	{
		publishMessage(CHNLS.LOBBY, {msg : MSG.JOIN_FAIL, uuid : userId});
	}
	printActivePlayers();
};

function handleLeaveRequest(userId, playerNumber) {
	console.log("player uuid on leave = " + userId);
	printActivePlayers();
	// re-gain player number of the player that left
	replenishPlayerNumber(playerNumber);
	delete active_players[userId];
	printActivePlayers();
	// Let other player know that their opponent has left the game
	publishMessage(CHNLS.GAME, {msg : MSG.PLAYER_LEFT, uuid : userId});
	// TODO: update lobby info
};