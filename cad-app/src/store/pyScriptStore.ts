import { create } from 'zustand'

export interface PyScript {
  id: string
  name: string
  code: string
}

const STORAGE_KEY = 'cad-py-scripts'

function loadFromStorage(): PyScript[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function saveToStorage(scripts: PyScript[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts))
}

const EXAMPLE_SCRIPT: PyScript = {
  id: 'example_helix',
  name: 'Hexagonal Pattern',
  code: `import math

# Hexagonal column pattern
n = 6
ring_radius = 3.0

for i in range(n):
    angle = 2 * math.pi * i / n
    x = ring_radius * math.cos(angle)
    z = ring_radius * math.sin(angle)
    add_cylinder(radius=0.3, height=2.0, position=[x, 1.0, z], color='#4a9eff')

# Center platform
add_box(width=1.5, height=0.2, depth=1.5, position=[0, 0.1, 0], color='#ff6b6b')
`,
}

const initialScripts = loadFromStorage()
if (initialScripts.length === 0) {
  initialScripts.push(EXAMPLE_SCRIPT)
  saveToStorage(initialScripts)
}

interface PyScriptState {
  scripts: PyScript[]
}

interface PyScriptActions {
  addScript: (name: string, code: string) => PyScript
  updateScript: (id: string, updates: Partial<Pick<PyScript, 'name' | 'code'>>) => void
  deleteScript: (id: string) => void
}

export const usePyScriptStore = create<PyScriptState & PyScriptActions>((set, get) => ({
  scripts: initialScripts,

  addScript: (name, code) => {
    const script: PyScript = { id: `py_${Date.now()}`, name, code }
    const scripts = [...get().scripts, script]
    set({ scripts }); saveToStorage(scripts)
    return script
  },

  updateScript: (id, updates) => {
    const scripts = get().scripts.map((s) => s.id === id ? { ...s, ...updates } : s)
    set({ scripts }); saveToStorage(scripts)
  },

  deleteScript: (id) => {
    const scripts = get().scripts.filter((s) => s.id !== id)
    set({ scripts }); saveToStorage(scripts)
  },
}))
