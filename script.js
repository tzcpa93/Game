/* 
  script.js
  Main game logic for Expense Manager Mania.

  DEPENDENCIES: 
    - data.json (fetched via AJAX/Fetch)
    - DOM references from index.html
    - Styles from styles.css

  HOW TO MODIFY:
    1. data.json: Add or remove good/bad items and their negative scores.
    2. Adjust "FALL_SPEED" or "SPAWN_INTERVAL" below to control difficulty.
    3. Adjust "DIFFICULTY_RAMP" to control how quickly difficulty increases over time.
    4. Replace shapes with images: 
       - Instead of plain DIVs, you can create an <img src="..." /> or 
         set "background-image" for .falling-item in CSS/JS. 
*/

// Global Variables / Configuration
let goodExpenses = []; // Will load from data.json
let badExpenses = [];  // Will load from data.json

// DOM Elements
const gameContainer = document.getElementById("game-container");
const scoreDisplay   = document.getElementById("score-display");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreElem = document.getElementById("final-score");
const restartButton  = document.getElementById("restart-button");
const playerElement  = document.getElementById("player");
const mobileControls = document.getElementById("mobile-controls");
const leftButton     = document.getElementById("left-button");
const rightButton    = document.getElementById("right-button");
const speedButton    = document.getElementById("speed-button");

// Game State
let score = 0;
let isGameOver = false;

// Player Config
let playerX = 275;  // Default horizontal position
const playerSpeed = 5;    // Normal movement speed
const playerSpeedBoost = 10; // Boosted movement speed (when space pressed)
let currentPlayerSpeed = playerSpeed;

// Falling Items
let fallingItems = []; // Array of objects { x, y, speed, type: 'good'/'bad', label, scoreValue }
const FALL_SPEED = 2;     // Base falling speed (pixels per frame)
const SPAWN_INTERVAL = 1500; // Base spawn interval in ms
let spawnTimer = null;
let gameLoopId = null;

// Difficulty ramp: after each item spawns, 
// we can slightly increase the falling speed or decrease spawn interval
const DIFFICULTY_RAMP = 0.01; // Increase speed by 1% each spawn (example)
let currentFallSpeed = FALL_SPEED;
let currentSpawnInterval = SPAWN_INTERVAL;

/**
 * Initialize the game once data is loaded.
 */
function initGame() {
  score = 0;
  isGameOver = false;
  currentFallSpeed = FALL_SPEED;
  currentSpawnInterval = SPAWN_INTERVAL;
  updateScoreDisplay();

  // Clear any existing items
  fallingItems.forEach(item => {
    if (item.element && gameContainer.contains(item.element)) {
      gameContainer.removeChild(item.element);
    }
  });
  fallingItems = [];

  // Position player in the middle
  playerX = (gameContainer.clientWidth / 2) - (playerElement.clientWidth / 2);
  updatePlayerPosition();

  // Hide Game Over screen if visible
  gameOverScreen.classList.add("hidden");

  // Start game loop
  gameLoopId = requestAnimationFrame(gameLoop);

  // Start spawning
  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnItem, currentSpawnInterval);
}

/**
 * Fetch data from data.json and store it in global arrays.
 */
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    // Example structure: { good: [...], bad: [{label, score}, ...] }
    goodExpenses = data.good || [];
    badExpenses  = data.bad || [];
    // After data is loaded, initialize the game
    initGame();
  })
  .catch(error => {
    console.error("Error loading data.json:", error);
    // Fallback if JSON fails (optional)
    goodExpenses = ["Office Supplies", "CRM Subscription", "Hotels for Conference"];
    badExpenses  = [
      { label: "Strippers", score: -100 },
      { label: "Netflix", score: -25 },
      { label: "Happy hour no receipt", score: -1 }
    ];
    initGame();
  });

/**
 * Spawns a new falling item (good or bad) at a random X position.
 */
function spawnItem() {
  // Decide if it's good or bad with a simple ratio. 
  // For example, 2/3 chance good, 1/3 chance bad.
  const isBad = Math.random() < 0.33; 

  let label = "";
  let scoreValue = +1; // Good items default to +1

  if (isBad && badExpenses.length > 0) {
    // Pick a random bad expense
    const randIndex = Math.floor(Math.random() * badExpenses.length);
    label = badExpenses[randIndex].label;
    scoreValue = badExpenses[randIndex].score; // negative value
  } else if (goodExpenses.length > 0) {
    // Pick a random good expense
    const randIndex = Math.floor(Math.random() * goodExpenses.length);
    label = goodExpenses[randIndex];
  } else {
    // Fallback if no data
    label = "N/A";
  }

  // Create a DOM element for the item
  const itemElem = document.createElement("div");
  itemElem.classList.add("falling-item");
  if (scoreValue < 0) {
    // Mark it as a bad item
    itemElem.classList.add("bad");
  }
  itemElem.textContent = label;

  // Random X position within container width
  const maxX = gameContainer.clientWidth - 50; // item width is 50
  const randomX = Math.floor(Math.random() * maxX);

  // Set initial position
  itemElem.style.left = randomX + "px";
  itemElem.style.top = "0px";

  gameContainer.appendChild(itemElem);

  // Add to array
  fallingItems.push({
    x: randomX,
    y: 0,
    speed: currentFallSpeed,
    type: scoreValue < 0 ? "bad" : "good",
    label: label,
    scoreValue: scoreValue,
    element: itemElem
  });

  // Ramp difficulty
  currentFallSpeed += currentFallSpeed * DIFFICULTY_RAMP;   // e.g. 1% faster
  clearInterval(spawnTimer);
  currentSpawnInterval = currentSpawnInterval * (1 - DIFFICULTY_RAMP/2); 
  spawnTimer = setInterval(spawnItem, currentSpawnInterval);
}

