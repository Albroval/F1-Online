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
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {}, readyCount: 0, started: false };
        }
        rooms[roomId].players[socket.id] = { 
            id: socket.id, 
            num: Object.keys(rooms[roomId].players).length + 1,
            laps: 0 
        };
        const myNum = rooms[roomId].players[socket.id].num;
        socket.emit('assign-number', myNum);
        io.to(roomId).emit('update-lobby', {
            x: Object.keys(rooms[roomId].players).length,
            y: rooms[roomId].readyCount
        });
    });

    socket.on('player-ready', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].readyCount++;
            let total = Object.keys(rooms[roomId].players).length;
            io.to(roomId).emit('update-lobby', { x: total, y: rooms[roomId].readyCount });
            
            if (rooms[roomId].readyCount === total && total > 0) {
                rooms[roomId].started = true;
                io.to(roomId).emit('init-race');
                setTimeout(() => io.to(roomId).emit('light', 1), 1000);
                setTimeout(() => io.to(roomId).emit('light', 2), 2000);
                setTimeout(() => io.to(roomId).emit('light', 3), 3000);
                setTimeout(() => io.to(roomId).emit('light', 4), 4000);
                setTimeout(() => io.to(roomId).emit('light', 5), 5000);
                setTimeout(() => io.to(roomId).emit('start-go'), 7000);
            }
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomId).emit('player-moved', data);
    });

    socket.on('lap-completed', (data) => {
        const room = rooms[data.roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].laps++;
            io.to(data.roomId).emit('update-leaderboard', Object.values(room.players));
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            if (rooms[roomId] && rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('update-lobby', {
                    x: Object.keys(rooms[roomId].players).length,
                    y: rooms[roomId].readyCount
                });
            }
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Servidor F1 corriendo en puerto ' + PORT));
