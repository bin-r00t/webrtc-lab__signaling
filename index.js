const https = require("https");
const fs = require("fs");
const express = require("express");
const { Server } = require("socket.io");
const app = express();
const setup = require("./setup");

const expressServer = https.createServer({
  key: fs.readFileSync("./certs/private.key"),
  cert: fs.readFileSync("./certs/cert.pem"),
  passphrase: '06092024hz'
}, app);
const socketServer = new Server(expressServer, {
  maxHttpBufferSize: 1048576, // 默认1e6, 即1000000, 不是严格的1MB, 此处限制载荷为1MB
  cors: {
    origin: "*",
  },
});
setup(socketServer);

expressServer.listen(8000, "0.0.0.0", () => {
  console.log("Server is running on port 8000");
});
