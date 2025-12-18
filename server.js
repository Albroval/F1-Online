const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = { players: {}, readyCount: 0, started: false };
        
        rooms[roomId].players[socket.id] = { 
            id: socket.id, 
            num: Object.keys(rooms[roomId].players).length + 1,
            laps: 0 
        };
        
        socket.emit('assign-number', rooms[roomId].players[socket.id].num);
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
            
            if (rooms[roomId].readyCount >= total && total > 0) {
                rooms[roomId].started = true;
                io.to(roomId).emit('init-race');
                [1,2,3,4,5].forEach(n => setTimeout(() => io.to(roomId).emit('light', n), n * 1000));
                setTimeout(() => io.to(roomId).emit('start-go'), 6000);
            }
        }
    });

    socket.on('move', (data) => {
        if (data.roomId) socket.to(data.roomId).emit('player-moved', data);
    });

    socket.on('lap-completed', (data) => {
        if (rooms[data.roomId] && rooms[data.roomId].players[socket.id]) {
            rooms[data.roomId].players[socket.id].laps++;
            io.to(data.roomId).emit('update-leaderboard', Object.values(rooms[data.roomId].players));
        }
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('update-lobby', {
                    x: Object.keys(rooms[roomId].players).length,
                    y: rooms[roomId].readyCount
                });
            }
        }
    });
});

server.listen(process.env.PORT || 10000);
