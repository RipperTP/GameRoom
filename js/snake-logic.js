export const DEFAULT_GRID_SIZE = 18;
export const DEFAULT_DIRECTION = "right";
export const DEFAULT_TICK_MS = 140;

export const DIRECTION_VECTORS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
});

const OPPOSITE_DIRECTIONS = Object.freeze({
  up: "down",
  right: "left",
  down: "up",
  left: "right"
});

function cloneSegment(segment) {
  return { x: segment.x, y: segment.y };
}

function toKey(position) {
  return `${position.x},${position.y}`;
}

function isSamePosition(first, second) {
  return first.x === second.x && first.y === second.y;
}

function createDefaultSnake(gridSize) {
  const centerY = Math.floor(gridSize / 2);
  const centerX = Math.floor(gridSize / 2);

  return [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ];
}

function clampRandom(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 0.9999999999999999;
  }

  return value;
}

function getNextDirection(currentDirection, queuedDirection, snakeLength) {
  if (!queuedDirection || !DIRECTION_VECTORS[queuedDirection]) {
    return currentDirection;
  }

  if (snakeLength > 1 && OPPOSITE_DIRECTIONS[currentDirection] === queuedDirection) {
    return currentDirection;
  }

  return queuedDirection;
}

export function isInsideBoard(position, gridSize) {
  return position.x >= 0 && position.x < gridSize && position.y >= 0 && position.y < gridSize;
}

export function wrapPosition(position, gridSize) {
  return {
    x: (position.x + gridSize) % gridSize,
    y: (position.y + gridSize) % gridSize
  };
}

export function placeFood(snake, gridSize, rng = Math.random) {
  const occupied = new Set(snake.map(toKey));
  const openCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const position = { x, y };

      if (!occupied.has(toKey(position))) {
        openCells.push(position);
      }
    }
  }

  if (openCells.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(clampRandom(rng()) * openCells.length);
  return openCells[randomIndex];
}

export function createInitialState({
  direction = DEFAULT_DIRECTION,
  food,
  gridSize = DEFAULT_GRID_SIZE,
  queuedDirection = direction,
  rng = Math.random,
  snake = createDefaultSnake(gridSize)
} = {}) {
  const nextSnake = snake.map(cloneSegment);
  const nextFood = food ? cloneSegment(food) : placeFood(nextSnake, gridSize, rng);

  return {
    direction,
    food: nextFood,
    gridSize,
    queuedDirection,
    score: 0,
    snake: nextSnake,
    status: nextFood === null ? "won" : "running"
  };
}

export function queueDirection(state, requestedDirection) {
  if (!DIRECTION_VECTORS[requestedDirection] || state.status === "game-over" || state.status === "won") {
    return state;
  }

  return {
    ...state,
    queuedDirection: getNextDirection(state.direction, requestedDirection, state.snake.length)
  };
}

export function advanceState(state, rng = Math.random) {
  const options = typeof rng === "function" ? { rng } : rng;
  const randomSource = options.rng ?? Math.random;
  const wrap = options.wrap ?? false;

  if (state.status !== "running") {
    return state;
  }

  const direction = getNextDirection(state.direction, state.queuedDirection, state.snake.length);
  const vector = DIRECTION_VECTORS[direction];
  let nextHead = {
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y
  };

  if (wrap) {
    nextHead = wrapPosition(nextHead, state.gridSize);
  } else if (!isInsideBoard(nextHead, state.gridSize)) {
    return {
      ...state,
      direction,
      queuedDirection: direction,
      status: "game-over"
    };
  }

  const willEatFood = state.food !== null && isSamePosition(nextHead, state.food);
  const collisionTargets = willEatFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = collisionTargets.some((segment) => isSamePosition(segment, nextHead));

  if (hitSelf) {
    return {
      ...state,
      direction,
      queuedDirection: direction,
      status: "game-over"
    };
  }

  const nextSnake = [nextHead, ...state.snake.map(cloneSegment)];

  if (!willEatFood) {
    nextSnake.pop();
  }

  const nextFood = willEatFood ? placeFood(nextSnake, state.gridSize, randomSource) : state.food;

  return {
    ...state,
    direction,
    food: nextFood,
    queuedDirection: direction,
    score: willEatFood ? state.score + 1 : state.score,
    snake: nextSnake,
    status: willEatFood && nextFood === null ? "won" : "running"
  };
}
