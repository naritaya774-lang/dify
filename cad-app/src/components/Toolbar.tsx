import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'
import type { PrimitiveType, TransformMode } from '../types'

const PRIMITIVE_ICONS: Record<PrimitiveType, string> = {
  box: '⬜', sphere: '⚪', cylinder: '🥫', cone: '🔺', torus: '⭕', plane: '▬',
}

export default function Toolbar() {
  const { addObject, transformMode, setTransformMode, selectedId, removeObject, duplicateObject,
    gridVisible, axesVisible, toggleGrid, toggleAxes, clearScene, objects, fileName } =
    useSceneStore()
  const { t, lang, setLang } = useLang()

  const PRIMITIVES: { type: PrimitiveType }[] = [
    { type: 'box' }, { type: 'sphere' }, { type: 'cylinder' },
    { type: 'cone' }, { type: 'torus' }, { type: 'plane' },
  ]

  const TRANSFORM_MODES: { mode: TransformMode; labelKey: 'move' | 'rotate' | 'scale'; icon: string; shortcut: string }[] = [
    { mode: 'translate', labelKey: 'move', icon: '✥', shortcut: 'G' },
    { mode: 'rotate', labelKey: 'rotate', icon: '↻', shortcut: 'R' },
    { mode: 'scale', labelKey: 'scale', icon: '⤡', shortcut: 'S' },
  ]

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
        <span style={styles.brandText}>{t('appName')}</span>
      </div>

      <div style={styles.divider} />

      {/* File ops */}
      <div style={styles.group}>
        <button style={styles.btn} onClick={handleOpen} title={`${t('open')} (Ctrl+O)`}>📂 {t('open')}</button>
        <button style={styles.btn} onClick={handleSave} title={`${t('save')} (Ctrl+S)`}>💾 {t('save')}</button>
      </div>

      <div style={styles.divider} />

      {/* Add primitives */}
      <div style={styles.groupLabel}>{t('add')}</div>
      <div style={styles.group}>
        {PRIMITIVES.map(({ type }) => (
          <button key={type} style={styles.iconBtn} onClick={() => addObject(type)} title={t(type)}>
            <span>{PRIMITIVE_ICONS[type]}</span>
            <span style={styles.btnLabel}>{t(type)}</span>
          </button>
        ))}
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

      {/* Object actions */}
      <div style={styles.groupLabel}>{t('object')}</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, opacity: selectedId ? 1 : 0.4 }}
          disabled={!selectedId}
          onClick={() => selectedId && duplicateObject(selectedId)}
          title={t('duplicate')}
        >
          <span>⧉</span>
          <span style={styles.btnLabel}>{t('duplicate')}</span>
        </button>
        <button
          style={{ ...styles.iconBtn, opacity: selectedId ? 1 : 0.4 }}
          disabled={!selectedId}
          onClick={() => selectedId && removeObject(selectedId)}
          title={`${t('delete')} [Del]`}
        >
          <span>🗑</span>
          <span style={styles.btnLabel}>{t('delete')}</span>
        </button>
      </div>

      <div style={styles.divider} />

      {/* View toggles */}
      <div style={styles.groupLabel}>{t('view')}</div>
      <div style={styles.group}>
        <button
          style={{ ...styles.iconBtn, ...(gridVisible ? styles.active : {}) }}
          onClick={toggleGrid}
          title={t('grid')}
        >
          <span>#</span>
          <span style={styles.btnLabel}>{t('grid')}</span>
        </button>
        <button
          style={{ ...styles.iconBtn, ...(axesVisible ? styles.active : {}) }}
          onClick={toggleAxes}
          title={t('axes')}
        >
          <span>⊹</span>
          <span style={styles.btnLabel}>{t('axes')}</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status */}
      <div style={styles.status}>
        <span style={styles.statusText}>{t('objects')}: {objects.length}</span>
        {selectedId && <span style={styles.statusActive}>{t('selected')}</span>}
      </div>

      {/* Language toggle */}
      <div style={styles.divider} />
      <button
        style={{ ...styles.langBtn, ...(lang === 'ja' ? styles.active : {}) }}
        onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
        title="Switch language / 言語切替"
      >
        {lang === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
      </button>

      <button
        style={{ ...styles.btn, color: '#ff6b6b', marginLeft: 8 }}
        onClick={() => { if (confirm(t('clearConfirm'))) clearScene() }}
        title={t('clearScene')}
      >
        {t('clearScene')}
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
  brand: { display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 },
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
    minWidth: 42,
    gap: 1,
  },
  langBtn: {
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    color: '#c0c0e0',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 11,
    whiteSpace: 'nowrap',
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
