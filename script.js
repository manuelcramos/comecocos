// --- Configuración ---
const gameContainer = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const cols = 20;
const rows = 15;

// Layout 1D: 1=pared, 0=punto, 3=superpunto, 2=guarida fantasmas, 4=vacio
const layout = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,3,1,0,0,0,1,0,3,0,0,0,0,1,
  1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,0,1,
  1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1,0,1,
  1,0,1,0,1,0,1,1,1,1,1,0,1,1,0,0,1,1,0,1,
  1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1,
  1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,
  1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,1,
  1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,
  1,0,1,0,1,1,1,1,1,2,2,1,1,0,1,1,1,0,1,1,
  1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1,
  1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,1,
  1,0,0,3,0,0,1,0,0,0,1,0,1,0,0,0,0,3,0,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
];

// Convierte layout 1D a matriz 2D
function createMaze() {
  let maze = [];
  for (let y = 0; y < rows; y++) {
    maze[y] = [];
    for (let x = 0; x < cols; x++) {
      maze[y][x] = layout[y * cols + x];
    }
  }
  return maze;
}

let maze = createMaze();

// Estado de Pac-Man
let pacman = {
  px: 1, // posición precisa (float)
  py: 1,
  x: 1, // posición lógica en la cuadrícula (int)
  y: 1,
  direction: { x: 0, y: 0 },
  nextDirection: { x: 0, y: 0 },
  speed: 8 // celdas por segundo
};

// Fantasmas con posición, color y velocidad (más lentos que Pac-Man)
let ghosts = [
  { x: 9, y: 10, color: 'red', scared: false, startX: 9, startY: 10, speed: 4, moveAccumulator: 0 },
  { x: 10, y: 10, color: 'pink', scared: false, startX: 10, startY: 10, speed: 4, moveAccumulator: 0 },
  { x: 9, y: 11, color: 'cyan', scared: false, startX: 9, startY: 11, speed: 4, moveAccumulator: 0 },
  { x: 10, y: 11, color: 'orange', scared: false, startX: 10, startY: 11, speed: 4, moveAccumulator: 0 }
];

let score = 0;
let lives = 3;
let level = 1;

let lastTime = 0;
let gameRunning = false;

// Actualiza HUD (puntos, vidas, nivel)
function updateHUD() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = lives;
  levelDisplay.textContent = level;
}

// Comprueba si una celda es transitable
// Fantasmas pueden entrar en guarida (2), Pac-Man no
function isWalkable(x, y, isGhost = false) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
  if (maze[y][x] === 1) return false; // pared bloquea todo
  if (!isGhost && maze[y][x] === 2) return false; // Pac-Man no entra en guarida
  return true;
}

// Fantasmas se asustan al comer superpunto
function scareGhosts() {
  ghosts.forEach(g => g.scared = true);
  setTimeout(() => {
    ghosts.forEach(g => g.scared = false);
  }, 7000);
}

// Movimiento fluido Pac-Man
function movePacman(delta) {
  // Intenta cambiar dirección si es posible
  let nextX = pacman.px + pacman.nextDirection.x * pacman.speed * delta;
  let nextY = pacman.py + pacman.nextDirection.y * pacman.speed * delta;

  if (isWalkable(Math.floor(nextX), Math.floor(nextY), false)) {
    pacman.direction = pacman.nextDirection;
  }

  // Mueve Pac-Man en dirección actual
  let newX = pacman.px + pacman.direction.x * pacman.speed * delta;
  let newY = pacman.py + pacman.direction.y * pacman.speed * delta;

  if (isWalkable(Math.floor(newX), Math.floor(newY), false)) {
    pacman.px = newX;
    pacman.py = newY;
  }

  // Actualiza posición lógica
  pacman.x = Math.floor(pacman.px);
  pacman.y = Math.floor(pacman.py);

  // Comer punto normal
  if (maze[pacman.y][pacman.x] === 0) {
    maze[pacman.y][pacman.x] = 4; // vacío
    score++;
  }
  // Comer superpunto
  else if (maze[pacman.y][pacman.x] === 3) {
    maze[pacman.y][pacman.x] = 4;
    score += 10;
    scareGhosts();
  }
}

// Movimiento fantasmas con velocidad y movimiento por acumulador de tiempo
function moveGhosts(delta) {
  ghosts.forEach(g => {
    g.moveAccumulator += delta;
    if (g.moveAccumulator < 1 / g.speed) return; // espera su tiempo de movimiento
    g.moveAccumulator = 0;

    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];
    // Filtrar direcciones válidas para el fantasma
    const validDirs = directions.filter(d => isWalkable(g.x + d.x, g.y + d.y, true));

    if (validDirs.length > 0) {
      // Movimiento simple: elige dirección que acerca a Pac-Man (búsqueda heurística)
      let bestDir = null;
      let minDist = Infinity;
      validDirs.forEach(dir => {
        const nx = g.x + dir.x;
        const ny = g.y + dir.y;
        // Distancia Manhattan a Pac-Man
        const dist = Math.abs(nx - Math.floor(pacman.px)) + Math.abs(ny - Math.floor(pacman.py));
        if (dist < minDist) {
          minDist = dist;
          bestDir = dir;
        }
      });
      if (bestDir) {
        g.x += bestDir.x;
        g.y += bestDir.y;
      }
    }
  });
}

