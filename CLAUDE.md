# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Running the arcade**: Open `index.html` in a modern browser. No build tools, servers, or installation needed—it's pure vanilla JavaScript.

**Development**: Edit files directly and refresh the browser to see changes. Use browser DevTools (F12) for debugging.

## Project Overview

**Signal Room Arcade** is a browser-based mini-game collection featuring five arcade-style games, each with multiple difficulty modes. Games are playable with keyboard, mouse/touch, and support fullscreen. Scores persist to localStorage per game/mode.

## Architecture

### Core Files

- **`index.html`**: Page structure, canvas target, UI panels (game picker, mode select, stats grid, touch controls).
- **`js/arcade.js`**: Main game controller (~1100 lines). Handles game lifecycle, rendering loop, UI updates, input routing, score persistence.
- **`js/snake-logic.js`**: Game-agnostic state machine for the Snake game (grid-based movement, collision, food placement).
- **`css/styles.css`**: Design system with CSS variables (color palette, shadows, spacing), layout grid, and component styles.

### High-Level Flow

1. **Initialization**: Arcade loads game definitions, renders the game/mode picker UI, initializes the first game (Snake/Classic).
2. **Game Lifecycle**: User selects a game → `switchGame()` instantiates it via `definition.create(mode)` → game runs in the main render loop.
3. **Frame Loop**: `requestAnimationFrame(frame)` runs continuously. Each frame: calls `activeGame.update(deltaMs)`, `activeGame.render(ctx, time)`, then `renderHud()` to refresh UI.
4. **Input Handling**: Keyboard events route to `activeGame.keydown()` or convert to control actions. Touch buttons call `activeGame.action()`. Space/Enter launch or pause.
5. **Scoring**: `syncBest()` tracks high scores per game/mode in localStorage under key `"ultra-arcade-scores-v1"`.

### Game Definition Pattern

Each game is defined in the `gameDefinitions` array (arcade.js:57–158):

```javascript
{
  id: "snake",
  kicker: "Precision Grid",           // Subtitle for the stage header
  title: "Snake",                     // Game name
  summary: "The classic loop...",     // Picker description
  modes: [
    {
      id: "classic",
      label: "Classic",
      summary: "Solid walls..."
    }
    // ... more modes
  ],
  create: createSnakeGame              // Function that instantiates the game
}
```

The `create(mode)` function returns a game instance with this interface:

```javascript
{
  action(control)           // Called by touch buttons; control = "up"|"down"|"left"|"right"
  getMeta()                 // Returns { score, scoreLabel, metricValue, canPause, isPaused, ... }
  keydown(event)            // Called on key press; return true if handled
  pointerdown()             // Optional pointer handler
  render(ctx, time)         // Draw to canvas (ctx = 2D context, time = elapsed seconds)
  restart()                 // Reset game state
  togglePause()             // Toggle pause state
  update(deltaMs, time)     // Update game logic (deltaMs = frame delta in ms)
}
```

### Rendering

- Canvas is 720×720 by default; resizes to container. `resizeCanvas()` is called once at init (viewport and pixel ratio).
- `drawStageBackdrop()` renders a gradient background with glow effects.
- `getGridMetrics()` computes grid layout for board games (cell size, position, dimensions).
- `fillRoundedRect()` and `strokeRoundedRect()` are helpers for UI shapes.
- `drawOverlayCard()` renders centered modal text (e.g., "Ready", "Paused", "Game Over").

## Adding a New Game

1. **Create the game factory** in `arcade.js` (e.g., `createMyGame(mode)`):
   - Declare per-mode config (colors, speeds, sizes, etc.).
   - Initialize game state.
   - Return an object implementing the game interface (see pattern above).

2. **Add a game definition** to `gameDefinitions` with id, title, kicker, modes, and a reference to your factory.

3. **Key Implementation Tips**:
   - Use `mode.id` to branch logic (e.g., difficulty).
   - Track state immutably in `update()` if possible (or use closures).
   - Return `false` from `action()` or `keydown()` if not handled.
   - `getMeta()` drives all HUD updates (score, labels, hints, control button state).
   - Pause state is typically tracked as `status === "paused"` in the game state.
   - Use the canvas viewport size (e.g., `viewport.width`) to scale graphics for responsiveness.

