import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True

def remove_cells(board, clues):
    attempts = SIZE * SIZE - clues
    while attempts > 0:
        row = random.randrange(SIZE)
        col = random.randrange(SIZE)
        if board[row][col] != EMPTY:
            board[row][col] = EMPTY
            attempts -= 1

def count_solutions(board, limit=2):
    """Count the number of solutions for the puzzle. Stop at limit to avoid long computation."""
    def solve(pos):
        if pos == SIZE * SIZE:
            return 1
        row, col = divmod(pos, SIZE)
        if board[row][col] != EMPTY:
            return solve(pos + 1)
        count = 0
        for num in range(1, SIZE + 1):
            if is_safe(board, row, col, num):
                board[row][col] = num
                count += solve(pos + 1)
                board[row][col] = EMPTY
                if count >= limit:
                    break
        return count
    
    return solve(0)

def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    
    # Create puzzle by removing cells while ensuring unique solution
    cells_to_remove = SIZE * SIZE - clues
    removed = 0
    while removed < cells_to_remove:
        # Find a filled cell to try removing
        candidates = [(i, j) for i in range(SIZE) for j in range(SIZE) if board[i][j] != EMPTY]
        if not candidates:
            break
        row, col = random.choice(candidates)
        temp = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(deep_copy(board)) == 1:
            removed += 1
        else:
            # Put it back if removing it creates multiple solutions
            board[row][col] = temp
    
    puzzle = deep_copy(board)
    return puzzle, solution
