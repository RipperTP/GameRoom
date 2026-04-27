// Motion juice helpers for smooth, satisfying interactions

export function shake(element, duration = 140) {
  if (!element) return;
  element.classList.add("juiced");
  setTimeout(() => {
    element.classList.remove("juiced");
  }, duration);
}

export function pulse(element, duration = 300) {
  if (!element) return;
  const originalOpacity = element.style.opacity;
  element.style.animation = `pulse ${duration}ms ease-in-out`;
  setTimeout(() => {
    element.style.animation = "";
    element.style.opacity = originalOpacity;
  }, duration);
}

export function burst(element) {
  if (!element || !element.parentElement) return;

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const velocity = 120;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    const particle = document.createElement("div");
    particle.style.position = "fixed";
    particle.style.left = centerX + "px";
    particle.style.top = centerY + "px";
    particle.style.width = "6px";
    particle.style.height = "6px";
    particle.style.borderRadius = "50%";
    particle.style.backgroundColor = "var(--neon-lime)";
    particle.style.pointerEvents = "none";
    particle.style.zIndex = "9999";
    particle.style.boxShadow = "0 0 8px var(--neon-lime)";
    particle.style.setProperty("--tx", vx + "px");
    particle.style.setProperty("--ty", vy + "px");
    particle.style.animation = `burst 600ms ease-out forwards`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
  }
}

export function screenFlash(color = "rgba(0, 240, 255, 0.3)", duration = 100) {
  const flash = document.createElement("div");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.backgroundColor = color;
  flash.style.pointerEvents = "none";
  flash.style.zIndex = "9998";
  flash.style.animation = `pulse ${duration}ms ease-out`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), duration);
}

export function crtOff(duration = 300) {
  const canvas = document.querySelector("#gameCanvas");
  if (!canvas) return;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "50%";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.height = "2px";
  overlay.style.backgroundColor = "black";
  overlay.style.zIndex = "9997";
  overlay.style.transformOrigin = "center";
  overlay.style.animation = `scaleY(1) 0%, scaleY(0) 100%`;

  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes scaleOut {
      0% { scaleY: 1; }
      100% { scaleY: 0; }
    }
  `;
  document.head.appendChild(style);

  overlay.style.animation = `scaleOut ${duration}ms ease-in forwards`;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    style.remove();
  }, duration);
}

export function glitchTitle(element) {
  if (!element) return;
  element.style.animation = "chromaGlitch 400ms ease-in-out";
  setTimeout(() => {
    element.style.animation = "";
  }, 400);
}
