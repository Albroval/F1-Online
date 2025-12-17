const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos (index.html)
app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = { 
                players: {}, 
                readyCount: 0, 
                started: false 
            };
        }

        // Asignar datos iniciales al jugador
        rooms[roomId].players[socket.id] = { 
            id: socket.id, 
            num: Object.keys(rooms[roomId].players).length + 1,
            laps: 0 
        };
        
        const myNum = rooms[roomId].players[socket.id].num;
        socket.emit('assign-number', myNum);
        
        // Notificar a todos en la sala cuántos hay
        io.to(roomId).emit('update-lobby', {
            x: Object.keys(rooms[roomId].players).length,
            y: rooms[roomId].readyCount
        });
    });

    socket.on('player-ready', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].readyCount++;
            let totalPlayers = Object.keys(rooms[roomId].players).length;
            
            io.to(roomId).emit('update-lobby', { 
                x: totalPlayers, 
                y: rooms[roomId].readyCount 
            });
            
            // Si todos están listos, arranca la secuencia de salida
            if (rooms[roomId].readyCount === totalPlayers && totalPlayers > 0) {
                rooms[roomId].started = true;
                io.to(roomId).emit('init-race');
                
                // Secuencia del semáforo de F1 (1 seg entre luces)
                setTimeout(() => io.to(roomId).emit('light', 1), 1000);
                setTimeout(() => io.to(roomId).emit('light', 2), 2000);
                setTimeout(() => io.to(roomId).emit('light', 3), 3000);
                setTimeout(() => io.to(roomId).emit('light', 4), 4000);
                setTimeout(() => io.to(roomId).emit('light', 5), 5000);
                // Se apagan y empieza la carrera a los 7 segundos
                setTimeout(() => io.to(roomId).emit('start-go'), 7000);
            }
        }
    });

    // Reenviar movimientos a los demás pilotos
    socket.on('move', (data) => {
        socket.to(data.roomId).emit('player-moved', data);
    });

    // Gestión de vueltas completadas
    socket.on('lap-completed', (data) => {
        const room = rooms[data.roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].laps++;
            
            // Enviar lista actualizada para la tabla de clasificación
            io.to(data.roomId).emit('update-leaderboard', Object.values(room.players));
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            if (rooms[roomId]) {
                delete rooms[roomId].players[socket.id];
                if (rooms[roomId].readyCount > 0) rooms[roomId].readyCount--;
                
                io.to(roomId).emit('update-lobby', {
                    x: Object.keys(rooms[roomId].players).length,
                    y: rooms[roomId].readyCount
                });
            }
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log('Servidor F1 NEBULA corriendo en puerto ' + PORT);
});
