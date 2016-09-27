// Author: Jeremy Wang

var MSG = {
   ACK            : 'ack',
   REQUEST_JOIN   : 'request_join',
   JOIN_SUCCESS   : 'join_success',
   JOIN_FAIL      : 'join_fail',
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

var CHNLS = {
   LOBBY : "lobby",
   GAME : "game"
};

PLAYER_ACTION = {
   JOIN: 'Join Game',
   LEAVE: 'Leave Game'
}

///////////////////
// Client Server //
///////////////////
var CLIENT_SERVER = (function ($app) {

   function generateUIDNotMoreThan1million() {
       return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4)
   }

   /* Subscribe to server lobby channel used to handle 
      * joining/leaving games
   */
   // server object to be returned to the webapp
   var server = {};
   // var user_id = pubnub.get_uuid(); // unique client user id
   var user_id = generateUIDNotMoreThan1million();

   // Initialize PubNub
   var pubnub = PUBNUB({
      publish_key    : 'pub-c-4eb11ea9-5b88-48c9-b43a-9e85200f6197',
      subscribe_key  : 'sub-c-eac89748-8135-11e6-974e-0619f8945a4f',
      uuid: user_id,
      heartbeat: 10,
   });

   pubnub.subscribe({
      channel: CHNLS.LOBBY,
      message: function(m) {
         server.handleLobbyRequests(m);
      },
      connect: function(m) {
         pubnub.publish({
            channel   : CHNLS.LOBBY,
            message   : {msg : "Client " + user_id + " entered the game server lobby."}
         });
      },
      presence: function(m) {
         // console.log("presence: " + m);
      },
      error: function(m) {
         console.log("ERROR: couldn't subscribe to server lobby channel");
      }
   });

   ////////////////////
   // PUBLIC METHODS //
   server.handleLobbyRequests = function(message) {
      // Handle responses from SERVER if message is directed at user's uuid
      if (message.uuid === user_id) {
         switch (message.msg) {
            case MSG.JOIN_SUCCESS: {
               $app.updateGameInfo("You joined the game!",
                                   PLAYER_ACTION.LEAVE,
                                   message.uuid,
                                   message.playerNumber,
                                   "Waiting for other player...");
               break;
            }
            case MSG.JOIN_FAIL: {
               $app.updateGameInfo("Game is currently full! Please try again later.",
                                   PLAYER_ACTION.JOIN,
                                   message.uuid,
                                   '',
                                   '');
               break;
            }
         }
         $app.updateScopeBindings();
      }
   }

   server.publishMessage = function(channelName, message, errorMsg) {
      pubnub.publish({
         channel  : channelName,
         message  : message,
         error : function(e) {
            console.log(errorMsg + ", " + e);
         }
      });
   }

   server.requestJoin = function() {
      server.publishMessage(
         CHNLS.LOBBY,
         {msg  : MSG.REQUEST_JOIN, 
          uuid : user_id},
         "ERROR: client could not subscribe to main game channel");
   };

   server.leaveGame = function(playerNumber) {
      server.publishMessage(
         CHNLS.GAME,
         {msg  : MSG.LEAVE_GAME, 
          playerNumber : playerNumber, 
          uuid : user_id},
         "ERROR: client could not subscribe to main game channel");
   };

   server.getUserId = function() {
      return user_id;
   }

   return server;

});

////////////////////////////
// Angular App Controller //
////////////////////////////
var app = angular.module('app', []);

app.controller('controller', function ($scope) {

   ///////////////
   // Constants //
   $scope.COMMAND = {
      LEFT:  0,
      RIGHT: 1,
      DROP:  2
   };

   var ROW_COUNT = 5;
   var COL_COUNT = 8;

   var TILE_STATE = {
      EMPTY: 'empty',
      RED: 'red',
      YELLOW: 'yellow'
   };

   // Initialize CLIENT_SERVER object
   var SERVER = CLIENT_SERVER($scope);

   /* Game board structure:
   [
      row: [{state: EMPTY}, {state: EMPTY}, ...],
      row: [{state: EMPTY}, {state: EMPTY}, ...],
      row: [{state: EMPTY}, {state: EMPTY}, ...],
      ...
   ]
   */
   $scope.row = (function() {          // Creates a single row of {COL_COUNT} columns
      var cols = [];
      for (var c = 0; c < COL_COUNT; ++c) 
      {
         cols.push({state: TILE_STATE.EMPTY});
      }
      return cols;
   })();

   $scope.gameBoard = (function() {    // Creates the gameBoard of {ROW_COUNT} rows
      var rows = [];
      for (var r = 0; r < ROW_COUNT; ++r) 
      {
         rows.push({row: $scope.row});
      }
      return rows;
   })();

   // Game state variables
   $scope.game_message = 'To join a game, press "Join Game"!';
   $scope.player_action = PLAYER_ACTION.JOIN;
   $scope.player_id = SERVER.getUserId();
   $scope.player_number = "";
   $scope.player_turn = '';

   ////////////////////
   // PUBLIC METHODS //
   $scope.test = function() {
      console.log("testing");
   }

   $scope.playerAction = function () {
      switch ($scope.player_action) {
         case PLAYER_ACTION.JOIN: {
            // subscribeToSelf() will call requestJoin() on connect 
            SERVER.requestJoin();
            break;
         }
         case PLAYER_ACTION.LEAVE: {
            SERVER.leaveGame($scope.player_number);
            $scope.updateGameInfo('To join a game, press "Join Game"!',
                                  PLAYER_ACTION.JOIN,
                                  SERVER.getUserId(),
                                  '',
                                  '');
            break;
         }
      }      
   };

   // UI Methods
   $scope.updateGameInfo = function(gameMessage, 
                                    playerAction, 
                                    playerId,
                                    playerNumber, 
                                    playerTurn) {
      $scope.updateGameMessage(gameMessage);
      $scope.updatePlayerAction(playerAction);
      $scope.updatePlayerId(playerId)
      $scope.updatePlayerNumber(playerNumber);
      $scope.updatePlayerTurn(playerTurn);
   }
   $scope.updateGameMessage = function (gameMessage) {
      $scope.game_message = gameMessage;
   }

   $scope.updatePlayerAction = function (playerAction) {
      $scope.player_action = playerAction;
   }

   $scope.updatePlayerId = function (playerId) {
      $scope.player_id = playerId;
   }

   $scope.updatePlayerNumber = function (playerNumber) {
      $scope.player_number = playerNumber;
   }

   $scope.updatePlayerTurn = function (playerTurn) {
      $scope.player_turn = playerTurn;
   }

   $scope.updateScopeBindings = function() {
      $scope.$apply();
   }

   ////////////////////////////
   // Browser Event Handlers //
   ////////////////////////////
   $(window).bind("unload",function(e) {
      SERVER.leaveGame($scope.player_number);
      e.preventDefault();
   }); 
});