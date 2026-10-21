const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const powerSlider = document.getElementById('powerSlider');
const powerValue = document.getElementById('powerValue');
const shootBtn = document.getElementById('shootBtn');
const newGameBtn = document.getElementById('newGameBtn');
const turnLabel = document.getElementById('turn-label');
const messageBox = document.getElementById('message');
const player1Panel = document.getElementById('player1-panel');
const player2Panel = document.getElementById('player2-panel');
const player1Group = document.getElementById('player1-group');
const player2Group = document.getElementById('player2-group');

const table = {
  x: 70,
  y: 60,
  width: canvas.width - 140,
  height: canvas.height - 120,
  pocketRadius: 24
};

const balls = [];
const players = [
  { id: 1, name: 'Jogador 1', group: null },
  { id: 2, name: 'Jogador 2', group: null }
];

const ballColors = {
  1: '#f6f6f6',
  2: '#f0c100',
  3: '#ef5d35',
  4: '#1c49f5',
  5: '#8a2d18',
  6: '#f7a6b8',
  7: '#1f1b1c',
  8: '#1a1a1a',
  9: '#f3f3f3',
  10: '#f9d52f',
  11: '#f17c4d',
  12: '#5065eb',
  13: '#9c3d2b',
  14: '#f5a6b7',
  15: '#3a3a3a'
};

let currentPlayer = 0;
let shotInProgress = false;
let gameOver = false;
let mouse = { x: canvas.width / 2, y: canvas.height / 2, inside: false };
let aimAngle = -Math.PI / 2;
let pocketedThisShot = [];
let powerReady = false;
let cueBallWasPocketed = false;

function createBall(number, x, y, isCue = false) {
  return {
    number,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 12,
    color: isCue ? '#f5f5f5' : ballColors[number],
    type: isCue ? 'cue' : number === 8 ? '8' : number >= 1 && number <= 7 ? 'solids' : 'stripes',
    pocketed: false,
    isCue
  };
}

function getCueBall() {
  return balls.find((ball) => ball.isCue);
}

function setMessage(text) {
  messageBox.textContent = text;
}

function resetGame() {
  balls.length = 0;
  players[0].group = null;
  players[1].group = null;
  currentPlayer = 0;
  shotInProgress = false;
  gameOver = false;
  pocketedThisShot = [];
  powerReady = false;
  cueBallWasPocketed = false;
  setMessage('Mova o mouse sobre a mesa para mirar e ajuste a potência antes do tiro.');

  const rackOriginX = table.x + table.width * 0.27;
  const rackOriginY = table.y + table.height / 2;
  const spacing = 24;
  const rack = [1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15, 8];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const index = row * (row + 1) / 2 + col;
      const ballNumber = rack[index];
      const x = rackOriginX + row * spacing;
      const y = rackOriginY + (col - row / 2) * spacing;
      balls.push(createBall(ballNumber, x, y));
    }
  }

  const cueBall = createBall(0, table.x + table.width * 0.72, table.y + table.height / 2, true);
  cueBall.type = 'cue';
  balls.push(cueBall);

  updateHud();
}

function updateHud() {
  powerValue.textContent = `${powerSlider.value}%`;
  turnLabel.textContent = `Vez de: ${players[currentPlayer].name}`;
  player1Panel.classList.toggle('active', currentPlayer === 0 && !gameOver);
  player2Panel.classList.toggle('active', currentPlayer === 1 && !gameOver);
  player1Group.textContent = `Grupo: ${players[0].group || '—'}`;
  player2Group.textContent = `Grupo: ${players[1].group || '—'}`;
}

function getPocketPositions() {
  return [
    { x: table.x, y: table.y },
    { x: table.x + table.width / 2, y: table.y },
    { x: table.x + table.width, y: table.y },
    { x: table.x, y: table.y + table.height },
    { x: table.x + table.width / 2, y: table.y + table.height },
    { x: table.x + table.width, y: table.y + table.height }
  ];
}

