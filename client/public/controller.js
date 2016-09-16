// Author: Max McCord
// Date:   Dec 12, 2015

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
   LEAVE_GAME     : 'leave_game'
   GAME_OVER      : 'game_over',
};

var SERVER = (function () {
   // this queue will hold messages received from any channel before they are processed
   var messageQueue = [];

   var enqueueMessage = function (msg) {
      messageQueue.push(msg);
   };

   // init pubnub and declare function for sending a message

   var pubnub = PUBNUB({
      publish_key   : 'pub-c-4421eb01-7fb7-44c1-8b5a-de3fd622eaba',
      subscribe_key : 'sub-c-9386a098-a106-11e5-bcd8-0619f8945a4f'
   });

   pubnub.subscribe({
      channel : 'ledgame_server',
      message : enqueueMessage
   });

   var sendMessage = function (playerNum, message, callback) {
      pubnub.publish({
         channel : 'ledgame_player' + ( (playerNum != 0) : playerNum ? '' ),
         message : message
      });

      // don't call the callback until we get a response from the server
      while (messageQueue.size == 0) {
         var msg = messageQueue.shift();

      }
   };

   ////////////////////
   // PUBLIC METHODS //

   var server = {};

   server.subscribeToChannel = function (playerNum) {
      pubnub.subscribe({
         channel : 'ledgame_server' + playerNum,
         message : enqueueMessage
      });
   };

   server.requestJoin = function (callback) {

   };

   server.sendReady = function (callback) {

   };

   return server;
})();

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
      SERVER.requestJoin();
   };

   $scope.sendReady = function () {
      SERVER.
   };

   $scope.sendCommand = function (command) {
      alert(command);
      pubnub.publish({
         channel : 'ledgame_player',
         message : {
            player:  $scope.player,
            command: command
         }
      });
   };

   // listen for messages from the server

   // var processServerMessage = function (message, env, ch, timer, magic_ch) {
   //    console.log('Message received: ' + JSON.stringify(message));
   // };


});
