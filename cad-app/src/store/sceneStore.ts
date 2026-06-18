import { create } from 'zustand'
import { CADObject, GeometryParams, PrimitiveType, SceneState, TransformMode, Vec3, ViewMode } from '../types'
import { useLang } from '../i18n/useLang'
import type { TranslationKey } from '../i18n/translations'

interface SceneActions {
  addObject: (type: PrimitiveType) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null, multi?: boolean) => void
  clearSelection: () => void
  updateObject: (id: string, updates: Partial<CADObject>) => void
  updateParams: (id: string, params: Partial<GeometryParams>) => void
  setTransformMode: (mode: TransformMode) => void
  setViewMode: (mode: ViewMode) => void
  toggleGrid: () => void
  toggleAxes: () => void
  duplicateObject: (id: string) => void
  clearScene: () => void
  loadScene: (state: SceneState) => void
  setFileName: (name: string) => void
  linearArray: (id: string, axis: 'x' | 'y' | 'z', count: number, spacing: number) => void
  circularArray: (id: string, axis: 'y', count: number, radius: number) => void
  mirrorObject: (id: string, axis: 'x' | 'y' | 'z') => void
  undo: () => void
  redo: () => void
  _snapshot: () => void
  alignObjects: (axis: 'x' | 'y' | 'z', mode: 'min' | 'center' | 'max') => void
}

const COLORS = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
let colorIndex = 0
let objCounter = 1

type Snapshot = { objects: CADObject[]; selectedIds: string[] }
const _past: Snapshot[] = []
const _future: Snapshot[] = []

function takeSnapshot(state: { objects: CADObject[]; selectedIds: string[] }) {
  _past.push({
    objects: state.objects.map((o) => ({ ...o, params: { ...o.params } })),
    selectedIds: [...state.selectedIds],
  })
  if (_past.length > 50) _past.shift()
  _future.length = 0
}

