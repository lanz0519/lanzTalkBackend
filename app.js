const express = require('express');
var fs = require('fs');
const { PeerServer } = require('peer');
var https = require('https')
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');
const PORT = 4001

const app = express();

var options = {
  //webrtc要求SSL安全传输,所以要设置证书
  key: fs.readFileSync('./key/127.0.0.1-key.pem'),
  cert: fs.readFileSync('./key/127.0.0.1.pem')
}

var server = PeerServer({
  port: 9000,
  // ssl: options,
  path:"/"
});

// var httpsServer = https.createServer(options, app);

const api = new ParseServer({
  databaseURI: 'postgres://postgres:lanz@www.lanzyy.com:5432/lanzTalk',
  cloud: './cloud/main.js',
  appId: 'lanz-talk001',
  masterKey: 'lanz-talk',
  serverURL: 'http://localhost:4001/parse'
});

const dash = new ParseDashboard({
  'apps': [{
      "serverURL": "http://localhost:4001/parse",
      "appId": "lanz-talk001",
      "masterKey": "lanz-talk",
      "appName": "lanz-talk"
  }]
})

// Serve the Parse API on the /parse URL prefix
app.use('/talk', api);
app.use('/dashboard', dash);

app.listen(PORT, () => console.log('服务器启动成功监听端口：', PORT))

// httpsServer.listen(5000, () => console.log('服务器启动成功监听端口：', 5000))