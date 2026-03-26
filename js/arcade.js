import { advanceState, createInitialState, queueDirection } from "./snake-logic.js";

const STORAGE_KEY = "ultra-arcade-scores-v1";
const CONTROL_KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
  w: "up",
  d: "right",
  s: "down",
  a: "left",
  W: "up",
  D: "right",
  S: "down",
  A: "left"
};

const MEMORY_KEY_TO_INDEX = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8
};

const canvas = document.querySelector("#gameCanvas");
const gamePicker = document.querySelector("#gamePicker");
const modePicker = document.querySelector("#modePicker");
const pauseButton = document.querySelector("#pauseButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const restartButton = document.querySelector("#restartButton");
const scoreLabel = document.querySelector("#scoreLabel");
const scoreValue = document.querySelector("#scoreValue");
const bestValue = document.querySelector("#bestValue");
const modeValue = document.querySelector("#modeValue");
const metaLabel = document.querySelector("#metaLabel");
const metaValue = document.querySelector("#metaValue");
const statusText = document.querySelector("#statusText");
const gameTag = document.querySelector("#gameTag");
const gameTitle = document.querySelector("#gameTitle");
const gameSubtitle = document.querySelector("#gameSubtitle");
const controlHint = document.querySelector("#controlHint");
const gameNote = document.querySelector("#gameNote");
const controlDeck = document.querySelector("#controlDeck");
const controlButtons = Array.from(document.querySelectorAll("[data-control]"));
const stageElement = document.querySelector(".stage");

const context = canvas.getContext("2d");
const viewport = { width: 720, height: 720 };
const scores = loadScores();

const gameDefinitions = [
  {
    id: "snake",
    kicker: "Precision Grid",
    title: "Snake",
    summary: "The classic loop, now rendered on a crisp canvas with tuned movement modes.",
    modes: [
      {
        id: "classic",
        label: "Classic",
        summary: "Solid walls, steady pace, faithful arcade pressure."
      },
      {
        id: "wrap",
        label: "Wrap",
        summary: "Slip through edges and attack the board from both sides."
      },
      {
        id: "rush",
        label: "Rush",
        summary: "Every meal accelerates the tempo until the board gets vicious."
      }
    ],
    create: createSnakeGame
  },
  {
    id: "dodge",
    kicker: "Lane Survival",
    title: "Meteor Dodge",
    summary: "Slide through falling traffic and hold your line as the storm thickens.",
    modes: [
      {
        id: "cruise",
        label: "Cruise",
        summary: "Measured pacing with room to read the lanes."
      },
      {
        id: "storm",
        label: "Storm",
        summary: "Denser waves and faster impact windows."
      }
    ],
    create: createDodgeGame
  },
  {
    id: "memory",
    kicker: "Pattern Recall",
    title: "Pulse Memory",
    summary: "Watch the sequence, then replay it cleanly with keys or taps.",
    modes: [
      {
        id: "focus",
        label: "Focus",
        summary: "Measured flashes and a calmer rhythm for longer chains."
      },
      {
        id: "rush",
        label: "Rush",
        summary: "Sharper reveal windows for high-speed recall."
      }
    ],
    create: createMemoryGame
  },
  {
    id: "blackout",
    kicker: "Black Cabinet",
    title: "Blackout",
    summary: "Minimal black stage. Keep the ball alive, clip targets, and build a rally.",
    modes: [
      {
        id: "night",
        label: "Night",
        summary: "Balanced speed with a wider paddle and clean monochrome pacing."
      },
      {
        id: "hardcut",
        label: "Hard Cut",
        summary: "Faster rebounds, tighter paddle, less room for mistakes."
      }
    ],
    create: createBlackoutGame
  },
  {
    id: "cipher",
    kicker: "Dark Grid",
    title: "Cipher Chase",
    summary: "Collect signal nodes, route around hunters, and hold the line on a stripped black grid.",
    modes: [
      {
        id: "trace",
        label: "Trace",
        summary: "One hunter to open, with a measured ramp as the grid heats up."
      },
      {
        id: "panic",
        label: "Panic",
        summary: "Starts with two hunters and climbs harder with every pickup."
      }
    ],
    create: createCipherGame
  }
];

let activeGameId = "snake";
let activeModeId = "classic";
let activeGame = null;
let lastFrameTime = performance.now();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function loadScores() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScores() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Ignore storage failures and keep the arcade playable.
  }
}

function getDefinition(gameId = activeGameId) {
  return gameDefinitions.find((definition) => definition.id === gameId) ?? gameDefinitions[0];
}

function getMode(definition, modeId = activeModeId) {
  return definition.modes.find((mode) => mode.id === modeId) ?? definition.modes[0];
}

function getScoreKey(gameId, modeId) {
  return `${gameId}:${modeId}`;
}

