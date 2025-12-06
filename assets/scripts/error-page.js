// Canvas анимация для страниц ошибок
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const particleCount = 200;
const SPEED = 3;
const TRAIL_LENGTH = 100;
const MIN_ALPHA = 0.0;
const FADE_IN_TIME = 300;
const EXCLUSION_WIDTH_PERCENT = 0.25;
const EXCLUSION_HEIGHT_PERCENT = 0.35;

let particles = [];
let animationId = null;
let centerX, centerY;
let exclusionZone = { left: 0, right: 0, top: 0, bottom: 0 };

function updateCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
  const exclusionWidth = canvas.width * EXCLUSION_WIDTH_PERCENT;
  const exclusionHeight = canvas.height * EXCLUSION_HEIGHT_PERCENT;
  exclusionZone.left = centerX - exclusionWidth / 2;
  exclusionZone.right = centerX + exclusionWidth / 2;
  exclusionZone.top = centerY - exclusionHeight / 2;
  exclusionZone.bottom = centerY + exclusionHeight / 2;
}

function isInExclusionZone(x, y) {
  return x >= exclusionZone.left && x <= exclusionZone.right && 
         y >= exclusionZone.top && y <= exclusionZone.bottom;
}

updateCanvasSize();

class Particle {
  constructor() {
    this.history = [];
    this.reset();
  }
  
  reset() {
    let x, y;
    let attempts = 0;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
      attempts++;
      if (attempts > 50) break;
    } while (isInExclusionZone(x, y));
    
    this.x = x;
    this.y = y;
    this.z = Math.random() * 1500;
    this.size = Math.random() * 2;
    this.history.length = 0;
    this.birthTime = performance.now();
  }
  
  update(deltaMs) {
    this.z -= SPEED * (deltaMs / 16.67);
    if (this.z <= 0) {
      this.reset();
      return;
    }
    
    const scale = 1500 / this.z;
    const sx = (this.x - centerX) * scale + centerX;
    const sy = (this.y - centerY) * scale + centerY;
    const r = this.size * scale;
    const baseOpacity = Math.min(1, (1500 - this.z) / 500);
    
    if (isInExclusionZone(sx, sy)) {
      this.reset();
      return;
    }
    
    this.history.push({ x: sx, y: sy, r, alpha: baseOpacity });
    if (this.history.length > TRAIL_LENGTH) {
      this.history.shift();
    }
  }
  
  draw(currentTime) {
    const len = this.history.length;
    if (len < 2) return;
    
    const age = currentTime - this.birthTime;
    const fadeInFactor = Math.min(1, age / FADE_IN_TIME);
    const tail = this.history[0];
    const head = this.history[len - 1];
    const dx = head.x - tail.x;
    const dy = head.y - tail.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.5) return;
    
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const baseWidth = head.r * 2;
    const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    
    for (let i = 0; i < len; i++) {
      const t = i / (len - 1);
      const fadeFactor = t * t * t;
      const p = this.history[i];
      const alpha = p.alpha * fadeFactor * 0.9 * fadeInFactor;
      if (alpha < MIN_ALPHA) {
        gradient.addColorStop(t, `rgba(255, 255, 255, 0)`);
      } else {
        gradient.addColorStop(t, `rgba(255, 255, 255, ${alpha})`);
      }
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(head.x + perpX * baseWidth / 2, head.y + perpY * baseWidth / 2);
    ctx.lineTo(head.x - perpX * baseWidth / 2, head.y - perpY * baseWidth / 2);
    ctx.closePath();
    ctx.fill();
    
    const headAlpha = head.alpha * fadeInFactor * 0.95;
    if (headAlpha >= MIN_ALPHA) {
      ctx.fillStyle = `rgba(255, 255, 255, ${headAlpha})`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, head.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

initParticles();

let lastTime = performance.now();

function animate(time) {
  const deltaMs = time - lastTime;
  lastTime = time;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < particles.length; i++) {
    particles[i].update(deltaMs);
    particles[i].draw(time);
  }
  
  animationId = requestAnimationFrame(animate);
}

animationId = requestAnimationFrame(animate);

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateCanvasSize();
    initParticles();
    lastTime = performance.now();
  }, 150);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else {
    if (!animationId) {
      lastTime = performance.now();
      animationId = requestAnimationFrame(animate);
    }
  }
});
