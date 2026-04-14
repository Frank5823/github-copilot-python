// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let currentDifficulty = 'medium';
let startTime = null;
let timerInterval = null;
let hintsUsed = 0;

// LocalStorage management for leaderboard
const STORAGE_KEY = 'sudoku-top-10-scores';
const MAX_STORED_SCORES = 10;

function getStoredScores() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveScoresToStorage(scores) {
  // Keep only top 10, sorted by time (ascending)
  const topScores = scores
    .sort((a, b) => a.time - b.time)
    .slice(0, MAX_STORED_SCORES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
}

function addScoreToStorage(newScore) {
  const scores = getStoredScores();
  scores.push(newScore);
  saveScoresToStorage(scores);
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('sudoku-theme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const body = document.body;
  const toggle = document.getElementById('theme-toggle');
  if (theme === 'dark') {
    body.classList.add('dark-mode');
    toggle.textContent = '☀️ Light';
  } else {
    body.classList.remove('dark-mode');
    toggle.textContent = '🌙 Dark';
  }
  localStorage.setItem('sudoku-theme', theme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimer() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const timeStr = formatTime(elapsed);
  document.getElementById('timer').innerText = `Time: ${timeStr}`;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}


function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function validateCell(row, col, value) {
  const board = getCurrentBoard();
  const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
  if (!input) return;

  if (!value) {
    input.classList.remove('incorrect');
    return;
  }

  // Temporarily set value to check conflicts (ignore this cell itself)
  const original = board[row][col];
  board[row][col] = parseInt(value, 10);

  const hasConflict = board[row].filter((v) => v === board[row][col]).length > 1
    || board.map((r) => r[col]).filter((v) => v === board[row][col]).length > 1
    || (() => {
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      let count = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[boxRow + r][boxCol + c] === board[row][col]) count += 1;
        }
      }
      return count > 1;
    })();

  board[row][col] = original;

  if (hasConflict) {
    input.classList.add('incorrect');
  } else {
    input.classList.remove('incorrect');
  }
}

