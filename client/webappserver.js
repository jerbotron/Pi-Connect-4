// Author: Max McCord
// Date:   Dec 12, 2015

var port = process.argv[2] || 80;

var fs      = require('fs');
var express = require('express');

var app = express();
app.use(express.static('public', { index: false })); // serve public directory; don't auto-serve index.html

app.get('/', function (req, res) {
   fs.readFile('html/controller.html', function (err, data) {
      if (err) return res.status(500).send('An internal error occured.');
      res.send(data.toString());
   });
});

var server = app.listen(port, function () {
   console.log('listening on port ' + port + '...');
});
