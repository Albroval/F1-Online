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
            rooms[roomId] = { players: [], readyCount: 0 };
        }
        rooms[roomId].players.push(socket.id);
        
        const playerNumber = rooms[roomId].players.length;
        socket.emit('assign-number', playerNumber);
        
        io.to(roomId).emit('update-lobby', {
            x: rooms[roomId].players.length,
            y: rooms[roomId].readyCount
        });
    });

    socket.on('player-ready', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].readyCount++;
            io.to(roomId).emit('update-lobby', {
                x: rooms[roomId].players.length,
                y: rooms[roomId].readyCount
            });
        }
    });

    socket.on('move', (data) => {
        socket.to(data.roomId).emit('player-moved', {
            id: socket.id,
            x: data.x,
            y: data.y,
            angle: data.angle,
            num: data.num
        });
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            if (rooms[roomId]) {
                rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
                if (rooms[roomId].readyCount > 0) rooms[roomId].readyCount--;
                io.to(roomId).emit('update-lobby', {
                    x: rooms[roomId].players.length,
                    y: rooms[roomId].readyCount
                });
            }
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log('Servidor corriendo en puerto ' + PORT);
});
