import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { ADDITION, SUBTRACTION, INTERSECTION, Evaluator } from 'three-bvh-csg'
import { useSceneStore } from '../store/sceneStore'
import { useSketchStore } from '../store/sketchStore'
import type { BooleanOp, CADObject, GeometryParams, Pt2, PrimitiveType } from '../types'

export const viewportActions = {
  exportSTL: null as (() => void) | null,
  exportOBJ: null as (() => void) | null,
  booleanOp: null as ((op: BooleanOp) => void) | null,
  commitSketch: null as (() => void) | null,
}

export function buildGeometry(type: PrimitiveType | 'boolean' | 'custom', p: GeometryParams): THREE.BufferGeometry {
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(p.width ?? 1, p.height ?? 1, p.depth ?? 1,
        p.widthSegments ?? 1, p.heightSegments ?? 1, p.depthSegments ?? 1)
    case 'sphere':
      return new THREE.SphereGeometry(p.radius ?? 0.5, p.phiSegments ?? 32, p.thetaSegments ?? 16)
    case 'cylinder':
      return new THREE.CylinderGeometry(p.radiusTop ?? 0.5, p.radiusBottom ?? 0.5,
        p.height ?? 1, p.radialSegments ?? 32, 1, p.openEnded ?? false)
    case 'cone':
      return new THREE.ConeGeometry(p.radiusBottom ?? 0.5, p.height ?? 1,
        p.radialSegments ?? 32, 1, p.openEnded ?? false)
    case 'torus':
      return new THREE.TorusGeometry(p.radius ?? 0.5, p.tube ?? 0.2,
        p.radialSegments ?? 16, p.tubularSegments ?? 64, p.arc ?? Math.PI * 2)
    case 'plane':
      return new THREE.PlaneGeometry(p.planeWidth ?? 2, p.planeHeight ?? 2,
        p.widthSegments ?? 1, p.heightSegments ?? 1)
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

function applyTransform(mesh: THREE.Mesh, obj: CADObject) {
  mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
  mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z)
  mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
  mesh.visible = obj.visible
  const mat = mesh.material as THREE.MeshStandardMaterial
  mat.color.set(obj.color)
  mat.wireframe = obj.wireframe
}

function clearGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0] as THREE.Mesh | THREE.Line
    group.remove(child)
    if ('geometry' in child && child.geometry) child.geometry.dispose()
    if ('material' in child) {
      const mat = (child as THREE.Mesh).material as THREE.Material | THREE.Material[]
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat.dispose()
    }
  }
}

