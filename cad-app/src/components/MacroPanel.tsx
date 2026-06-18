import { useState } from 'react'
import { useMacroStore, type Macro } from '../store/macroStore'
import { useLang } from '../i18n/useLang'

interface Props {
  onClose: () => void
}

export default function MacroPanel({ onClose }: Props) {
  const { macros, runMacro, deleteMacro, updateMacro } = useMacroStore()
  const { lang } = useLang()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editJson, setEditJson] = useState('')
  const [jsonError, setJsonError] = useState('')

  const L = lang === 'ja'
    ? { title: 'マクロ一覧', run: '実行', edit: '編集', del: '削除', noMacros: 'マクロなし', save: '保存', cancel: 'キャンセル', nameLabel: '名前', opsLabel: '操作 (JSON)', jsonErr: 'JSON形式エラー', ops: '操作数' }
    : { title: 'Macros', run: 'Run', edit: 'Edit', del: 'Del', noMacros: 'No macros saved', save: 'Save', cancel: 'Cancel', nameLabel: 'Name', opsLabel: 'Operations (JSON)', jsonErr: 'Invalid JSON', ops: 'ops' }

  const startEdit = (macro: Macro) => {
    setEditingId(macro.id)
    setEditName(macro.name)
    setEditJson(JSON.stringify(macro.ops, null, 2))
    setJsonError('')
  }

  const saveEdit = () => {
    try {
      const ops = JSON.parse(editJson)
      if (!Array.isArray(ops)) throw new Error('not array')
      updateMacro(editingId!, { name: editName, ops })
      setEditingId(null)
      setJsonError('')
    } catch {
      setJsonError(L.jsonErr)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setJsonError('')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{L.title}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {editingId ? (
          <div style={styles.editView}>
            <label style={styles.label}>{L.nameLabel}</label>
            <input
              style={styles.input}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <label style={styles.label}>{L.opsLabel}</label>
            <textarea
              style={styles.textarea}
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              spellCheck={false}
            />
            {jsonError && <div style={styles.error}>{jsonError}</div>}
            <div style={styles.editActions}>
              <button style={styles.saveBtn} onClick={saveEdit}>{L.save}</button>
              <button style={styles.cancelBtn} onClick={cancelEdit}>{L.cancel}</button>
            </div>
          </div>
        ) : (
          <div style={styles.list}>
            {macros.length === 0 ? (
              <div style={styles.empty}>{L.noMacros}</div>
            ) : (
              macros.map((macro) => (
                <div key={macro.id} style={styles.row}>
                  <div style={styles.macroInfo}>
                    <span style={styles.macroName}>{macro.name}</span>
                    <span style={styles.macroMeta}>{macro.ops.length} {L.ops}</span>
                  </div>
                  <div style={styles.rowActions}>
                    <button style={styles.runBtn} onClick={() => { runMacro(macro.id); onClose() }}>▶ {L.run}</button>
                    <button style={styles.editBtn} onClick={() => startEdit(macro)}>✏ {L.edit}</button>
                    <button style={styles.delBtn} onClick={() => deleteMacro(macro.id)}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
    width: 480,
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
  closeBtn: { background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 16, padding: 2 },
  list: { overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 },
  empty: { textAlign: 'center', color: '#666688', fontSize: 13, padding: 24 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#12122a', borderRadius: 7, padding: '10px 12px', gap: 10 },
  macroInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  macroName: { fontSize: 13, color: '#e0e0ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  macroMeta: { fontSize: 11, color: '#666688' },
  rowActions: { display: 'flex', gap: 6, flexShrink: 0 },
  runBtn: { background: '#1a4a2a', border: '1px solid #2a8a4a', borderRadius: 5, color: '#51cf66', padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  editBtn: { background: '#1a2a4a', border: '1px solid #2a4a8a', borderRadius: 5, color: '#74c0fc', padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  delBtn: { background: '#3a1a1a', border: '1px solid #8a2a2a', borderRadius: 5, color: '#ff6b6b', padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  editView: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 18px 18px', overflow: 'hidden', flex: 1 },
  label: { fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { background: '#12122a', border: '1px solid #3a3a6a', borderRadius: 5, color: '#e0e0ff', padding: '7px 10px', fontSize: 13, outline: 'none' },
  textarea: { background: '#12122a', border: '1px solid #3a3a6a', borderRadius: 5, color: '#a0e0a0', padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', height: 280, outline: 'none', flex: 1 },
  error: { color: '#ff6b6b', fontSize: 12 },
  editActions: { display: 'flex', gap: 8 },
  saveBtn: { flex: 1, background: '#1a4a2a', border: '1px solid #2a8a4a', borderRadius: 5, color: '#51cf66', padding: '8px', cursor: 'pointer', fontSize: 13 },
  cancelBtn: { flex: 1, background: '#1e1e3a', border: '1px solid #2a2a4a', borderRadius: 5, color: '#c0c0e0', padding: '8px', cursor: 'pointer', fontSize: 13 },
}
