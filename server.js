const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname)); // Sirve tu HTML

let rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [], readyCount: 0 };
        }
        
        // Asignar número basado en orden de llegada (X)
        const playerNumber = rooms[roomId].players.length + 1;
        rooms[roomId].players.push({ id: socket.id, ready: false, number: playerNumber });

        // Enviar a todos la actualización X
        io.to(roomId).emit('update-lobby', {
            x: rooms[roomId].players.length,
            y: rooms[roomId].readyCount
        });

        // Decirle al jugador qué número es
        socket.emit('assign-number', playerNumber);
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

    socket.on('disconnecting', () => {
        // Lógica para restar X si alguien se va (opcional para empezar)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));