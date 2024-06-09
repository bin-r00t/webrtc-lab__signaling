let rooms = [];

module.exports = function (io) {
  io.on("connection", (socket) => {
    const { roomId, username } = socket.handshake.auth;
    console.log("socket connected", socket.id, roomId, username);
    if (
      rooms.includes(roomId) &&
      io.sockets.adapter.rooms.get(roomId).size >= 2
    ) {
      socket.emit("room-full");
      socket.disconnect();
      return;
    }

    socket.join(roomId);
    // events
    socket.on("offer", (offer) => {
      // get room users length
      const room = io.sockets.adapter.rooms.get(roomId);
      const roomSize = room ? room.size : 0;
      console.log("roomSize", roomSize);
      if (roomSize < 2) {
        socket.to(roomId).emit("offer", offer);
      } else {
        socket.emit("roomFull");
      }

      //   socket.to(roomId).emit("offer", offer);
    });
  });
};
