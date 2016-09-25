var express = require('express');
var fs      = require('fs');

var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 80;

var PubNub = require('pubnub');

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

// PubNub Handlers
var pubnub = new PubNub({
    subscribeKey : 'pub-c-4eb11ea9-5b88-48c9-b43a-9e85200f6197',
    publishKey   : 'sub-c-eac89748-8135-11e6-974e-0619f8945a4f'
});

function publish() {
  pubnub.publish({ 
    channel   : 'ledgame_server',
    message   : 'Server subscribed'
  });
}

pubnub.subscribe({
    channel  : "ledgame_server",
    callback : function(m) {
    	console.log("Got a message: " + m);
    },
    connect  : publish
});

pubnub.publish({
    channel   : 'ledgame_server',
    message   : "hello world",
    callback  : function(e) { 
        console.log( "SUCCESS!", e );
    },
    error     : function(e) { 
        console.log( "FAILED! RETRY PUBLISH!", e );
    }
});