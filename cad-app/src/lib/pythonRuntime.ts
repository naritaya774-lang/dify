// JavaScript runtime context exposed to Python scripts
// Python kwargs (width=1) are transpiled to JS objects ({width: 1})

import { useSceneStore } from '../store/sceneStore'
import type { Vec3, GeometryParams, PrimitiveType } from '../types'

interface AddParams {
  position?: [number, number, number] | Vec3
  rotation?: [number, number, number] | Vec3
  scale?: [number, number, number] | Vec3
  color?: string
  name?: string
  [key: string]: unknown
}

const COLORS = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
let colorIdx = 0

function nextColor() { return COLORS[colorIdx++ % COLORS.length] }

function toVec3(v?: [number, number, number] | Vec3 | null): Vec3 {
  if (!v) return { x: 0, y: 0, z: 0 }
  if (Array.isArray(v)) return { x: v[0] ?? 0, y: v[1] ?? 0, z: v[2] ?? 0 }
  return v as Vec3
}

function makeId() { return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

function addPrimitive(type: PrimitiveType, params: GeometryParams, p: AddParams, defaultY = 0.5): string {
  const id = makeId()
  const pos = toVec3(p.position as [number, number, number] | Vec3 | undefined)
  if (p.position == null) pos.y = defaultY
  const obj = {
    id,
    name: typeof p.name === 'string' ? p.name : `${type[0].toUpperCase()}${type.slice(1)}`,
    type,
    position: pos,
    rotation: toVec3(p.rotation as [number, number, number] | Vec3 | undefined),
    scale: p.scale ? toVec3(p.scale as [number, number, number] | Vec3 | undefined) : { x: 1, y: 1, z: 1 },
    color: typeof p.color === 'string' ? p.color : nextColor(),
    wireframe: false,
    visible: true,
    params,
  }
  useSceneStore.setState((s) => ({ objects: [...s.objects, obj], selectedIds: [id] }))
  return id
}

export function createCadRuntime(appendOutput: (line: string) => void): Record<string, unknown> {
  return {
    // Python built-in helpers
    _print: (...args: unknown[]) => appendOutput(args.map(String).join(' ')),
    _len: (x: unknown) => (Array.isArray(x) || typeof x === 'string') ? (x as { length: number }).length : 0,
    _sum: (x: number[]) => x.reduce((a, b) => a + b, 0),
    _range: (a: number, b?: number, c?: number): number[] => {
      const start = b === undefined ? 0 : a
      const end = b === undefined ? a : b
      const step = c ?? 1
      const result: number[] = []
      if (step > 0) for (let i = start; i < end; i += step) result.push(i)
      else for (let i = start; i > end; i += step) result.push(i)
      return result
    },
    math: Math,
    Math,

    // ── CAD API ──────────────────────────────────────────────────────────────

    add_box: (p: AddParams & { width?: number; height?: number; depth?: number } = {}) =>
      addPrimitive('box', {
        width: (p.width as number) ?? 1, height: (p.height as number) ?? 1, depth: (p.depth as number) ?? 1,
        widthSegments: 1, heightSegments: 1, depthSegments: 1,
      }, p),

    add_sphere: (p: AddParams & { radius?: number } = {}) =>
      addPrimitive('sphere', { radius: (p.radius as number) ?? 0.5, phiSegments: 32, thetaSegments: 16 }, p),

    add_cylinder: (p: AddParams & { radius?: number; radius_top?: number; radius_bottom?: number; height?: number } = {}) => {
      const rt = (p.radius_top ?? p.radius ?? 0.5) as number
      const rb = (p.radius_bottom ?? p.radius ?? 0.5) as number
      return addPrimitive('cylinder', { radiusTop: rt, radiusBottom: rb, height: (p.height as number) ?? 1, radialSegments: 32 }, p)
    },

    add_cone: (p: AddParams & { radius?: number; height?: number } = {}) =>
      addPrimitive('cone', { radiusBottom: (p.radius as number) ?? 0.5, height: (p.height as number) ?? 1, radialSegments: 32 }, p),

    add_torus: (p: AddParams & { radius?: number; tube?: number } = {}) =>
      addPrimitive('torus', { radius: (p.radius as number) ?? 0.5, tube: (p.tube as number) ?? 0.2, tubularSegments: 64, radialSegments: 16, arc: Math.PI * 2 }, p),

    add_plane: (p: AddParams & { width?: number; height?: number } = {}) =>
      addPrimitive('plane', { planeWidth: (p.width as number) ?? 2, planeHeight: (p.height as number) ?? 2, widthSegments: 1, heightSegments: 1 }, p, 0),

    delete: (id: string) => useSceneStore.getState().removeObject(id),

    duplicate: (id: string) => {
      const obj = useSceneStore.getState().objects.find((o) => o.id === id)
      if (!obj) return null
      const newId = makeId()
      const copy = { ...obj, id: newId, position: { ...obj.position, x: obj.position.x + 1.5 }, params: { ...obj.params } }
      useSceneStore.setState((s) => ({ objects: [...s.objects, copy], selectedIds: [newId] }))
      return newId
    },

    set_color: (id: string, color: string) =>
      useSceneStore.getState().updateObject(id, { color }),

    set_position: (id: string, pos: [number, number, number]) =>
      useSceneStore.getState().updateObject(id, { position: { x: pos[0], y: pos[1], z: pos[2] } }),

    set_scale: (id: string, s: [number, number, number] | number) => {
      const v = typeof s === 'number' ? { x: s, y: s, z: s } : { x: s[0], y: s[1], z: s[2] }
      useSceneStore.getState().updateObject(id, { scale: v })
    },

    mirror: (id: string, axis: 'x' | 'y' | 'z') =>
      useSceneStore.getState().mirrorObject(id, axis),

    linear_array: (id: string, axis: 'x' | 'y' | 'z', count: number, spacing: number) =>
      useSceneStore.getState().linearArray(id, axis, count, spacing),

    circular_array: (id: string, count: number, radius: number) =>
      useSceneStore.getState().circularArray(id, 'y', count, radius),
  }
}