function isPointInsidePocket(x, y) {
  return getPocketPositions().some((pocket) => Math.hypot(x - pocket.x, y - pocket.y) < table.pocketRadius);
}

function setCueBallAtStart() {
  const cue = getCueBall();
  cue.x = table.x + table.width * 0.72;
  cue.y = table.y + table.height / 2;
  cue.vx = 0;
  cue.vy = 0;
  cue.pocketed = false;
}

function assignGroupForBall(ball) {
  if (!ball || ball.number === 8 || ball.isCue || players[0].group && players[1].group) return;

  const current = players[currentPlayer];
  const opponent = players[1 - currentPlayer];
  if (ball.number >= 1 && ball.number <= 7) {
    current.group = 'solids';
    opponent.group = 'stripes';
  } else if (ball.number >= 9 && ball.number <= 15) {
    current.group = 'stripes';
    opponent.group = 'solids';
  }

  updateHud();
}

function ballGroup(ball) {
  if (!ball || ball.isCue || ball.number === 8) return null;
  return ball.number >= 1 && ball.number <= 7 ? 'solids' : 'stripes';
}

function handleShotResolution() {
  if (gameOver) return;

  const current = players[currentPlayer];
  const opponent = players[1 - currentPlayer];
  const cue = getCueBall();
  const sunkEight = pocketedThisShot.some((ball) => ball.number === 8);

  if (sunkEight) {
    const playerHasRemaining = balls.some((ball) => !ball.isCue && !ball.pocketed && ball.number !== 8 && ballGroup(ball) === current.group);
    if (playerHasRemaining) {
      setMessage(`${current.name} perdeu! Bola 8 encaçapada antes de limpar o grupo.`);
    } else {
      setMessage(`${current.name} venceu! Bola 8 encaçapada corretamente.`);
    }
    gameOver = true;
    updateHud();
    return;
  }

  if (cue.pocketed) {
    setMessage(`${current.name} cometeu scratch. ${opponent.name} joga agora.`);
    currentPlayer = 1 - currentPlayer;
    setCueBallAtStart();
    pocketedThisShot = [];
    shotInProgress = false;
    powerReady = false;
    updateHud();
    return;
  }

  if (pocketedThisShot.length > 0 && !players[0].group && !players[1].group) {
    const firstBall = pocketedThisShot.find((ball) => !ball.isCue && ball.number !== 8);
    if (firstBall) {
      assignGroupForBall(firstBall);
      setMessage(`${current.name} definiu o grupo ${current.group}.`);
      pocketedThisShot = [];
      shotInProgress = false;
      powerReady = false;
      updateHud();
      return;
    }
  }

  if (pocketedThisShot.length > 0 && players[currentPlayer].group) {
    const validPocket = pocketedThisShot.some((ball) => !ball.isCue && ball.number !== 8 && ballGroup(ball) === players[currentPlayer].group);
    if (validPocket) {
      setMessage(`${current.name} encaçapou no grupo correto e continua.`);
      pocketedThisShot = [];
      shotInProgress = false;
      powerReady = false;
      updateHud();
      return;
    }

    const opponentPocket = pocketedThisShot.some((ball) => !ball.isCue && ball.number !== 8 && ballGroup(ball) !== players[currentPlayer].group);
    if (opponentPocket) {
      setMessage(`${current.name} encaçapou bola do adversário. Vez do ${opponent.name}.`);
      currentPlayer = 1 - currentPlayer;
      pocketedThisShot = [];
      shotInProgress = false;
      powerReady = false;
      updateHud();
      return;
    }
  }

  if (pocketedThisShot.length > 0) {
    setMessage(`${current.name} manteve a vez.`);
  } else {
    setMessage(`${current.name} errou e a vez passa para ${opponent.name}.`);
    currentPlayer = 1 - currentPlayer;
  }

  pocketedThisShot = [];
  shotInProgress = false;
  powerReady = false;
  updateHud();
}

