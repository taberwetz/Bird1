(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const COLORS = {
    black: "#111111",
    white: "#ffffff",
    orange: "#ff7a00",
    orangeDark: "#cc5f00",
    iceShadow: "#e8e8e8",
  };

  const GROUND_H = 80;
  const GRAVITY = 0.45;
  const FLAP_VELOCITY = -7.5;
  const PIPE_GAP = 150;
  const PIPE_WIDTH = 64;
  const PIPE_SPEED = 2.4;
  const PIPE_INTERVAL = 1500;

  const STATE = { READY: 0, PLAYING: 1, GAMEOVER: 2 };

  let state = STATE.READY;
  let score = 0;
  let best = Number(localStorage.getItem("flappyPenguinBest") || 0);
  let pipes = [];
  let lastPipeTime = 0;
  let snowflakes = [];
  let groundOffset = 0;
  let flashAlpha = 0;

  const penguin = {
    x: 90,
    y: H / 2,
    w: 36,
    h: 36,
    vy: 0,
    rotation: 0,
    flapPhase: 0,
  };

  for (let i = 0; i < 40; i++) {
    snowflakes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.6,
      v: Math.random() * 0.6 + 0.3,
    });
  }

  function reset() {
    state = STATE.READY;
    score = 0;
    pipes = [];
    lastPipeTime = 0;
    penguin.y = H / 2;
    penguin.vy = 0;
    penguin.rotation = 0;
  }

  function flap() {
    if (state === STATE.READY) {
      state = STATE.PLAYING;
      lastPipeTime = performance.now() - PIPE_INTERVAL + 600;
    }
    if (state === STATE.PLAYING) {
      penguin.vy = FLAP_VELOCITY;
      penguin.flapPhase = 1;
    } else if (state === STATE.GAMEOVER) {
      reset();
    }
  }

  function spawnPipe() {
    const minTop = 50;
    const maxTop = H - GROUND_H - PIPE_GAP - 50;
    const topH = Math.random() * (maxTop - minTop) + minTop;
    pipes.push({
      x: W + 10,
      topH,
      bottomY: topH + PIPE_GAP,
      passed: false,
    });
  }

  function update(dt, now) {
    groundOffset = (groundOffset + PIPE_SPEED) % 24;

    for (const f of snowflakes) {
      f.y += f.v;
      f.x -= 0.3;
      if (f.y > H) {
        f.y = -2;
        f.x = Math.random() * W;
      }
      if (f.x < 0) f.x = W;
    }

    if (state === STATE.READY) {
      penguin.y = H / 2 + Math.sin(now / 250) * 6;
      penguin.rotation = 0;
      return;
    }

    if (state === STATE.PLAYING) {
      penguin.vy += GRAVITY;
      penguin.y += penguin.vy;
      penguin.rotation = Math.max(-0.5, Math.min(1.2, penguin.vy / 12));
      penguin.flapPhase = Math.max(0, penguin.flapPhase - 0.08);

      if (now - lastPipeTime > PIPE_INTERVAL) {
        spawnPipe();
        lastPipeTime = now;
      }

      for (const p of pipes) {
        p.x -= PIPE_SPEED;
        if (!p.passed && p.x + PIPE_WIDTH < penguin.x) {
          p.passed = true;
          score++;
          flashAlpha = 0.25;
        }
      }
      pipes = pipes.filter(p => p.x + PIPE_WIDTH > -10);

      if (penguin.y + penguin.h / 2 >= H - GROUND_H) {
        penguin.y = H - GROUND_H - penguin.h / 2;
        gameOver();
      }
      if (penguin.y - penguin.h / 2 <= 0) {
        penguin.y = penguin.h / 2;
        penguin.vy = 0;
      }

      for (const p of pipes) {
        if (collides(p)) {
          gameOver();
          break;
        }
      }
    } else if (state === STATE.GAMEOVER) {
      penguin.vy += GRAVITY;
      penguin.y += penguin.vy;
      penguin.rotation = Math.min(1.4, penguin.rotation + 0.06);
      if (penguin.y + penguin.h / 2 >= H - GROUND_H) {
        penguin.y = H - GROUND_H - penguin.h / 2;
        penguin.vy = 0;
      }
    }

    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.03);
  }

  function collides(p) {
    const hx = penguin.x - penguin.w / 2 + 4;
    const hy = penguin.y - penguin.h / 2 + 4;
    const hw = penguin.w - 8;
    const hh = penguin.h - 8;

    const inX = hx + hw > p.x && hx < p.x + PIPE_WIDTH;
    if (!inX) return false;
    const hitsTop = hy < p.topH;
    const hitsBottom = hy + hh > p.bottomY;
    return hitsTop || hitsBottom;
  }

  function gameOver() {
    if (state !== STATE.GAMEOVER) {
      state = STATE.GAMEOVER;
      penguin.vy = -3;
      flashAlpha = 0.6;
      if (score > best) {
        best = score;
        localStorage.setItem("flappyPenguinBest", String(best));
      }
    }
  }

  function drawBackground() {
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#f2f2f2";
    drawMountain(0, H - GROUND_H, 160, 110);
    drawMountain(120, H - GROUND_H, 200, 140);
    drawMountain(280, H - GROUND_H, 180, 120);

    ctx.fillStyle = COLORS.white;
    for (const f of snowflakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.black;
    ctx.globalAlpha = 0.15;
    for (const f of snowflakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMountain(x, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w / 2, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipes() {
    for (const p of pipes) {
      drawPipe(p.x, 0, PIPE_WIDTH, p.topH, true);
      drawPipe(p.x, p.bottomY, PIPE_WIDTH, H - GROUND_H - p.bottomY, false);
    }
  }

  function drawPipe(x, y, w, h, isTop) {
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = COLORS.orangeDark;
    ctx.fillRect(x + w - 6, y, 6, h);
    ctx.fillRect(x, y, 4, h);

    const capH = 18;
    const capY = isTop ? y + h - capH : y;
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(x - 4, capY, w + 8, capH);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(x - 4, capY, w + 8, 3);
    ctx.fillRect(x - 4, capY + capH - 3, w + 8, 3);
    ctx.fillStyle = COLORS.orangeDark;
    ctx.fillRect(x + w + 2, capY + 3, 2, capH - 6);
  }

  function drawGround() {
    ctx.fillStyle = COLORS.iceShadow;
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, H - GROUND_H, W, 18);

    ctx.fillStyle = COLORS.black;
    ctx.fillRect(0, H - GROUND_H + 18, W, 2);

    ctx.fillStyle = COLORS.orange;
    for (let i = -groundOffset; i < W; i += 24) {
      ctx.fillRect(i, H - GROUND_H + 22, 12, 4);
    }

    ctx.fillStyle = COLORS.black;
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 30; i++) {
      const px = (i * 53 + groundOffset * 2) % W;
      const py = H - GROUND_H + 30 + ((i * 17) % 40);
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  function drawPenguin() {
    ctx.save();
    ctx.translate(penguin.x, penguin.y);
    ctx.rotate(penguin.rotation);

    const w = penguin.w;
    const h = penguin.h;

    ctx.fillStyle = COLORS.black;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.ellipse(2, 4, w / 2 - 6, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const flap = Math.sin(penguin.flapPhase * Math.PI) * 6;
    ctx.fillStyle = COLORS.black;
    ctx.beginPath();
    ctx.ellipse(-w / 2 + 2, -2 + flap, 6, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(w / 4 - 2, -h / 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.black;
    ctx.beginPath();
    ctx.arc(w / 4 - 1, -h / 4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.moveTo(w / 4 + 2, -h / 8 + 2);
    ctx.lineTo(w / 2 + 4, -h / 8 + 5);
    ctx.lineTo(w / 4 + 2, -h / 8 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.orangeDark;
    ctx.beginPath();
    ctx.moveTo(w / 4 + 2, -h / 8 + 5);
    ctx.lineTo(w / 2 + 4, -h / 8 + 5);
    ctx.lineTo(w / 4 + 2, -h / 8 + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.ellipse(-4, h / 2 + 2, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, h / 2 + 2, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = COLORS.black;
    ctx.font = "bold 42px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    if (state === STATE.PLAYING || state === STATE.GAMEOVER) {
      ctx.fillStyle = COLORS.white;
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS.black;
      ctx.strokeText(String(score), W / 2, 30);
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(String(score), W / 2, 30);
    }

    if (state === STATE.READY) {
      drawPanel("FLAPPY PENGUIN", "Click, tap, or press SPACE", null);
    }

    if (state === STATE.GAMEOVER) {
      drawPanel("GAME OVER", `Score: ${score}   Best: ${best}`, "Tap to restart");
    }
  }

  function drawPanel(title, sub, hint) {
    const pw = 280;
    const ph = hint ? 150 : 120;
    const px = (W - pw) / 2;
    const py = H / 2 - ph / 2 - 40;

    ctx.fillStyle = COLORS.black;
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(px + 8, py + 8, pw - 16, ph - 16);

    ctx.fillStyle = COLORS.orange;
    ctx.font = "bold 24px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(title, W / 2, py + 22);

    ctx.fillStyle = COLORS.white;
    ctx.font = "16px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(sub, W / 2, py + 60);

    if (hint) {
      ctx.fillStyle = COLORS.orange;
      ctx.font = "bold 14px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(hint, W / 2, py + 100);
    }
  }

  function render() {
    drawBackground();
    drawPipes();
    drawGround();
    drawPenguin();

    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 122, 0, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    drawHUD();
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;
    update(dt, now);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      flap();
    }
  });
  canvas.addEventListener("mousedown", flap);
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    flap();
  }, { passive: false });

  requestAnimationFrame(loop);
})();