function syncBest(gameId, modeId, score) {
  const key = getScoreKey(gameId, modeId);
  const currentBest = scores[key] ?? 0;

  if (score > currentBest) {
    scores[key] = score;
    saveScores();
  }

  return scores[key] ?? 0;
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.arcTo(x + width, y, x + width, y + height, corner);
  ctx.arcTo(x + width, y + height, x, y + height, corner);
  ctx.arcTo(x, y + height, x, y, corner);
  ctx.arcTo(x, y, x + width, y, corner);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

function drawStageBackdrop(ctx, colors) {
  const background = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
  background.addColorStop(0, colors.top);
  background.addColorStop(1, colors.bottom);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = colors.glowA;
  ctx.beginPath();
  ctx.arc(viewport.width * 0.18, viewport.height * 0.16, viewport.width * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.glowB;
  ctx.beginPath();
  ctx.arc(viewport.width * 0.82, viewport.height * 0.18, viewport.width * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  fillRoundedRect(
    ctx,
    22,
    22,
    viewport.width - 44,
    viewport.height - 44,
    30,
    "rgba(5, 12, 20, 0.34)"
  );
  strokeRoundedRect(ctx, 22, 22, viewport.width - 44, viewport.height - 44, 30, "rgba(255, 255, 255, 0.08)");
}

function getGridMetrics(columns, rows, padding = 82) {
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;
  const cellSize = Math.max(16, Math.floor(Math.min(availableWidth / columns, availableHeight / rows)));
  const width = cellSize * columns;
  const height = cellSize * rows;

  return {
    cellSize,
    columns,
    height,
    rows,
    width,
    x: Math.floor((viewport.width - width) / 2),
    y: Math.floor((viewport.height - height) / 2)
  };
}

function drawOverlayCard(ctx, title, subtitle, accent) {
  const width = Math.min(380, viewport.width - 120);
  const height = 156;
  const x = Math.floor((viewport.width - width) / 2);
  const y = Math.floor((viewport.height - height) / 2);

  fillRoundedRect(ctx, x, y, width, height, 24, "rgba(6, 12, 21, 0.8)");
  strokeRoundedRect(ctx, x, y, width, height, 24, accent, 1.5);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 28px "Bahnschrift", "Trebuchet MS", sans-serif';
  ctx.fillText(title, x + width / 2, y + 62);

  ctx.fillStyle = "rgba(228, 236, 245, 0.86)";
  ctx.font = '500 15px "Aptos", "Segoe UI", sans-serif';
  ctx.fillText(subtitle, x + width / 2, y + 96);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  viewport.width = Math.max(320, Math.round(rect.width));
  viewport.height = Math.max(320, Math.round(rect.height));

  canvas.width = Math.round(viewport.width * pixelRatio);
  canvas.height = Math.round(viewport.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function renderGamePicker() {
  gamePicker.innerHTML = "";

  for (const definition of gameDefinitions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-button";

    if (definition.id === activeGameId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `<strong>${definition.title}</strong><span>${definition.summary}</span>`;
    button.addEventListener("click", () => {
      if (definition.id !== activeGameId) {
        switchGame(definition.id);
      }
    });

    gamePicker.append(button);
  }
}

function renderModePicker() {
  const definition = getDefinition();
  modePicker.innerHTML = "";

  for (const mode of definition.modes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-button";

    if (mode.id === activeModeId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `<strong>${mode.label}</strong><span>${mode.summary}</span>`;
    button.addEventListener("click", () => {
      if (mode.id !== activeModeId) {
        switchMode(mode.id);
      }
    });

    modePicker.append(button);
  }
}

function renderHud() {
  if (!activeGame) {
    return;
  }

  const definition = getDefinition();
  const mode = getMode(definition);
  const meta = activeGame.getMeta();
  const best = syncBest(activeGameId, activeModeId, meta.score);

  gameTag.textContent = definition.kicker;
  gameTitle.textContent = definition.title;
  gameSubtitle.textContent = mode.summary;

  scoreLabel.textContent = meta.scoreLabel;
  scoreValue.textContent = String(meta.score);
  bestValue.textContent = String(best);
  modeValue.textContent = mode.label;
  metaLabel.textContent = meta.metricLabel;
  metaValue.textContent = meta.metricValue;
  statusText.textContent = meta.statusText;
  controlHint.textContent = meta.controlHint;
  gameNote.textContent = meta.noteText;
  pauseButton.textContent = meta.isPaused ? "Resume" : "Pause";
  pauseButton.disabled = !meta.canPause;

  controlDeck.classList.toggle("is-hidden", Boolean(meta.controlPadHidden));

  for (const button of controlButtons) {
    const control = meta.controls?.[button.dataset.control] ?? { enabled: false, label: button.textContent };
    button.textContent = control.label;
    button.disabled = !control.enabled;
  }
}

function switchGame(gameId) {
  const definition = getDefinition(gameId);
  const mode = definition.modes[0];

  activeGameId = definition.id;
  activeModeId = mode.id;
  activeGame = definition.create(mode);
  lastFrameTime = performance.now();
  renderGamePicker();
  renderModePicker();
  renderHud();
}

function switchMode(modeId) {
  const definition = getDefinition();
  const mode = getMode(definition, modeId);

  activeModeId = mode.id;
  activeGame = definition.create(mode);
  lastFrameTime = performance.now();
  renderModePicker();
  renderHud();
}

function handleButtonAction(action) {
  if (!activeGame) {
    return;
  }

  if (action === "pause") {
    activeGame.togglePause();
  } else if (action === "restart") {
    activeGame.restart();
  } else {
    activeGame.action(action);
  }

  renderHud();
}

function isStageFullscreen() {
  return document.fullscreenElement === stageElement;
}

function updateFullscreenButton() {
  if (!fullscreenButton) {
    return;
  }

  fullscreenButton.textContent = isStageFullscreen() ? "Exit Full Screen" : "Full Screen";
}

async function toggleFullscreen() {
  if (!stageElement || !document.fullscreenEnabled) {
    return;
  }

  try {
    if (isStageFullscreen()) {
      await document.exitFullscreen();
    } else {
      await stageElement.requestFullscreen();
    }
  } catch {
    // Ignore fullscreen failures and leave the stage usable.
  }
}

function frame(now) {
  const deltaMs = Math.min(48, now - lastFrameTime);
  lastFrameTime = now;

  if (activeGame) {
    activeGame.update(deltaMs, now / 1000);
    activeGame.render(context, now / 1000);
    renderHud();
  }

  window.requestAnimationFrame(frame);
}

function createSnakeGame(mode) {
  const config = {
    classic: {
      accent: "#22c55e",
      gridSize: 18,
      minTickMs: 140,
      tickMs: 140,
      wrap: false
    },
    wrap: {
      accent: "#38bdf8",
      gridSize: 18,
      minTickMs: 124,
      tickMs: 124,
      wrap: true
    },
    rush: {
      accent: "#fb7185",
      gridSize: 18,
      minTickMs: 72,
      speedGain: 4,
      tickMs: 112,
      wrap: false
    }
  }[mode.id];

  function createRunState(status = "ready") {
    return {
      ...createInitialState({ gridSize: config.gridSize }),
      status
    };
  }

  let state = createRunState();
  let accumulator = 0;
  let tickMs = config.tickMs;

  function restart() {
    state = createRunState();
    accumulator = 0;
    tickMs = config.tickMs;
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over" || state.status === "won") {
      state = createRunState("running");
      accumulator = 0;
      tickMs = config.tickMs;
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      const previousScore = state.score;
      state = advanceState(state, { wrap: config.wrap });

      if (config.speedGain && state.score > previousScore) {
        tickMs = Math.max(config.minTickMs, tickMs - config.speedGain);
      }

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    const direction = CONTROL_KEY_TO_DIRECTION[event.key];

    if (direction) {
      state = queueDirection(state, direction);
      return true;
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over" || state.status === "won") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over" || state.status === "won")) {
      return launch();
    }

    return false;
  }

  function render(ctx, time) {
    drawStageBackdrop(ctx, {
      bottom: "#07141b",
      glowA: "rgba(34, 197, 94, 1)",
      glowB: "rgba(56, 189, 248, 1)",
      top: "#081f25"
    });

    const board = getGridMetrics(state.gridSize, state.gridSize, 88);
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 28, "rgba(8, 21, 35, 0.8)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 28, "rgba(255, 255, 255, 0.08)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 18, "#071521");

    ctx.strokeStyle = "rgba(125, 154, 180, 0.16)";
    ctx.lineWidth = 1;

    for (let index = 0; index <= state.gridSize; index += 1) {
      const horizontal = board.y + index * board.cellSize + 0.5;
      const vertical = board.x + index * board.cellSize + 0.5;

      ctx.beginPath();
      ctx.moveTo(board.x, horizontal);
      ctx.lineTo(board.x + board.width, horizontal);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vertical, board.y);
      ctx.lineTo(vertical, board.y + board.height);
      ctx.stroke();
    }

    if (state.food) {
      const pulse = 0.84 + Math.sin(time * 6) * 0.12;
      const centerX = board.x + state.food.x * board.cellSize + board.cellSize / 2;
      const centerY = board.y + state.food.y * board.cellSize + board.cellSize / 2;
      const radius = board.cellSize * 0.26 * pulse;

      ctx.fillStyle = "rgba(255, 122, 94, 0.16)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 2.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff7b5c";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let index = state.snake.length - 1; index >= 0; index -= 1) {
      const segment = state.snake[index];
      const pad = index === 0 ? 3 : 4;
      const x = board.x + segment.x * board.cellSize + pad;
      const y = board.y + segment.y * board.cellSize + pad;
      const size = board.cellSize - pad * 2;
      const color = index === 0 ? "#88f2a8" : "#29c773";

      ctx.shadowBlur = index === 0 ? 18 : 10;
      ctx.shadowColor = "rgba(41, 199, 115, 0.32)";
      fillRoundedRect(ctx, x, y, size, size, 10, color);
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "rgba(232, 240, 248, 0.9)";
    ctx.font = '700 13px "Bahnschrift", "Trebuchet MS", sans-serif';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the run.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Tap pause again or press Space to resume.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Run Ended", "Press Enter or Space to restart.", config.accent);
    } else if (state.status === "won") {
      drawOverlayCard(ctx, "Perfect Clear", "You filled the entire grid.", config.accent);
    }
  }

  return {
    action(control) {
      if (["up", "right", "down", "left"].includes(control)) {
        state = queueDirection(state, control);
        return true;
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Arrow keys or WASD steer. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: true, label: "Down" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: true, label: "Up" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Tempo",
        metricValue: `${tickMs} ms`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        statusText:
          state.status === "ready"
            ? "Cabinet is armed. Pick a line, then press Enter or Space to start."
            : state.status === "game-over"
            ? "Snake clipped the board. Restart and tighten the turns."
            : state.status === "won"
              ? "Full board clear. That is a complete control run."
              : state.status === "paused"
                ? "Run paused. The queue is frozen until you resume."
                : config.wrap
                  ? "Wrap mode is live. Use the walls as hidden tunnels."
                  : mode.id === "rush"
                    ? "Rush mode speeds up after every meal. Stay ahead of the clock."
                    : "Canvas grid is locked to whole cells now, so the board stays perfectly aligned."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createDodgeGame(mode) {
  const config = {
    cruise: {
      accent: "#38bdf8",
      baseTickMs: 176,
      maxHazards: 4,
      minHazards: 2,
      minTickMs: 106
    },
    storm: {
      accent: "#f97316",
      baseTickMs: 148,
      maxHazards: 5,
      minHazards: 3,
      minTickMs: 84
    }
  }[mode.id];

  const columns = 12;
  const rows = 18;
  let accumulator = 0;
  let tickMs = config.baseTickMs;
  function createRunState(status = "ready") {
    return {
      hazards: [],
      playerX: Math.floor(columns / 2),
      score: 0,
      status,
      wave: 1
    };
  }

  let state = createRunState();

  function restart() {
    accumulator = 0;
    tickMs = config.baseTickMs;
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over") {
      accumulator = 0;
      tickMs = config.baseTickMs;
      state = createRunState("running");
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function move(delta) {
    if (state.status === "game-over") {
      return false;
    }

    state = {
      ...state,
      playerX: clamp(state.playerX + delta, 0, columns - 1)
    };
    return true;
  }

  function spawnWave() {
    const count = randomInt(config.minHazards, Math.min(config.maxHazards, config.minHazards + Math.floor(state.wave / 3)));
    const used = new Set();

    while (used.size < count) {
      used.add(Math.floor(Math.random() * columns));
    }

    return Array.from(used, (column) => ({ x: column, y: 0 }));
  }

  function step() {
    const shifted = [];
    let escaped = 0;

    for (const hazard of state.hazards) {
      const nextY = hazard.y + 1;

      if (nextY >= rows) {
        escaped += 1;
      } else {
        shifted.push({ x: hazard.x, y: nextY });
      }
    }

    const nextScore = state.score + 1 + escaped * 4;
    const nextWave = 1 + Math.floor(nextScore / 40);
    const nextHazards = [...shifted, ...spawnWave()];
    const collision = nextHazards.some((hazard) => hazard.y === rows - 1 && hazard.x === state.playerX);

    tickMs = Math.max(config.minTickMs, config.baseTickMs - (nextWave - 1) * 4);
    state = {
      ...state,
      hazards: nextHazards,
      score: nextScore,
      status: collision ? "game-over" : state.status,
      wave: nextWave
    };
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      step();

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      return move(-1);
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      return move(1);
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, {
      bottom: "#08111f",
      glowA: "rgba(56, 189, 248, 1)",
      glowB: "rgba(249, 115, 22, 1)",
      top: "#10223a"
    });

    const board = getGridMetrics(columns, rows, 92);
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 28, "rgba(7, 17, 29, 0.82)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 28, "rgba(255, 255, 255, 0.08)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 20, "#071422");

    for (let column = 0; column < columns; column += 1) {
      const x = board.x + column * board.cellSize;
      const stripe = column % 2 === 0 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.015)";
      fillRoundedRect(ctx, x + 2, board.y + 2, board.cellSize - 4, board.height - 4, 12, stripe);
    }

    ctx.strokeStyle = "rgba(130, 158, 184, 0.12)";
    ctx.lineWidth = 1;

    for (let row = 1; row < rows; row += 1) {
      const y = board.y + row * board.cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(board.x, y);
      ctx.lineTo(board.x + board.width, y);
      ctx.stroke();
    }

    for (const hazard of state.hazards) {
      const x = board.x + hazard.x * board.cellSize + 6;
      const y = board.y + hazard.y * board.cellSize + 6;
      const size = board.cellSize - 12;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(249, 115, 22, 0.45)";
      fillRoundedRect(ctx, x, y, size, size, 10, "#ff8f3d");
      ctx.shadowBlur = 0;
    }

    const playerY = board.y + (rows - 1) * board.cellSize + 6;
    const playerX = board.x + state.playerX * board.cellSize + board.cellSize / 2;
    ctx.fillStyle = "#8be9ff";
    ctx.shadowBlur = 22;
    ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
    ctx.beginPath();
    ctx.moveTo(playerX, playerY + 4);
    ctx.lineTo(playerX - board.cellSize * 0.28, playerY + board.cellSize - 6);
    ctx.lineTo(playerX + board.cellSize * 0.28, playerY + board.cellSize - 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(232, 240, 248, 0.9)";
    ctx.font = '700 13px "Bahnschrift", "Trebuchet MS", sans-serif';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to launch the run.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you are ready to re-enter traffic.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Impact", "Press Enter or Space to restart the run.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "left") {
        return move(-1);
      }

      if (control === "right") {
        return move(1);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Use Left and Right or A and D to weave. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Locked" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: false, label: "Locked" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Wave",
        metricValue: String(state.wave),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        statusText:
          state.status === "ready"
            ? "Run is queued. Press Enter or Space when you want the first wave."
            : state.status === "game-over"
            ? "Meteor contact. The lane pattern closed before the ship cleared."
            : state.status === "paused"
              ? "Traffic frozen. Resume to keep the survival score climbing."
              : mode.id === "storm"
                ? "Storm mode is dense. Read the next row before you commit."
                : "Cruise mode ramps more gently, but the board still tightens over time."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createMemoryGame(mode) {
  const config = {
    focus: {
      accent: "#a855f7",
      clearDelay: 520,
      flashGap: 210,
      flashOn: 560,
      introDelay: 420
    },
    rush: {
      accent: "#ec4899",
      clearDelay: 420,
      flashGap: 140,
      flashOn: 360,
      introDelay: 260
    }
  }[mode.id];

  const palette = ["#5eead4", "#60a5fa", "#a78bfa", "#f472b6", "#fb7185", "#f59e0b", "#22c55e", "#38bdf8", "#f97316"];
  let hitRegions = [];
  let state;

  function startRound() {
    state.sequence.push(Math.floor(Math.random() * 9));
    state.flashIndex = null;
    state.inputIndex = 0;
    state.showIndex = 0;
    state.status = "showing";
    state.timer = config.introDelay;
  }

  function restart() {
    state = {
      flashIndex: null,
      inputIndex: 0,
      pausedFrom: null,
      pressedIndex: null,
      pressedTimer: 0,
      score: 0,
      sequence: [],
      showIndex: 0,
      status: "ready",
      timer: 0
    };
  }

  function launch() {
    if (state.status === "ready") {
      state.sequence = [];
      state.score = 0;
      state.flashIndex = null;
      state.inputIndex = 0;
      state.showIndex = 0;
      state.pressedIndex = null;
      state.pressedTimer = 0;
      startRound();
      return true;
    }

    if (state.status === "game-over") {
      restart();
      return launch();
    }

    return false;
  }

  function togglePause() {
    if (state.status === "game-over" || state.status === "ready") {
      return false;
    }

    if (state.status === "paused") {
      state.status = state.pausedFrom ?? "showing";
      state.pausedFrom = null;
      return true;
    }

    state.pausedFrom = state.status;
    state.status = "paused";
    return true;
  }

  function acceptIndex(index) {
    if (state.status !== "input") {
      return false;
    }

    state.pressedIndex = index;
    state.pressedTimer = 180;

    if (index !== state.sequence[state.inputIndex]) {
      state.status = "game-over";
      return true;
    }

    state.inputIndex += 1;

    if (state.inputIndex >= state.sequence.length) {
      state.score += 1;
      state.status = "round-clear";
      state.timer = config.clearDelay;
    }

    return true;
  }

  function update(deltaMs) {
    if (state.pressedTimer > 0) {
      state.pressedTimer = Math.max(0, state.pressedTimer - deltaMs);

      if (state.pressedTimer === 0) {
        state.pressedIndex = null;
      }
    }

    if (state.status === "paused" || state.status === "game-over") {
      return;
    }

    if (state.status === "round-clear") {
      state.timer -= deltaMs;

      if (state.timer <= 0) {
        startRound();
      }

      return;
    }

    if (state.status !== "showing") {
      return;
    }

    state.timer -= deltaMs;

    while (state.timer <= 0 && state.status === "showing") {
      if (state.flashIndex === null) {
        if (state.showIndex >= state.sequence.length) {
          state.status = "input";
          state.flashIndex = null;
          break;
        }

        state.flashIndex = state.sequence[state.showIndex];
        state.timer += config.flashOn;
      } else {
        state.flashIndex = null;
        state.showIndex += 1;
        state.timer += config.flashGap;
      }
    }
  }

  function keydown(event) {
    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    const index = MEMORY_KEY_TO_INDEX[event.key];

    if (index !== undefined) {
      return acceptIndex(index);
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, {
      bottom: "#14142b",
      glowA: "rgba(168, 85, 247, 1)",
      glowB: "rgba(236, 72, 153, 1)",
      top: "#20133f"
    });

    const boardSize = Math.min(viewport.width, viewport.height) - 182;
    const gap = Math.max(12, Math.floor(boardSize * 0.035));
    const tileSize = Math.floor((boardSize - gap * 2) / 3);
    const size = tileSize * 3 + gap * 2;
    const startX = Math.floor((viewport.width - size) / 2);
    const startY = Math.floor((viewport.height - size) / 2);

    hitRegions = [];

    fillRoundedRect(ctx, startX - 24, startY - 24, size + 48, size + 48, 30, "rgba(10, 11, 24, 0.78)");
    strokeRoundedRect(ctx, startX - 24, startY - 24, size + 48, size + 48, 30, "rgba(255, 255, 255, 0.08)");

    for (let index = 0; index < 9; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + column * (tileSize + gap);
      const y = startY + row * (tileSize + gap);
      const active = state.flashIndex === index || state.pressedIndex === index;
      const color = palette[index];
      const fill = active ? color : "rgba(255, 255, 255, 0.08)";
      const stroke = active ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.1)";

      ctx.shadowBlur = active ? 28 : 0;
      ctx.shadowColor = color;
      fillRoundedRect(ctx, x, y, tileSize, tileSize, 22, fill);
      ctx.shadowBlur = 0;
      strokeRoundedRect(ctx, x, y, tileSize, tileSize, 22, stroke, 1.5);

      ctx.fillStyle = active ? "#0f1020" : "rgba(255, 255, 255, 0.82)";
      ctx.font = '700 28px "Bahnschrift", "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), x + tileSize / 2, y + tileSize / 2 + 10);

      hitRegions.push({ index, size: tileSize, x, y });
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(232, 240, 248, 0.9)";
    ctx.font = '700 13px "Bahnschrift", "Trebuchet MS", sans-serif';
    ctx.fillText(mode.label.toUpperCase(), startX, startY - 34);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the pattern.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume to continue the pattern chain.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Sequence Broken", "Press Enter or Space to restart.", config.accent);
    } else if (state.status === "round-clear") {
      drawOverlayCard(ctx, "Clean Recall", "Next pattern loading.", config.accent);
    }
  }

  restart();

  return {
    action() {
      return false;
    },
    getMeta() {
      return {
        canPause: state.status !== "game-over" && state.status !== "ready",
        controlHint: "Tap pads or use number keys 1 to 9. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Tap" },
          left: { enabled: false, label: "Tap" },
          right: { enabled: false, label: "Tap" },
          up: { enabled: false, label: "Tap" }
        },
        controlPadHidden: true,
        isPaused: state.status === "paused",
        metricLabel: state.status === "input" ? "Input" : "Chain",
        metricValue:
          state.status === "input"
            ? `${state.inputIndex}/${state.sequence.length}`
            : String(state.sequence.length),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Rounds",
        statusText:
          state.status === "ready"
            ? "Pattern deck is waiting. Press Enter or Space when you are ready."
            : state.status === "game-over"
            ? "Wrong tile. The chain broke on recall."
            : state.status === "paused"
              ? "Pattern playback is frozen until you resume."
              : state.status === "input"
                ? "Your turn. Repeat the full pattern without hesitation."
                : mode.id === "rush"
                  ? "Rush mode trims the flash windows. Read early and commit."
                  : "Focus mode gives you more reveal time to build a longer chain."
      };
    },
    keydown,
    pointerdown(point) {
      for (const region of hitRegions) {
        if (
          point.x >= region.x &&
          point.x <= region.x + region.size &&
          point.y >= region.y &&
          point.y <= region.y + region.size
        ) {
          return acceptIndex(region.index);
        }
      }

      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createBlackoutGame(mode) {
  const config = {
    night: {
      accent: "#f5f7fb",
      ballSpeed: 300,
      paddleStep: 46,
      paddleWidth: 136,
      targetColumns: 5
    },
    hardcut: {
      accent: "#f59e0b",
      ballSpeed: 352,
      paddleStep: 38,
      paddleWidth: 108,
      targetColumns: 6
    }
  }[mode.id];

  const world = { height: 1000, width: 1000 };
  const ballRadius = 12;
  const paddleHeight = 18;
  const paddleY = 912;
  const targetGap = 18;
  const targetHeight = 18;

  function createTargets() {
    const width = config.targetColumns === 6 ? 104 : 118;
    const totalWidth = config.targetColumns * width + (config.targetColumns - 1) * targetGap;
    const startX = (world.width - totalWidth) / 2;
    const targets = [];

    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < config.targetColumns; column += 1) {
        targets.push({
          height: targetHeight,
          live: true,
          width,
          x: startX + column * (width + targetGap),
          y: 150 + row * 54
        });
      }
    }

    return targets;
  }

  function createRunState(status = "ready") {
    return {
      ball: {
        vx: (Math.random() > 0.5 ? 1 : -1) * config.ballSpeed * 0.72,
        vy: -config.ballSpeed,
        x: world.width / 2,
        y: world.height * 0.68
      },
      paddleX: world.width / 2,
      score: 0,
      status,
      streak: 0,
      targets: createTargets()
    };
  }

  function intersectsCircle(rect, circleX, circleY, radius) {
    const closestX = clamp(circleX, rect.x, rect.x + rect.width);
    const closestY = clamp(circleY, rect.y, rect.y + rect.height);
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  let state = createRunState();

  function restart() {
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over") {
      state = createRunState("running");
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function move(delta) {
    if (state.status === "game-over") {
      return false;
    }

    const halfWidth = config.paddleWidth / 2;
    state = {
      ...state,
      paddleX: clamp(state.paddleX + delta, 80 + halfWidth, world.width - 80 - halfWidth)
    };
    return true;
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const nextBall = {
      ...state.ball,
      x: state.ball.x + state.ball.vx * deltaSeconds,
      y: state.ball.y + state.ball.vy * deltaSeconds
    };

    let nextTargets = state.targets;
    let nextScore = state.score;
    let nextStreak = state.streak;
    let nextStatus = state.status;

    if (nextBall.x <= 70 + ballRadius || nextBall.x >= world.width - 70 - ballRadius) {
      nextBall.x = clamp(nextBall.x, 70 + ballRadius, world.width - 70 - ballRadius);
      nextBall.vx *= -1;
    }

    if (nextBall.y <= 90 + ballRadius) {
      nextBall.y = 90 + ballRadius;
      nextBall.vy = Math.abs(nextBall.vy);
    }

    const halfWidth = config.paddleWidth / 2;
    const paddleRect = {
      height: paddleHeight,
      width: config.paddleWidth,
      x: state.paddleX - halfWidth,
      y: paddleY - paddleHeight / 2
    };

    if (
      nextBall.vy > 0 &&
      intersectsCircle(paddleRect, nextBall.x, nextBall.y, ballRadius)
    ) {
      const offset = (nextBall.x - state.paddleX) / halfWidth;
      nextBall.y = paddleRect.y - ballRadius;
      nextBall.vy = -Math.abs(nextBall.vy);
      nextBall.vx = clamp(nextBall.vx + offset * 220, -520, 520);
      nextScore += 1;
      nextStreak += 1;
    }

    for (let index = 0; index < nextTargets.length; index += 1) {
      const target = nextTargets[index];

      if (!target.live || !intersectsCircle(target, nextBall.x, nextBall.y, ballRadius)) {
        continue;
      }

      nextBall.vy *= -1;
      nextTargets = nextTargets.map((item, itemIndex) => (itemIndex === index ? { ...item, live: false } : item));
      nextScore += 5;
      nextStreak += 1;
      break;
    }

    if (nextTargets.length > 0 && nextTargets.every((target) => !target.live)) {
      nextTargets = createTargets();
      nextScore += 12;
    }

    if (nextBall.y - ballRadius > world.height + 20) {
      nextStatus = "game-over";
    }

    state = {
      ...state,
      ball: nextBall,
      score: nextScore,
      status: nextStatus,
      streak: nextStreak,
      targets: nextTargets
    };
  }

  function keydown(event) {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      return move(-config.paddleStep);
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      return move(config.paddleStep);
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, {
      bottom: "#020202",
      glowA: "rgba(255, 255, 255, 0.06)",
      glowB: "rgba(239, 91, 42, 0.14)",
      top: "#0a0a0a"
    });

    const board = getGridMetrics(20, 20, 92);
    const scale = board.width / world.width;
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 18, "rgba(8, 8, 8, 0.92)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 18, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 12, "#030303");

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let index = 0; index <= 20; index += 1) {
      const position = board.x + (board.width / 20) * index + 0.5;
      const vertical = board.y + (board.height / 20) * index + 0.5;

      ctx.beginPath();
      ctx.moveTo(position, board.y);
      ctx.lineTo(position, board.y + board.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(board.x, vertical);
      ctx.lineTo(board.x + board.width, vertical);
      ctx.stroke();
    }

    for (const target of state.targets) {
      if (!target.live) {
        continue;
      }

      fillRoundedRect(
        ctx,
        board.x + target.x * scale,
        board.y + target.y * scale,
        target.width * scale,
        target.height * scale,
        6,
        "rgba(255, 255, 255, 0.92)"
      );
    }

    fillRoundedRect(
      ctx,
      board.x + (state.paddleX - config.paddleWidth / 2) * scale,
      board.y + (paddleY - paddleHeight / 2) * scale,
      config.paddleWidth * scale,
      paddleHeight * scale,
      6,
      "#f6f7fb"
    );

    ctx.fillStyle = "#f6f7fb";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(board.x + state.ball.x * scale, board.y + state.ball.y * scale, ballRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = '700 13px "Bahnschrift", "Trebuchet MS", sans-serif';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the cabinet.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you want the rally back.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Drop", "Press Enter or Space to restart the rally.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "left") {
        return move(-config.paddleStep);
      }

      if (control === "right") {
        return move(config.paddleStep);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Use Left and Right or A and D. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Locked" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: false, label: "Locked" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Rally",
        metricValue: String(state.streak),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        statusText:
          state.status === "ready"
            ? "Blackout is idle. Press Enter or Space to start the rally."
            : state.status === "game-over"
              ? "Ball dropped below the rail. Restart and catch the next return."
              : state.status === "paused"
                ? "Rally frozen. Resume when you want the cabinet live again."
                : mode.id === "hardcut"
                  ? "Hard Cut tightens the paddle and pushes a faster return angle."
                  : "Night mode keeps the paddle wider and the rhythm steadier."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createCipherGame(mode) {
  const config = {
    trace: {
      accent: "#7dd3fc",
      baseHunters: 1,
      maxHunters: 3,
      minTickMs: 108,
      tickMs: 176
    },
    panic: {
      accent: "#f87171",
      baseHunters: 2,
      maxHunters: 4,
      minTickMs: 92,
      tickMs: 144
    }
  }[mode.id];

  const gridSize = 14;
  let accumulator = 0;
  let tickMs = config.tickMs;

  function sameCell(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function buildCorners() {
    return [
      { x: 1, y: 1 },
      { x: gridSize - 2, y: 1 },
      { x: 1, y: gridSize - 2 },
      { x: gridSize - 2, y: gridSize - 2 }
    ];
  }

  function isTaken(cell, cells) {
    return cells.some((item) => item && sameCell(item, cell));
  }

  function createPickup(player, hunters) {
    const blocked = [player, ...hunters];

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidate = {
        x: randomInt(0, gridSize - 1),
        y: randomInt(0, gridSize - 1)
      };

      if (!isTaken(candidate, blocked)) {
        return candidate;
      }
    }

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const candidate = { x, y };

        if (!isTaken(candidate, blocked)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function createHunter(player, hunters, pickup) {
    const corners = buildCorners();

    for (const corner of corners) {
      if (!isTaken(corner, [player, pickup, ...hunters])) {
        return corner;
      }
    }

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const candidate = { x, y };

        if (!isTaken(candidate, [player, pickup, ...hunters])) {
          return candidate;
        }
      }
    }

    return null;
  }

  function createHunters(count, player) {
    return buildCorners()
      .filter((corner) => !sameCell(corner, player))
      .slice(0, count);
  }

  function createRunState(status = "ready") {
    const player = {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2)
    };
    const hunters = createHunters(config.baseHunters, player);

    return {
      hunters,
      pickup: createPickup(player, hunters),
      player,
      queuedDirection: null,
      score: 0,
      status,
      tick: 0
    };
  }

  let state = createRunState();

  function restart() {
    accumulator = 0;
    tickMs = config.tickMs;
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over") {
      accumulator = 0;
      tickMs = config.tickMs;
      state = createRunState("running");
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function setDirection(direction) {
    if (!DIRECTION_VECTORS[direction] || state.status === "game-over") {
      return false;
    }

    state = {
      ...state,
      queuedDirection: direction
    };
    return true;
  }

  function moveHunter(hunter, player, tickOffset) {
    const dx = player.x - hunter.x;
    const dy = player.y - hunter.y;

    if (dx === 0 && dy === 0) {
      return hunter;
    }

    const preferX = Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && tickOffset % 2 === 0);

    if (preferX && dx !== 0) {
      return { x: hunter.x + Math.sign(dx), y: hunter.y };
    }

    if (dy !== 0) {
      return { x: hunter.x, y: hunter.y + Math.sign(dy) };
    }

    return { x: hunter.x + Math.sign(dx), y: hunter.y };
  }

  function step() {
    const vector = state.queuedDirection ? DIRECTION_VECTORS[state.queuedDirection] : null;
    const nextPlayer = vector
      ? {
          x: clamp(state.player.x + vector.x, 0, gridSize - 1),
          y: clamp(state.player.y + vector.y, 0, gridSize - 1)
        }
      : state.player;

    if (state.hunters.some((hunter) => sameCell(hunter, nextPlayer))) {
      state = {
        ...state,
        player: nextPlayer,
        status: "game-over",
        tick: state.tick + 1
      };
      return;
    }

    let nextScore = state.score;
    let nextHunters = state.hunters.map((hunter, index) => moveHunter(hunter, nextPlayer, state.tick + index));
    let nextPickup = state.pickup;
    let nextStatus = state.status;

    if (nextHunters.some((hunter) => sameCell(hunter, nextPlayer))) {
      nextStatus = "game-over";
    }

    if (nextStatus === "running" && nextPickup && sameCell(nextPlayer, nextPickup)) {
      nextScore += 1;
      tickMs = Math.max(config.minTickMs, config.tickMs - nextScore * 4);

      if (nextScore % 4 === 0 && nextHunters.length < config.maxHunters) {
        const newHunter = createHunter(nextPlayer, nextHunters, nextPickup);

        if (newHunter) {
          nextHunters = [...nextHunters, newHunter];
        }
      }

      nextPickup = createPickup(nextPlayer, nextHunters);
    }

    state = {
      ...state,
      hunters: nextHunters,
      pickup: nextPickup,
      player: nextPlayer,
      score: nextScore,
      status: nextStatus,
      tick: state.tick + 1
    };
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      step();

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    const direction = CONTROL_KEY_TO_DIRECTION[event.key];

    if (direction) {
      return setDirection(direction);
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx, time) {
    drawStageBackdrop(ctx, {
      bottom: "#010101",
      glowA: "rgba(125, 211, 252, 0.1)",
      glowB: "rgba(248, 113, 113, 0.12)",
      top: "#090909"
    });

    const board = getGridMetrics(gridSize, gridSize, 88);
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 16, "rgba(5, 5, 5, 0.94)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 16, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 10, "#020202");

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let index = 0; index <= gridSize; index += 1) {
      const horizontal = board.y + index * board.cellSize + 0.5;
      const vertical = board.x + index * board.cellSize + 0.5;

      ctx.beginPath();
      ctx.moveTo(board.x, horizontal);
      ctx.lineTo(board.x + board.width, horizontal);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vertical, board.y);
      ctx.lineTo(vertical, board.y + board.height);
      ctx.stroke();
    }

    if (state.pickup) {
      const centerX = board.x + state.pickup.x * board.cellSize + board.cellSize / 2;
      const centerY = board.y + state.pickup.y * board.cellSize + board.cellSize / 2;
      const pulse = 0.9 + Math.sin(time * 5.2) * 0.12;
      const size = board.cellSize * 0.22 * pulse;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI / 4);
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(125, 211, 252, 0.46)";
      fillRoundedRect(ctx, -size, -size, size * 2, size * 2, 4, "#9ae6ff");
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    for (const hunter of state.hunters) {
      const x = board.x + hunter.x * board.cellSize + 5;
      const y = board.y + hunter.y * board.cellSize + 5;
      const size = board.cellSize - 10;

      strokeRoundedRect(ctx, x, y, size, size, 4, "rgba(248, 113, 113, 0.95)", 1.5);
      ctx.strokeStyle = "rgba(248, 113, 113, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + size - 6, y + size - 6);
      ctx.moveTo(x + size - 6, y + 6);
      ctx.lineTo(x + 6, y + size - 6);
      ctx.stroke();
    }

    const playerX = board.x + state.player.x * board.cellSize + 4;
    const playerY = board.y + state.player.y * board.cellSize + 4;
    const playerSize = board.cellSize - 8;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 255, 255, 0.26)";
    fillRoundedRect(ctx, playerX, playerY, playerSize, playerSize, 4, "#f4f7fb");
    ctx.shadowBlur = 0;
    strokeRoundedRect(ctx, playerX + 5, playerY + 5, playerSize - 10, playerSize - 10, 2, "rgba(5, 10, 16, 0.5)");

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = '700 13px "Bahnschrift", "Trebuchet MS", sans-serif';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the chase.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you want the grid live again.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Caught", "Press Enter or Space to restart the chase.", config.accent);
    }
  }

  return {
    action(control) {
      if (["up", "right", "down", "left"].includes(control)) {
        return setDirection(control);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Arrow keys or WASD route the runner. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: true, label: "Down" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: true, label: "Up" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Heat",
        metricValue: `${state.hunters.length}x`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Nodes",
        statusText:
          state.status === "ready"
            ? "Cipher grid is waiting. Press Enter or Space to start the hunt."
            : state.status === "game-over"
              ? "Hunter contact. Reset and keep more space between lines."
              : state.status === "paused"
                ? "Grid frozen. Resume to continue the route."
                : mode.id === "panic"
                  ? "Panic mode starts hot and stacks more hunters faster."
                  : "Trace mode builds pressure steadily as the board fills with hunters."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!activeGame) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  if (activeGame.pointerdown(point)) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (!activeGame) {
    return;
  }

  if (activeGame.keydown(event)) {
    event.preventDefault();
  }
});

pauseButton.addEventListener("click", () => {
  handleButtonAction("pause");
});

restartButton.addEventListener("click", () => {
  handleButtonAction("restart");
});

if (fullscreenButton) {
  if (!document.fullscreenEnabled) {
    fullscreenButton.disabled = true;
  }

  fullscreenButton.addEventListener("click", () => {
    toggleFullscreen();
  });
}

for (const button of controlButtons) {
  button.addEventListener("click", () => {
    handleButtonAction(button.dataset.control);
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
});

document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();
  resizeCanvas();
});

resizeCanvas();
switchGame(activeGameId);
updateFullscreenButton();
window.requestAnimationFrame(frame);