function ballSpeed(ball) {
  return Math.hypot(ball.vx, ball.vy);
}

function applyFriction(ball) {
  const speed = ballSpeed(ball);
  if (speed < 0.06) {
    ball.vx = 0;
    ball.vy = 0;
    return;
  }

  const factor = 0.985;
  ball.vx *= factor;
  ball.vy *= factor;
}

function resolveWallCollision(ball) {
  const left = table.x + ball.radius;
  const right = table.x + table.width - ball.radius;
  const top = table.y + ball.radius;
  const bottom = table.y + table.height - ball.radius;

  if (ball.x < left) {
    ball.x = left;
    ball.vx *= -0.96;
  }
  if (ball.x > right) {
    ball.x = right;
    ball.vx *= -0.96;
  }
  if (ball.y < top) {
    ball.y = top;
    ball.vy *= -0.96;
  }
  if (ball.y > bottom) {
    ball.y = bottom;
    ball.vy *= -0.96;
  }
}

function handlePocketing() {
  for (const ball of balls) {
    if (ball.pocketed) continue;
    if (isPointInsidePocket(ball.x, ball.y)) {
      ball.pocketed = true;
      ball.vx = 0;
      ball.vy = 0;
      if (!ball.isCue) {
        pocketedThisShot.push(ball);
      } else {
        cueBallWasPocketed = true;
      }
    }
  }
}

function resolveBallCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const aMass = 1;
  const bMass = 1;
  const impulse = ((-(1 + 0.96) * ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny)) / ((1 / aMass) + (1 / bMass))) || 0;

  a.vx -= (impulse / aMass) * nx;
  a.vy -= (impulse / aMass) * ny;
  b.vx += (impulse / bMass) * nx;
  b.vy += (impulse / bMass) * ny;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;
}

function updatePhysics() {
  if (!shotInProgress) return;

  const movingBalls = balls.filter((ball) => !ball.pocketed);

  for (const ball of movingBalls) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    applyFriction(ball);
    resolveWallCollision(ball);
  }

  for (let i = 0; i < movingBalls.length; i += 1) {
    for (let j = i + 1; j < movingBalls.length; j += 1) {
      resolveBallCollision(movingBalls[i], movingBalls[j]);
    }
  }

  handlePocketing();

  const anyMoving = movingBalls.some((ball) => ballSpeed(ball) > 0.15);
  if (!anyMoving) {
    shotInProgress = false;
    if (cueBallWasPocketed) {
      setMessage(`${players[currentPlayer].name} marcou scratch. ${players[1 - currentPlayer].name} segue.`);
      currentPlayer = 1 - currentPlayer;
      setCueBallAtStart();
      pocketedThisShot = [];
      powerReady = false;
      updateHud();
      return;
    }
    handleShotResolution();
  }
}

function fireShot() {
  if (shotInProgress || gameOver || !mouse.inside) {
    if (!mouse.inside) setMessage('Mova o mouse sobre a mesa para mirar antes do tiro.');
    return;
  }

  if (!powerReady) {
    setMessage('Ajuste a potência da tacada antes de atirar.');
    return;
  }

  const cue = getCueBall();
  if (!cue || cue.pocketed) return;

  const power = Number(powerSlider.value) / 100;
  const strike = 9 + power * 18;
  const forceX = Math.cos(aimAngle) * strike;
  const forceY = Math.sin(aimAngle) * strike;
  cue.vx = forceX;
  cue.vy = forceY;
  shotInProgress = true;
  powerReady = false;
  setMessage(`${players[currentPlayer].name} executou a tacada.`);
}

