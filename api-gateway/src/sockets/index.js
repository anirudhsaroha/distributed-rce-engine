const { Server } = require('socket.io');

let io;

function initSockets(server, submitQueue) {
  io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // allow client to join rooms for submission progress
    socket.on('subscribe', (submissionId) => {
      socket.join(`submission:${submissionId}`);
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });

  // admin namespace
  const admin = io.of('/admin');
  admin.on('connection', (socket) => {
    console.log('admin connected', socket.id);
  });
}

function publishSubmissionUpdate(submissionId, payload) {
  if (!io) return;
  io.to(`submission:${submissionId}`).emit('submission.update', payload);
}

function publishAdmin(event, payload) {
  if (!io) return;
  const admin = io.of('/admin');
  admin.emit(event, payload);
}

module.exports = { initSockets, publishSubmissionUpdate, publishAdmin };
