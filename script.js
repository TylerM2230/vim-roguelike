// script.js

// --- Game Configuration ---
const MAP_WIDTH = 36;
const MAP_HEIGHT = 18;
const PLAYER_CHAR = "@";
const WALL_CHAR = "#";
const FLOOR_CHAR = ".";
const GOAL_CHAR = ">";
const TRAP_CHAR = "X";
const JUMP_DISTANCE = 3;

// --- Game State ---
let player = { x: 1, y: 1 };
let goal = { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 };
let gameMap = [];
let gameActive = true;
let currentLevel = 1;
let traps = []; // Stores locations of placed traps {x, y}

// --- DOM Elements ---
const gameDisplay = document.getElementById("game-display");
const statusMessage = document.getElementById("status-message");
const levelDisplay = document.getElementById("level-display");
const messageOverlay = document.getElementById("message-overlay");
const messageText = document.getElementById("message-text");
const restartButton = document.getElementById("restart-button");

// --- Utility Functions ---
/**
 * Generates a random integer between 0 (inclusive) and max (exclusive).
 * @param {number} max - The upper limit (exclusive).
 * @returns {number} A random integer.
 */
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array<any>} array - The array to shuffle.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- Pathfinding Function (BFS) ---
/**
 * Checks if a path exists between start and end coordinates on the map.
 * Treats WALL_CHAR as impassable.
 * @param {number} startX Starting X coordinate.
 * @param {number} startY Starting Y coordinate.
 * @param {number} endX Target X coordinate.
 * @param {number} endY Target Y coordinate.
 * @param {string[][]} mapToCheck The current state of the map to check.
 * @returns {boolean} True if a path exists, false otherwise.
 */
function isPathAvailable(startX, startY, endX, endY, mapToCheck) {
  const queue = [{ x: startX, y: startY }];
  const visited = new Set([`${startX},${startY}`]); // Keep track of visited cells 'x,y'

  while (queue.length > 0) {
    const current = queue.shift(); // Get the next cell to visit

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      return true; // Path found!
    }

    // Explore neighbors (up, down, left, right)
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const dir of directions) {
      const nextX = current.x + dir.dx;
      const nextY = current.y + dir.dy;
      const nextKey = `${nextX},${nextY}`;

      // Check bounds
      if (nextX >= 0 && nextX < MAP_WIDTH && nextY >= 0 && nextY < MAP_HEIGHT) {
        // Check if the neighbor is not a wall and hasn't been visited
        if (mapToCheck[nextY]?.[nextX] !== WALL_CHAR && !visited.has(nextKey)) {
          visited.add(nextKey); // Mark as visited
          queue.push({ x: nextX, y: nextY }); // Add to the queue to explore later
        }
      }
    }
  }

  return false; // Goal not reachable
}

// --- Map Generation (Randomized DFS) ---
/**
 * Generates the game map using Randomized Depth-First Search for maze generation.
 * Also places the player, goal, and traps.
 */