function getCurrentBoard() {
  const board = [];
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  return board;
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  const res = await fetch(`/new?difficulty=${currentDifficulty}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
  hintsUsed = 0;
  startTimer();
}

async function hint() {
  const res = await fetch('/hint');
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  const boardDiv = document.getElementById('sudoku-board');
  const input = boardDiv.querySelector(`input[data-row="${data.row}"][data-col="${data.col}"]`);
  if (input) {
    input.value = data.value;
    input.disabled = true;
    input.classList.remove('incorrect');
    input.classList.add('prefilled');
  }

  hintsUsed++;
  msg.style.color = '#388e3c';
  msg.innerText = `Hint applied at row ${data.row + 1}, col ${data.col + 1}. (${hintsUsed} hints used)`;
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.classList.remove('incorrect', 'success');
    inp.classList.add('sudoku-cell');
    if (incorrect.has(idx)) {
      inp.classList.add('incorrect');
    }
  }
  if (incorrect.size === 0) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    showWinModal(elapsed);
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = `${incorrect.size} incorrect cell(s). Please fix the red ones.`;
  }
}

function showWinModal(timeInSeconds) {
  const time = formatTime(timeInSeconds);
  document.getElementById('win-stats').textContent = 
    `Difficulty: ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)} | Hints: ${hintsUsed} | Time: ${time}`;
  document.getElementById('username-input').value = '';
  document.getElementById('win-modal').classList.add('show');
}

function closeWinModal() {
  document.getElementById('win-modal').classList.remove('show');
}

function showLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  loadLeaderboard();
  modal.classList.add('show');
}

async function submitScore() {
  const username = document.getElementById('username-input').value.trim();
  if (!username) {
    alert('Please enter a name');
    return;
  }

  const time = parseInt(document.getElementById('timer').innerText.replace('Time: ', '').split(':')[0]) * 60 + 
               parseInt(document.getElementById('timer').innerText.replace('Time: ', '').split(':')[1]);
  
  const scoreData = {
    username,
    difficulty: currentDifficulty,
    hints: hintsUsed,
    time
  };

  // Save to localStorage immediately
  addScoreToStorage(scoreData);

  // Try to sync with backend
  try {
    const res = await fetch('/score', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(scoreData)
    });

    if (res.ok) {
      closeWinModal();
      loadLeaderboard();
    }
  } catch (error) {
    console.log('Backend sync failed, but score saved locally:', error);
    closeWinModal();
    loadLeaderboard();
  }
}

async function loadLeaderboard() {
  let scores = [];
  
  // Try to fetch from backend
  try {
    const res = await fetch('/scores');
    if (res.ok) {
      const data = await res.json();
      scores = data.scores;
      // Sync backend scores to localStorage
      saveScoresToStorage(scores);
    }
  } catch (error) {
    console.log('Backend fetch failed, using localStorage:', error);
  }

  // If no backend scores, use localStorage
  if (scores.length === 0) {
    scores = getStoredScores();
  }

  displayLeaderboard(scores);
}

function displayLeaderboard(scores) {
  const content = document.getElementById('leaderboard-content');
  
  if (scores.length === 0) {
    content.innerHTML = '<div class="no-scores">No scores yet. Be the first to submit!</div>';
    return;
  }

  let html = '<div class="leaderboard-header">' +
    '<span class="leaderboard-rank">Rank</span>' +
    '<span class="leaderboard-name">Name</span>' +
    '<span class="leaderboard-diff">Difficulty</span>' +
    '<span class="leaderboard-hints">Hints</span>' +
    '<span class="leaderboard-time">Time</span>' +
    '</div>';
  
  scores.forEach((score, idx) => {
    const time = formatTime(score.time);
    const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
    html += `<div class="leaderboard-item">
      <span class="leaderboard-rank ${rankClass}">${idx + 1}</span>
      <span class="leaderboard-name">${score.username}</span>
      <span class="leaderboard-diff">${score.difficulty}</span>
      <span class="leaderboard-hints">${score.hints}</span>
      <span class="leaderboard-time">${time}</span>
    </div>`;
  });
  content.innerHTML = html;
}

async function giveHint() {
  const res = await fetch('/hint');
  const data = await res.json();
  const msg = document.getElementById('message');

  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const idx = data.row * SIZE + data.col;
  const input = inputs[idx];
  if (input && !input.disabled) {
    input.value = data.value;
    input.disabled = true;
    input.classList.add('prefilled');
    input.classList.remove('incorrect');
    msg.style.color = '#1976d2';
    msg.innerText = `Hint: cell (${data.row + 1}, ${data.col + 1}) set to ${data.value}.`;
  }
}

// Wire buttons
window.addEventListener('load', () => {
  initTheme();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', hint);
  document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);

  // Board cell input delegation
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.addEventListener('input', (e) => {
    if (e.target.classList.contains('sudoku-cell')) {
      const row = parseInt(e.target.dataset.row, 10);
      const col = parseInt(e.target.dataset.col, 10);
      const val = e.target.value.replace(/[^1-9]/g, '');
      e.target.value = val;
      validateCell(row, col, val);
    }
  });

  // Modal close buttons
  document.querySelector('#leaderboard-modal .close').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').classList.remove('show');
  });
  document.getElementById('submit-score').addEventListener('click', submitScore);
  document.getElementById('skip-score').addEventListener('click', closeWinModal);

  // Close modal on outside click
  window.addEventListener('click', (e) => {
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const winModal = document.getElementById('win-modal');
    if (e.target === leaderboardModal) leaderboardModal.classList.remove('show');
    if (e.target === winModal) winModal.classList.remove('show');
  });

  // Difficulty buttons
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentDifficulty = e.target.dataset.difficulty;
      // Update active button
      difficultyBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
  
  // Load leaderboard on page load
  loadLeaderboard();
  
  // initialize game
  newGame();
});