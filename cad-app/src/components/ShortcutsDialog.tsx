import { useLang } from '../i18n/useLang'

interface Props {
  onClose: () => void
}

type Entry = { key: string; en: string; ja: string }

const ENTRIES: Entry[] = [
  { key: 'Ctrl+Z', en: 'Undo', ja: '元に戻す' },
  { key: 'Ctrl+Y / Ctrl+Shift+Z', en: 'Redo', ja: 'やり直し' },
  { key: 'G', en: 'Move (Translate)', ja: '移動モード' },
  { key: 'R', en: 'Rotate', ja: '回転モード' },
  { key: 'S', en: 'Scale', ja: 'スケールモード' },
  { key: 'Delete / Backspace', en: 'Delete selected', ja: '選択を削除' },
  { key: 'Click', en: 'Select object', ja: 'オブジェクト選択' },
  { key: 'Shift+Click', en: 'Multi-select', ja: '複数選択' },
  { key: 'Left drag', en: 'Orbit (rotate view)', ja: 'ビュー回転' },
  { key: 'Right drag', en: 'Pan view', ja: 'ビュー移動' },
  { key: 'Scroll', en: 'Zoom in/out', ja: 'ズーム' },
  { key: 'Double-click', en: 'Close sketch shape', ja: 'スケッチ形状を閉じる' },
  { key: 'ESC', en: 'Cancel sketch', ja: 'スケッチをキャンセル' },
]

export default function ShortcutsDialog({ onClose }: Props) {
  const { lang } = useLang()

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{lang === 'ja' ? 'キーボードショートカット' : 'Keyboard Shortcuts'}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.list}>
          {ENTRIES.map((entry) => (
            <div key={entry.key} style={styles.row}>
              <kbd style={styles.kbd}>{entry.key}</kbd>
              <span style={styles.desc}>{lang === 'ja' ? entry.ja : entry.en}</span>
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
    width: 440,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #2a2a4a',
    flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: 700, color: '#e0e0ff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 16, padding: 2,
  },
  list: {
    overflowY: 'auto',
    padding: '12px 18px 18px',
    display: 'flex', flexDirection: 'column', gap: 9,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 14,
  },
  kbd: {
    background: '#12122a',
    border: '1px solid #3a3a6a',
    borderRadius: 5,
    padding: '3px 10px',
    fontSize: 11,
    color: '#4a9eff',
    fontFamily: 'monospace',
    minWidth: 160,
    textAlign: 'center' as const,
    flexShrink: 0,
    boxShadow: '0 2px 0 #12122a',
  },
  desc: { fontSize: 12, color: '#c0c0e0' },
}
