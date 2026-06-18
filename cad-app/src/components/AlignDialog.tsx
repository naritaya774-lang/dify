import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'

interface Props {
  onClose: () => void
}

export default function AlignDialog({ onClose }: Props) {
  const { alignObjects } = useSceneStore()
  const { lang } = useLang()

  const L = lang === 'ja'
    ? { title: 'オブジェクト整列', min: '最小', center: '中央', max: '最大' }
    : { title: 'Align Objects', min: 'Min', center: 'Center', max: 'Max' }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{L.title}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <div key={axis} style={styles.row}>
              <span style={styles.axisLabel}>{axis.toUpperCase()}</span>
              {(['min', 'center', 'max'] as const).map((mode) => (
                <button
                  key={mode}
                  style={styles.btn}
                  onClick={() => { alignObjects(axis, mode); onClose() }}
                >
                  {L[mode]}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    background: '#1a1a3a',
    border: '1px solid #3a3a6a',
    borderRadius: 10,
    width: 300,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #2a2a4a',
  },
  title: { fontSize: 15, fontWeight: 700, color: '#e0e0ff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 16, padding: 2,
  },
  body: {
    padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  axisLabel: {
    width: 22, color: '#4a9eff', fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  btn: {
    flex: 1,
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 5,
    color: '#c0c0e0',
    padding: '6px 0',
    cursor: 'pointer',
    fontSize: 12,
  },
}
