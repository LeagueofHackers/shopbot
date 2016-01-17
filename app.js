var express = require('express');
var bodyParser = require('body-parser');
var path    = require("path");
var url = require('url');

var app = express();
var port = process.env.PORT || 8888;
var hellobot = require('./hellobot');

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// test router
app.get('/appinstall', function (req, res) {
    var url_parts = url.parse(req.url, true);
    var code = url_parts.query.code;
    if(typeof code != "undefined") {
        res.send("Success installed in your channel");
        res.redirect('https://slack.com/');
    }
});

app.get('/', function(req,res) {
    res.send("Worked");
});
app.post('/', hellobot);
app.get('/install', function (req, res) { res.sendFile(path.join(__dirname+'/install.html')); });

// error handler
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(400).send(err.message);
});

app.listen(port, function () {
    console.log('Slack bot listening on port ' + port);
});