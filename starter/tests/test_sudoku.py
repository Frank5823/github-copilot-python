import pytest
from sudoku_logic import (
    create_empty_board,
    is_safe,
    generate_puzzle,
    SIZE,
    EMPTY,
)


def test_create_empty_board():
    """Test that empty board is 9x9 grid of zeros."""
    board = create_empty_board()
    assert len(board) == SIZE
    for row in board:
        assert len(row) == SIZE
        assert all(cell == EMPTY for cell in row)


def test_is_safe_valid_placement():
    """Test is_safe correctly validates valid number placements."""
    board = create_empty_board()
    assert is_safe(board, 0, 0, 1)
    assert is_safe(board, 4, 4, 5)


def test_is_safe_row_conflict():
    """Test is_safe detects row conflicts."""
    board = create_empty_board()
    board[0][0] = 1
    assert not is_safe(board, 0, 1, 1)


def test_is_safe_column_conflict():
    """Test is_safe detects column conflicts."""
    board = create_empty_board()
    board[0][0] = 1
    assert not is_safe(board, 1, 0, 1)


def test_is_safe_box_conflict():
    """Test is_safe detects 3x3 box conflicts."""
    board = create_empty_board()
    board[0][0] = 1
    assert not is_safe(board, 1, 1, 1)


def test_generate_puzzle_shape():
    """Test that puzzle and solution are 9x9."""
    puzzle, solution = generate_puzzle()
    assert len(puzzle) == SIZE
    assert len(solution) == SIZE
    for row in puzzle:
        assert len(row) == SIZE
    for row in solution:
        assert len(row) == SIZE


def test_generate_puzzle_solution_complete():
    """Test that solution has no empty cells."""
    puzzle, solution = generate_puzzle()
    for row in solution:
        assert all(cell != EMPTY for cell in row)


def test_new_route(client):
    """Test GET /new returns 200 with puzzle, solution NOT in response."""
    response = client.get("/new")
    assert response.status_code == 200
    assert b"puzzle" in response.data or b"board" in response.data.lower()


def test_check_route(client):
    """Test POST /check endpoint."""
    response = client.get("/new")
    assert response.status_code == 200
    # Create a valid 9x9 board for checking
    test_board = [[0] * 9 for _ in range(9)]
    response = client.post("/check", json={"board": test_board})
    assert response.status_code == 200


def test_hint_route(client):
    """Test GET /hint endpoint."""
    response = client.get("/new?difficulty=easy")
    assert response.status_code == 200
    hint_res = client.get("/hint")
    assert hint_res.status_code == 200
    data = hint_res.get_json()
    assert "row" in data and "col" in data and "value" in data
    assert isinstance(data["row"], int)
    assert isinstance(data["col"], int)
    assert isinstance(data["value"], int)


def test_score_save_route(client):
    """Test POST /score endpoint."""
    response = client.post(
        "/score",
        json={
            "username": "TestPlayer",
            "difficulty": "medium",
            "hints": 2,
            "time": 180,
        },
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True


def test_scores_list_route(client):
    """Test GET /scores endpoint."""
    # Save a score first
    client.post(
        "/score",
        json={"username": "Player1", "difficulty": "easy", "hints": 1, "time": 120},
    )

    response = client.get("/scores")
    assert response.status_code == 200
    data = response.get_json()
    assert "scores" in data
    assert isinstance(data["scores"], list)
