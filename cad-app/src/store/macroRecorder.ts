import type { Vec3, GeometryParams, PrimitiveType } from '../types'

export type MacroOp =
  | { type: 'add'; vid: string; primitiveType: PrimitiveType; name: string; position: Vec3; rotation: Vec3; scale: Vec3; color: string; params: GeometryParams }
  | { type: 'delete'; vid: string }
  | { type: 'update'; vid: string; position: Vec3; rotation: Vec3; scale: Vec3 }
  | { type: 'params'; vid: string; params: Partial<GeometryParams> }
  | { type: 'duplicate'; sourceVid: string; newVid: string }
  | { type: 'mirror'; vid: string; axis: 'x' | 'y' | 'z'; newVid: string }
  | { type: 'linearArray'; vid: string; axis: 'x' | 'y' | 'z'; count: number; spacing: number; newVids: string[] }
  | { type: 'circularArray'; vid: string; count: number; radius: number; newVids: string[] }

type Emitter = (op: MacroOp) => void
let _emitter: Emitter | null = null
const _vidMap = new Map<string, string>()
let _vidCounter = 0

export const macroRecord = {
  start: (emitter: Emitter) => {
    _emitter = emitter
    _vidMap.clear()
    _vidCounter = 0
  },
  stop: () => { _emitter = null },
  active: () => _emitter !== null,
  getVid: (realId: string): string => {
    if (!_vidMap.has(realId)) _vidMap.set(realId, `v${_vidCounter++}`)
    return _vidMap.get(realId)!
  },
  emit: (op: MacroOp) => { _emitter?.(op) },
}