function drawRoundedRect(x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTable() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0d5f3d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f412e';
  ctx.fillRect(table.x - 18, table.y - 18, table.width + 36, table.height + 36);

  ctx.fillStyle = '#0b6d42';
  drawRoundedRect(table.x, table.y, table.width, table.height, 22);
  ctx.fill();

  ctx.strokeStyle = '#d9cfb3';
  ctx.lineWidth = 4;
  ctx.strokeRect(table.x, table.y, table.width, table.height);

  ctx.fillStyle = '#0a543d';
  ctx.fillRect(table.x + 26, table.y + 26, table.width - 52, table.height - 52);

  const pockets = getPocketPositions();
  pockets.forEach((pocket) => {
    ctx.beginPath();
    ctx.fillStyle = '#050505';
    ctx.arc(pocket.x, pocket.y, table.pocketRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(table.x + 60, table.y + 16);
  ctx.lineTo(table.x + table.width - 60, table.y + 16);
  ctx.moveTo(table.x + 60, table.y + table.height - 16);
  ctx.lineTo(table.x + table.width - 60, table.y + table.height - 16);
  ctx.stroke();
}

function drawBall(ball) {
  if (ball.pocketed) return;

  ctx.beginPath();
  ctx.fillStyle = ball.isCue ? '#fbfbfb' : ball.color;
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();

  if (ball.number !== 0 && !ball.isCue) {
    const stripe = ball.number >= 9 && ball.number <= 15;
    ctx.fillStyle = stripe ? '#f5f5f5' : '#101010';
    ctx.fillRect(ball.x - ball.radius * 0.82, ball.y - ball.radius * 0.92, ball.radius * 1.64, ball.radius * 0.52);

    if (stripe) {
      ctx.fillStyle = ball.color;
      ctx.fillRect(ball.x - ball.radius * 0.78, ball.y - ball.radius * 0.18, ball.radius * 1.56, ball.radius * 0.36);
    }

    ctx.fillStyle = '#101010';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ball.number), ball.x, ball.y + 1);
  }

  if (ball.number === 8) {
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#f4f4f4';
    ctx.arc(ball.x, ball.y, ball.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCueStick() {
  const cue = getCueBall();
  if (!cue || shotInProgress || gameOver || !mouse.inside) return;

  const cueLength = 170;
  const startX = cue.x + Math.cos(aimAngle) * 12;
  const startY = cue.y + Math.sin(aimAngle) * 12;
  const endX = cue.x - Math.cos(aimAngle) * cueLength;
  const endY = cue.y - Math.sin(aimAngle) * cueLength;

  ctx.save();
  ctx.strokeStyle = '#c4904a';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.fillStyle = '#d7b77f';
  ctx.beginPath();
  ctx.arc(endX, endY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f1f1f';
  ctx.beginPath();
  ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAimLine() {
  const cue = getCueBall();
  if (!cue || shotInProgress || gameOver || !mouse.inside) return;

  const length = 150;
  const endX = cue.x + Math.cos(aimAngle) * length;
  const endY = cue.y + Math.sin(aimAngle) * length;

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(endX, endY, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  drawTable();
  for (const ball of balls) drawBall(ball);
  drawCueStick();
  drawAimLine();
}

function updateAimFromMouse() {
  const cue = getCueBall();
  if (!cue || shotInProgress || gameOver) return;
  aimAngle = Math.atan2(mouse.y - cue.y, mouse.x - cue.x);
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.inside = true;
  mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  updateAimFromMouse();
});

canvas.addEventListener('pointerleave', () => {
  mouse.inside = false;
});

powerSlider.addEventListener('input', () => {
  powerValue.textContent = `${powerSlider.value}%`;
  powerReady = true;
  if (!shotInProgress) {
    setMessage(`Potência ajustada em ${powerSlider.value}%. Mova o mouse para mirar.`);
  }
});

shootBtn.addEventListener('click', fireShot);
newGameBtn.addEventListener('click', resetGame);

function animate() {
  updatePhysics();
  draw();
  requestAnimationFrame(animate);
}

resetGame();
updateAimFromMouse();
animate();
