// Author: Jeremy Wang

var MSG = {
   ACK            : 'ack',
   REQUEST_JOIN   : 'request_join',
   JOIN_SUCCESS   : 'join_success',
   JOIN_FAIL      : 'join_fail',
   PLAYER_LEFT    : 'player_left',
   START_GAME     : 'start_game',
   FINISHED_TURN  : 'finished_turn',
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
   JOIN_SUCCESS      : 'You joined the game! Waiting for other player...',
   GAME_FULL         : 'Game is currently full! Please try again later.',
   PLAYER_LEFT       : 'Your opponent left the game.',
   GAME_START_GO     : 'Game started! It\'s your turn!',
   GAME_START_WAIT   : 'Game started! Waiting for other player\'s turn...',
   YOUR_TURN         : 'It\s your turn!',
   WAIT_YOUR_TURN    : 'Waiting for other player\'s turn...'
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
      message: handleLobbyRequests,
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
   function handleLobbyRequests(message) {
      // Handle responses from SERVER if message is directed at user's uuid
      if (message.uuid === user_id) {
         switch (message.msg) {
            case MSG.JOIN_SUCCESS: {
               $app.updateGameInfo(GAME_MESSAGE.JOIN_SUCCESS,
                                   PLAYER_ACTION.LEAVE,
                                   message.uuid,
                                   message.playerColor,
                                   false);
               server.joinGame();
               break;
            }
            case MSG.JOIN_FAIL: {
               $app.updateGameInfo(GAME_MESSAGE.GAME_FULL,
                                   PLAYER_ACTION.JOIN,
                                   message.uuid,
                                   '',
                                   false);
               break;
            }
         }
         $app.updateScopeBindings();
      }
   }

   /*
      Subscribes to game channel and handles game channel requests
      * other player's move
      * other player left
   */
   function handleGameRequests(message) {
      switch (message.msg) {
         case MSG.START_GAME: {
            if (message.playerStart === user_id) {
               $app.updateGameMessage(GAME_MESSAGE.GAME_START_GO);
               $app.updatePlayerTurn(true);
            } else {
               $app.updateGameMessage(GAME_MESSAGE.GAME_START_WAIT);
               $app.updatePlayerTurn(false);
            }
            $app.updateScopeBindings();
            break;
         }
         case MSG.FINISHED_TURN: {
            // if other player finished their turn, update our gameBoard accordingly
            if (message.uuid != user_id) {
               $app.updateGameBoard(message.playerColor, message.col, message.row);
               $app.updateGameMessage(GAME_MESSAGE.YOUR_TURN);
               $app.updatePlayerTurn(true);
               $app.updateScopeBindings();
            }
            break;
         }
         case MSG.GAME_OVER: {
            if (message.winner === user_id) {
               $app.alertWinner();
            } else {
               $app.alertLoser();
            }
            break;
         }
         case MSG.PLAYER_LEFT: {
            if (message.uuid != user_id) {
               $app.alertPlayerLeft();
            }
            break;
         }
      }
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

   // Player actions
   server.joinGame = function() {
      pubnub.subscribe({
         channel : CHNLS.GAME,
         message : handleGameRequests,
         error : function(e) {
            console.log("ERROR: couldn't subscribe to server game channel")
         }
      });
   }

   server.requestJoin = function() {
      server.publishMessage(
         CHNLS.LOBBY,
         {msg  : MSG.REQUEST_JOIN, 
          uuid : user_id},
         "ERROR: client could not subscribe to server lobby channel");
   };

   server.leaveGame = function(playerColor) {
      server.unsubscribeFromChnl(CHNLS.GAME);
      server.publishMessage(
         CHNLS.GAME,
         {msg           : MSG.LEAVE_GAME, 
          playerColor   : playerColor, 
          uuid          : user_id});
   };

   server.announceWinner = function(uuid) {
      server.publishMessage(
         CHNLS.GAME,
         {msg     : MSG.GAME_OVER,
          winner  : uuid});
   };

   server.finishTurn = function(uuid, playerColor, col, row) {
      /*
         uuid : playerId of player who is finishing their turn
         playerColor : color of the player who is finishing turn
         row  : row of the piece dropped
         col  : col of the piece dropped
      */
      server.publishMessage(
         CHNLS.GAME,
         {msg         : MSG.FINISHED_TURN,
          uuid        : uuid,
          playerColor : playerColor,
          col         : col,
          row         : row})
   };

   server.getUserId = function() {
      return user_id;
   };

   return server;
});

////////////////////////////
// Angular App Controller //
////////////////////////////
var app = angular.module('app', []);

