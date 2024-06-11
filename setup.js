const rooms = new Map();
// 先不管条件竞争的情况

function initRoom(roomId, socket) { 
  let room = rooms.get(roomId, null);
  if (!room) {   
    room = {
      initiator: {},
      participant: { id: socket.id },
      ready: 0
    };
  }    
  if (room.ready >= 2) return socket.disconnect();
  room.ready += 1;
  if (room.ready == 1){
    room.participant.id = socket.id;
  }
  rooms.set(roomId, room);
  if (room.ready == 2){
    room.initiator.id = socket.id;
    rooms.set(roomId, room);
    socket.emit('negotiation::start');
  }
}

function isRoomReady(roomId){
  let room = rooms.get(roomId, null);
  if (!room || room.ready != 2) {
    return false;
  }
  return true;
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    const { roomId } = socket.handshake.auth;
    console.log("socket connected", socket.id, roomId);

    socket.context = {};
    socket.context.roomId = roomId;
    socket.context.username = Math.floor(Math.random() * 10000).toString();
    initRoom(roomId, socket);
      // get room
    let room = rooms.get(roomId);
    console.log("room ==> ", room);
    if (room.ready == 2) {
      console.log('start negotiation...');
    } else if (room.ready < 2) {
      console.log("waiting participant...");
    } else {
      console.log('***** closed socket *****');
      return;
    }

    // 通知服务器，一个客户端已就绪
    socket.on('ready', () => {
      console.log('ready ... ', socket.id);
      initRoom(socket.context.roomId, socket);
    })

    socket.on('disconnect', () => {
      let room = rooms.get(roomId);
      if (!room.participant.id && !room.initiator.id){
        room.participant = {};
        room.initiator = {};  
        room.ready = room.ready > 0 ? room.ready - 1 : 0;  
      } else {
        const participantId = room.participant.id;
        const initiatorId = room.initiator.id;
        room.participant = {};
        room.initiator = {};  
        room.ready = room.ready > 0 ? room.ready - 1 : 0;  
        if (socket.id !== participantId && participantId) {
          room.participant.id = participantId
          io.to(participantId).emit('waiting');
        } 
        if (socket.id !== initiatorId && initiatorId) {
          room.participant.id = initiatorId
          io.to(initiatorId).emit('waiting');
        }
      }

      rooms.set(roomId, room);
      console.log('disconnect ... ', socket.id, room );      
    })

    socket.on("user:setName", name =>{
      console.log("set name ", socket.id, name);
      socket.context.username = name;
    });

    socket.on("offer", offer => {
      if (isRoomReady(socket.context.roomId)) {
        console.log("send offer ", socket.id);
        // continue
        let room = rooms.get(socket.context.roomId, null);
        room.initiator.id = socket.id;
        room.initiator.offer = offer;
        rooms.set(socket.context.roomId, room);
        io.to(room.participant.id).emit('offer', offer);
        return;
      }
      socket.emit('waiting');
      // after emit waiting
      // client will send back an 'ready' to trigger initRoom()
    });

    socket.on("answer", answer => {
      console.log("send answer ", socket.id);
      if (isRoomReady(socket.context.roomId)) {
        // continue
        let room = rooms.get(socket.context.roomId, null);
        room.participant.answer = answer;
        rooms.set(socket.context.roomId, room);
        io.to(room.initiator.id).emit('answer', answer);
        return;
      }
      socket.emit('waiting');
    });

    socket.on("candidate::initiator", candidate => {
      console.log("candidate::initiator ", socket.id);
      if (isRoomReady(socket.context.roomId)) {
        let room = rooms.get(socket.context.roomId, null);
        room.initiator.candidates = room.initiator.candidates ?? [];
        room.initiator.candidates.push(candidate);
        return;
      }
      socket.emit('waiting');
    })

    socket.on("candidate::participant", candidate => {
      console.log("candidate::participant ", socket.id);
      if (isRoomReady(socket.context.roomId)) {
        let room = rooms.get(socket.context.roomId, null);
        room.participant.candidates = room.participant.candidates ?? [];
        room.participant.candidates.push(candidate);
        return;
      }
      socket.emit('waiting');
    })

    // more listeners


    // room check
   //  let room = rooms.get(roomId, null);
   //  if (!room) {
   //    rooms.set(roomId, { initiator: null, participant: null });
   //    socket.emit('cmd::initiator');
   //  } else {
   //   !room.initiator ? socket.emit('cmd::initiator') : socket.emit('cmd::participant');
   // }
  });
};

