// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let currentDifficulty = 'medium';
let startTime = null;
let timerInterval = null;

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimer() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('timer').innerText = `Time: ${formatTime(elapsed)}`;
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
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        validateCell(i, j, val);
      });
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
  startTimer();
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
    msg.style.color = '#388e3c';
    msg.innerText = `🎉 Congratulations! You solved the Sudoku in ${document.getElementById('timer').innerText.replace('Time: ', '')}! 🎉`;
    // highlight all non-locked cells as success
    for (let idx = 0; idx < inputs.length; idx++) {
      const inp = inputs[idx];
      if (!inp.disabled) {
        inp.classList.add('success');
      }
    }
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = `${incorrect.size} incorrect cell(s). Please fix the red ones.`;
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  
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
  
  // initialize
  newGame();
});