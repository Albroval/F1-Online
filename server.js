<!DOCTYPE html>
<html>
<head>
    <title>F1 Nebula - ONLINE REAL</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { margin: 0; overflow: hidden; background: #1a5e1a; font-family: 'Arial Black', sans-serif; }
        canvas { display: block; }
        .overlay { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 200; color: white; }
        .menu-box { background: #222; padding: 30px; border: 4px solid #fbff00; border-radius: 20px; text-align: center; }
        button { padding: 15px; font-size: 18px; background: #fbff00; border: none; cursor: pointer; border-radius: 8px; margin: 10px 0; width: 100%; font-family: 'Arial Black'; }
        input { padding: 10px; font-size: 18px; width: 80%; text-align: center; border-radius: 5px; border: none; }
        #ui { position: absolute; top: 10px; left: 10px; color: white; background: rgba(0,0,0,0.8); padding: 10px; border: 2px solid #fbff00; display: none; }
    </style>
</head>
<body>

    <div id="main-menu" class="overlay">
        <h1>F1 NEBULA ONLINE</h1>
        <div class="menu-box">
            <button onclick="connect('CREATE')">CREAR GRAN PREMIO</button>
            <button onclick="showJoin()">UNIRSE A CARRERA</button>
        </div>
    </div>

    <div id="join-menu" class="overlay" style="display:none">
        <div class="menu-box">
            <h2>CÓDIGO DE SALA</h2>
            <input type="text" id="room-input" placeholder="ABCD">
            <button onclick="connect('JOIN')">ENTRAR</button>
        </div>
    </div>

    <div id="lobby-menu" class="overlay" style="display:none">
        <div class="menu-box">
            <h2>SALA: <span id="room-id-txt">---</span></h2>
            <div style="font-size:30px; margin:20px;">LISTOS: <span id="y">0</span> / <span id="x">0</span></div>
            <button id="ready-btn" onclick="sendReady()">ESTOY LISTO</button>
        </div>
    </div>

    <div id="ui">JUGADOR #<span id="my-dorsal">?</span></div>
    <canvas id="gameCanvas"></canvas>

<script>
    const socket = io();
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let roomId = "";
    let myNum = 0;
    let started = false;
    let players = {}; 
    let me = { x: 1500, y: 2400, angle: 0, speed: 0 };
    const keys = {};

    function showJoin() {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('join-menu').style.display = 'flex';
    }

    function connect(mode) {
        roomId = mode === 'CREATE' ? Math.random().toString(36).substring(2,6).toUpperCase() : document.getElementById('room-input').value.toUpperCase();
        socket.emit('join-room', roomId);
        document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
        document.getElementById('lobby-menu').style.display = 'flex';
        document.getElementById('room-id-txt').innerText = roomId;
    }

    function sendReady() {
        document.getElementById('ready-btn').style.background = "#00ff00";
        document.getElementById('ready-btn').innerText = "ESPERANDO...";
        socket.emit('player-ready', roomId);
    }

    socket.on('update-lobby', data => {
        document.getElementById('x').innerText = data.x;
        document.getElementById('y').innerText = data.y;
        if(data.y >= data.x && data.x > 0) startRace();
    });

    socket.on('assign-number', num => {
        myNum = num;
        document.getElementById('my-dorsal').innerText = num;
        me.y = 2300 + (num * 60); // Parrilla de salida
    });

    socket.on('player-moved', data => {
        players[data.id] = data;
    });

    function startRace() {
        document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
        document.getElementById('ui').style.display = 'block';
        started = true;
        resize();
        loop();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.onkeydown = e => keys[e.key.toLowerCase()] = true;
    window.onkeyup = e => keys[e.key.toLowerCase()] = false;

    function loop() {
        if(!started) return;

        // Física básica
        if(keys['w']) me.speed = Math.min(me.speed + 0.15, 7);
        else me.speed *= 0.97;

        if(keys['a']) me.angle -= 0.04;
        if(keys['d']) me.angle += 0.04;

        me.x += Math.cos(me.angle) * me.speed;
        me.y += Math.sin(me.angle) * me.speed;

        // Enviar mi posición
        socket.emit('move', { roomId, x: me.x, y: me.y, angle: me.angle, num: myNum });

        draw();
        requestAnimationFrame(loop);
    }

    function draw() {
        ctx.fillStyle = "#1a5e1a"; // Césped
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width/2 - me.x, canvas.height/2 - me.y);

        // Circuito circular
        ctx.strokeStyle = "#333"; // Asfalto
        ctx.lineWidth = 300;
        ctx.beginPath();
        ctx.arc(1500, 1500, 1000, 0, Math.PI * 2);
        ctx.stroke();

        // Línea de salida/meta
        ctx.fillStyle = "white";
        ctx.fillRect(1400, 2350, 10, 300);

        // Otros jugadores
        for(let id in players) {
            drawCar(players[id].x, players[id].y, players[id].angle, players[id].num, "#ff4444");
        }

        // Mi coche
        drawCar(me.x, me.y, me.angle, myNum, "#fbff00");

        ctx.restore();
    }

    function drawCar(x, y, angle, num, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.fillRect(-20, -12, 40, 24); // Chasis
        ctx.fillStyle = "black";
        ctx.fillRect(8, -15, 8, 30); // Alerón delantero
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText(num, -4, 4);
        ctx.restore();
    }
</script>
</body>
</html>
