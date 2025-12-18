const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = { players: {}, started: false };
        
        // Asignar número de dorsal basado en orden de llegada
        const pNum = Object.keys(rooms[roomId].players).length + 1;
        rooms[roomId].players[socket.id] = { id: socket.id, num: pNum, x: 1200, y: 1000, angle: 0, laps: 0 };
        
        socket.emit('init-player', { num: pNum, room: roomId });
        io.to(roomId).emit('update-table', Object.values(rooms[roomId].players));
    });

    socket.on('update-me', (data) => {
        if (rooms[data.room] && rooms[data.room].players[socket.id]) {
            Object.assign(rooms[data.room].players[socket.id], data);
            socket.to(data.room).emit('player-moved', rooms[data.room].players[socket.id]);
        }
    });

    socket.on('sync-laps', (data) => {
        if (rooms[data.room] && rooms[data.room].players[socket.id]) {
            rooms[data.room].players[socket.id].laps = data.laps;
            io.to(data.room).emit('update-table', Object.values(rooms[data.room].players));
        }
    });

    socket.on('start-request', (roomId) => {
        io.to(roomId).emit('begin-countdown');
    });

    socket.on('disconnect', () => {
        for (let r in rooms) {
            if (rooms[r].players[socket.id]) {
                delete rooms[r].players[socket.id];
                io.to(r).emit('update-table', Object.values(rooms[r].players));
            }
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
