//------------------------------------------------------------------------------
//old http--------------------------
//var express = require('express');
//var app = express();
//var http = require('http').createServer(app).listen(process.env.PORT || 3000);
//var io = require('socket.io').listen(http);

//---------------------
//---HTTPS-TODO--------
//---------------------

var express = require('express');
var https = require('https');
var fs = require('fs');

var options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
};

var app = express();

server = https.createServer(options, app).listen(process.env.PORT);

////initilization for http redirection
//var http = require('http');

////redirecting to https
//http.createServer(function (req, res) {
//    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//    res.end();
//}).listen(process.env.PORT || 80);

var io = require('socket.io').listen(server);

console.log('Server is listening...');


var SocketIOFile = require('socket.io-file');
var ss = require('socket.io-stream');

const fetch = require("node-fetch");

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


//----------------------
//connection to cloudant
const Cloudant = require('cloudant/cloudant');

const vcap = require('./vcap-local.json');

function dbCloudantConnect() {
    return new Promise((resolve, reject) => {
        Cloudant({  // eslint-disable-line
            url: vcap.services.cloudantNoSQLDB.credentials.url
        }, ((err, cloudant) => {
            if (err) {
                logger.error('Connect failure: ' + err.message + ' for Cloudant DB: ' +
                    appSettings.cloudant_db_name);
                reject(err);
            } else {
                let db = cloudant.use(appSettings.cloudant_db_name);
                logger.info('Connect success! Connected to DB: ' + appSettings.cloudant_db_name);
                resolve(db);
            }
        }));
    });
}


users = [];
connections = [];

app.get('/', function (req, res) {
    return res.sendFile(__dirname + '/index.html');
});

app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

//app.get('/socket.io.js', (req, res, next) => {
//    res.set('Content-Type', 'text/html');
//    return res.sendFile(__dirname + '/node_modules/socket.io/socket.io.js');
//});

//app.use('/node_modules/socket.io', express.static(__dirname + '/node_modules/socket.io'));

app.use('/css', express.static(__dirname + '/css'));

ss(io).on('filedownload', function (stream, name, callback) {

    // file search Todo
    callback({
        name: "filename",
        size: 500
    });

    var MyFileStream = fs.createReadStream(name);
    MyFileStream.pipe(stream);

});


io.sockets.on('connection', function (socket) {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    //new user connects, message to every connected client and usernames are updated
    socket.on('new user', function (data, callback) {
        callback(true);
        socket.username = data;
        users.push(socket.username);
        updateUsernames();
        io.sockets.emit('user connects', { user: socket.username });
        //every new user joins his 'private' room
        socket.join(socket.username);
    });

    //user disconnects, message to every user and usernames are updated 
    socket.on('disconnect', function (data) {
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected : %s sockets connected', connections.length);
        io.sockets.emit('user disconnects', { user: socket.username });
    });

    //send message to every selected user 
    socket.on('send message', function (data, highlightedUsers) {

        var originalMessage = data;
        var url = "https://eu-de.functions.cloud.ibm.com/api/v1/web/Alexander.Bartuli%40Student.Reutlingen-University.DE_dev/hrt-demo/identify-and-translate/?text=" + data;


        const getData = async url => {
            try {
   
                const response = await fetch(url);
                const json = await response.json();
                console.log(json);
                console.log(json.translations);
                data = json.translations;
                console.log("Message : " + data);
                var x = highlightedUsers;
                console.log("highlighted User: " + x);
                if (highlightedUsers == null) {
                    io.sockets.emit('new message', { msg: data, user: socket.username });
                } else {
                    for (var i = 0; i < x.length; i++) {
                        io.sockets.in(x[i]).emit('new message', { msg: data + " (This message is only visible for the following users: " + x + ")", user: socket.username });
                    }
                }
            } catch (error) {
                console.log(error);
            }
        };
        getData(url);
    });

    //Server is offering the download to every selected User
    socket.on('fetch file', function (data, highlightedUsers) {
        console.log(data);
        var x = highlightedUsers;
        console.log(x);
        if (highlightedUsers == null) {
            io.sockets.emit('fetch file', { msg: data, user: socket.username });
        } else {
            for (var i = 0; i < x.length; i++) {
                io.sockets.in(x[i]).emit('fetch file', { msg: data + " (This download is only visible for the following users: " + x + ")", user: socket.username });
            }
        }
    });

    //updates the usernames
    function updateUsernames() {
        io.sockets.emit('get users', users);
    }

    // Uploader for File Transfer
    var uploader = new SocketIOFile(socket, {
        // uploadDir: {			// multiple directories
        // 	music: 'data/music',
        // 	document: 'data/document'
        // },
        uploadDir: 'data',
        accepts: ['audio/mpeg', 'audio/mp3'],
        maxFileSize: 4194304,
        chunkSize: 10240,
        transmissionDelay: 0,
        overwrite: true
    });
    uploader.on('start', (fileInfo) => {
        console.log('Start uploading');
        console.log(fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete.');
        console.log(fileInfo);
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });
});
