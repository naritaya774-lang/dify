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
}

const COLORS = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
let colorIndex = 0
let objCounter = 1

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

  clearScene: () => set({ objects: [], selectedIds: [] }),

  loadScene: (state) => set({ ...state }),

  setFileName: (name) => set({ fileName: name }),
}))
