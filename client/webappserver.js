// Author: Jeremy Wang

var express = require('express');
var fs      = require('fs');

var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 80;

app.use(express.static('public', { index: false })); // serve public directory; don't auto-serve index.html

app.get('/', function (req, res) {
   fs.readFile('html/controller.html', function (err, data) {
      if (err) return res.status(500).send('An internal error occured.');
      res.send(data.toString());
   });
});

// replace 5000 with port number when deploying
server.listen(5000, function () {
   console.log('listening on port: ' + 5000 + '...');
});