function generateMap() {
  // Initialize map, visited array, stack, and floorTiles list
  gameMap = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(WALL_CHAR)
  );
  traps = []; // Clear traps for the new level
  const visited = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(false)
  );
  const stack = [];
  const floorTiles = []; // Keep track of all reachable floor locations

  // Choose a random starting cell (must be odd coordinates for DFS on a grid)
  let startX = getRandomInt(Math.floor((MAP_WIDTH - 1) / 2)) * 2 + 1;
  let startY = getRandomInt(Math.floor((MAP_HEIGHT - 1) / 2)) * 2 + 1;
  player.x = startX; // Set player start position
  player.y = startY;
  stack.push({ x: startX, y: startY });
  visited[startY][startX] = true;
  gameMap[startY][startX] = FLOOR_CHAR;
  floorTiles.push({ x: startX, y: startY }); // Add start to floor tiles

  // Randomized Depth-First Search Algorithm (guarantees connectivity)
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    // Directions for carving: move two steps at a time
    const directions = [
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
    ];
    shuffleArray(directions); // Randomize direction order

    for (const dir of directions) {
      const nx = current.x + dir.dx; // Next cell x
      const ny = current.y + dir.dy; // Next cell y
      // Check if the next cell is within bounds and not visited
      if (
        nx > 0 &&
        nx < MAP_WIDTH - 1 &&
        ny > 0 &&
        ny < MAP_HEIGHT - 1 &&
        !visited[ny][nx]
      ) {
        // Wall between current and next cell
        const wallX = current.x + dir.dx / 2;
        const wallY = current.y + dir.dy / 2;
        neighbors.push({ x: nx, y: ny, wallX: wallX, wallY: wallY });
      }
    }

    if (neighbors.length > 0) {
      const chosen = neighbors[0]; // Pick the first (randomized) neighbor
      // Carve path: set wall and next cell to floor
      gameMap[chosen.wallY][chosen.wallX] = FLOOR_CHAR;
      gameMap[chosen.y][chosen.x] = FLOOR_CHAR;
      visited[chosen.y][chosen.x] = true;
      stack.push({ x: chosen.x, y: chosen.y }); // Move to the next cell
      floorTiles.push({ x: chosen.x, y: chosen.y }); // Add new floor tile
      floorTiles.push({ x: chosen.wallX, y: chosen.wallY }); // Add carved wall as floor
    } else {
      stack.pop(); // Backtrack if no unvisited neighbors
    }
  } // --- End DFS ---

  // --- Place Goal '>' ---
  // Place goal on a reachable floor tile, ensuring path exists from start.
  let goalPlaced = false;
  shuffleArray(floorTiles); // Shuffle floor tiles to pick a random goal location

  // Try to place the goal reasonably far from the player
  for (const tile of floorTiles) {
    const dist = Math.abs(tile.x - player.x) + Math.abs(tile.y - player.y);
    // Ensure goal is not at player start and is at a minimum distance
    if (
      dist > Math.min(MAP_WIDTH, MAP_HEIGHT) / 1.5 &&
      (tile.x !== player.x || tile.y !== player.y)
    ) {
      goal.x = tile.x;
      goal.y = tile.y;
      gameMap[goal.y][goal.x] = GOAL_CHAR;
      goalPlaced = true;
      break;
    }
  }
  // Fallback: if no suitable distant tile found, place it on any non-player floor tile
  if (!goalPlaced) {
    for (const tile of floorTiles) {
      if (tile.x !== player.x || tile.y !== player.y) {
        goal.x = tile.x;
        goal.y = tile.y;
        gameMap[goal.y][goal.x] = GOAL_CHAR;
        goalPlaced = true;
        break;
      }
    }
  }
  // Final fallback: if still not placed (e.g., very small map), place at a default corner
  // This should ideally not be reached with proper DFS and floor tile collection
  if (!goalPlaced) {
    goal.x = MAP_WIDTH - 2;
    goal.y = MAP_HEIGHT - 2;
    if (gameMap[goal.y]?.[goal.x] !== undefined) {
      // Check if coordinates are valid
      if (gameMap[goal.y][goal.x] === WALL_CHAR)
        gameMap[goal.y][goal.x] = FLOOR_CHAR; // Carve if it's a wall
      gameMap[goal.y][goal.x] = GOAL_CHAR;
    } else {
      console.error(
        "Failed to place goal even with fallback. Map might be too small or generation failed."
      );
      // Attempt to place at player's start if all else fails, though this is not ideal
      goal.x = player.x;
      goal.y = player.y;
      // No need to set gameMap[goal.y][goal.x] = GOAL_CHAR here as player will overwrite
    }
  } // --- End Goal placement ---

  // --- Place Traps 'X' Safely ---
  // Number of traps increases with level, capped by available floor space
  const numTraps = Math.min(
    Math.floor(floorTiles.length / 20),
    4 + currentLevel
  );
  let trapsPlaced = 0;
  shuffleArray(floorTiles); // Shuffle potential trap locations for randomness

  for (const tile of floorTiles) {
    if (trapsPlaced >= numTraps) break; // Stop if we've placed enough traps

    // Skip player start and goal locations for traps
    if (
      (tile.x === player.x && tile.y === player.y) ||
      (tile.x === goal.x && tile.y === goal.y)
    ) {
      continue;
    }

    // --- Connectivity Check ---
    // Temporarily mark the potential trap location as a wall
    const originalTile = gameMap[tile.y][tile.x]; // Should be FLOOR_CHAR
    gameMap[tile.y][tile.x] = WALL_CHAR; // Simulate placing a wall (trap)

    // Check if a path still exists from player start to goal using BFS
    const pathExists = isPathAvailable(
      player.x,
      player.y,
      goal.x,
      goal.y,
      gameMap
    );

    // Revert the temporary change
    gameMap[tile.y][tile.x] = originalTile;
    // --- End Connectivity Check ---

    // If placing the trap doesn't block the path, place it permanently
    if (pathExists) {
      gameMap[tile.y][tile.x] = TRAP_CHAR; // Place the trap on the map
      traps.push({ x: tile.x, y: tile.y }); // Add to trap state array
      trapsPlaced++;
    }
    // If pathExists is false, we simply don't place the trap here and continue to the next potential tile
  }
  // console.log(`Placed ${trapsPlaced} traps out of desired ${numTraps}.`); // Optional debug log
} // --- End generateMap ---

