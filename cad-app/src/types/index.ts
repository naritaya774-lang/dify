export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type ViewMode = 'perspective' | 'top' | 'front' | 'right'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface CADObject {
  id: string
  name: string
  type: PrimitiveType
  position: Vec3
  rotation: Vec3
  scale: Vec3
  color: string
  wireframe: boolean
  visible: boolean
}

export interface SceneState {
  objects: CADObject[]
  selectedId: string | null
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
