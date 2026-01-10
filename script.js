const game = document.getElementById("game");
const bird1 = document.getElementById("bird1");
const bird2 = document.getElementById("bird2");
const pipeTop = document.querySelector(".pipe-top");
const pipeBottom = document.querySelector(".pipe-bottom");
const scoreEl = document.getElementById("score");
const tapText = document.getElementById("tap-text");
const popup = document.getElementById("popup");
const gameOverMenu = document.getElementById("game-over-menu");
const finalScore = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");

let started = false;
let gameOver = false;
let score = 0;

const gravity = 0.45;
const jump = -7.5;

let b1y = 180, b2y = 260;
let b1v = 0, b2v = 0;

let pipeX = 360;
let gap = 140;
let topH = 150;
const speed = 2.2;

function reset() {
  started = false;
  gameOver = false;
  score = 0;
  b1y = 180; b2y = 260;
  b1v = 0; b2v = 0;
  pipeX = 360;
  randomPipe();
  scoreEl.textContent = "0";
  tapText.style.display = "block";
  gameOverMenu.style.display = "none";
}

function randomPipe() {
  topH = Math.random() * 150 + 80;
  pipeTop.style.height = topH + "px";
  pipeBottom.style.height = 500 - topH - gap + "px";
}

function showPopup(text) {
  popup.textContent = text;
  popup.style.opacity = "1";
  popup.style.transform = "scale(1.2)";
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "scale(1)";
  }, 700);
}

document.addEventListener("keydown", e => {
  if (e.key === "w" || e.key === "W") {
    started = true;
    tapText.style.display = "none";
    b1v = jump;
  }
  if (e.key === "l" || e.key === "L") {
    started = true;
    tapText.style.display = "none";
    b2v = jump;
  }
});

restartBtn.onclick = reset;

function collide(bird) {
  const b = bird.getBoundingClientRect();
  const t = pipeTop.getBoundingClientRect();
  const bot = pipeBottom.getBoundingClientRect();
  const g = game.getBoundingClientRect();

  return (
    b.top <= g.top ||
    b.bottom >= g.bottom ||
    (b.right > t.left && b.left < t.right && b.top < t.bottom) ||
    (b.right > bot.left && b.left < bot.right && b.bottom > bot.top)
  );
}

function loop() {
  if (!gameOver && started) {
    b1v += gravity;
    b2v += gravity;
    b1y += b1v;
    b2y += b2v;

    bird1.style.top = b1y + "px";
    bird2.style.top = b2y + "px";

    bird1.style.transform = `rotate(${Math.min(b1v * 4, 25)}deg)`;
    bird2.style.transform = `rotate(${Math.min(b2v * 4, 25)}deg)`;

    pipeX -= speed;
    pipeTop.style.left = pipeX + "px";
    pipeBottom.style.left = pipeX + "px";

    if (pipeX < -60) {
      pipeX = 360;
      randomPipe();
      score++;
      scoreEl.textContent = score;

      if (score % 3 === 0) {
        const words = ["WOW!", "NICE!", "WHOA!", "COOL!"];
        showPopup(words[Math.floor(Math.random() * words.length)]);
      }
    }

    if (collide(bird1) || collide(bird2)) {
      gameOver = true;
      gameOverMenu.style.display = "flex";
      finalScore.textContent = "Score: " + score;
    }
  }

  requestAnimationFrame(loop);
}

reset();
loop();