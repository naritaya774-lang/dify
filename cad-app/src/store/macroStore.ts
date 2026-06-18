import { create } from 'zustand'
import { macroRecord, type MacroOp } from './macroRecorder'
import { useSceneStore } from './sceneStore'
import type { CADObject, PrimitiveType } from '../types'

export interface Macro {
  id: string
  name: string
  ops: MacroOp[]
}

interface MacroState {
  macros: Macro[]
  recording: boolean
}

interface MacroActions {
  startRecording: () => void
  stopRecording: (name: string) => void
  cancelRecording: () => void
  runMacro: (id: string) => void
  deleteMacro: (id: string) => void
  updateMacro: (id: string, updates: Partial<Pick<Macro, 'name' | 'ops'>>) => void
}

function makeId() {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const _pendingOps: MacroOp[] = []

export const useMacroStore = create<MacroState & MacroActions>((set, get) => ({
  macros: [],
  recording: false,

  startRecording: () => {
    _pendingOps.length = 0
    macroRecord.start((op) => {
      // Dedup consecutive update/params for same vid
      if (_pendingOps.length > 0) {
        const last = _pendingOps[_pendingOps.length - 1]
        if ((op.type === 'update' || op.type === 'params') &&
            last.type === op.type &&
            (last as { vid: string }).vid === (op as { vid: string }).vid) {
          _pendingOps[_pendingOps.length - 1] = op
          return
        }
      }
      _pendingOps.push(op)
    })
    set({ recording: true })
  },

  stopRecording: (name) => {
    macroRecord.stop()
    const ops = [..._pendingOps]
    _pendingOps.length = 0
    if (ops.length > 0) {
      const macro: Macro = { id: `macro_${Date.now()}`, name, ops }
      set((s) => ({ macros: [...s.macros, macro], recording: false }))
    } else {
      set({ recording: false })
    }
  },

  cancelRecording: () => {
    macroRecord.stop()
    _pendingOps.length = 0
    set({ recording: false })
  },

  runMacro: (id) => {
    const macro = get().macros.find((m) => m.id === id)
    if (!macro) return

    useSceneStore.getState()._snapshot()
    const vidToReal = new Map<string, string>()
    const sceneStore = useSceneStore

    for (const op of macro.ops) {
      switch (op.type) {
        case 'add': {
          const newId = makeId()
          vidToReal.set(op.vid, newId)
          const obj: CADObject = {
            id: newId, name: op.name, type: op.primitiveType as PrimitiveType,
            position: { ...op.position }, rotation: { ...op.rotation }, scale: { ...op.scale },
            color: op.color, wireframe: false, visible: true, params: { ...op.params },
          }
          sceneStore.setState((s) => ({ objects: [...s.objects, obj], selectedIds: [newId] }))
          break
        }
        case 'delete': {
          const realId = vidToReal.get(op.vid)
          if (realId) {
            sceneStore.setState((s) => ({
              objects: s.objects.filter((o) => o.id !== realId),
              selectedIds: s.selectedIds.filter((sid) => sid !== realId),
            }))
          }
          break
        }
        case 'update': {
          const realId = vidToReal.get(op.vid)
          if (realId) {
            sceneStore.setState((s) => ({
              objects: s.objects.map((o) =>
                o.id === realId
                  ? { ...o, position: { ...op.position }, rotation: { ...op.rotation }, scale: { ...op.scale } }
                  : o
              ),
            }))
          }
          break
        }
        case 'params': {
          const realId = vidToReal.get(op.vid)
          if (realId) {
            sceneStore.setState((s) => ({
              objects: s.objects.map((o) =>
                o.id === realId ? { ...o, params: { ...o.params, ...op.params } } : o
              ),
            }))
          }
          break
        }
        case 'duplicate': {
          const sourceRealId = vidToReal.get(op.sourceVid)
          if (!sourceRealId) break
          const src = sceneStore.getState().objects.find((o) => o.id === sourceRealId)
          if (!src) break
          const newId = makeId()
          vidToReal.set(op.newVid, newId)
          const copy: CADObject = {
            ...src, id: newId,
            position: { ...src.position, x: src.position.x + 1.5 },
            params: { ...src.params },
          }
          sceneStore.setState((s) => ({ objects: [...s.objects, copy], selectedIds: [newId] }))
          break
        }
        case 'mirror': {
          const realId = vidToReal.get(op.vid)
          if (!realId) break
          const src = sceneStore.getState().objects.find((o) => o.id === realId)
          if (!src) break
          const newId = makeId()
          vidToReal.set(op.newVid, newId)
          const axis = op.axis as 'x' | 'y' | 'z'
          const pos = { ...src.position }; pos[axis] = -pos[axis]
          const rot = { ...src.rotation }; const sc = { ...src.scale }; sc[axis] = -sc[axis]
          if (axis === 'x') { rot.y = -rot.y; rot.z = -rot.z }
          else if (axis === 'y') { rot.x = -rot.x; rot.z = -rot.z }
          else { rot.x = -rot.x; rot.y = -rot.y }
          const mirror: CADObject = { ...src, id: newId, name: `${src.name} M${axis.toUpperCase()}`, position: pos, rotation: rot, scale: sc, params: { ...src.params } }
          sceneStore.setState((s) => ({ objects: [...s.objects, mirror] }))
          break
        }
        case 'linearArray': {
          const realId = vidToReal.get(op.vid)
          if (!realId) break
          const src = sceneStore.getState().objects.find((o) => o.id === realId)
          if (!src) break
          const copies: CADObject[] = []
          for (let i = 0; i < op.newVids.length; i++) {
            const newId = makeId()
            vidToReal.set(op.newVids[i], newId)
            const pos = { ...src.position }; pos[op.axis as 'x' | 'y' | 'z'] = src.position[op.axis as 'x' | 'y' | 'z'] + (i + 1) * op.spacing
            copies.push({ ...src, id: newId, name: `${src.name} [${i + 1}]`, position: pos, params: { ...src.params } })
          }
          sceneStore.setState((s) => ({ objects: [...s.objects, ...copies] }))
          break
        }
        case 'circularArray': {
          const realId = vidToReal.get(op.vid)
          if (!realId) break
          const src = sceneStore.getState().objects.find((o) => o.id === realId)
          if (!src) break
          const copies: CADObject[] = []
          for (let i = 0; i < op.newVids.length; i++) {
            const newId = makeId()
            vidToReal.set(op.newVids[i], newId)
            const angle = (i / op.count) * Math.PI * 2
            copies.push({ ...src, id: newId, name: `${src.name} [${i}]`, position: { x: src.position.x + Math.cos(angle) * op.radius, y: src.position.y, z: src.position.z + Math.sin(angle) * op.radius }, params: { ...src.params } })
          }
          sceneStore.setState((s) => ({ objects: [...s.objects, ...copies] }))
          break
        }
      }
    }
  },

  deleteMacro: (id) => {
    set((s) => ({ macros: s.macros.filter((m) => m.id !== id) }))
  },

  updateMacro: (id, updates) => {
    set((s) => ({ macros: s.macros.map((m) => m.id === id ? { ...m, ...updates } : m) }))
  },
}))