// Comprueba colisiones Pac-Man y fantasmas
function checkCollisions() {
  ghosts.forEach(g => {
    if (Math.floor(pacman.px) === g.x && Math.floor(pacman.py) === g.y) {
      if (g.scared) {
        // Fantasma asustado es comido: vuelve a inicio y suma puntos
        g.x = g.startX;
        g.y = g.startY;
        score += 50;
      } else {
        // Fantasma normal: Pac-Man pierde vida y resetea posición
        lives--;
        if (lives <= 0) {
          alert("Game Over");
          gameRunning = false;
        } else {
          pacman.px = 1;
          pacman.py = 1;
          pacman.x = 1;
          pacman.y = 1;
          pacman.direction = { x: 0, y: 0 };
          pacman.nextDirection = { x: 0, y: 0 };
        }
      }
      updateHUD();
    }
  });
}

// Comprobar si quedan puntos o superpuntos para ganar
function checkWin() {
  const hasDots = maze.some(row => row.includes(0) || row.includes(3));
  if (!hasDots) {
    alert("¡Has ganado!");
    gameRunning = false;
  }
}

// Dibuja el tablero (paredes, puntos, superpuntos)
function drawMaze() {
  gameContainer.innerHTML = '';
  gameContainer.style.display = 'grid';
  gameContainer.style.gridTemplateColumns = `repeat(${cols}, 25px)`;
  gameContainer.style.gridTemplateRows = `repeat(${rows}, 25px)`;
  gameContainer.style.gap = '2px';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      switch (maze[y][x]) {
        case 1:
          cell.classList.add('wall');
          break;
        case 0:
          cell.classList.add('pac-dot');
          break;
        case 2:
          cell.classList.add('ghost-lair');
          break;
        case 3:
          cell.classList.add('power-pellet');
          break;
        case 4:
          cell.classList.add('empty');
          break;
      }
      gameContainer.appendChild(cell);
    }
  }
}

// Dibuja Pac-Man
function drawPacman() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(c => c.classList.remove('pacman'));
  const index = Math.floor(pacman.py) * cols + Math.floor(pacman.px);
  if (cells[index]) cells[index].classList.add('pacman');
}

// Dibuja fantasmas
function drawGhosts() {
  const cells = document.querySelectorAll('.cell');
  // Eliminar fantasmas antiguos
  cells.forEach(cell => {
    const ghostEl = cell.querySelector('.ghost');
    if (ghostEl) ghostEl.remove();
  });

  ghosts.forEach(g => {
    const index = g.y * cols + g.x;
    if (cells[index]) {
      const ghostEl = document.createElement('div');
      ghostEl.classList.add('ghost');
      ghostEl.style.backgroundColor = g.scared ? 'blue' : g.color;
      cells[index].appendChild(ghostEl);
    }
  });
}

// Bucle principal del juego
function gameLoop(timestamp = 0) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (!gameRunning) return;

  movePacman(delta);
  moveGhosts(delta);
  checkCollisions();

  drawMaze();
  drawPacman();
  drawGhosts();
  updateHUD();
  checkWin();

  requestAnimationFrame(gameLoop);
}

// Controles de teclado
document.addEventListener('keydown', e => {
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      pacman.nextDirection = { x: 0, y: -1 };
      break;
    case 'arrowdown':
    case 's':
      pacman.nextDirection = { x: 0, y: 1 };
      break;
    case 'arrowleft':
    case 'a':
      pacman.nextDirection = { x: -1, y: 0 };
      break;
    case 'arrowright':
    case 'd':
      pacman.nextDirection = { x: 1, y: 0 };
      break;
  }
});

// Crear fantasmas para reiniciar
function createGhosts() {
  return [
    { x: 9, y: 10, color: 'red', scared: false, startX: 9, startY: 10, speed: 4, moveAccumulator: 0 },
    { x: 10, y: 10, color: 'pink', scared: false, startX: 10, startY: 10, speed: 4, moveAccumulator: 0 },
    { x: 9, y: 11, color: 'cyan', scared: false, startX: 9, startY: 11, speed: 4, moveAccumulator: 0 },
    { x: 10, y: 11, color: 'orange', scared: false, startX: 10, startY: 11, speed: 4, moveAccumulator: 0 }
  ];
}

// Botones Iniciar y Reiniciar
startBtn.addEventListener('click', () => {
  if (!gameRunning) {
    maze = createMaze();
    pacman.px = 1; pacman.py = 1;
    pacman.x = 1; pacman.y = 1;
    pacman.direction = { x: 0, y: 0 };
    pacman.nextDirection = { x: 0, y: 0 };
    score = 0; lives = 3; level = 1;
    ghosts = createGhosts();
    updateHUD();
    gameRunning = true;
    gameLoop();
  }
});

resetBtn.addEventListener('click', () => {
  gameRunning = false;
  maze = createMaze();
  pacman.px = 1; pacman.py = 1;
  pacman.x = 1; pacman.y = 1;
  pacman.direction = { x: 0, y: 0 };
  pacman.nextDirection = { x: 0, y: 0 };
  score = 0; lives = 3; level = 1;
  ghosts = createGhosts();
  updateHUD();
  drawMaze();
  drawPacman();
  drawGhosts();
});


