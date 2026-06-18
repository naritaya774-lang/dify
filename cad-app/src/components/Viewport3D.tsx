import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { ADDITION, SUBTRACTION, INTERSECTION, Evaluator } from 'three-bvh-csg'
import { useSceneStore } from '../store/sceneStore'
import { useSketchStore } from '../store/sketchStore'
import type { BooleanOp, CADObject, GeometryParams, PrimitiveType } from '../types'

// exposed for Toolbar / SketchPanel to call
export const viewportActions = {
  exportSTL: null as (() => void) | null,
  exportOBJ: null as (() => void) | null,
  booleanOp: null as ((op: BooleanOp) => void) | null,
  commitSketch: null as (() => void) | null,
}

export const viewportRefs: { camera: THREE.PerspectiveCamera | null; mount: HTMLDivElement | null } = {
  camera: null,
  mount: null,
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

const OUTLINE_COLOR = 0xffffff
const SELECT_COLOR = 0x4a9eff

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
  const rafRef = useRef<number>(0)
  const csgEvalRef = useRef(new Evaluator())
  const sketchGroupRef = useRef<THREE.Group | null>(null)
  const sketchPlaneRef = useRef<THREE.Mesh | null>(null)
  // drag detection
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)

  const store = useSceneStore()
  const { objects, selectedIds, transformMode, gridVisible, axesVisible,
    selectObject, updateObject } = store

  const sketchStore = useSketchStore()

  // init Three.js
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
    scene.add(grid)
    gridRef.current = grid

    const axes = new THREE.AxesHelper(5)
    scene.add(axes)
    axesRef.current = axes

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(10, 20, 10)
    dir.castShadow = true
    scene.add(dir)
    scene.add(new THREE.HemisphereLight(0x4466ff, 0x224422, 0.3))

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000)
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    viewportRefs.camera = camera
    viewportRefs.mount = mount

    const orbit = new OrbitControls(camera, renderer.domElement)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.05
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
    scene.add(transform)
    transformRef.current = transform

    // Sketch group
    const sketchGroup = new THREE.Group()
    scene.add(sketchGroup)
    sketchGroupRef.current = sketchGroup

    // Export actions
    viewportActions.exportSTL = () => {
      const exporter = new STLExporter()
      const group = new THREE.Group()
      meshMapRef.current.forEach((m) => { if (m.visible) group.add(m.clone()) })
      const data = exporter.parse(group, { binary: true }) as ArrayBuffer
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'model.stl'
      a.click()
    }

    viewportActions.exportOBJ = () => {
      const exporter = new OBJExporter()
      const group = new THREE.Group()
      meshMapRef.current.forEach((m) => { if (m.visible) group.add(m.clone()) })
      const data = exporter.parse(group)
      const blob = new Blob([data], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'model.obj'
      a.click()
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
        const evaluator = csgEvalRef.current
        const cloneA = meshA.clone()
        const cloneB = meshB.clone()
        cloneA.updateMatrixWorld(true)
        cloneB.updateMatrixWorld(true)
        const result = evaluator.evaluate(cloneA, cloneB, opMap[op])
        result.userData = {}

        const COLORS_LIST = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
        const color = COLORS_LIST[Math.floor(Math.random() * COLORS_LIST.length)]
        const id = `obj_${Date.now()}_csg`
        const objA = state.objects.find((o) => o.id === aId)!
        const newObj = {
          id,
          name: `Boolean ${op}`,
          type: 'boolean' as const,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: objA?.color ?? color,
          wireframe: false,
          visible: true,
          params: {},
        }

        // Inject the result mesh directly
        result.userData.cadId = id
        const mat = new THREE.MeshStandardMaterial({ color: newObj.color })
        result.material = mat
        result.castShadow = true
        result.receiveShadow = true
        sceneRef.current?.add(result)
        meshMapRef.current.set(id, result)

        // Remove source objects and add boolean result to store
        state.removeObject(aId)
        state.removeObject(bId)
        useSceneStore.setState((s) => ({ objects: [...s.objects, newObj], selectedIds: [id] }))
      } catch (e) {
        console.error('CSG failed', e)
      }
    }

    viewportActions.commitSketch = () => {
      const sketch = useSketchStore.getState()
      const scene = sceneRef.current
      if (!scene || sketch.shapes.length === 0) return

      const COLORS_LIST = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#74c0fc']
      let colorIdx = 0

      sketch.shapes.forEach((shape) => {
        let geo: THREE.BufferGeometry | null = null

        if (sketch.mode === 'extrude') {
          const threeShape = new THREE.Shape()
          if (shape.tool === 'circle' && shape.circleCenter && shape.circleRadius !== undefined) {
            threeShape.absarc(shape.circleCenter.x, -shape.circleCenter.y, shape.circleRadius, 0, Math.PI * 2, false)
          } else {
            const pts = shape.points
            if (pts.length < 2) return
            threeShape.moveTo(pts[0].x, -pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              threeShape.lineTo(pts[i].x, -pts[i].y)
            }
            if (shape.closed) threeShape.closePath()
          }
          geo = new THREE.ExtrudeGeometry(threeShape, {
            depth: sketch.extrudeDepth,
            bevelEnabled: false,
          })
        } else {
          // revolve
          const pts = shape.tool === 'circle' && shape.circleCenter && shape.circleRadius !== undefined
            ? (() => {
                const vecs: THREE.Vector2[] = []
                for (let i = 0; i <= 16; i++) {
                  const a = (i / 16) * Math.PI * 2
                  vecs.push(new THREE.Vector2(
                    shape.circleCenter!.x + Math.cos(a) * shape.circleRadius!,
                    shape.circleCenter!.y + Math.sin(a) * shape.circleRadius!
                  ))
                }
                return vecs
              })()
            : shape.points.map((p) => new THREE.Vector2(p.x, p.y))
          if (pts.length < 2) return
          geo = new THREE.LatheGeometry(pts, 32, 0, sketch.revolveAngle)
        }

        if (!geo) return

        const color = COLORS_LIST[colorIdx % COLORS_LIST.length]
        colorIdx++
        const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true

        if (sketch.mode === 'extrude') {
          mesh.rotation.x = -Math.PI / 2
          mesh.position.y = 0
        }

        const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        mesh.userData.cadId = id
        scene.add(mesh)
        meshMapRef.current.set(id, mesh)

        const newObj = {
          id,
          name: sketch.mode === 'extrude' ? 'Extrude' : 'Revolve',
          type: 'custom' as const,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color,
          wireframe: false,
          visible: true,
          params: {},
        }
        useSceneStore.setState((s) => ({ objects: [...s.objects, newObj], selectedIds: [id] }))
      })

      useSketchStore.getState().cancelSketch()
    }

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      orbit.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      transform.dispose()
      orbit.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      viewportActions.exportSTL = null
      viewportActions.exportOBJ = null
      viewportActions.booleanOp = null
      viewportActions.commitSketch = null
      viewportRefs.camera = null
      viewportRefs.mount = null
    }
  }, [updateObject])

  // Sketch mode: mouse handling on canvas
  useEffect(() => {
    const mount = mountRef.current
    const camera = cameraRef.current
    const orbit = orbitRef.current
    if (!mount || !camera || !orbit) return

    const sketchState = useSketchStore.getState()

    if (!sketchState.active) {
      orbit.enabled = true
      return
    }

    orbit.enabled = false

    const getHitPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = mount.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
      const currentSketch = useSketchStore.getState()
      const plane = currentSketch.mode === 'extrude'
        ? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        : new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const hit = new THREE.Vector3()
      const result = raycaster.ray.intersectPlane(plane, hit)
      if (!result) return null
      if (currentSketch.mode === 'extrude') {
        return { x: hit.x, y: hit.z }
      } else {
        return { x: hit.x, y: hit.y }
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      const pt = getHitPoint(e.clientX, e.clientY)
      useSketchStore.getState().setMousePos(pt)
    }

    const onClick = (e: MouseEvent) => {
      const down = mouseDownPosRef.current
      if (!down) return
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (Math.sqrt(dx * dx + dy * dy) > 5) return // was a drag
      const pt = getHitPoint(e.clientX, e.clientY)
      if (pt) useSketchStore.getState().addPoint(pt)
    }

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault()
      useSketchStore.getState().closeShape()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useSketchStore.getState().cancelSketch()
      }
    }

    mount.addEventListener('mousedown', onMouseDown)
    mount.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('click', onClick)
    mount.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      mount.removeEventListener('mousedown', onMouseDown)
      mount.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('click', onClick)
      mount.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
      orbit.enabled = true
    }
  }, [sketchStore.active])

  // Sketch visualization
  useEffect(() => {
    const scene = sceneRef.current
    const sketchGroup = sketchGroupRef.current
    if (!scene || !sketchGroup) return

    // Clear old sketch group children
    while (sketchGroup.children.length > 0) {
      const child = sketchGroup.children[0]
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
        if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose()
      }
      sketchGroup.remove(child)
    }

    // Remove old sketch plane indicator
    if (sketchPlaneRef.current) {
      scene.remove(sketchPlaneRef.current)
      sketchPlaneRef.current.geometry.dispose()
      ;(sketchPlaneRef.current.material as THREE.Material).dispose()
      sketchPlaneRef.current = null
    }

    if (!sketchStore.active) return

    // Add sketch plane indicator
    const planeGeo = new THREE.PlaneGeometry(20, 20)
    const planeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.05,
      color: 0x4a9eff,
      side: THREE.DoubleSide,
    })
    const planeMesh = new THREE.Mesh(planeGeo, planeMat)
    if (sketchStore.mode === 'extrude') {
      planeMesh.rotation.x = -Math.PI / 2
    }
    scene.add(planeMesh)
    sketchPlaneRef.current = planeMesh

    const toWorld = (pt: { x: number; y: number }): THREE.Vector3 => {
      if (sketchStore.mode === 'extrude') {
        return new THREE.Vector3(pt.x, 0, pt.y)
      } else {
        return new THREE.Vector3(pt.x, pt.y, 0)
      }
    }

    const addLineMat = (color: number, dashed = false): THREE.LineBasicMaterial | THREE.LineDashedMaterial => {
      if (dashed) {
        return new THREE.LineDashedMaterial({ color, dashSize: 0.1, gapSize: 0.05 })
      }
      return new THREE.LineBasicMaterial({ color })
    }

    const addPointSphere = (pt: { x: number; y: number }, color: number) => {
      const geo = new THREE.SphereGeometry(0.05, 8, 8)
      const mat = new THREE.MeshBasicMaterial({ color })
      const sphere = new THREE.Mesh(geo, mat)
      sphere.position.copy(toWorld(pt))
      sketchGroup.add(sphere)
    }

    // Draw completed shapes (white)
    sketchStore.shapes.forEach((shape) => {
      if (shape.tool === 'circle' && shape.circleCenter && shape.circleRadius !== undefined) {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2
          pts.push(toWorld({
            x: shape.circleCenter.x + Math.cos(a) * shape.circleRadius,
            y: shape.circleCenter.y + Math.sin(a) * shape.circleRadius,
          }))
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        const line = new THREE.Line(geo, addLineMat(0xffffff))
        sketchGroup.add(line)
        addPointSphere(shape.circleCenter, 0xffffff)
      } else {
        const pts = shape.points.map(toWorld)
        if (shape.closed) pts.push(pts[0].clone())
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        const line = new THREE.Line(geo, addLineMat(0xffffff))
        sketchGroup.add(line)
        shape.points.forEach((p) => addPointSphere(p, 0xffffff))
      }
    })

    // Draw current in-progress points (cyan)
    const cpts = sketchStore.currentPoints
    if (cpts.length > 0) {
      const pts = cpts.map(toWorld)
      if (pts.length > 1) {
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        const line = new THREE.Line(geo, addLineMat(0x00ffff))
        sketchGroup.add(line)
      }
      cpts.forEach((p) => addPointSphere(p, 0x00ffff))

      // Preview line to mouse
      if (sketchStore.mousePos) {
        const lastPt = toWorld(cpts[cpts.length - 1])
        const mousePt = toWorld(sketchStore.mousePos)
        const geo = new THREE.BufferGeometry().setFromPoints([lastPt, mousePt])
        const line = new THREE.Line(geo, addLineMat(0xffff00, true))
        line.computeLineDistances()
        sketchGroup.add(line)
      }
    } else if (sketchStore.tool === 'circle' || sketchStore.tool === 'rect') {
      // For circle/rect first click preview: show mouse position dot
      if (sketchStore.mousePos) {
        addPointSphere(sketchStore.mousePos, 0x4a9eff)
      }
    }
  }, [sketchStore.active, sketchStore.shapes, sketchStore.currentPoints, sketchStore.mousePos, sketchStore.mode])

  // Sync objects to Three.js scene
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const existingIds = new Set(objects.map((o) => o.id))

    // Remove deleted
    meshMapRef.current.forEach((mesh, id) => {
      if (!existingIds.has(id)) {
        scene.remove(mesh)
        const outline = outlineMapRef.current.get(id)
        if (outline) { scene.remove(outline); outlineMapRef.current.delete(id) }
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        meshMapRef.current.delete(id)
      }
    })

    objects.forEach((obj) => {
      let mesh = meshMapRef.current.get(obj.id)
      // For boolean/custom results, mesh is already in scene — just update material/visibility
      if (!mesh) {
        if (obj.type === 'custom' || obj.type === 'boolean') {
          // These are managed directly; skip if not in map yet
          return
        }
        const geo = buildGeometry(obj.type as PrimitiveType, obj.params)
        const mat = new THREE.MeshStandardMaterial({ color: obj.color })
        mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.userData.cadId = obj.id
        scene.add(mesh)
        meshMapRef.current.set(obj.id, mesh)
      } else if (obj.type !== 'boolean' && obj.type !== 'custom') {
        // Rebuild geometry if params changed
        mesh.geometry.dispose()
        mesh.geometry = buildGeometry(obj.type as PrimitiveType, obj.params)
      }
      applyTransform(mesh, obj)
    })
  }, [objects])

  // Selection highlight with outline
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const allIds = new Set(objects.map((o) => o.id))

    // Clean up outlines for removed/deselected objects
    outlineMapRef.current.forEach((outline, id) => {
      if (!selectedIds.includes(id) || !allIds.has(id)) {
        scene.remove(outline)
        outline.geometry.dispose()
        ;(outline.material as THREE.Material).dispose()
        outlineMapRef.current.delete(id)
      }
    })

    // Add outlines for selected objects
    selectedIds.forEach((id, idx) => {
      const mesh = meshMapRef.current.get(id)
      if (!mesh) return
      if (outlineMapRef.current.has(id)) return
      const outlineGeo = mesh.geometry.clone()
      const outlineMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? SELECT_COLOR : OUTLINE_COLOR,
        side: THREE.BackSide,
      })
      const outline = new THREE.Mesh(outlineGeo, outlineMat)
      outline.scale.multiplyScalar(1.05)
      mesh.add(outline)
      outlineMapRef.current.set(id, outline)
    })

    // Attach transform to primary selection
    const transform = transformRef.current
    if (!transform) return
    if (selectedIds.length > 0) {
      const mesh = meshMapRef.current.get(selectedIds[0])
      if (mesh) transform.attach(mesh)
    } else {
      transform.detach()
    }
  }, [selectedIds, objects])

  useEffect(() => {
    transformRef.current?.setMode(transformMode)
  }, [transformMode])

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = gridVisible
  }, [gridVisible])

  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = axesVisible
  }, [axesVisible])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip click handling when sketch is active
      if (useSketchStore.getState().active) return

      const mount = mountRef.current
      const camera = cameraRef.current
      const scene = sceneRef.current
      if (!mount || !camera || !scene) return

      const rect = mount.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

      const meshes = Array.from(meshMapRef.current.values())
      const hits = raycaster.intersectObjects(meshes)
      if (hits.length > 0) {
        const id = hits[0].object.userData.cadId as string
        selectObject(id, e.shiftKey)
      } else if (!e.shiftKey) {
        selectObject(null)
      }
    },
    [selectObject],
  )

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: sketchStore.active ? 'crosshair' : 'crosshair' }}
    />
  )
}
