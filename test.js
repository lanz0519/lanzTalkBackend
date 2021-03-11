const express = require('express');
var fs = require('fs');
const { PeerServer } = require('peer');
var https = require('https')
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');
const PORT = 4001

const app = express();

// const api = new ParseServer({
//   databaseURI: 'postgres://postgres:lanz@localhost:5432/lanz-talk',
//   cloud: './cloud/main.js',
//   appId: 'lanz-talk001',
//   masterKey: 'lanz-talk',
//   serverURL: 'http://localhost:4001/parse'
// });

const dash = new ParseDashboard({
  'apps': [{
      serverURL: "http://localhost:1234/summer/api/v1/",
			appId: "summer",
			readOnlyMasterKey: "summer-sasdff23ss@",
			masterKey: "late-summer",
			javascriptKey: "",
			appName: "夏末",
  }]
})

// Serve the Parse API on the /parse URL prefix
// app.use('/parse', api);
app.use('/dashboard', dash);

app.listen(PORT, () => console.log('服务器启动成功监听端口：', PORT))

// httpsServer.listen(5000, () => console.log('服务器启动成功监听端口：', 5000))