export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type ViewMode = 'perspective' | 'top' | 'front' | 'right'
export type BooleanOp = 'union' | 'subtract' | 'intersect'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface GeometryParams {
  // Box
  width?: number
  height?: number
  depth?: number
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
  // Sphere
  radius?: number
  phiSegments?: number
  thetaSegments?: number
  // Cylinder / Cone
  radiusTop?: number
  radiusBottom?: number
  radialSegments?: number
  openEnded?: boolean
  // Torus
  tube?: number
  tubularSegments?: number
  arc?: number
  // Plane
  planeWidth?: number
  planeHeight?: number
}

export interface CADObject {
  id: string
  name: string
  type: PrimitiveType | 'boolean'
  position: Vec3
  rotation: Vec3
  scale: Vec3
  color: string
  wireframe: boolean
  visible: boolean
  params: GeometryParams
}

export interface SceneState {
  objects: CADObject[]
  selectedIds: string[]
  transformMode: TransformMode
  viewMode: ViewMode
  gridVisible: boolean
  axesVisible: boolean
  fileName: string
}

export interface ElectronAPI {
  saveFile: (name: string, data: string) => Promise<{ success: boolean; filePath?: string }>
  openFile: () => Promise<{ success: boolean; data?: string; filePath?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