const OUTLINE_COLOR = 0xffffff
const SELECT_COLOR = 0x4a9eff
const COLORS_LIST = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const orbitRef = useRef<OrbitControls | null>(null)
  const transformRef = useRef<TransformControls | null>(null)
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const outlineMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const axesRef = useRef<THREE.AxesHelper | null>(null)
  const sketchGroupRef = useRef<THREE.Group | null>(null)
  const rafRef = useRef<number>(0)
  const csgEvalRef = useRef(new Evaluator())

  const { objects, selectedIds, transformMode, gridVisible, axesVisible, selectObject, updateObject } = useSceneStore()
  const { active: sketchActive, mode: sketchMode, shapes, currentPoints, mousePos } = useSketchStore()

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x1a1a2e)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355)
    scene.add(grid); gridRef.current = grid

    const axes = new THREE.AxesHelper(5)
    scene.add(axes); axesRef.current = axes

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(10, 20, 10); dir.castShadow = true; scene.add(dir)
    scene.add(new THREE.HemisphereLight(0x4466ff, 0x224422, 0.3))

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000)
    camera.position.set(5, 5, 5); camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const orbit = new OrbitControls(camera, renderer.domElement)
    orbit.enableDamping = true; orbit.dampingFactor = 0.05
    orbitRef.current = orbit

    const transform = new TransformControls(camera, renderer.domElement)
    transform.addEventListener('dragging-changed', (e) => {
      orbit.enabled = !(e as { value: boolean }).value
    })
    transform.addEventListener('objectChange', () => {
      const obj = transform.object
      if (!obj) return
      const id = obj.userData.cadId as string
      updateObject(id, {
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      })
    })
    scene.add(transform); transformRef.current = transform

    const sketchGroup = new THREE.Group()
    scene.add(sketchGroup); sketchGroupRef.current = sketchGroup

    viewportActions.exportSTL = () => {
      const exporter = new STLExporter()
      const group = new THREE.Group()
      meshMapRef.current.forEach((m) => { if (m.visible) group.add(m.clone()) })
      const data = exporter.parse(group, { binary: true }) as ArrayBuffer
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'model.stl'; a.click()
    }

    viewportActions.exportOBJ = () => {
      const exporter = new OBJExporter()
      const group = new THREE.Group()
      meshMapRef.current.forEach((m) => { if (m.visible) group.add(m.clone()) })
      const data = exporter.parse(group)
      const blob = new Blob([data], { type: 'text/plain' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'model.obj'; a.click()
    }

    viewportActions.booleanOp = (op: BooleanOp) => {
      const state = useSceneStore.getState()
      const ids = state.selectedIds
      if (ids.length < 2) return
      const [aId, bId] = ids
      const meshA = meshMapRef.current.get(aId)
      const meshB = meshMapRef.current.get(bId)
      if (!meshA || !meshB) return
      const opMap = { union: ADDITION, subtract: SUBTRACTION, intersect: INTERSECTION }
      try {
        const cloneA = meshA.clone(); cloneA.updateMatrixWorld(true)
        const cloneB = meshB.clone(); cloneB.updateMatrixWorld(true)
        const result = csgEvalRef.current.evaluate(cloneA, cloneB, opMap[op])
        const id = `obj_${Date.now()}_csg`
        const objA = state.objects.find((o) => o.id === aId)!
        const newObj = {
          id, name: `Boolean ${op}`, type: 'boolean' as const,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
          color: objA?.color ?? '#4a9eff', wireframe: false, visible: true, params: {},
        }
        result.userData.cadId = id
        result.material = new THREE.MeshStandardMaterial({ color: newObj.color })
        result.castShadow = true; result.receiveShadow = true
        scene.add(result); meshMapRef.current.set(id, result)
        state.removeObject(aId); state.removeObject(bId)
        useSceneStore.setState((s) => ({ objects: [...s.objects, newObj], selectedIds: [id] }))
      } catch (e) { console.error('CSG failed', e) }
    }

    viewportActions.commitSketch = () => {
      const sk = useSketchStore.getState()
      const { shapes: skShapes, mode, extrudeDepth, revolveAngle } = sk
      if (skShapes.length === 0) return

      const color = COLORS_LIST[Math.floor(Math.random() * COLORS_LIST.length)]
      const id = `obj_${Date.now()}_sketch`
      let mesh: THREE.Mesh
      let rotX = 0

      if (mode === 'extrude') {
        const threeShapes = skShapes.map((s) => {
          const shape = new THREE.Shape()
          if (s.tool === 'circle' && s.circleCenter) {
            shape.absarc(s.circleCenter.x, -s.circleCenter.y, s.circleRadius ?? 1, 0, Math.PI * 2, false)
          } else {
            const [first, ...rest] = s.points
            if (!first) return shape
            shape.moveTo(first.x, -first.y)
            rest.forEach((p) => shape.lineTo(p.x, -p.y))
            if (s.closed) shape.closePath()
          }
          return shape
        })
        const geo = new THREE.ExtrudeGeometry(threeShapes, { depth: extrudeDepth, bevelEnabled: false })
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }))
        rotX = -Math.PI / 2
        mesh.rotation.x = rotX
      } else {
        const profile = skShapes[0]
        if (!profile || profile.points.length < 2) return
        const pts = profile.points.filter((p) => p.x >= 0).map((p) => new THREE.Vector2(p.x, p.y))
        if (pts.length < 2) return
        const geo = new THREE.LatheGeometry(pts, 64, 0, revolveAngle)
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }))
      }

      const newObj = {
        id,
        name: mode === 'extrude' ? 'Extrude' : 'Revolve',
        type: 'custom' as const,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: rotX, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color,
        wireframe: false,
        visible: true,
        params: {},
      }
      mesh.userData.cadId = id; mesh.castShadow = true; mesh.receiveShadow = true
      scene.add(mesh); meshMapRef.current.set(id, mesh)
      useSceneStore.setState((s) => ({ objects: [...s.objects, newObj], selectedIds: [id] }))
      sk.cancelSketch()
    }

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      orbit.update(); renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth; const h = mount.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
    })
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect(); transform.dispose(); orbit.dispose(); renderer.dispose()
      mount.removeChild(renderer.domElement)
      viewportActions.exportSTL = null; viewportActions.exportOBJ = null
      viewportActions.booleanOp = null; viewportActions.commitSketch = null
    }
  }, [updateObject])

  // Sketch mouse events
  useEffect(() => {
    const domEl = rendererRef.current?.domElement
    const camera = cameraRef.current
    const orbit = orbitRef.current
    if (!domEl || !camera) return
    if (!sketchActive) { if (orbit) orbit.enabled = true; return }
    if (orbit) orbit.enabled = false

    let mdX = 0; let mdY = 0

    const project = (clientX: number, clientY: number): Pt2 | null => {
      const rect = domEl.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1
      const ray = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera)
      const normal = sketchMode === 'extrude' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
      const target = new THREE.Vector3()
      const hit = ray.ray.intersectPlane(new THREE.Plane(normal, 0), target)
      if (!hit) return null
      return sketchMode === 'extrude' ? { x: target.x, y: target.z } : { x: target.x, y: target.y }
    }

    const onMD = (e: MouseEvent) => { mdX = e.clientX; mdY = e.clientY }
    const onMM = (e: MouseEvent) => { const p = project(e.clientX, e.clientY); if (p) useSketchStore.getState().setMousePos(p) }
    const onCL = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - mdX, e.clientY - mdY) > 5) return
      const p = project(e.clientX, e.clientY)
      if (p) useSketchStore.getState().addPoint(p)
    }
    const onDBL = (e: MouseEvent) => { useSketchStore.getState().closeShape(); e.preventDefault() }

    domEl.addEventListener('mousedown', onMD)
    domEl.addEventListener('mousemove', onMM)
    domEl.addEventListener('click', onCL)
    domEl.addEventListener('dblclick', onDBL)
    return () => {
      domEl.removeEventListener('mousedown', onMD)
      domEl.removeEventListener('mousemove', onMM)
      domEl.removeEventListener('click', onCL)
      domEl.removeEventListener('dblclick', onDBL)
      if (orbit) orbit.enabled = true
    }
  }, [sketchActive, sketchMode])

  // Sketch visualization
  useEffect(() => {
    const group = sketchGroupRef.current
    if (!group) return
    clearGroup(group)
    if (!sketchActive) { group.visible = false; return }
    group.visible = true

    const ptToVec3 = (pt: Pt2): THREE.Vector3 =>
      sketchMode === 'extrude'
        ? new THREE.Vector3(pt.x, 0.02, pt.y)
        : new THREE.Vector3(pt.x, pt.y, 0.02)

    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.06, side: THREE.DoubleSide }),
    )
    if (sketchMode === 'extrude') planeMesh.rotation.x = -Math.PI / 2
    group.add(planeMesh)

    const lmat = (c: number) => new THREE.LineBasicMaterial({ color: c })
    const dmat = (c: number) => new THREE.MeshBasicMaterial({ color: c })

    shapes.forEach((s) => {
      let pts3: THREE.Vector3[]
      if (s.tool === 'circle' && s.circleCenter) {
        const N = 64; const r = s.circleRadius ?? 1; const cx = s.circleCenter.x; const cy = s.circleCenter.y
        pts3 = Array.from({ length: N + 1 }, (_, i) => {
          const a = (i / N) * Math.PI * 2
          return ptToVec3({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
        })
      } else {
        pts3 = s.points.map(ptToVec3)
        if (s.closed && pts3.length > 0) pts3.push(pts3[0].clone())
      }
      if (pts3.length >= 2) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3), lmat(0xffffff)))
      s.points.forEach((p) => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), dmat(0xffffff))
        dot.position.copy(ptToVec3(p)); group.add(dot)
      })
    })

    if (currentPoints.length > 0) {
      const cvecs = currentPoints.map(ptToVec3)
      if (cvecs.length >= 2) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cvecs), lmat(0x00ffff)))
      if (mousePos) {
        const last = ptToVec3(currentPoints[currentPoints.length - 1])
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([last, ptToVec3(mousePos)]), lmat(0xffff00)))
      }
      currentPoints.forEach((p) => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), dmat(0x00ffff))
        dot.position.copy(ptToVec3(p)); group.add(dot)
      })
    }
    if (mousePos) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), dmat(0xffff00))
      dot.position.copy(ptToVec3(mousePos)); group.add(dot)
    }
  }, [sketchActive, sketchMode, shapes, currentPoints, mousePos])

  // Sync CAD objects
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const existingIds = new Set(objects.map((o) => o.id))

    meshMapRef.current.forEach((mesh, id) => {
      if (!existingIds.has(id)) {
        scene.remove(mesh)
        const outline = outlineMapRef.current.get(id)
        if (outline) { mesh.remove(outline); outlineMapRef.current.delete(id) }
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        meshMapRef.current.delete(id)
      }
    })

    objects.forEach((obj) => {
      let mesh = meshMapRef.current.get(obj.id)
      if (!mesh) {
        if (obj.type === 'boolean' || obj.type === 'custom') return
        const geo = buildGeometry(obj.type, obj.params)
        const mat = new THREE.MeshStandardMaterial({ color: obj.color })
        mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true; mesh.receiveShadow = true
        mesh.userData.cadId = obj.id
        scene.add(mesh); meshMapRef.current.set(obj.id, mesh)
      } else if (obj.type !== 'boolean' && obj.type !== 'custom') {
        mesh.geometry.dispose()
        mesh.geometry = buildGeometry(obj.type, obj.params)
      }
      applyTransform(mesh, obj)
    })
  }, [objects])

  // Selection outlines
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const allIds = new Set(objects.map((o) => o.id))
    outlineMapRef.current.forEach((outline, id) => {
      if (!selectedIds.includes(id) || !allIds.has(id)) {
        const mesh = meshMapRef.current.get(id)
        if (mesh) mesh.remove(outline)
        outline.geometry.dispose()
        ;(outline.material as THREE.Material).dispose()
        outlineMapRef.current.delete(id)
      }
    })
    selectedIds.forEach((id, idx) => {
      const mesh = meshMapRef.current.get(id)
      if (!mesh || outlineMapRef.current.has(id)) return
      const outline = new THREE.Mesh(
        mesh.geometry.clone(),
        new THREE.MeshBasicMaterial({ color: idx === 0 ? SELECT_COLOR : OUTLINE_COLOR, side: THREE.BackSide }),
      )
      outline.scale.multiplyScalar(1.05)
      mesh.add(outline); outlineMapRef.current.set(id, outline)
    })
    const transform = transformRef.current
    if (!transform) return
    if (selectedIds.length > 0 && !sketchActive) {
      const mesh = meshMapRef.current.get(selectedIds[0])
      if (mesh) transform.attach(mesh)
    } else {
      transform.detach()
    }
  }, [selectedIds, objects, sketchActive])

  useEffect(() => { transformRef.current?.setMode(transformMode) }, [transformMode])
  useEffect(() => { if (gridRef.current) gridRef.current.visible = gridVisible }, [gridVisible])
  useEffect(() => { if (axesRef.current) axesRef.current.visible = axesVisible }, [axesVisible])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (useSketchStore.getState().active) return
      const mount = mountRef.current; const camera = cameraRef.current; const scene = sceneRef.current
      if (!mount || !camera || !scene) return
      const rect = mount.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      const meshes = Array.from(meshMapRef.current.values())
      const hits = raycaster.intersectObjects(meshes)
      if (hits.length > 0) selectObject(hits[0].object.userData.cadId as string, e.shiftKey)
      else if (!e.shiftKey) selectObject(null)
    },
    [selectObject],
  )

  return (
    <div ref={mountRef} onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: sketchActive ? 'crosshair' : 'default' }} />
  )
}
