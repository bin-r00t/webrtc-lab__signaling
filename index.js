const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const app = express();
const setup = require("./setup");

const expressServer = http.createServer(app);
const socketServer = new Server(expressServer, {
  maxHttpBufferSize: 1048576, // 默认1e6, 即1000000, 不是严格的1MB, 此处限制载荷为1MB
  cors: {
    origin: "*",
  },
});
setup(socketServer);

expressServer.listen(8000, () => {
  console.log("Server is running on port 8000");
});