/**
 * Main game loop using requestAnimationFrame.
 * Updates positions, checks collisions, handles game over condition.
 */
function gameLoop() {
  if (isGameOver) return;

  updateFallingItems();
  requestAnimationFrame(gameLoop);
}

/**
 * Update positions of all falling items and check for scoring or collisions.
 */
function updateFallingItems() {
  for (let i = 0; i < fallingItems.length; i++) {
    const item = fallingItems[i];

    // Move item down
    item.y += item.speed;
    if (item.element) {
      item.element.style.top = item.y + "px";
    }

    // Check if item reaches bottom
    if (item.y + 50 >= gameContainer.clientHeight) {
      // If good, increase score
      if (item.type === "good") {
        score += 1;
      } else {
        // If bad and not caught, subtract from score
        score += item.scoreValue; // negative value
        triggerScreenShake();
      }

      updateScoreDisplay();

      // Remove item from DOM and array
      if (item.element && gameContainer.contains(item.element)) {
        gameContainer.removeChild(item.element);
      }
      fallingItems.splice(i, 1);
      i--;

      // Check game over
      if (score < 0) {
        endGame();
        return;
      }
    } else {
      // Check collision with player (only relevant for bad items)
      if (item.type === "bad") {
        if (isColliding(item)) {
          // "Block" the bad expense, so no negative score
          // Remove the item from game
          if (item.element && gameContainer.contains(item.element)) {
            gameContainer.removeChild(item.element);
          }
          fallingItems.splice(i, 1);
          i--;
        }
      }
    }
  }
}

/**
 * Check if the bad item is colliding with the player's horizontal position.
 * Simple AABB collision (assuming same vertical region at bottom).
 */
function isColliding(item) {
  const playerRect = playerElement.getBoundingClientRect();
  const itemRect   = item.element.getBoundingClientRect();

  // Basic overlap check in X dimension, Y dimension is near bottom
  // We'll say if item is within 50px of the bottom, check if X overlaps.
  if (
    itemRect.bottom >= playerRect.top &&     // item is at or below player's top
    itemRect.left < playerRect.right && 
    itemRect.right > playerRect.left 
  ) {
    return true;
  }
  return false;
}

/**
 * Update the on-screen score display.
 */
function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

/**
 * End the game if score < 0.
 */
function endGame() {
  isGameOver = true;
  // Stop spawn interval
  if (spawnTimer) clearInterval(spawnTimer);
  // Show game over screen
  finalScoreElem.textContent = `Your final score: ${score}`;
  gameOverScreen.classList.remove("hidden");
}

/**
 * Trigger a brief screen shake by adding the .shake class to the container.
 */
function triggerScreenShake() {
  gameContainer.classList.add("shake");
  setTimeout(() => {
    gameContainer.classList.remove("shake");
  }, 300);
}

/**
 * Handle keyboard input for desktop:
 * - Left arrow  => move left
 * - Right arrow => move right
 * - Space       => speed boost while pressed
 */
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") {
    movePlayer(-1);
  } else if (e.code === "ArrowRight") {
    movePlayer(1);
  } else if (e.code === "Space") {
    currentPlayerSpeed = playerSpeedBoost;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    currentPlayerSpeed = playerSpeed;
  }
});

/**
 * Move player by direction (-1 for left, +1 for right)
 */
function movePlayer(direction) {
  playerX += direction * currentPlayerSpeed;
  // Constrain within game container
  const maxX = gameContainer.clientWidth - playerElement.clientWidth;
  if (playerX < 0) playerX = 0;
  if (playerX > maxX) playerX = maxX;
  updatePlayerPosition();
}

/**
 * Update player element's position in the DOM.
 */
function updatePlayerPosition() {
  playerElement.style.left = `${playerX}px`;
}

/* 
  Mobile Controls:
  Show or hide them as you prefer. 
  For simplicity, let's always show on small screens via CSS or dynamically here.
*/

// Example: un-hide mobile controls if screen width < 700
if (window.innerWidth < 700) {
  mobileControls.classList.remove("hidden");
}

// Touch/click event for left button
if (leftButton) {
  leftButton.addEventListener("mousedown", () => movePlayer(-1));
  leftButton.addEventListener("touchstart", () => movePlayer(-1));
}

// Touch/click event for right button
if (rightButton) {
  rightButton.addEventListener("mousedown", () => movePlayer(1));
  rightButton.addEventListener("touchstart", () => movePlayer(1));
}

// Speed button (if wanted)
if (speedButton) {
  speedButton.addEventListener("mousedown", () => { currentPlayerSpeed = playerSpeedBoost; });
  speedButton.addEventListener("mouseup", () => { currentPlayerSpeed = playerSpeed; });
  speedButton.addEventListener("touchstart", () => { currentPlayerSpeed = playerSpeedBoost; });
  speedButton.addEventListener("touchend", () => { currentPlayerSpeed = playerSpeed; });
}

// Restart button
restartButton.addEventListener("click", () => {
  initGame();
});