app.controller('controller', function ($scope, $timeout) {

   ///////////////
   // Constants //
   var SERVER = CLIENT_SERVER($scope);

   var ROW_COUNT = 5;
   var COL_COUNT = 8;

   var PIECE_STATE = {
      EMPTY: 'empty',
      RED: 'red',
      YELLOW: 'yellow'
   };

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

   // Create new gameboard;
   $scope.gameBoard = new GAME_BOARD();

   // Game state variables
   $scope.gameMessage = GAME_MESSAGE.JOIN_GAME;
   $scope.playerAction = PLAYER_ACTION.JOIN;
   $scope.playerId = SERVER.getUserId();
   $scope.playerColor = '';
   $scope.playerTurn = false;

   ////////////////////
   // PUBLIC METHODS //
   $scope.buttonAction = function () {
      switch ($scope.playerAction) {
         case PLAYER_ACTION.JOIN: {
            // subscribeToSelf() will call requestJoin() on connect 
            SERVER.requestJoin();
            break;
         }
         case PLAYER_ACTION.LEAVE: {
            SERVER.leaveGame($scope.playerColor);
            $scope.updateGameInfo(GAME_MESSAGE.JOIN_GAME,
                                  PLAYER_ACTION.JOIN,
                                  $scope.playerId,
                                  '',
                                  false);
            
            $scope.gameBoard = new GAME_BOARD();   // clear game board
            break;
         }
      }      
   };

   $scope.alertPlayerLeft = function() {
      alert(GAME_MESSAGE.PLAYER_LEFT);
      $scope.updateGameInfo(GAME_MESSAGE.JOIN_SUCCESS,
                            PLAYER_ACTION.LEAVE,
                            SERVER.getUserId(),
                            $scope.playerColor,
                            false);

      $scope.gameBoard = new GAME_BOARD();   // clear game board
   };

   $scope.checkWinner = function(col, row, state) {
      /*
         col: column of the piece of interest
         row: row of the piece of interest
         state: color of the current player, RED or YELLOW
      */
      
      if (checkHorizontal(col, row, state) ||
          checkVertical(col, row, state)   ||
          checkDiagonals(col, row, state)) {
         // if player won the game
         SERVER.announceWinner($scope.playerId);
      } else {
         // if player didn't win yet, let server know that player's turn is done
         SERVER.finishTurn($scope.playerId, $scope.playerColor, col, row);
         $scope.updateGameMessage(GAME_MESSAGE.WAIT_YOUR_TURN);
         $scope.updatePlayerTurn(false);
      }
   };

   // UI Methods
   $scope.updateGameBoard = function(playerColor, col, row) {
      $scope.gameBoard[col][row].state = playerColor;
      $scope.gameBoard[col][row].filled = true;
   }
   $scope.updateGameInfo = function(gameMessage, 
                                    playerAction, 
                                    playerId,
                                    playerColor, 
                                    playerTurn) {
      $scope.updateGameMessage(gameMessage);
      $scope.updatePlayerAction(playerAction);
      $scope.updatePlayerId(playerId)
      $scope.updatePlayerColor(playerColor);
      $scope.updatePlayerTurn(playerTurn);
   };

   $scope.updateGameMessage = function (gameMessage) {
      $scope.gameMessage = gameMessage;
   };

   $scope.updatePlayerAction = function (playerAction) {
      $scope.playerAction = playerAction;
   };

   $scope.updatePlayerId = function (playerId) {
      $scope.playerId = playerId;
   };

   $scope.updatePlayerColor = function (playerColor) {
      $scope.playerColor = playerColor;
   };

   $scope.updatePlayerTurn = function (playerTurn) {
      $scope.playerTurn = playerTurn;
   };

   $scope.updateScopeBindings = function() {
      $scope.$apply();
   };

   // Game Events
   $scope.hoverColumnIn = function() {
      if ($scope.playerTurn && !this.col[0].filled) {
         this.col[0].state = $scope.playerColor;
      }
   };

   $scope.hoverColumnOut = function() {
      if (!this.col[0].filled) {
         this.col[0].state = PIECE_STATE.EMPTY;
      }
   };

   $scope.dropPiece = function() {
      if ($scope.playerTurn) {
         for (var i = this.col.length - 1; i > -1; --i) {
            if (!this.col[i].filled) {
               this.col[i].state = $scope.playerColor;
               this.col[i].filled = true;
               var row = i;
               break;
            }
         }
         $scope.checkWinner(this.$index, row, $scope.playerColor);
      }
   };

   $scope.alertWinner = function(){
      alert("You win!");
      $scope.gameBoard = new GAME_BOARD();   // clear game board
      $scope.updatePlayerTurn(false);
   };

   $scope.alertLoser = function(){
      alert("You lost!");
      $scope.gameBoard = new GAME_BOARD();   // clear game board
      $scope.updatePlayerTurn(false);
   };

   /////////////////////
   // Private Methods //
   function checkVertical(col, row, state) {
      var count = 0;
      while (row < ROW_COUNT && $scope.gameBoard[col][row].state === state) {
         count++;
         row++;
      }

      return (count >= 4) ? true : false;
   };

   function checkHorizontal(col, row, state) {
      var count = 0;
      var col_l = col;
      var col_r = col + 1;
      // check left
      while (col_l >= 0 && $scope.gameBoard[col_l][row].state === state) {
         count++;
         col_l--;
      }
      // check right
      while (col_r < COL_COUNT && $scope.gameBoard[col_r][row].state === state) {
         count++;
         col_r++;
      }

      return (count >= 4) ? true : false;
   };

   function checkDiagonals(col, row, state) {
      var count1 = 0;
      // check / (bottom left to top right)
      var _col = col;
      var _row = row;
      // check left
      while ((_col >= 0 && _row < ROW_COUNT) && $scope.gameBoard[_col][_row].state === state) {
         count1++;
         _col--;
         _row++;
      }
      // check right
      _col = col+1;
      _row = row-1;
      while ((_col < COL_COUNT && _row >= 0) && $scope.gameBoard[_col][_row].state === state) {
         count1++;
         _col++;
         _row--
      }

      var count2 = 0;
      // check \ (top left to bottom right)
      // reset _col and _row
      _col = col;
      _row = row;
      // check left
      while ((_col >= 0 && _row >= 0) && $scope.gameBoard[_col][_row].state === state) {
         count2++;
         _col--;
         _row--;
      }
      // check right
      _col = col+1;
      _row = row+1;
      while ((_col < COL_COUNT && _row < ROW_COUNT) && $scope.gameBoard[_col][_row].state === state) {
         count2++;
         _col++;
         _row++
      }

      return (count1 >= 4 || count2 >= 4) ? true : false;
   };
});
