4. **Canvas Rendering Guidelines**:
   - Set context transform (e.g., `ctx.fillStyle`, `ctx.font`) before drawing.
   - Use time-based animations: `Math.sin(time * frequency)` for pulsing, cycling, or oscillation.
   - Keep color constants consistent with the design system or mode config.

## Key Patterns

- **Immutable State**: Snake logic (`advanceState`) returns a new state object rather than mutating.
- **Closure-Based Games**: Snake, Dodge, Memory, etc., use closures to encapsulate private state and methods, returning only the public interface.
- **Fixed Tick Loop with Accumulator**: Snake uses `accumulator += deltaMs; while (accumulator >= tickMs)` to advance game logic at a fixed timestep, decoupled from frame rate.
- **Config Per Mode**: Each mode has a config object (colors, speeds, grid sizes) that the game factory reads to branch behavior.
- **Conditional Render Overlays**: Games render "Ready", "Paused", "Game Over" overlays conditionally based on state status.

## UI & Styling

- **Design System**: CSS variables in `:root` for color (--ink, --signal, --mint, --navy, etc.), shadows, and radius.
- **Layout**: Flexbox-based layout with a rail sidebar and central stage. Hero section at top with game feature strip.
- **Picker Buttons**: Game and mode pickers use `.picker-button` and `.mode-button` classes; `.is-active` indicates selection.
- **Touch Controls**: `.control-pad` has directional buttons. Visibility is toggled by `controlDeck.classList.toggle("is-hidden")` based on game's `controlPadHidden` flag.
- **Stat Cards**: `.stat-card` shows score, best, mode, and metric (tempo, etc.).

## Storage

Scores are stored in localStorage under the key `"ultra-arcade-scores-v1"` as a flat JSON object:

```json
{
  "snake:classic": 25,
  "snake:wrap": 18,
  "dodge:cruise": 150,
  ...
}
```

Key format is `gameId:modeId`. Failures to read/write are silently ignored to keep the arcade playable offline.

## Browser Compatibility

- Uses ES6 modules (`import`/`export`), `requestAnimationFrame`, Canvas 2D, localStorage, and Fullscreen API.
- Supports keyboard (Arrow keys, WASD), touch (buttons), and pointer events.
- Tested on modern browsers (Chrome, Firefox, Safari, Edge).

## Development Workflow

1. **Edit game logic or UI**: Modify `.js` or `.css` directly.
2. **Refresh browser** (Ctrl+R or Cmd+R) to reload.
3. **Debug in DevTools**: Breakpoints, console logging, canvas inspection.
4. **Test scoring**: Open DevTools → Application → LocalStorage, check `"ultra-arcade-scores-v1"`.
5. **Test responsiveness**: Resize window or use device emulation; canvas scales automatically.

## Common Tasks

### Adjust Game Speed/Difficulty
Edit the `config` object in the game factory (e.g., `tickMs`, `gridSize`, `maxHazards`).

### Change Colors
Update CSS variables in `styles.css` for global colors, or set per-mode `accent` color in the config.

### Add a New Mode to an Existing Game
1. Add entry to the game's `modes` array in `gameDefinitions`.
2. Add a config block in the game factory for the new mode id.

### Hide/Show Touch Controls
In the game's `getMeta()`, set `controlPadHidden: true/false`.

### Update HUD Labels
Modify the `getMeta()` return object to change `scoreLabel`, `metricLabel`, `statusText`, `controlHint`, etc.

### Store Additional Game State
Extend the localStorage structure (careful not to break existing scores) or use a separate localStorage key.

## Performance Notes

- Canvas resize happens once at initialization; subsequent redraws only touch the canvas 2D context.
- Frame delta is clamped to 48ms to prevent large jumps on slow frames.
- Games should limit complexity in `render()` (e.g., avoid recomputing expensive paths every frame).
- localStorage operations are try-catch wrapped to prevent crashes if quota exceeded.