// --- Game Logic Functions ---
/**
 * Initializes the state for a new level.
 */
function initializeLevel() {
  gameActive = true;
  generateMap(); // This now includes safe trap placement
  render();
  updateStatus(`Level ${currentLevel} Start!`);
  if (levelDisplay) levelDisplay.textContent = `Level: ${currentLevel}`;
}

/**
 * Renders the current game state to the HTML display, applying CSS classes for colors.
 */
function render() {
  if (!gameDisplay) return; // Ensure the display element exists
  let displayHTML = "";
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      let char = " "; // Default to space if map position is undefined
      let cssClass = "";

      if (gameMap[y]?.[x] !== undefined) {
        // Check if map cell exists
        char = gameMap[y][x];
        // Determine character and CSS class
        if (x === player.x && y === player.y) {
          char = PLAYER_CHAR;
          cssClass = "player";
        } else if (x === goal.x && y === goal.y && char !== PLAYER_CHAR) {
          // Goal only if not player
          char = GOAL_CHAR;
          cssClass = "goal";
        } else {
          // Check if the current cell is a trap (and not the player or goal)
          const isTrap = traps.some((t) => t.x === x && t.y === y);
          if (isTrap && char === TRAP_CHAR) {
            // Ensure it's supposed to be a trap
            cssClass = "trap";
          } else if (char === WALL_CHAR) {
            cssClass = "wall";
          } else if (char === FLOOR_CHAR) {
            cssClass = "floor";
          }
          // Other characters (like a trap that became floor) will use default styling
        }
      }
      // Append character with span if class is set, otherwise just the character
      if (cssClass) {
        displayHTML += `<span class="${cssClass}">${char}</span>`;
      } else {
        displayHTML += char;
      }
    }
    displayHTML += "\n"; // Newline after each row
  }
  gameDisplay.innerHTML = displayHTML; // Update the pre element
}

/**
 * Displays the game over message overlay.
 * @param {string} message - The message to display (e.g., "Game Over!").
 */
function showGameOverMessage(message) {
  gameActive = false;
  if (messageText) messageText.textContent = message;
  if (messageOverlay) {
    messageOverlay.style.display = "flex";
    messageOverlay.style.backgroundColor = "rgba(80, 0, 0, 0.8)"; // Dark red overlay
  }
}

/**
 * Hides the message overlay and restarts the game from level 1.
 */
function hideMessageAndRestart() {
  if (messageOverlay) messageOverlay.style.display = "none";
  currentLevel = 1;
  initializeLevel();
}

/**
 * Updates the status message displayed to the player.
 * @param {string} message - The message to display.
 */
function updateStatus(message) {
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

/**
 * Checks if a move to the given coordinates is valid.
 * @param {number} x - The target x-coordinate.
 * @param {number} y - The target y-coordinate.
 * @returns {{valid: boolean, target?: string, x?: number, y?: number}}
 * An object indicating if the move is valid, and if so, the target cell content and coordinates.
 */
function isValidMove(x, y) {
  // Check bounds
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    updateStatus("Out of bounds!");
    return { valid: false };
  }
  const targetCell = gameMap[y]?.[x];
  // Check if the target cell is valid (exists)
  if (targetCell === undefined) {
    updateStatus("Invalid area!"); // Should not happen with bounds check, but good for safety
    return { valid: false };
  }
  // Check for walls
  if (targetCell === WALL_CHAR) {
    updateStatus("Bump! Wall.");
    return { valid: false };
  }
  // Move is valid
  return { valid: true, target: targetCell, x: x, y: y };
}

/**
 * Moves the player by the given delta (dx, dy).
 * @param {number} dx - Change in x-coordinate.
 * @param {number} dy - Change in y-coordinate.
 */
function movePlayer(dx, dy) {
  if (!gameActive) return;

  const moveResult = isValidMove(player.x + dx, player.y + dy);
  if (moveResult.valid) {
    player.x = moveResult.x;
    player.y = moveResult.y;
    handleMoveConsequences(moveResult.target); // Handle what happens on the new tile
  } else {
    render(); // Re-render to show status messages like "Bump!"
  }
}

/**
 * Allows the player to jump a certain number of steps in a given direction.
 * The jump is blocked if any intermediate cell is a wall.
 * @param {number} dx - Change in x-coordinate per step.
 * @param {number} dy - Change in y-coordinate per step (should be 0 for horizontal jumps).
 * @param {number} steps - The number of steps to jump.
 */
