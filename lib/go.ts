export type StoneColor = 'B' | 'W'
export type BoardPoint = { x: number; y: number }
export type BoardState = (StoneColor | null)[][]

export type MoveResult = {
  board: BoardState
  captured: BoardPoint[]
  nextKoPoint: BoardPoint | null
  legal: boolean
  error?: string
}

const createRow = (size: number) => Array.from({ length: size }, () => null as StoneColor | null)

export const createEmptyBoard = (size: number) =>
  Array.from({ length: size }, () => createRow(size))

export const cloneBoard = (board: BoardState) => board.map((row) => row.slice())

const getNeighbors = (board: BoardState, x: number, y: number) => {
  const size = board.length
  const neighbors: BoardPoint[] = []
  if (x > 0) neighbors.push({ x: x - 1, y })
  if (x < size - 1) neighbors.push({ x: x + 1, y })
  if (y > 0) neighbors.push({ x, y: y - 1 })
  if (y < size - 1) neighbors.push({ x, y: y + 1 })
  return neighbors
}

const keyOf = (p: BoardPoint) => `${p.x},${p.y}`

const getGroup = (board: BoardState, x: number, y: number) => {
  const color = board[y]?.[x]
  if (!color) {
    return { stones: [] as BoardPoint[], liberties: new Set<string>() }
  }
  const visited = new Set<string>()
  const stones: BoardPoint[] = []
  const liberties = new Set<string>()
  const stack: BoardPoint[] = [{ x, y }]
  while (stack.length) {
    const current = stack.pop() as BoardPoint
    const k = keyOf(current)
    if (visited.has(k)) continue
    visited.add(k)
    stones.push(current)
    for (const n of getNeighbors(board, current.x, current.y)) {
      const v = board[n.y][n.x]
      if (!v) {
        liberties.add(keyOf(n))
      } else if (v === color && !visited.has(keyOf(n))) {
        stack.push(n)
      }
    }
  }
  return { stones, liberties }
}

const removeStones = (board: BoardState, stones: BoardPoint[]) => {
  for (const s of stones) {
    board[s.y][s.x] = null
  }
}

const getOpponent = (color: StoneColor) => (color === 'B' ? 'W' : 'B')

export const applyMove = (
  board: BoardState,
  x: number,
  y: number,
  color: StoneColor,
  koPoint: BoardPoint | null
): MoveResult => {
  const size = board.length
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return { board, captured: [], nextKoPoint: koPoint, legal: false, error: 'OUT_OF_RANGE' }
  }
  if (board[y][x]) {
    return { board, captured: [], nextKoPoint: koPoint, legal: false, error: 'OCCUPIED' }
  }
  if (koPoint && koPoint.x === x && koPoint.y === y) {
    return { board, captured: [], nextKoPoint: koPoint, legal: false, error: 'KO' }
  }

  const nextBoard = cloneBoard(board)
  nextBoard[y][x] = color

  const opponent = getOpponent(color)
  const captured: BoardPoint[] = []
  for (const n of getNeighbors(nextBoard, x, y)) {
    if (nextBoard[n.y][n.x] === opponent) {
      const group = getGroup(nextBoard, n.x, n.y)
      if (group.liberties.size === 0) {
        captured.push(...group.stones)
      }
    }
  }
  if (captured.length) {
    removeStones(nextBoard, captured)
  }

  const ownGroup = getGroup(nextBoard, x, y)
  if (ownGroup.liberties.size === 0) {
    return { board, captured: [], nextKoPoint: koPoint, legal: false, error: 'SUICIDE' }
  }

  let nextKoPoint: BoardPoint | null = null
  if (captured.length === 1 && ownGroup.stones.length === 1 && ownGroup.liberties.size === 1) {
    nextKoPoint = captured[0]
  }

  return { board: nextBoard, captured, nextKoPoint, legal: true }
}
