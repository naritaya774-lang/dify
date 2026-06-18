import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { useSceneStore } from '../store/sceneStore'
import type { CADObject, PrimitiveType } from '../types'

function buildGeometry(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1)
    case 'sphere': return new THREE.SphereGeometry(0.5, 32, 32)
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 32)
    case 'torus': return new THREE.TorusGeometry(0.5, 0.2, 16, 64)
    case 'plane': return new THREE.PlaneGeometry(2, 2)
    default: return new THREE.BoxGeometry(1, 1, 1)
  }
}

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const orbitRef = useRef<OrbitControls | null>(null)
  const transformRef = useRef<TransformControls | null>(null)
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const axesRef = useRef<THREE.AxesHelper | null>(null)
  const rafRef = useRef<number>(0)

  const { objects, selectedId, transformMode, gridVisible, axesVisible, selectObject, updateObject } =
    useSceneStore()

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

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355)
    scene.add(grid)
    gridRef.current = grid

    // Axes
    const axes = new THREE.AxesHelper(5)
    scene.add(axes)
    axesRef.current = axes

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    scene.add(dirLight)
    const hemi = new THREE.HemisphereLight(0x4466ff, 0x224422, 0.3)
    scene.add(hemi)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000)
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Orbit
    const orbit = new OrbitControls(camera, renderer.domElement)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.05
    orbitRef.current = orbit

    // Transform
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

    // Animate
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      orbit.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      transform.dispose()
      orbit.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [updateObject])

  // Sync objects
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const existingIds = new Set(objects.map((o) => o.id))

    // Remove deleted
    meshMapRef.current.forEach((mesh, id) => {
      if (!existingIds.has(id)) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        meshMapRef.current.delete(id)
      }
    })

    // Add / update
    objects.forEach((obj) => {
      let mesh = meshMapRef.current.get(obj.id)
      if (!mesh) {
        const geo = buildGeometry(obj.type)
        const mat = new THREE.MeshStandardMaterial({ color: obj.color })
        mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.userData.cadId = obj.id
        scene.add(mesh)
        meshMapRef.current.set(obj.id, mesh)
      }
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
      mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z)
      mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
      mesh.visible = obj.visible
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.set(obj.color)
      mat.wireframe = obj.wireframe
    })
  }, [objects])

  // Selection + transform mode
  useEffect(() => {
    const transform = transformRef.current
    if (!transform) return
    if (selectedId) {
      const mesh = meshMapRef.current.get(selectedId)
      if (mesh) {
        transform.attach(mesh)
        transform.setMode(transformRef.current?.mode ?? 'translate')
      }
    } else {
      transform.detach()
    }
  }, [selectedId])

  useEffect(() => {
    transformRef.current?.setMode(transformMode)
  }, [transformMode])

  // Grid / axes visibility
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = gridVisible
  }, [gridVisible])

  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = axesVisible
  }, [axesVisible])

  // Click to select
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
        selectObject(id)
      } else {
        selectObject(null)
      }
    },
    [selectObject],
  )

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
    />
  )
}
