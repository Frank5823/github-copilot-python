from flask import Flask, render_template, jsonify, request
import sudoku_logic
import json
import os
from datetime import datetime

app = Flask(__name__)

# Difficulty levels mapping to number of clues
DIFFICULTIES = {
    'easy': 50,
    'medium': 35,
    'hard': 25
}

# Scores file
SCORES_FILE = 'scores.json'

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

def load_scores():
    """Load scores from file."""
    if os.path.exists(SCORES_FILE):
        try:
            with open(SCORES_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_scores(scores):
    """Save scores to file."""
    with open(SCORES_FILE, 'w') as f:
        json.dump(scores, f, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    clues = DIFFICULTIES.get(difficulty, DIFFICULTIES['medium'])
    puzzle, solution = sudoku_logic.generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle})

@app.route('/hint')
def hint():
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')
    if puzzle is None or solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if puzzle[i][j] == sudoku_logic.EMPTY:
                value = solution[i][j]
                puzzle[i][j] = value
                CURRENT['puzzle'] = puzzle
                return jsonify({'row': i, 'col': j, 'value': value})

    return jsonify({'error': 'Puzzle is already complete'}), 400

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

@app.route('/score', methods=['POST'])
def save_score():
    data = request.json
    username = data.get('username', 'Anonymous')
    difficulty = data.get('difficulty', 'medium')
    hints = data.get('hints', 0)
    time = data.get('time', 0)

    score_entry = {
        'username': username[:20],
        'difficulty': difficulty,
        'hints': hints,
        'time': time,
        'timestamp': datetime.now().isoformat()
    }

    scores = load_scores()
    scores.append(score_entry)
    # Sort by time, then by hints
    scores.sort(key=lambda x: (x['time'], x['hints']))
    # Keep top 100 to avoid file bloat
    scores = scores[:100]
    save_scores(scores)

    return jsonify({'success': True})

@app.route('/scores')
def get_scores():
    scores = load_scores()
    # Sort by time, then by hints
    scores.sort(key=lambda x: (x['time'], x['hints']))
    # Return top 10
    top_scores = scores[:10]
    return jsonify({'scores': top_scores})

if __name__ == '__main__':
    app.run(debug=True)