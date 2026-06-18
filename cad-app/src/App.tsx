import { useEffect } from 'react'
import Toolbar from './components/Toolbar'
import Viewport3D from './components/Viewport3D'
import ObjectList from './components/ObjectList'
import PropertiesPanel from './components/PropertiesPanel'
import SketchPanel from './components/SketchPanel'
import { useSceneStore } from './store/sceneStore'
import { useLang } from './i18n/useLang'

export default function App() {
  const { selectedIds, removeObject, setTransformMode } = useSceneStore()
  const { t } = useLang()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT') return
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
  }, [selectedIds, removeObject, setTransformMode])

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
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.5)',
    color: '#666688',
    fontSize: 10,
    padding: '4px 12px',
    borderRadius: 20,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
}
