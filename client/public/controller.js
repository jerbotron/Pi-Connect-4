// Author: Jeremy Wang

var MSG = {
   ACK            : 'ack',
   REQUEST_JOIN   : 'request_join',
   JOIN_SUCCESS   : 'join_success',
   PLAYER_READY   : 'player_ready',
   START_GAME     : 'start_game',
   REQUEST_TURN   : 'request_turn',
   WAIT_YOUR_TURN : 'wait_your_turn',
   MOVE_CUR_LEFT  : 'move_cur_left',
   MOVE_CUR_RIGHT : 'move_cur_right',
   DROP           : 'drop',
   LEAVE_GAME     : 'leave_game',
   GAME_OVER      : 'game_over'
};

var SERVER = (function () {
   // this queue will hold messages received from any channel before they are processed
   var messageQueue = [];

   var enqueueMessage = function (msg) {
      messageQueue.push(msg);
   };

   // init pubnub and declare function for sending a message

   var pubnub = PUBNUB({
      publish_key    : 'pub-c-4eb11ea9-5b88-48c9-b43a-9e85200f6197',
      subscribe_key  : 'sub-c-eac89748-8135-11e6-974e-0619f8945a4f'
   });

   pubnub.subscribe({
      channel : 'ledgame_server',
      message : enqueueMessage
   });

   var sendMessage = function (playerNum, message, callback) {
      pubnub.publish({
         channel : 'ledgame_player' + ( (playerNum != 0) ? playerNum : '' ),
         message : message
      });

      // don't call the callback until we get a response from the server
      while (messageQueue.size == 0) {
         var msg = messageQueue.shift();

      }
   };

   ////////////////////
   // PUBLIC METHODS //
   ////////////////////

   var server = {};

   server.subscribeToChannel = function (playerNum) {
      pubnub.subscribe({
         channel : 'ledgame_server' + playerNum,
         message : enqueueMessage
      });
   };

   server.requestJoin = function (callback) {
      console.log("server.requestJoin");

   };

   server.sendReady = function (callback) {
      console.log("server.sendReady");
   };

   return server;
})(); // var SERVER

var app = angular.module('app', []);

app.controller('controller', function ($scope) {
   // constants
   $scope.COMMAND = {
      LEFT:  0,
      RIGHT: 1,
      DROP:  2
   };

   // game state variables
   $scope.game_message = 'To join a game, press "Join Game"!';
   $scope.player = 0;

   $scope.joinGame = function () {
      console.log("joinGame");
      SERVER.requestJoin();
   };

   $scope.sendReady = function () {
      console.log("sendReady");
      SERVER.sendReady();
   };

   $scope.sendCommand = function (command) {
      alert(command);
      // SERVER.pubnub.publish({
      //    channel : 'ledgame_player',
      //    message : {
      //       player:  $scope.player,
      //       command: command
      //    }
      // });
   };

   // listen for messages from the server

   // var processServerMessage = function (message, env, ch, timer, magic_ch) {
   //    console.log('Message received: ' + JSON.stringify(message));
   // };


});
