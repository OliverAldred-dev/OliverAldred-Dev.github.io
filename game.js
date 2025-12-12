const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 800, H = 600;
canvas.width = W; canvas.height = H;

// Player
const player = {
  x: W/2, y: H/2,
  radius: 16,
  speed: 250, // px / second
  angle: 0,
  health: 5
};

// Input
const keys = {w:false,a:false,s:false,d:false,ArrowUp:false,ArrowLeft:false,ArrowDown:false,ArrowRight:false};
let mouse = {x: W/2, y: H/2};
let mouseDown = false;

// Game entities
const bullets = [];
const enemies = [];
let score = 0;

// Shooting
let fireCooldown = 0;
const FIRE_RATE = 0.12; // seconds between shots
const BULLET_SPEED = 700;

// Enemy spawn
let spawnTimer = 0;
const SPAWN_INTERVAL = 1.4; // seconds

// Timing
let last = performance.now();
let gameOver = false;

// Helpers
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function randRange(a,b){ return a + Math.random()*(b-a); }

// Input handlers
window.addEventListener('keydown', e => { if(e.key in keys) keys[e.key]=true; });
window.addEventListener('keyup', e => { if(e.key in keys) keys[e.key]=false; });
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width/rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height/rect.height);
});
canvas.addEventListener('mousedown', e => { if(e.button===0) mouseDown=true; });
window.addEventListener('mouseup', e => { if(e.button===0) mouseDown=false; });

canvas.addEventListener('click', e => {
  if(gameOver){ restart(); }
});

function spawnEnemy(){
  // spawn at random edge
  const edge = Math.floor(Math.random()*4);
  let x,y;
  if(edge===0){ x = -20; y = randRange(0,H); }
  else if(edge===1){ x = W+20; y = randRange(0,H); }
  else if(edge===2){ x = randRange(0,W); y = -20; }
  else { x = randRange(0,W); y = H+20; }
  const speed = randRange(50,110);
  enemies.push({x,y,r:14, speed});
}

function update(dt){
  if(gameOver) return;

  // Movement
  let mx = 0, my = 0;
  if(keys.w || keys.ArrowUp) my -= 1;
  if(keys.s || keys.ArrowDown) my += 1;
  if(keys.a || keys.ArrowLeft) mx -= 1;
  if(keys.d || keys.ArrowRight) mx += 1;
  if(mx!==0 || my!==0){
    const len = Math.hypot(mx,my);
    mx /= len; my /= len;
    player.x += mx * player.speed * dt;
    player.y += my * player.speed * dt;
    player.x = clamp(player.x, player.radius, W-player.radius);
    player.y = clamp(player.y, player.radius, H-player.radius);
  }

  // Aim
  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  // Shooting
  fireCooldown -= dt;
  if(mouseDown && fireCooldown <= 0){
    fireCooldown = FIRE_RATE;
    const angle = player.angle;
    const vx = Math.cos(angle) * BULLET_SPEED;
    const vy = Math.sin(angle) * BULLET_SPEED;
    bullets.push({x: player.x + Math.cos(angle)*(player.radius+6), y: player.y + Math.sin(angle)*(player.radius+6), vx, vy, r:4});
  }

  // Update bullets
  for(let i = bullets.length-1; i>=0; --i){
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if(b.x < -50 || b.x > W+50 || b.y < -50 || b.y > H+50) bullets.splice(i,1);
  }

  // Spawn enemies
  spawnTimer -= dt;
  if(spawnTimer <= 0){ spawnTimer = SPAWN_INTERVAL; spawnEnemy(); }

  // Update enemies
  for(let i = enemies.length-1; i>=0; --i){
    const e = enemies[i];
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(ang) * e.speed * dt;
    e.y += Math.sin(ang) * e.speed * dt;

    // collision with player
    const pdist = Math.hypot(e.x - player.x, e.y - player.y);
    if(pdist < e.r + player.radius){
      // hit player
      enemies.splice(i,1);
      player.health -= 1;
      if(player.health <= 0){ gameOver = true; }
      continue;
    }

    // bullets vs enemy
    for(let j = bullets.length-1; j>=0; --j){
      const b = bullets[j];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if(dist < b.r + e.r){
        bullets.splice(j,1);
        enemies.splice(i,1);
        score += 1;
        break;
      }
    }
  }
}

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  // body
  ctx.fillStyle = '#7fe0ff';
  ctx.beginPath();
  ctx.moveTo(18,0);
  ctx.lineTo(-12,10);
  ctx.lineTo(-12,-10);
  ctx.closePath();
  ctx.fill();
  // center
  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.arc(0,0,6,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function draw(){
  // background
  ctx.fillStyle = '#0b0b0c';
  ctx.fillRect(0,0,W,H);

  // bullets
  for(const b of bullets){
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
  }

  // enemies
  for(const e of enemies){
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
  }

  // player
  drawPlayer();

  // UI
  ctx.fillStyle = '#e6eef8';
  ctx.font = '16px system-ui,Segoe UI,Roboto';
  ctx.fillText('Score: ' + score, 10, 20);
  ctx.fillText('Health: ' + player.health, 10, 40);

  if(gameOver){
    ctx.fillStyle = 'rgba(3,3,3,0.7)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff'; ctx.font = '36px system-ui,Segoe UI';
    ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W/2, H/2 - 10);
    ctx.font = '18px system-ui,Segoe UI'; ctx.fillText('Click to restart', W/2, H/2 + 24);
    ctx.textAlign = 'start';
  }
}

function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function restart(){
  bullets.length = 0; enemies.length = 0; score = 0; player.x=W/2; player.y=H/2; player.health = 5; gameOver = false; spawnTimer = 0; fireCooldown = 0;
}

requestAnimationFrame(loop);
