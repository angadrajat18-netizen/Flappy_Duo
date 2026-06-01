// ================= CANVAS =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= UI =================
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");
const restartBtn = document.getElementById("restartBtn");

// ================= GAME STATE =================
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;

// ================= CAMERA =================
let camX = 0;
let camY = 0;
let shakeTime = 0;
let shakePower = 0;

// ================= REVIVE =================
const REVIVE_PIPES = 7;
let reviveCount = 0;

// ================= PARTICLES =================
let particles = [];

// ================= CLOUDS =================
let clouds = [];
for (let i = 0; i < 8; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.5,
    speed: 0.2 + Math.random() * 0.3,
    size: 80 + Math.random() * 120
  });
}

// ================= BACKGROUND =================
let bgOffset = 0;
function drawBackground() {
  bgOffset -= 0.5;

  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hills
  ctx.fillStyle = "#6ab04c";
  for (let i = 0; i < 10; i++) {
    const x = (i * 300 + bgOffset * 0.3) % (canvas.width + 300);
    ctx.beginPath();
    ctx.arc(x, canvas.height, 300, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -c.size) c.x = canvas.width + c.size;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.size, c.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ================= PARTICLE =================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 40;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3;
    this.life--;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, 4, 4);
  }
}

// ================= BIRD =================
class Bird {
  constructor(offsetX, key, color) {
    this.offsetX = offsetX;
    this.key = key;
    this.color = color;
    this.deaths = 0;
    this.reset();
  }

  reset() {
    this.x = canvas.width / 2 + this.offsetX;
    this.y = canvas.height / 2;
    this.vel = 0;
    this.alive = true;
    this.immunity = 60;
    this.flash = 30;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.deaths++;
    shakeTime = 20;
    shakePower = 10;
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(this.x, this.y, this.color));
    }
  }

  flap() {
    if (this.alive) this.vel = -8;
  }

  update() {
    if (!this.alive) return;
    this.vel += 0.5;
    this.y += this.vel;

    if ((this.y < 0 || this.y > canvas.height - 20) && this.immunity <= 0) {
      this.die();
    }

    if (this.immunity > 0) this.immunity--;
    if (this.flash > 0) this.flash--;
  }

  draw() {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.vel * 0.05);
    ctx.globalAlpha = this.flash > 0 && this.flash % 6 < 3 ? 0.4 : 1;

    ctx.fillStyle = this.color;
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillRect(-4, 2, 8, 4);

    ctx.fillStyle = "white";
    ctx.fillRect(5, -4, 3, 3);
    ctx.fillStyle = "black";
    ctx.fillRect(6, -3, 1, 1);

    ctx.fillStyle = "orange";
    ctx.fillRect(10, -1, 4, 2);

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ================= PIPE =================
class Pipe {
  constructor(x) {
    this.x = x;
    this.width = 60;
    this.gap = 190;
    this.topHeight = Math.random() * (canvas.height - 300) + 50;
    this.passed = false;
  }

  update() {
    this.x -= 3;
    if (!this.passed && this.x + this.width < canvas.width / 2) {
      this.passed = true;
      score++;
      reviveCount++;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }
  }

  draw() {
    ctx.fillStyle = "#1e7f43";
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    ctx.fillRect(this.x, this.topHeight + this.gap, this.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x, 0, this.width, this.topHeight);
    ctx.strokeRect(this.x, this.topHeight + this.gap, this.width, canvas.height);
  }

  hits(bird) {
    if (!bird.alive || bird.immunity > 0) return false;
    return (
      bird.x + 10 > this.x &&
      bird.x - 10 < this.x + this.width &&
      (bird.y - 6 < this.topHeight ||
        bird.y + 6 > this.topHeight + this.gap)
    );
  }
}