function jumpPlayer(dx, dy, steps) {
  if (!gameActive) return;

  let currentX = player.x;
  let currentY = player.y;
  let finalX = player.x;
  let finalY = player.y;
  let blocked = false;

  // Simulate the jump step-by-step
  for (let i = 0; i < steps; i++) {
    const nextX = currentX + dx;
    const nextY = currentY + dy; // dy is usually 0 for these jumps

    // Check bounds for each step
    if (nextX < 0 || nextX >= MAP_WIDTH || nextY < 0 || nextY >= MAP_HEIGHT) {
      blocked = true;
      updateStatus("Jump out of bounds!");
      break;
    }
    // Check if the intermediate or final cell is a wall
    if (gameMap[nextY]?.[nextX] === WALL_CHAR) {
      blocked = true;
      updateStatus("Jump blocked by a wall!");
      break;
    }
    // If not blocked, update current position for the next step in simulation
    currentX = nextX;
    currentY = nextY;
    // Update final landing position
    finalX = nextX;
    finalY = nextY;
  }

  if (!blocked) {
    player.x = finalX;
    player.y = finalY;
    handleMoveConsequences(gameMap[player.y][player.x]); // Handle landing
  } else {
    render(); // Re-render to show status messages
  }
}

/**
 * Handles the consequences of the player landing on a specific tile.
 * @param {string} targetCell - The character representing the tile the player landed on.
 */
function handleMoveConsequences(targetCell) {
  if (targetCell === GOAL_CHAR) {
    updateStatus(`Level ${currentLevel} Complete!`);
    currentLevel++;
    // Delay before starting next level to show message
    setTimeout(initializeLevel, 500);
  } else if (targetCell === TRAP_CHAR) {
    // Player landed on a trap
    gameMap[player.y][player.x] = FLOOR_CHAR; // Turn the trap into a floor tile visually

    // Remove the trap from the `traps` array
    const trapIndex = traps.findIndex(
      (t) => t.x === player.x && t.y === player.y
    );
    if (trapIndex !== -1) {
      traps.splice(trapIndex, 1);
    }
    showGameOverMessage(`Stepped on a trap! Game Over (Lvl ${currentLevel})!`);
  } else {
    updateStatus(""); // Clear status message if landed on a normal floor
  }
  render(); // Re-render the map after any consequence
}

/**
 * Handles keydown events for player movement and actions.
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function handleKeydown(event) {
  if (!gameActive && event.key !== "Enter" && event.key !== "Escape") {
    // Allow Enter/Esc on message overlay
    if (messageOverlay.style.display === "flex" && event.key === "Enter") {
      hideMessageAndRestart(); // Allow Enter to restart from game over screen
    }
    return;
  }
  if (messageOverlay.style.display === "flex") {
    // If message overlay is active
    if (event.key === "Enter" || event.key === "Escape") {
      hideMessageAndRestart();
    }
    return; // Don't process game keys if overlay is visible
  }

  // Prevent default browser action for game keys (e.g., scrolling with arrow keys)
  if (
    [
      "h",
      "j",
      "k",
      "l",
      "y",
      "u",
      "b",
      "n",
      "w",
      "e",
      "B",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(event.key)
  ) {
    event.preventDefault();
  }

  switch (event.key) {
    // Vim-like movement
    case "h":
    case "ArrowLeft":
      movePlayer(-1, 0);
      break; // Left
    case "j":
    case "ArrowDown":
      movePlayer(0, 1);
      break; // Down
    case "k":
    case "ArrowUp":
      movePlayer(0, -1);
      break; // Up
    case "l":
    case "ArrowRight":
      movePlayer(1, 0);
      break; // Right
    // Diagonal movement
    case "y":
      movePlayer(-1, -1);
      break; // Up-Left
    case "u":
      movePlayer(1, -1);
      break; // Up-Right
    case "b":
      movePlayer(-1, 1);
      break; // Down-Left
    case "n":
      movePlayer(1, 1);
      break; // Down-Right
    // Jump movement (example: 'w' or 'e' for forward, 'B' for backward)
    // Assuming dx=1 for forward, dx=-1 for backward, dy=0 for horizontal
    case "w": /* moveWordForward equivalent */
    case "e" /* moveWordForward equivalent */:
      // Find the next non-floor tile or map edge in the right direction
      jumpPlayer(1, 0, JUMP_DISTANCE); // Jump 3 steps right
      break;
    case "B" /* moveWordBackward equivalent */:
      // Find the next non-floor tile or map edge in the left direction
      jumpPlayer(-1, 0, JUMP_DISTANCE); // Jump 3 steps left
      break;
  }
}

// --- Event Listeners ---
document.addEventListener("keydown", handleKeydown);
if (restartButton)
  restartButton.addEventListener("click", hideMessageAndRestart);

// --- Initial Game Start ---
// Ensures the DOM is fully loaded before trying to access elements and start the game.
window.onload = function () {
  initializeLevel();
};
