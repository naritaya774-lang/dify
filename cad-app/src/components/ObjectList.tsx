import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'

const TYPE_ICONS: Record<string, string> = {
  box: '⬜', sphere: '⚪', cylinder: '🥫', cone: '🔺', torus: '⭕', plane: '▬',
}

export default function ObjectList() {
  const { objects, selectedIds, selectObject, removeObject, updateObject } = useSceneStore()
  const { t } = useLang()

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        {t('sceneObjects')}
        <span style={styles.count}>{objects.length}</span>
      </div>
      <div style={styles.list}>
        {objects.length === 0 && (
          <div style={styles.empty}>{t('noObjects')}</div>
        )}
        {objects.map((obj) => (
          <div
            key={obj.id}
            style={{
              ...styles.item,
              ...(selectedIds.includes(obj.id) ? styles.selected : {}),
              opacity: obj.visible ? 1 : 0.45,
            }}
            onClick={(e) => selectObject(obj.id, e.shiftKey)}
          >
            <span style={styles.icon}>{TYPE_ICONS[obj.type] ?? '◆'}</span>
            <span style={styles.name} title={obj.name}>{obj.name}</span>
            <div style={styles.actions}>
              <button
                style={styles.actionBtn}
                onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
                title={obj.visible ? t('hide') : t('show')}
              >
                {obj.visible ? '👁' : '🚫'}
              </button>
              <button
                style={{ ...styles.actionBtn, color: '#ff6b6b' }}
                onClick={(e) => { e.stopPropagation(); removeObject(obj.id) }}
                title={t('delete')}
              >
                ✕
              </button>
            </div>
            <div style={{ ...styles.colorDot, background: obj.color }} />
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 200,
    background: '#12122a',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  header: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 10,
    padding: '0 6px',
    fontSize: 10,
    color: '#4a9eff',
  },
  list: { flex: 1, overflowY: 'auto' },
  empty: { padding: 16, color: '#444466', fontSize: 11, textAlign: 'center' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a1a30',
  },
  selected: { background: '#1a2a4a' },
  icon: { fontSize: 14, flexShrink: 0 },
  name: {
    flex: 1,
    fontSize: 12,
    color: '#c0c0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: { display: 'flex', gap: 2, flexShrink: 0 },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666688',
    padding: '2px 3px',
    fontSize: 11,
    borderRadius: 3,
  },
  colorDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
}
