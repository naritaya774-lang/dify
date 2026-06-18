import { create } from 'zustand'
import { CADObject, PrimitiveType, SceneState, TransformMode, Vec3, ViewMode } from '../types'

interface SceneActions {
  addObject: (type: PrimitiveType) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  updateObject: (id: string, updates: Partial<CADObject>) => void
  setTransformMode: (mode: TransformMode) => void
  setViewMode: (mode: ViewMode) => void
  toggleGrid: () => void
  toggleAxes: () => void
  duplicateObject: (id: string) => void
  clearScene: () => void
  loadScene: (state: SceneState) => void
  setFileName: (name: string) => void
}

const defaultPosition: Vec3 = { x: 0, y: 0, z: 0 }
const defaultRotation: Vec3 = { x: 0, y: 0, z: 0 }
const defaultScale: Vec3 = { x: 1, y: 1, z: 1 }

const COLORS = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
let colorIndex = 0
let objCounter = 1

function makeId() {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const initialState: SceneState = {
  objects: [],
  selectedId: null,
  transformMode: 'translate',
  viewMode: 'perspective',
  gridVisible: true,
  axesVisible: true,
  fileName: 'untitled.dcad',
}

export const useSceneStore = create<SceneState & SceneActions>((set, get) => ({
  ...initialState,

  addObject: (type) => {
    const color = COLORS[colorIndex % COLORS.length]
    colorIndex++
    const obj: CADObject = {
      id: makeId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objCounter++}`,
      type,
      position: { ...defaultPosition, y: type === 'plane' ? 0 : 0.5 },
      rotation: { ...defaultRotation },
      scale: { ...defaultScale },
      color,
      wireframe: false,
      visible: true,
    }
    set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },

  removeObject: (id) => {
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
  },

  selectObject: (id) => set({ selectedId: id }),

  updateObject: (id, updates) => {
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }))
  },

  setTransformMode: (mode) => set({ transformMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleAxes: () => set((s) => ({ axesVisible: !s.axesVisible })),

  duplicateObject: (id) => {
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const copy: CADObject = {
      ...obj,
      id: makeId(),
      name: `${obj.name} (copy)`,
      position: { ...obj.position, x: obj.position.x + 1.5 },
    }
    set((s) => ({ objects: [...s.objects, copy], selectedId: copy.id }))
  },

  clearScene: () => set({ objects: [], selectedId: null }),

  loadScene: (state) => set({ ...state }),

  setFileName: (name) => set({ fileName: name }),
}))