// ================= BOSS =================
class BigBird {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = canvas.width + 300;
    this.y = canvas.height / 2;
    this.active = false;
    this.phase = 0;
    this.timer = 0;
    this.pellets = [];
    this.crashing = false;
    this.warningTimer = 0;
  }

  start() {
    this.active = true;
    this.phase = 1;
    this.x = canvas.width - 180;
  }

  update(targetY) {
    if (!this.active) return;

    this.y += (targetY - this.y) * 0.05;
    this.timer++;

    if (this.phase === 1 && this.timer % 90 === 0) this.fire(targetY);
    if (this.phase === 2 && this.timer % 40 === 0) this.fire(targetY);

    if (this.phase === 1 && score >= 30) {
      this.phase = 2;
      this.warningTimer = 120;
      shakeTime = 40;
      shakePower = 12;
    }

    if (this.phase === 2 && score >= 40 && !this.crashing) {
      this.crashing = true;
      this.pellets = [];
      shakeTime = 60;
      shakePower = 16;
    }

    this.pellets.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
    });

    this.pellets = this.pellets.filter(p => p.x > -50 && p.y < canvas.height + 50);
  }

  fire(targetY) {
    const angle = Math.atan2(targetY - this.y, (canvas.width / 2) - this.x);
    this.pellets.push({
      x: this.x - 50,
      y: this.y,
      vx: Math.cos(angle) * 7,
      vy: Math.sin(angle) * 7,
      r: 6
    });
  }

  draw() {
    if (!this.active) return;

    ctx.fillStyle = "#2c2c54";
    ctx.fillRect(this.x - 60, this.y - 35, 120, 70);

    // Eyes
    ctx.fillStyle = "white";
    ctx.fillRect(this.x - 30, this.y - 10, 8, 8);
    ctx.fillRect(this.x - 10, this.y - 10, 8, 8);
    ctx.fillStyle = "black";
    ctx.fillRect(this.x - 27, this.y - 7, 3, 3);
    ctx.fillRect(this.x - 7, this.y - 7, 3, 3);

    ctx.fillStyle = "orange";
    ctx.fillRect(this.x - 80, this.y - 6, 20, 12);

    ctx.fillStyle = "red";
    this.pellets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.warningTimer > 0) {
      ctx.fillStyle = "rgba(255,0,0,0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PHASE 2", canvas.width / 2, canvas.height / 2);
      this.warningTimer--;
    }
  }
}

// ================= OBJECTS =================
const bird1 = new Bird(-30, "w", "#ffeb3b");
const bird2 = new Bird(30, "l", "#ff5722");
const boss = new BigBird();
let pipes = [];
let pipeTimer = 0;

// ================= INPUT =================
document.addEventListener("keydown", e => {
  if (!gameRunning) return;
  if (e.key === "w") bird1.flap();
  if (e.key === "l") bird2.flap();
});

// ================= REVIVE =================
function tryRevive() {
  if (reviveCount < REVIVE_PIPES) return;
  if (!bird1.alive) bird1.reset();
  else if (!bird2.alive) bird2.reset();
  reviveCount = 0;
}

// ================= GAME FLOW =================
function startGame() {
  bird1.reset();
  bird2.reset();
  boss.reset();
  pipes = [];
  particles = [];
  score = 0;
  reviveCount = 0;
  gameRunning = true;
  overlay.style.display = "none";
  endScreen.style.display = "none";
}

function endGame() {
  gameRunning = false;
  endScreen.style.display = "flex";
  const better = bird1.deaths < bird2.deaths ? "Yellow" : "Red";
  endText.innerHTML = `Score: ${score}<br>Better Bird: ${better}`;
}

// ================= MAIN LOOP =================
function loop() {
  ctx.save();

  if (shakeTime > 0) {
    shakeTime--;
    camX = (Math.random() - 0.5) * shakePower;
    camY = (Math.random() - 0.5) * shakePower;
  } else {
    camX *= 0.9;
    camY *= 0.9;
  }

  ctx.translate(camX, camY);

  drawBackground();

  particles.forEach(p => p.update());
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => p.draw());

  if (gameRunning) {
    bird1.update();
    bird2.update();

    if (!bird1.alive && !bird2.alive) endGame();

    const alive = [bird1, bird2].filter(b => b.alive);
    const avgY = alive.length ? alive.reduce((a, b) => a + b.y, 0) / alive.length : canvas.height / 2;

    if (score >= 20 && !boss.active) boss.start();
    boss.update(avgY);

    pipeTimer++;
    if (pipeTimer > 170) {
      pipes.push(new Pipe(canvas.width));
      pipeTimer = 0;
    }

    pipes.forEach(p => {
      p.update();
      p.draw();
      if (p.hits(bird1)) bird1.die();
      if (p.hits(bird2)) bird2.die();
    });

    boss.pellets.forEach(p => {
      [bird1, bird2].forEach(b => {
        if (b.alive && b.immunity <= 0) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          if (Math.hypot(dx, dy) < 14) b.die();
        }
      });
    });

    pipes = pipes.filter(p => p.x + p.width > 0);
    tryRevive();
  }

  boss.draw();
  bird1.draw();
  bird2.draw();

  ctx.restore();

  // UI
  ctx.fillStyle = "white";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, 40);

  // Revive Bar
  const barW = 200;
  const barH = 14;
  const bx = canvas.width / 2 - barW / 2;
  const by = 60;
  ctx.strokeStyle = "white";
  ctx.strokeRect(bx, by, barW, barH);
  ctx.fillStyle = "#00e676";
  ctx.fillRect(bx, by, barW * Math.min(reviveCount / REVIVE_PIPES, 1), barH);

  requestAnimationFrame(loop);
}

loop();