function makeId() {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultParams(type: PrimitiveType): GeometryParams {
  switch (type) {
    case 'box': return { width: 1, height: 1, depth: 1, widthSegments: 1, heightSegments: 1, depthSegments: 1 }
    case 'sphere': return { radius: 0.5, phiSegments: 32, thetaSegments: 16 }
    case 'cylinder': return { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 32, openEnded: false }
    case 'cone': return { radiusBottom: 0.5, height: 1, radialSegments: 32, openEnded: false }
    case 'torus': return { radius: 0.5, tube: 0.2, tubularSegments: 64, radialSegments: 16, arc: Math.PI * 2 }
    case 'plane': return { planeWidth: 2, planeHeight: 2, widthSegments: 1, heightSegments: 1 }
    default: return {}
  }
}

const initialState: SceneState = {
  objects: [],
  selectedIds: [],
  transformMode: 'translate',
  viewMode: 'perspective',
  gridVisible: true,
  axesVisible: true,
  fileName: 'untitled.dcad',
}

export const useSceneStore = create<SceneState & SceneActions>((set, get) => ({
  ...initialState,

  addObject: (type) => {
    takeSnapshot(get())
    const color = COLORS[colorIndex % COLORS.length]
    colorIndex++
    const key = `obj${type.charAt(0).toUpperCase() + type.slice(1)}` as TranslationKey
    const baseName = useLang.getState().t(key)
    const obj: CADObject = {
      id: makeId(),
      name: `${baseName} ${objCounter++}`,
      type,
      position: { x: 0, y: type === 'plane' ? 0 : 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color,
      wireframe: false,
      visible: true,
      params: defaultParams(type),
    }
    set((s) => ({ objects: [...s.objects, obj], selectedIds: [obj.id] }))
  },

  removeObject: (id) => {
    takeSnapshot(get())
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    }))
  },

  selectObject: (id, multi = false) => {
    if (id === null) {
      set({ selectedIds: [] })
      return
    }
    set((s) => {
      if (multi) {
        const already = s.selectedIds.includes(id)
        return { selectedIds: already ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id] }
      }
      return { selectedIds: [id] }
    })
  },

  clearSelection: () => set({ selectedIds: [] }),

  updateObject: (id, updates) => {
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }))
  },

  updateParams: (id, params) => {
    takeSnapshot(get())
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, params: { ...o.params, ...params } } : o
      ),
    }))
  },

  setTransformMode: (mode) => set({ transformMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleAxes: () => set((s) => ({ axesVisible: !s.axesVisible })),

  duplicateObject: (id) => {
    takeSnapshot(get())
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const copyLabel = useLang.getState().t('objCopy')
    const copy: CADObject = {
      ...obj,
      id: makeId(),
      name: `${obj.name} ${copyLabel}`,
      position: { ...obj.position, x: obj.position.x + 1.5 },
      params: { ...obj.params },
    }
    set((s) => ({ objects: [...s.objects, copy], selectedIds: [copy.id] }))
  },

  clearScene: () => { takeSnapshot(get()); set({ objects: [], selectedIds: [] }) },

  loadScene: (state) => set({ ...state }),

  setFileName: (name) => set({ fileName: name }),

  linearArray: (id, axis, count, spacing) => {
    takeSnapshot(get())
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const copies: CADObject[] = []
    for (let i = 1; i < count; i++) {
      const offset = i * spacing
      const pos = { ...obj.position }
      pos[axis] = obj.position[axis] + offset
      copies.push({
        ...obj,
        id: makeId(),
        name: `${obj.name} [${i}]`,
        position: pos,
        params: { ...obj.params },
      })
    }
    set((s) => ({ objects: [...s.objects, ...copies] }))
  },

  circularArray: (id, _axis, count, radius) => {
    takeSnapshot(get())
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const copies: CADObject[] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = obj.position.x + Math.cos(angle) * radius
      const z = obj.position.z + Math.sin(angle) * radius
      copies.push({
        ...obj,
        id: makeId(),
        name: `${obj.name} [${i}]`,
        position: { x, y: obj.position.y, z },
        params: { ...obj.params },
      })
    }
    set((s) => ({ objects: [...s.objects, ...copies] }))
  },

  mirrorObject: (id, axis) => {
    takeSnapshot(get())
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const pos = { ...obj.position }
    const rot = { ...obj.rotation }
    const sc = { ...obj.scale }
    pos[axis] = -pos[axis]
    sc[axis] = -sc[axis]
    if (axis === 'x') {
      rot.y = -rot.y
      rot.z = -rot.z
    } else if (axis === 'y') {
      rot.x = -rot.x
      rot.z = -rot.z
    } else {
      rot.x = -rot.x
      rot.y = -rot.y
    }
    const mirror: CADObject = {
      ...obj,
      id: makeId(),
      name: `${obj.name} Mirror${axis.toUpperCase()}`,
      position: pos,
      rotation: rot,
      scale: sc,
      params: { ...obj.params },
    }
    set((s) => ({ objects: [...s.objects, mirror] }))
  },

  undo: () => {
    if (_past.length === 0) return
    const prev = _past.pop()!
    const current = get()
    _future.push({
      objects: current.objects.map((o) => ({ ...o, params: { ...o.params } })),
      selectedIds: [...current.selectedIds],
    })
    set({ objects: prev.objects, selectedIds: prev.selectedIds })
  },

  redo: () => {
    if (_future.length === 0) return
    const next = _future.pop()!
    const current = get()
    _past.push({
      objects: current.objects.map((o) => ({ ...o, params: { ...o.params } })),
      selectedIds: [...current.selectedIds],
    })
    set({ objects: next.objects, selectedIds: next.selectedIds })
  },

  _snapshot: () => {
    takeSnapshot(get())
  },

  alignObjects: (axis, mode) => {
    const ids = get().selectedIds
    if (ids.length < 2) return
    takeSnapshot(get())
    const objs = get().objects.filter((o) => ids.includes(o.id))
    const vals = objs.map((o) => o.position[axis])
    const target =
      mode === 'min' ? Math.min(...vals)
      : mode === 'max' ? Math.max(...vals)
      : vals.reduce((a, b) => a + b, 0) / vals.length
    set((s) => ({
      objects: s.objects.map((o) =>
        ids.includes(o.id) ? { ...o, position: { ...o.position, [axis]: target } } : o
      ),
    }))
  },
}))
