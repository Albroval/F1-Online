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
            rooms[roomId] = { players: {} };
        }
        
        // Creamos al jugador con estado "ready: false"
        const pNum = Object.keys(rooms[roomId].players).length + 1;
        rooms[roomId].players[socket.id] = { 
            id: socket.id, 
            num: pNum, 
            laps: 0, 
            ready: false 
        };
        
        socket.emit('init-player', { num: pNum, room: roomId });
        broadcastLobbyUpdate(roomId);
    });

    socket.on('toggle-ready', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players[socket.id]) {
            // Cambiamos el estado
            rooms[roomId].players[socket.id].ready = !rooms[roomId].players[socket.id].ready;
            
            const playersArray = Object.values(rooms[roomId].players);
            const readyCount = playersArray.filter(p => p.ready).length;
            const totalPlayers = playersArray.length;

            broadcastLobbyUpdate(roomId);

            // SI TODOS ESTÁN LISTOS (y hay al menos 1 jugador)
            if (readyCount === totalPlayers && totalPlayers > 0) {
                io.to(roomId).emit('begin-countdown');
            }
        }
    });

    socket.on('update-me', (data) => {
        if (data.room && rooms[data.room]) {
            socket.to(data.room).emit('player-moved', data);
        }
    });

    socket.on('sync-laps', (data) => {
        if (data.room && rooms[data.room] && rooms[data.room].players[socket.id]) {
            rooms[data.room].players[socket.id].laps = data.laps;
            io.to(data.room).emit('update-table', Object.values(rooms[data.room].players));
        }
    });

    socket.on('disconnect', () => {
        for (let r in rooms) {
            if (rooms[r].players[socket.id]) {
                delete rooms[r].players[socket.id];
                broadcastLobbyUpdate(r);
                io.to(r).emit('update-table', Object.values(rooms[r].players));
                if (Object.keys(rooms[r].players).length === 0) delete rooms[r];
            }
        }
    });

    function broadcastLobbyUpdate(roomId) {
        if (rooms[roomId]) {
            const playersArray = Object.values(rooms[roomId].players);
            io.to(roomId).emit('lobby-update', {
                playersInRoom: playersArray.length,
                readyCount: playersArray.filter(p => p.ready).length
            });
        }
    }
});

server.listen(process.env.PORT || 10000);
