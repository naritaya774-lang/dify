import { useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useSketchStore } from '../store/sketchStore'
import { useLang } from '../i18n/useLang'
import { viewportActions } from './Viewport3D'
import ArrayDialog from './ArrayDialog'
import type { BooleanOp, PrimitiveType, TransformMode } from '../types'

const PRIMITIVE_ICONS: Record<PrimitiveType, string> = {
  box: '⬜', sphere: '⚪', cylinder: '🥫', cone: '🔺', torus: '⭕', plane: '▬',
}

const BOOLEAN_OPS: { op: BooleanOp; icon: string }[] = [
  { op: 'union', icon: '⊕' },
  { op: 'subtract', icon: '⊖' },
  { op: 'intersect', icon: '⊗' },
]

const TRANSFORM_MODES: { mode: TransformMode; labelKey: 'move' | 'rotate' | 'scale'; icon: string; shortcut: string }[] = [
  { mode: 'translate', labelKey: 'move', icon: '✥', shortcut: 'G' },
  { mode: 'rotate', labelKey: 'rotate', icon: '↻', shortcut: 'R' },
  { mode: 'scale', labelKey: 'scale', icon: '⤡', shortcut: 'S' },
]

export default function Toolbar() {
  const { addObject, transformMode, setTransformMode, selectedIds, removeObject, duplicateObject,
    gridVisible, axesVisible, toggleGrid, toggleAxes, clearScene, objects, fileName, mirrorObject } =
    useSceneStore()
  const sketchStore = useSketchStore()
  const { t, lang, setLang } = useLang()
  const [showArrayDialog, setShowArrayDialog] = useState(false)

  const PRIMITIVES: PrimitiveType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane']

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

  const canBoolean = selectedIds.length >= 2
  const hasSelection = selectedIds.length > 0

  return (
    <div style={styles.toolbar}>
      {/* Brand */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>◈</span>
        <span style={styles.brandText}>{t('appName')}</span>
      </div>
      <div style={styles.divider} />

      {/* File */}
      <div style={styles.group}>
        <button style={styles.btn} onClick={handleOpen}>📂 {t('open')}</button>
        <button style={styles.btn} onClick={handleSave}>💾 {t('save')}</button>
      </div>
      <div style={styles.divider} />

      {/* Add */}
      <div style={styles.groupLabel}>{t('add')}</div>
      <div style={styles.group}>
        {PRIMITIVES.map((type) => (
          <button key={type} style={styles.iconBtn} onClick={() => addObject(type)} title={t(type)}>
            <span>{PRIMITIVE_ICONS[type]}</span>
            <span style={styles.btnLabel}>{t(type)}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />

      {/* Sketch */}
      <div style={styles.groupLabel}>{t('sketch')}</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, ...(sketchStore.active && sketchStore.mode === 'extrude' ? styles.active : {}) }}
          onClick={() => sketchStore.active ? sketchStore.cancelSketch() : sketchStore.startSketch('extrude')}
          title={t('sketchExtrude')}
        >
          <span style={{ fontSize: 14 }}>✏</span>
          <span style={styles.btnLabel}>{t('sketch')}</span>
        </button>
        <button
          style={{ ...styles.iconBtn, ...(sketchStore.active && sketchStore.mode === 'revolve' ? styles.active : {}) }}
          onClick={() => sketchStore.active ? sketchStore.cancelSketch() : sketchStore.startSketch('revolve')}
          title={t('sketchRevolve')}
        >
          <span style={{ fontSize: 14 }}>↺</span>
          <span style={styles.btnLabel}>{t('revolve')}</span>
        </button>
      </div>
      <div style={styles.divider} />

      {/* Transform */}
      <div style={styles.groupLabel}>{t('transform')}</div>
      <div style={styles.group}>
        {TRANSFORM_MODES.map(({ mode, labelKey, icon, shortcut }) => (
          <button
            key={mode}
            style={{ ...styles.iconBtn, ...(transformMode === mode ? styles.active : {}) }}
            onClick={() => setTransformMode(mode)}
            title={`${t(labelKey)} [${shortcut}]`}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={styles.btnLabel}>{t(labelKey)}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />

      {/* Boolean */}
      <div style={styles.groupLabel}>{t('boolean')}</div>
      <div style={styles.group}>
        {BOOLEAN_OPS.map(({ op, icon }) => (
          <button
            key={op}
            style={{ ...styles.iconBtn, opacity: canBoolean ? 1 : 0.38 }}
            disabled={!canBoolean}
            onClick={() => viewportActions.booleanOp?.(op)}
            title={canBoolean ? t(op) : t('booleanHint')}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={styles.btnLabel}>{t(op)}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />

      {/* Array */}
      <div style={styles.groupLabel}>{t('array')}</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, opacity: hasSelection ? 1 : 0.38 }}
          disabled={!hasSelection}
          onClick={() => hasSelection && setShowArrayDialog(true)}
          title={t('array')}
        >
          <span style={{ fontSize: 13 }}>⣿</span>
          <span style={styles.btnLabel}>{t('array')}</span>
        </button>
      </div>
      <div style={styles.divider} />

      {/* Mirror */}
      <div style={styles.groupLabel}>{t('mirror')}</div>
      <div style={styles.group}>
        {(['x', 'y', 'z'] as const).map((ax) => (
          <button
            key={ax}
            style={{ ...styles.iconBtn, opacity: hasSelection ? 1 : 0.38 }}
            disabled={!hasSelection}
            onClick={() => selectedIds[0] && mirrorObject(selectedIds[0], ax)}
            title={t(`mirror${ax.toUpperCase()}` as 'mirrorX' | 'mirrorY' | 'mirrorZ')}
          >
            <span style={{ fontSize: 12 }}>⟺</span>
            <span style={styles.btnLabel}>{ax.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />

      {/* Export */}
      <div style={styles.groupLabel}>{t('export')}</div>
      <div style={styles.group}>
        <button style={styles.iconBtn} onClick={() => viewportActions.exportSTL?.()} title="Export STL">
          <span style={{ fontSize: 13 }}>🖨</span>
          <span style={styles.btnLabel}>{t('exportSTL')}</span>
        </button>
        <button style={styles.iconBtn} onClick={() => viewportActions.exportOBJ?.()} title="Export OBJ">
          <span style={{ fontSize: 13 }}>📦</span>
          <span style={styles.btnLabel}>{t('exportOBJ')}</span>
        </button>
      </div>
      <div style={styles.divider} />

      {/* Object actions */}
      <div style={styles.groupLabel}>{t('object')}</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={() => selectedIds[0] && duplicateObject(selectedIds[0])}
          title={t('duplicate')}
        >
          <span>⧉</span>
          <span style={styles.btnLabel}>{t('duplicate')}</span>
        </button>
        <button
          style={{ ...styles.iconBtn, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={() => selectedIds[0] && removeObject(selectedIds[0])}
          title={`${t('delete')} [Del]`}
        >
          <span>🗑</span>
          <span style={styles.btnLabel}>{t('delete')}</span>
        </button>
      </div>
      <div style={styles.divider} />

      {/* View */}
      <div style={styles.groupLabel}>{t('view')}</div>
      <div style={styles.group}>
        <button style={{ ...styles.iconBtn, ...(gridVisible ? styles.active : {}) }} onClick={toggleGrid}>
          <span>#</span><span style={styles.btnLabel}>{t('grid')}</span>
        </button>
        <button style={{ ...styles.iconBtn, ...(axesVisible ? styles.active : {}) }} onClick={toggleAxes}>
          <span>⊹</span><span style={styles.btnLabel}>{t('axes')}</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status */}
      <div style={styles.status}>
        <span style={styles.statusText}>{t('objects')}: {objects.length}</span>
        {selectedIds.length > 0 && (
          <span style={styles.statusActive}>● {selectedIds.length}{lang === 'ja' ? '個' : ''}</span>
        )}
      </div>

      <div style={styles.divider} />
      <button style={{ ...styles.langBtn }} onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} title="Switch language">
        {lang === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
      </button>

      <button
        style={{ ...styles.btn, color: '#ff6b6b', marginLeft: 4 }}
        onClick={() => { if (confirm(t('clearConfirm'))) clearScene() }}
      >
        {t('clearScene')}
      </button>

      {/* Array Dialog */}
      {showArrayDialog && selectedIds[0] && (
        <ArrayDialog
          objectId={selectedIds[0]}
          onClose={() => setShowArrayDialog(false)}
        />
      )}
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
  brand: { display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 },
  brandIcon: { fontSize: 22, color: '#4a9eff' },
  brandText: { fontSize: 15, fontWeight: 700, color: '#e0e0ff', letterSpacing: 1 },
  divider: { width: 1, height: 32, background: '#2a2a4a', margin: '0 4px', flexShrink: 0 },
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
    padding: '3px 7px',
    cursor: 'pointer',
    fontSize: 14,
    minWidth: 40,
    gap: 1,
  },
  langBtn: {
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    color: '#c0c0e0',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  active: { background: '#1a3a6a', border: '1px solid #4a9eff', color: '#4a9eff' },
  btnLabel: { fontSize: 9, color: '#8888aa' },
  status: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 },
  statusText: { color: '#666688' },
  statusActive: { color: '#51cf66', fontWeight: 600 },
}
