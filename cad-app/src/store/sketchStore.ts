import { create } from 'zustand'
import type { Pt2, SketchMode, SketchShape, SketchTool } from '../types'

function makeId() {
  return `sk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid
}

interface SketchState {
  active: boolean
  mode: SketchMode
  tool: SketchTool
  currentPoints: Pt2[]
  shapes: SketchShape[]
  mousePos: Pt2 | null
  extrudeDepth: number
  revolveAngle: number
  snap: number
}

interface SketchActions {
  startSketch: (mode: SketchMode) => void
  cancelSketch: () => void
  setTool: (tool: SketchTool) => void
  addPoint: (p: Pt2) => void
  closeShape: () => void
  setMousePos: (p: Pt2 | null) => void
  setExtrudeDepth: (d: number) => void
  setRevolveAngle: (a: number) => void
}

export const useSketchStore = create<SketchState & SketchActions>((set, get) => ({
  active: false,
  mode: 'extrude',
  tool: 'polyline',
  currentPoints: [],
  shapes: [],
  mousePos: null,
  extrudeDepth: 1,
  revolveAngle: Math.PI * 2,
  snap: 0.5,

  startSketch: (mode) => set({
    active: true,
    mode,
    tool: 'polyline',
    currentPoints: [],
    shapes: [],
    mousePos: null,
  }),

  cancelSketch: () => set({
    active: false,
    currentPoints: [],
    shapes: [],
    mousePos: null,
  }),

  setTool: (tool) => set({ tool, currentPoints: [] }),

  addPoint: (p) => {
    const { tool, currentPoints, snap: snapGrid, shapes } = get()
    const snapped: Pt2 = { x: snap(p.x, snapGrid), y: snap(p.y, snapGrid) }

    if (tool === 'polyline') {
      set({ currentPoints: [...currentPoints, snapped] })
    } else if (tool === 'circle') {
      if (currentPoints.length === 0) {
        // First click: set center
        set({ currentPoints: [snapped] })
      } else {
        // Second click: compute radius and complete shape
        const center = currentPoints[0]
        const dx = snapped.x - center.x
        const dy = snapped.y - center.y
        const r = Math.sqrt(dx * dx + dy * dy)
        const shape: SketchShape = {
          id: makeId(),
          tool: 'circle',
          points: [center],
          closed: true,
          circleCenter: center,
          circleRadius: r,
        }
        set({ shapes: [...shapes, shape], currentPoints: [] })
      }
    } else if (tool === 'rect') {
      if (currentPoints.length === 0) {
        // First click: first corner
        set({ currentPoints: [snapped] })
      } else {
        // Second click: opposite corner, complete shape
        const c1 = currentPoints[0]
        const c2 = snapped
        const pts: Pt2[] = [
          { x: c1.x, y: c1.y },
          { x: c2.x, y: c1.y },
          { x: c2.x, y: c2.y },
          { x: c1.x, y: c2.y },
        ]
        const shape: SketchShape = {
          id: makeId(),
          tool: 'rect',
          points: pts,
          closed: true,
        }
        set({ shapes: [...shapes, shape], currentPoints: [] })
      }
    }
  },

  closeShape: () => {
    const { currentPoints, shapes, tool } = get()
    if (tool === 'polyline' && currentPoints.length >= 3) {
      const shape: SketchShape = {
        id: makeId(),
        tool: 'polyline',
        points: [...currentPoints],
        closed: true,
      }
      set({ shapes: [...shapes, shape], currentPoints: [] })
    }
  },

  setMousePos: (p) => {
    const { snap: snapGrid } = get()
    if (p === null) {
      set({ mousePos: null })
      return
    }
    set({ mousePos: { x: snap(p.x, snapGrid), y: snap(p.y, snapGrid) } })
  },

  setExtrudeDepth: (d) => set({ extrudeDepth: d }),
  setRevolveAngle: (a) => set({ revolveAngle: a }),
}))
