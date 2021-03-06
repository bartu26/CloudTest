//------------------------------------------------------------------------------
//old http--------------------------
var express = require('express');
var app = express();
var http = require('http').createServer(app).listen(process.env.PORT || 3000);
var io = require('socket.io').listen(http);

var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
//var fs = require('fs');

var visualRecognition = new VisualRecognitionV3({
    version: '2018-03-19',
    iam_apikey: '7cLYSh-2k8-pS0K7omgfaQIb_i1smKrBme3Omv3Nr_Kh'
});

var url = 'https://watson-developer-cloud.github.io/doc-tutorial-downloads/visual-recognition/640px-IBM_VGA_90X8941_on_PS55.jpg';

var params = {
        url: url,
};

//const csp = require('express-csp-header');
//app.use(csp({
//    policies: {
//        //'default-src': [csp.SELF, 'https://silly-bose.eu-de.mybluemix.net/'],
//        'script-src': [csp.SELF, 'https://silly-bose.eu-de.mybluemix.net/', 'https://code.jquery.com/jquery-latest.min.js', '/socket.io-file-client.js' , '/socket.io/socket.io.js'],
//        //'style-src': [csp.SELF,'https://silly-bose.eu-de.mybluemix.net/'],
//        //'worker-src': [csp.SELF,'https://silly-bose.eu-de.mybluemix.net/'],
//        //'block-all-mixed-content': true
//    }
//}));



// Strict-Transport-Security: max-age: 15552000; includeSubDomains

//---------------------
//---HTTPS-TODO--------
//---------------------
//var fs = require('fs');
//var http = require('http');
//var https = require('https');

//ssl credentials for https
//var options = {
//    key: fs.readFileSync('key.pem', 'utf8'),
//    cert: fs.readFileSync('key-cert.pem', 'utf8'),
//    secure: true,
//    reconnect: true,
//    rejectUnauthorized: false
//};

//var express = require('express');
//var app = express();

//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(options, app)

//httpServer.listen(process.env.PORT || 80);
//httpsServer.listen(process.env.PORT || 8080);

//var io = require('socket.io').listen(httpsServer);


////initilization for http redirection
//var http = require('http');

////redirecting to https
//http.createServer(function (req, res) {
//    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//    res.end();
//}).listen(process.env.PORT || 80);

console.log('Server is listening...');

//---------------------------
//initializing of node modules
var SocketIOFile = require('socket.io-file');
var ss = require('socket.io-stream');
var fetch = require("node-fetch");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

//const csp = require(`helmet-csp`);

//const hsts = require('hsts');

//const helmet = require('helmet')


//----------------------
//connection to cloudant
var Cloudant = require('cloudant/cloudant');

var vcap = require('./vcap-local.json');

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
                var db = cloudant.use(appSettings.cloudant_db_name);
                logger.info('Connect success! Connected to DB: ' + appSettings.cloudant_db_name);
                resolve(db);
            }
        }));
    });
}

//let db;

//// Initialize the DB when this module is loaded
//(function getDbConnection() {
//    logger.info('Initializing Cloudant connection...', 'items-dao-cloudant.getDbConnection()');
//    utils.dbCloudantConnect().then((database) => {
//        logger.info('Cloudant connection initialized.', 'items-dao-cloudant.getDbConnection()');
//        db = database;
//    }).catch((err) => {
//        logger.error('Error while initializing DB: ' + err.message, 'items-dao-cloudant.getDbConnection()');
//        throw err;
//    });
//})();


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

//app.use(helmet.frameguard());

app.use(function (req, res, next) {
    res.setHeader("Content-Security-Policy", "script-src 'self' https://silly-bose.eu-de.mybluemix.net/");
    return next();
});


//app.use(csp({
//    directives: {
//        defaultSrc: ["'self'", 'default.com'],
//        scriptSrc: ["'self'", "'unsafe-inline'"],
//        styleSrc: ['style.com'],
//        fontSrc: ["'self'", 'fonts.com'],
//        imgSrc: ['img.com', 'data:'],
//        sandbox: ['allow-forms', 'allow-scripts'],
//        reportUri: '/report-violation',
//        objectSrc: ["'none'"],
//        upgradeInsecureRequests: true,
//        workerSrc: false  // This is not set.
//    }
//}))

//const hstsMiddleware = hsts({
//    maxAge: 1234000
//})

//app.use((req, res, next) => {
//    if (req.secure) {
//        hstsMiddleware(req, res, next)
//    } else {
//        next()
//    }
//})

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

    //user attempts a login
    socket.on('user login', function (username, callback) {
        if (true) { //TODO--hier db abfragen ob user bereits registriert
            socket.username = username;
            users.push(socket.username);
            //update usernames
            updateUsernames();
            //notification to every other user logged in
            io.sockets.emit('user connects', { user: socket.username });
            //every new user joins his 'private' room
            socket.join(socket.username);
            callback(true);
        } else {
            callback(false);
        }      
    });


    //Server �berpr�ft ob auf dem Bild ein Gesicht zu sehen ist 
    socket.on('CheckProfilePicture', function (ProfilePicture, callback) {
        visualRecognition.classify(param, function (err, response) {
            if (err) {
                console.log(err);
                callback(false);
            } else
            {
                console.log(JSON.stringify(response, null, 2));
                callback(true);
            }
        });    
    });


    //new user attempts a registration
    socket.on('user registration', function (username, pwd, email, callback) {
        if (true) {  //TODO--hier db abfragen ob user bereits registriert
            //TODO--daten in db speichern
            callback(true);
        } else {
            callback(false);
        }     
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
    socket.on('send message', function (message, highlightedUsers) {
        var url = "https://eu-de.functions.cloud.ibm.com/api/v1/web/Alexander.Bartuli%40Student.Reutlingen-University.DE_dev/hrt-demo/identify-and-translate/?text=" + message;
        var getData = async url => {
            try {
                var response = await fetch(url);
                var json = await response.json();
                console.log(json);
                console.log(json.translations);
                message = json.translations;
                console.log("Message : " + message);
                var x = highlightedUsers;
                console.log("highlighted User: " + x);
                if (highlightedUsers == null) {
                    io.sockets.emit('new message', { msg: message, user: socket.username });
                } else {
                    for (var i = 0; i < x.length; i++) {
                        io.sockets.in(x[i]).emit('new message', { msg: message + " (This message is only visible for the following users: " + x + ")", user: socket.username });
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
