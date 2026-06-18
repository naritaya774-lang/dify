import { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import Viewport3D from './components/Viewport3D'
import ObjectList from './components/ObjectList'
import PropertiesPanel from './components/PropertiesPanel'
import SketchPanel from './components/SketchPanel'
import { useSceneStore } from './store/sceneStore'
import { useLang } from './i18n/useLang'

export default function App() {
  const { selectedIds, removeObject, setTransformMode, undo, redo } = useSceneStore()
  const { t } = useLang()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useSceneStore.getState()
        selectedIds.forEach((id) => removeObject(id))
      }
      if (e.key === 'g' || e.key === 'G') setTransformMode('translate')
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate')
      if (e.key === 's' || e.key === 'S') setTransformMode('scale')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, removeObject, setTransformMode, undo, redo])

  return (
    <div style={styles.app}>
      <Toolbar />
      <div style={styles.workspace}>
        <ObjectList />
        <div style={styles.viewport}>
          <Viewport3D />
          <SketchPanel />
          <div style={styles.hint}>{t('hint')}</div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#1a1a2e',
    color: '#c0c0e0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    overflow: 'hidden',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    height: '100vh',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10,10,30,0.75)',
    color: '#8888aa',
    fontSize: 11,
    padding: '5px 14px',
    borderRadius: 20,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    border: '1px solid #2a2a4a',
  },
}
