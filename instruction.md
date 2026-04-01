---
applyTo: "**/*.py,**/*.html,**/*.js,**/*.css"
---

## Project
Flask Sudoku app — refactor legacy code, add modern features.

## Code Style
- Python 3.10+, PEP 8 and Black compliant
- Modular logic in `sudoku_logic.py`
- English comments, concise
- Exceptions handled cleanly

## Routes
- `GET /` index
- `GET /new?difficulty=easy|medium|hard`
- `POST /check`
- `GET /hint`
- generate logic in `sudoku_logic.generate_puzzle`

## Frontend
- Vanilla JS only
- Plain CSS only
- 9x9 grid with 3x3 visual blocks
- timer + dark mode + scoreboard

## Sudoku rules
- no hardcoded puzzles
- prefilled cells locked
- real validation for row/col/box and unique solution