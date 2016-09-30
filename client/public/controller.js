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

var PLAYER_ACTION = {
   JOIN: 'Join Game',
   LEAVE: 'Leave Game'
}

var GAME_MESSAGE = {
   JOIN_GAME         : 'To join a game, press "Join Game"!',
   JOIN_SUCCESS      : 'You joined the game!',
   GAME_FULL         : 'Game is currently full! Please try again later.',
   PLAYER_LEFT       : 'Your opponent left the game.',
   WAIT_FOR_PLAYER   : 'Waiting for other player...'
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
               $app.updateGameInfo(GAME_MESSAGE.JOIN_SUCCESS,
                                   PLAYER_ACTION.LEAVE,
                                   message.uuid,
                                   message.playerNumber,
                                   "Waiting for other player...");
               server.joinGame();
               break;
            }
            case MSG.JOIN_FAIL: {
               $app.updateGameInfo(GAME_MESSAGE.GAME_FULL,
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

   /*
      Subscribes to game channel and handles game channel requests
      * other player's move
      * other player leaving
   */

   server.joinGame = function() {
      pubnub.subscribe({
         channel : CHNLS.GAME,
         message : function(m) {
            console.log(m.msg);
            if (m.msg === MSG.PLAYER_LEFT && m.uuid != user_id) {
               $app.alertPlayerLeft();
            }
         },
         error : function(e) {
            console.log("ERROR: couldn't subscribe to server game channel")
         }
      });
   }

   server.unsubscribeFromChnl = function(channelName) {
      pubnub.unsubscribe({
         channel : channelName
      })
   }

   server.publishMessage = function(channelName, message, errorMsg, callback) {
      pubnub.publish({
         channel  : channelName,
         message  : message,
         error : function(e) {
            console.log(errorMsg + ", " + e);
         },
         callback : callback
      });
   }

   server.requestJoin = function() {
      server.publishMessage(
         CHNLS.LOBBY,
         {msg  : MSG.REQUEST_JOIN, 
          uuid : user_id},
         "ERROR: client could not subscribe to server lobby channel");
   };

   server.leaveGame = function(playerNumber) {
      server.unsubscribeFromChnl(CHNLS.GAME);
      server.publishMessage(
         CHNLS.GAME,
         {msg  : MSG.LEAVE_GAME, 
          playerNumber : playerNumber, 
          uuid : user_id});
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

app.controller('controller', function ($scope, $timeout) {

   ///////////////
   // Constants //
   $scope.COMMAND = {
      LEFT:  0,
      RIGHT: 1,
      DROP:  2
   };

   var ROW_COUNT = 5;
   var COL_COUNT = 8;

   var PIECE_STATE = {
      EMPTY: 'empty',
      RED: 'red',
      YELLOW: 'yellow'
   };

   // Initialize CLIENT_SERVER object
   var SERVER = CLIENT_SERVER($scope);

   /* Game board structure:
   [
      col: [{state: EMPTY}, {state: EMPTY}, ...],
      col: [{state: EMPTY}, {state: EMPTY}, ...],
      col: [{state: EMPTY}, {state: EMPTY}, ...],
      ...
   ]
   */

   // Constructor for a single col of {ROW_COUNT} pieces
   var EMPTY_COL = (function() {
      var col = [];
      for (var r = 0; r < ROW_COUNT; ++r) 
      {
         col.push({state: PIECE_STATE.EMPTY, filled: false});
      }
      return col;
   });

   // Constructor for a gameBoard of {COL_COUNT} columns
   var GAME_BOARD = (function() {
      var cols = [];
      for (var c = 0; c < COL_COUNT; ++c) 
      {
         cols.push(new EMPTY_COL());
      }
      return cols;
   });

   // create new gameboard;
   $scope.gameBoard = new GAME_BOARD();

   // Game state variables
   $scope.game_message = GAME_MESSAGE.JOIN_GAME;
   $scope.player_action = PLAYER_ACTION.JOIN;
   $scope.player_id = SERVER.getUserId();
   $scope.player_number = '';
   $scope.player_turn = '';

   ////////////////////
   // PUBLIC METHODS //
   $scope.playerAction = function () {
      switch ($scope.player_action) {
         case PLAYER_ACTION.JOIN: {
            // subscribeToSelf() will call requestJoin() on connect 
            SERVER.requestJoin();
            break;
         }
         case PLAYER_ACTION.LEAVE: {
            SERVER.leaveGame($scope.player_number);
            $scope.updateGameInfo(GAME_MESSAGE.JOIN_GAME,
                                  PLAYER_ACTION.JOIN,
                                  $scope.player_id,
                                  '',
                                  '');
            break;
         }
      }      
   };

   $scope.alertPlayerLeft = function() {
      alert(GAME_MESSAGE.PLAYER_LEFT);
      $scope.updateGameInfo(GAME_MESSAGE.JOIN_SUCCESS,
                            PLAYER_ACTION.LEAVE,
                            SERVER.getUserId(),
                            $scope.player_number,
                            GAME_MESSAGE.WAIT_FOR_PLAYER);
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
   };

   $scope.updateGameMessage = function (gameMessage) {
      $scope.game_message = gameMessage;
   };

   $scope.updatePlayerAction = function (playerAction) {
      $scope.player_action = playerAction;
   };

   $scope.updatePlayerId = function (playerId) {
      $scope.player_id = playerId;
   };

   $scope.updatePlayerNumber = function (playerNumber) {
      $scope.player_number = playerNumber;
   };

   $scope.updatePlayerTurn = function (playerTurn) {
      $scope.player_turn = playerTurn;
   };

   $scope.updateScopeBindings = function() {
      $scope.$apply();
   };

   ////////////////////////
   // Game Driven Events //
   $scope.hoverColumnIn = function() {
      if (!this.col[0].filled) 
      {
         this.col[0].state = PIECE_STATE.RED;
      }
   };

   $scope.hoverColumnOut = function() {
      if (!this.col[0].filled)
      {
         this.col[0].state = PIECE_STATE.EMPTY;
      }
   };

   $scope.dropPiece = function() {
      for (var i = this.col.length - 1; i > -1; --i) 
      {
         if (!this.col[i].filled) 
         {
            this.col[i].state = PIECE_STATE.RED;
            this.col[i].filled = true;
            var row = i;
            break;
         }
      }
      $scope.checkWinner(this.$index, row, PIECE_STATE.RED, function(){
         alert("You win!");
         $scope.gameBoard = new GAME_BOARD();
      });
   };

   $scope.checkWinner = function(col, row, state, callback) {
      /*
         col: column of the piece of interest
         row: row of the piece of interest
         state: color of the current player, RED or YELLOW
      */
      
      if (($scope.checkHorizontal(col, row, state) ||
           $scope.checkVertical(col, row, state)) && callback) {
         $timeout(callback, 300);
      }
   }

   $scope.checkVertical = function(col, row, state) {
      // count to keep track of now many pieces are in a row
      var count = 0;
      while (row < ROW_COUNT && $scope.gameBoard[col][row].state === state) {
         count++;
         row++;
      }
      return (count >= 4) ? true : false;
   }

   $scope.checkHorizontal = function(col, row, state) {
      // count to keep track of now many pieces are in a row
      var count = 0;
      var col_l = col;
      var col_r = col + 1;
      // check left
      while (col_l >= 0 && $scope.gameBoard[col_l][row].state === state) {
         count++;
         col_l--;
      }
      // check right
      while (col_r >= 0 && $scope.gameBoard[col_r][row].state === state) {
         count++;
         col_r++;
      }
      return (count >= 4) ? true : false;
   }

   $scope.checkDiagonals = function(col, row, state) {
      var count1 = 0;
      // check /
      var _col = col;
      var _row = row;
      // check left
      while ((_col < COL_COUNT && _row >= 0) && 
            $scope.gameBoard[_col][_row].state === state) {
         count++;
         _col--;
         _col--;
      }
      // check right
      _col = col+1;
      _row = row+1;
      while ((_col < COL_COUNT && _row >= 0) && 
            $scope.gameBoard[_col][_row].state === state) {
         count++;
         _col++;
         _row++;
      }


      var count2 = 0;
      // check \
   }
});
















