import { useSceneStore } from '../store/sceneStore'
import type { PrimitiveType, TransformMode } from '../types'

const PRIMITIVES: { type: PrimitiveType; label: string; icon: string }[] = [
  { type: 'box', label: 'Box', icon: '⬜' },
  { type: 'sphere', label: 'Sphere', icon: '⚪' },
  { type: 'cylinder', label: 'Cylinder', icon: '🥫' },
  { type: 'cone', label: 'Cone', icon: '🔺' },
  { type: 'torus', label: 'Torus', icon: '⭕' },
  { type: 'plane', label: 'Plane', icon: '▬' },
]

const TRANSFORM_MODES: { mode: TransformMode; label: string; icon: string; shortcut: string }[] = [
  { mode: 'translate', label: 'Move', icon: '✥', shortcut: 'G' },
  { mode: 'rotate', label: 'Rotate', icon: '↻', shortcut: 'R' },
  { mode: 'scale', label: 'Scale', icon: '⤡', shortcut: 'S' },
]

export default function Toolbar() {
  const { addObject, transformMode, setTransformMode, selectedId, removeObject, duplicateObject,
    gridVisible, axesVisible, toggleGrid, toggleAxes, clearScene, objects, fileName } =
    useSceneStore()

  const handleSave = async () => {
    const state = useSceneStore.getState()
    const data = JSON.stringify({ objects: state.objects, fileName: state.fileName }, null, 2)
    if (window.electronAPI) {
      await window.electronAPI.saveFile(fileName, data)
    } else {
      const blob = new Blob([data], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName
      a.click()
    }
  }

  const handleOpen = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile()
      if (result.success && result.data) {
        const parsed = JSON.parse(result.data)
        useSceneStore.getState().loadScene({ ...useSceneStore.getState(), ...parsed })
      }
    }
  }

  return (
    <div style={styles.toolbar}>
      {/* Title */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>◈</span>
        <span style={styles.brandText}>Dify CAD</span>
      </div>

      <div style={styles.divider} />

      {/* File ops */}
      <div style={styles.group}>
        <button style={styles.btn} onClick={handleOpen} title="Open (Ctrl+O)">📂 Open</button>
        <button style={styles.btn} onClick={handleSave} title="Save (Ctrl+S)">💾 Save</button>
      </div>

      <div style={styles.divider} />

      {/* Add primitives */}
      <div style={styles.groupLabel}>Add</div>
      <div style={styles.group}>
        {PRIMITIVES.map(({ type, label, icon }) => (
          <button key={type} style={styles.iconBtn} onClick={() => addObject(type)} title={`Add ${label}`}>
            <span>{icon}</span>
            <span style={styles.btnLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Transform */}
      <div style={styles.groupLabel}>Transform</div>
      <div style={styles.group}>
        {TRANSFORM_MODES.map(({ mode, label, icon, shortcut }) => (
          <button
            key={mode}
            style={{ ...styles.iconBtn, ...(transformMode === mode ? styles.active : {}) }}
            onClick={() => setTransformMode(mode)}
            title={`${label} [${shortcut}]`}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={styles.btnLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Object actions */}
      <div style={styles.groupLabel}>Object</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, opacity: selectedId ? 1 : 0.4 }}
          disabled={!selectedId}
          onClick={() => selectedId && duplicateObject(selectedId)}
          title="Duplicate"
        >
          <span>⧉</span>
          <span style={styles.btnLabel}>Dup</span>
        </button>
        <button
          style={{ ...styles.iconBtn, opacity: selectedId ? 1 : 0.4 }}
          disabled={!selectedId}
          onClick={() => selectedId && removeObject(selectedId)}
          title="Delete [Del]"
        >
          <span>🗑</span>
          <span style={styles.btnLabel}>Del</span>
        </button>
      </div>

      <div style={styles.divider} />

      {/* View toggles */}
      <div style={styles.groupLabel}>View</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, ...(gridVisible ? styles.active : {}) }}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          <span>#</span>
          <span style={styles.btnLabel}>Grid</span>
        </button>
        <button
          style={{ ...styles.iconBtn, ...(axesVisible ? styles.active : {}) }}
          onClick={toggleAxes}
          title="Toggle Axes"
        >
          <span>⊹</span>
          <span style={styles.btnLabel}>Axes</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status */}
      <div style={styles.status}>
        <span style={styles.statusText}>Objects: {objects.length}</span>
        {selectedId && <span style={styles.statusActive}>● Selected</span>}
      </div>

      <button
        style={{ ...styles.btn, color: '#ff6b6b', marginLeft: 8 }}
        onClick={() => { if (confirm('Clear all objects?')) clearScene() }}
        title="Clear scene"
      >
        Clear
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#12122a',
    borderBottom: '1px solid #2a2a4a',
    padding: '0 12px',
    height: 52,
    flexShrink: 0,
    userSelect: 'none',
    overflowX: 'auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  brandIcon: { fontSize: 22, color: '#4a9eff' },
  brandText: { fontSize: 15, fontWeight: 700, color: '#e0e0ff', letterSpacing: 1 },
  divider: { width: 1, height: 32, background: '#2a2a4a', margin: '0 6px', flexShrink: 0 },
  groupLabel: { fontSize: 9, color: '#666688', textTransform: 'uppercase', letterSpacing: 1, marginRight: 2, flexShrink: 0 },
  group: { display: 'flex', gap: 2, alignItems: 'center' },
  btn: {
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    color: '#c0c0e0',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    color: '#c0c0e0',
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: 14,
    minWidth: 40,
    gap: 1,
  },
  active: {
    background: '#1a3a6a',
    border: '1px solid #4a9eff',
    color: '#4a9eff',
  },
  btnLabel: { fontSize: 9, color: '#8888aa' },
  status: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 },
  statusText: { color: '#666688' },
  statusActive: { color: '#51cf66', fontWeight: 600 },
}
