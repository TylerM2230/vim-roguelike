# Vim Roguelike Practice

A simple browser-based roguelike game where the player navigates a procedurally generated maze using Vim-like keybindings. The objective is to reach the goal ('>') while avoiding traps ('X'). Each level presents a new maze layout.

![vim-roguelike](https://github.com/user-attachments/assets/bf3a802c-0702-4b86-a072-5ed055f5b1ba)

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Gameplay](#gameplay)
  - [Controls](#controls)
  - [Objective](#objective)
- [Technical Details](#technical-details)
  - [Maze Generation: Randomized Depth-First Search (DFS)](#maze-generation-randomized-depth-first-search-dfs)
  - [Goal Placement](#goal-placement)
  - [Trap Placement and Pathfinding (BFS)](#trap-placement-and-pathfinding-bfs)
- [How to Play](#how-to-play)
- [Future Enhancements (Ideas)](#future-enhancements-ideas)

## Project Overview

This project is an exercise in creating a simple roguelike game with a focus on procedural content generation (specifically maze generation) and handling player input for navigation. It runs entirely in the browser using HTML, CSS, and vanilla JavaScript.

## Features

* **Procedurally Generated Mazes:** Each level features a unique maze layout.
* **Vim-like Controls:** Navigate using `h, j, k, l` and other Vim-inspired keys.
* **Increasing Difficulty:** Traps become more numerous as levels progress (up to a cap).
* **Player, Goal, Traps, Walls, Floors:** Standard roguelike elements.
* **Responsive Design:** Adapts to different screen sizes, with instructions panel moving below the game on smaller screens.
* **Clear Visuals:** Uses distinct characters and colors for different game elements.
* **Game Over/Restart:** Simple game over message with a restart option.
* **Path Solvability:** Mazes are guaranteed to have a path from player start to the goal, and traps are placed such that they do not block this essential path.

## Project Structure

The project is organized into three main files, all located in the same directory:

* `index.html`: The main HTML file that provides the structure for the game page. It includes:
    * The game display area (`<pre id="game-display">`).
    * The instructions and status panel.
    * The game over message overlay.
    * Links to the CSS stylesheet (`styles.css`) and the JavaScript file (`script.js`).

* `styles.css`: This file contains all the CSS rules for styling the game, including:
    * Layout of the game container, instructions panel, and game screen.
    * Font styles (using 'Press Start 2P').
    * Colors for different game elements (player, goal, trap, wall, floor).
    * Styling for the message overlay and buttons.
    * Responsive design adjustments for smaller screens.

* `script.js`: This file houses all the JavaScript logic for the game. Key components include:
    * **Game Configuration:** Constants for map dimensions, character representations, etc.
    * **Game State:** Variables to track player position, goal position, the game map, active status, current level, and trap locations.
    * **DOM Element References:** Variables to interact with HTML elements.
    * **Utility Functions:** `getRandomInt`, `shuffleArray`.
    * **Pathfinding (BFS):** `isPathAvailable` function to check if a path exists between two points, crucial for safe trap placement.
    * **Map Generation:** `generateMap` function, which uses Randomized DFS.
    * **Game Logic:**
        * `initializeLevel`: Sets up a new level.
        * `render`: Draws the game state to the screen.
        * `showGameOverMessage`, `hideMessageAndRestart`: Manages the game over state.
        * `updateStatus`: Displays messages to the player.
        * `isValidMove`: Checks if a player's intended move is valid.
        * `movePlayer`, `jumpPlayer`: Handles player movement.
        * `handleMoveConsequences`: Determines what happens when a player lands on a tile (e.g., reaching the goal, hitting a trap).
    * **Event Handling:** `handleKeydown` for keyboard input.
    * **Initialization:** Starts the game when the window loads.

## Gameplay

### Controls

* **Movement:**
    * `h` or `ArrowLeft`: Move Left
    * `j` or `ArrowDown`: Move Down
    * `k` or `ArrowUp`: Move Up
    * `l` or `ArrowRight`: Move Right
* **Diagonal Movement:**
    * `y`: Move Up-Left
    * `u`: Move Up-Right
    * `b`: Move Down-Left
    * `n`: Move Down-Right
* **Jumps (Move 3 spaces, blocked by walls):**
    * `w` or `e`: Jump Forward (Right)
    * `B` (Shift + b): Jump Backward (Left)
* **Game Over Screen:**
    * `Enter` or `Escape`: Restart Game

### Objective

* Navigate your character (`@`) through the maze.
* Reach the exit (`>`) to advance to the next level.
* Avoid traps (`X`). Stepping on a trap results in a Game Over.
* Walls (`#`) are impassable.
* Floor tiles (`.`) are safe to walk on.

## Technical Details

### Maze Generation: Randomized Depth-First Search (DFS)

The mazes are generated using a **Randomized Depth-First Search (DFS)** algorithm. This algorithm is well-suited for creating mazes because it naturally carves out paths and ensures that all parts of the maze are connected (i.e., every cell that is part of the maze can be reached from any other cell in the maze).

**How it Works:**

1.  **Initialization:**
    * The map is initialized as a grid full of walls (`#`).
    * A `visited` array of the same dimensions is created, initially all `false`.
    * A stack is used to keep track of the cells to visit.
    * A list `floorTiles` is maintained to store coordinates of all carved floor cells.

2.  **Starting Point:**
    * A random starting cell (e.g., `(startX, startY)`) is chosen. This cell must have odd coordinates to ensure proper carving on a grid where walls and paths alternate.
    * The starting cell is marked as a floor (`.`), added to `floorTiles`, marked as visited, and pushed onto the stack. The player (`@`) is initially placed here.

3.  **Carving Process (DFS Loop):**
    * While the stack is not empty:
        a.  Get the current cell from the top of the stack (without popping it yet).
        b.  Find all unvisited neighbors of the current cell that are two steps away (e.g., `(x+2, y)`, `(x-2, y)`, `(x, y+2)`, `(x, y-2)`). These are potential cells to extend the path to. The "two steps away" ensures there's a wall cell between the current cell and the potential next cell.
        c.  **If unvisited neighbors exist:**
            i.  Randomly choose one of these neighbors.
            ii. "Carve" a path to it:
                * The wall cell between the current cell and the chosen neighbor is turned into a floor (`.`) and added to `floorTiles`.
                * The chosen neighbor cell is also turned into a floor (`.`), added to `floorTiles`, marked as visited, and pushed onto the stack. This becomes the new current cell for the next iteration.
        d.  **If no unvisited neighbors exist:**
            i.  The algorithm has reached a dead end from the current cell.
            ii. Pop the current cell from the stack (backtrack) to explore other paths.

4.  **Completion:** The process continues until the stack is empty, meaning all reachable cells have been visited and carved.

**Diagrammatic Representation of DFS Carving:**

Imagine a small grid. `S` is start, `W` is wall, `.` is path.

Initial State (all walls, not shown for brevity, assume `S` is chosen):
Stack: `[S]`
Map:
`S W W`
`W W W`
`W W W`

1. Current: `S`. Neighbors: `N1 (right)`, `N2 (down)`. Choose `N1`.
   Carve wall between `S` and `N1`.
   Stack: `[S, N1]`
   Map:
   `S . N1`
   `W W W`
   `W W W`

2. Current: `N1`. Neighbors: None unvisited two steps away. Backtrack.
   Stack: `[S]`

3. Current: `S`. Neighbors: `N2 (down)`. Choose `N2`.
   Carve wall between `S` and `N2`.
   Stack: `[S, N2]`
   Map:
   `S . N1`
   `. W W`
   `N2W W`

...and so on.

This ensures that there's always a path from the starting point to any other carved point in the maze.

### Goal Placement

1.  After the maze is generated, the `floorTiles` list contains all coordinates that are part of the maze's path.
2.  The list of `floorTiles` is shuffled.
3.  The game attempts to place the goal (`>`) on a floor tile that is:
    * Not the player's starting position.
    * Reasonably far from the player (using a heuristic like Manhattan distance greater than `min(MAP_WIDTH, MAP_HEIGHT) / 1.5`).
4.  If a suitable distant tile isn't found (e.g., on very small or constrained maps), it falls back to placing the goal on any floor tile that isn't the player's start.
5.  A final fallback places the goal at a default corner if all else fails, ensuring a goal always exists.

### Trap Placement and Pathfinding (BFS)

Traps (`X`) are placed after the maze and goal are set. To ensure the game remains solvable, traps are placed strategically:

1.  **Number of Traps:** Determined by the current level (e.g., `min(floorTiles.length / 20, 4 + currentLevel)`), encouraging a slight increase in difficulty.
2.  **Candidate Locations:** Traps can only be placed on existing `floorTiles`. Player start and goal locations are excluded.
3.  **Connectivity Check (Safety):**
    * For each potential trap location:
        a.  Temporarily mark the candidate floor tile as a wall (`#`) on a *copy* or by *temporarily modifying* the `gameMap`.
        b.  Use a **Breadth-First Search (BFS)** algorithm (`isPathAvailable` function) to check if a path *still exists* from the player's current starting position (`player.x`, `player.y`) to the goal's position (`goal.x`, `goal.y`) with this temporary wall in place.
        c.  **If a path still exists:** The trap can be safely placed. The `gameMap` is updated to permanently show `X` at this location, and the trap's coordinates are stored in the `traps` array.
        d.  **If no path exists (trap blocks the only way):** The trap is *not* placed at this location. The `gameMap` is reverted to its state before the temporary wall was added (i.e., it remains a floor tile).
    * The `floorTiles` list is shuffled before iterating to ensure random trap placement among valid spots.

The BFS algorithm (`isPathAvailable`) works as follows:
1.  Start a queue with the player's starting coordinates.
2.  Maintain a `visited` set to avoid re-processing cells.
3.  While the queue is not empty:
    a.  Dequeue a cell. If it's the goal, a path exists.
    b.  For each valid, unvisited, non-wall neighbor of the dequeued cell, add it to the queue and mark it as visited.
4.  If the queue becomes empty and the goal hasn't been reached, no path exists.

This ensures that players always have at least one path to the goal, no matter how many traps are placed.

## How to Play

1.  Download the files (`index.html`, `styles.css`, `script.js`) into the same directory on your computer.
2.  Open `index.html` in a modern web browser (e.g., Chrome, Firefox, Edge, Safari).
3.  Use the keyboard controls listed in the "Controls" section or on the game's instruction panel to navigate.
4.  Try to reach the `>` symbol to complete the level.
5.  Avoid `X` symbols (traps).

## Future Enhancements (Ideas)

* **More Enemy/Item Types:** Introduce simple enemies that move, or items that provide temporary benefits.
* **Vision/Fog of War:** Only reveal parts of the map the player can see.
* **More Sophisticated Level Generation:** Different types of rooms, corridors, or features.
* **Sound Effects:** Simple sounds for movement, hitting walls, traps, or completing levels.
* **Score/Timer:** Add a scoring system or a timer for an extra challenge.
* **Different Map Themes:** Vary the visual appearance of walls and floors.
* **Save/Load Progress:** (More complex) Allow players to save their current level.

