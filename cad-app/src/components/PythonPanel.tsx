import { useState, useRef } from 'react'
import { usePyScriptStore, type PyScript } from '../store/pyScriptStore'
import { transpilePython } from '../lib/pythonTranspiler'
import { createCadRuntime } from '../lib/pythonRuntime'
import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'

interface Props { onClose: () => void }

const TEMPLATE = `import math

# Example: use add_box, add_sphere, add_cylinder, add_cone, add_torus, add_plane
# Functions accept keyword args: add_box(width=1, height=1, depth=1, position=[0,0,0])
# Returns object ID you can use with mirror(), linear_array(), circular_array()

n = 8
r = 3.0
for i in range(n):
    angle = 2 * math.pi * i / n
    x = r * math.cos(angle)
    z = r * math.sin(angle)
    add_cylinder(radius=0.25, height=2, position=[x, 1, z], color='#4a9eff')
`

type View = 'list' | 'edit' | 'new'

export default function PythonPanel({ onClose }: Props) {
  const { scripts, addScript, updateScript, deleteScript } = usePyScriptStore()
  const { lang } = useLang()
  const [view, setView] = useState<View>('list')
  const [editTarget, setEditTarget] = useState<PyScript | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [jsPreview, setJsPreview] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  const L = lang === 'ja'
    ? { title: 'Pythonスクリプト', list: '一覧', newScript: '新規', run: '実行', edit: '編集', del: '削除', save: '保存', cancel: 'キャンセル', name: '名前', code: 'コード', output: '出力', clear: 'クリア', noScripts: 'スクリプトなし', preview: 'JS変換確認', apiRef: 'API一覧' }
    : { title: 'Python Scripts', list: 'List', newScript: 'New', run: 'Run', edit: 'Edit', del: 'Del', save: 'Save', cancel: 'Cancel', name: 'Name', code: 'Code', output: 'Output', clear: 'Clear', noScripts: 'No scripts', preview: 'View JS', apiRef: 'API Ref' }

  const API_HELP = [
    'add_box(width, height, depth, position=[x,y,z], color="#hex", name="str")',
    'add_sphere(radius, position=[x,y,z], color="#hex")',
    'add_cylinder(radius, height, position=[x,y,z], color="#hex")',
    'add_cone(radius, height, position=[x,y,z])',
    'add_torus(radius, tube, position=[x,y,z])',
    'add_plane(width, height, position=[x,y,z])',
    'duplicate(id)  →  new_id',
    'mirror(id, "x"|"y"|"z")',
    'linear_array(id, "x"|"y"|"z", count, spacing)',
    'circular_array(id, count, radius)',
    'set_color(id, "#hex")',
    'set_position(id, [x,y,z])',
    'set_scale(id, [x,y,z] | number)',
    'delete(id)',
  ]

  function openNew() {
    setEditName(lang === 'ja' ? `スクリプト${scripts.length + 1}` : `Script ${scripts.length + 1}`)
    setEditCode(TEMPLATE)
    setOutput([])
    setJsPreview(false)
    setView('new')
  }

  function openEdit(s: PyScript) {
    setEditTarget(s)
    setEditName(s.name)
    setEditCode(s.code)
    setOutput([])
    setJsPreview(false)
    setView('edit')
  }

  function saveScript() {
    if (!editName.trim()) return
    if (view === 'new') {
      addScript(editName.trim(), editCode)
    } else if (editTarget) {
      updateScript(editTarget.id, { name: editName.trim(), code: editCode })
    }
    setView('list')
  }

  function appendOutput(line: string) {
    setOutput((prev) => [...prev, line])
    setTimeout(() => outputRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
  }

  function runCode(code: string) {
    setRunning(true)
    setOutput([])
    appendOutput(lang === 'ja' ? '▶ 実行開始...' : '▶ Running...')
    useSceneStore.getState()._snapshot()
    try {
      const { js, error: transpileError } = transpilePython(code)
      if (transpileError) { appendOutput(`[transpile error] ${transpileError}`); setRunning(false); return }
      const runtime = createCadRuntime(appendOutput)
      const keys = Object.keys(runtime)
      const vals = Object.values(runtime)
      // eslint-disable-next-line no-new-func
      const fn = new Function(...keys, js)
      fn(...vals)
      appendOutput(lang === 'ja' ? '✓ 完了' : '✓ Done')
    } catch (e) {
      appendOutput(`[error] ${String(e)}`)
    }
    setRunning(false)
  }

  function runListItem(s: PyScript) {
    useSceneStore.getState()._snapshot()
    setOutput([])
    setView('list')
    setRunning(true)
    setTimeout(() => {
      try {
        appendOutput(lang === 'ja' ? `▶ "${s.name}" 実行中...` : `▶ Running "${s.name}"...`)
        const { js, error } = transpilePython(s.code)
        if (error) { appendOutput(`[transpile error] ${error}`); setRunning(false); return }
        const runtime = createCadRuntime(appendOutput)
        // eslint-disable-next-line no-new-func
        new Function(...Object.keys(runtime), js)(...Object.values(runtime))
        appendOutput('✓ Done')
      } catch (e) { appendOutput(`[error] ${String(e)}`) }
      setRunning(false)
    }, 0)
  }

  const isEditing = view === 'edit' || view === 'new'
  const currentJs = isEditing ? transpilePython(editCode).js : ''

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{L.title}</span>
          <div style={styles.headerActions}>
            {view === 'list' && (
              <button style={styles.newBtn} onClick={openNew}>+ {L.newScript}</button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* List view */}
        {view === 'list' && (
          <div style={styles.body}>
            <div style={styles.scriptList}>
              {scripts.length === 0 ? (
                <div style={styles.empty}>{L.noScripts}</div>
              ) : scripts.map((s) => (
                <div key={s.id} style={styles.scriptRow}>
                  <div style={styles.scriptMeta}>
                    <span style={styles.scriptName}>{s.name}</span>
                    <span style={styles.scriptLines}>{s.code.split('\n').filter(Boolean).length} lines</span>
                  </div>
                  <div style={styles.scriptActions}>
                    <button style={styles.runBtn} onClick={() => runListItem(s)} disabled={running}>▶ {L.run}</button>
                    <button style={styles.editBtn} onClick={() => openEdit(s)}>✏ {L.edit}</button>
                    <button style={styles.delBtn} onClick={() => deleteScript(s.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
            {output.length > 0 && (
              <div style={styles.outputArea} ref={outputRef}>
                <div style={styles.outputHeader}>
                  <span style={styles.outputLabel}>{L.output}</span>
                  <button style={styles.clearBtn} onClick={() => setOutput([])}>✕ {L.clear}</button>
                </div>
                {output.map((line, i) => (
                  <div key={i} style={{ ...styles.outputLine, color: line.startsWith('[error]') ? '#ff6b6b' : line.startsWith('✓') ? '#51cf66' : '#c0c0e0' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit / New view */}
        {isEditing && (
          <div style={styles.editBody}>
            <div style={styles.editTop}>
              <input style={styles.nameInput} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={L.name} />
              <button style={styles.runBtnLg} onClick={() => runCode(editCode)} disabled={running}>
                ▶ {L.run}
              </button>
            </div>

            {/* Tab bar */}
            <div style={styles.tabs}>
              <button style={{ ...styles.tab, ...(jsPreview ? {} : styles.tabActive) }} onClick={() => setJsPreview(false)}>
                Python
              </button>
              <button style={{ ...styles.tab, ...(jsPreview ? styles.tabActive : {}) }} onClick={() => setJsPreview(true)}>
                {L.preview}
              </button>
              <div style={styles.apiToggleWrap}>
                <details>
                  <summary style={styles.apiSummary}>{L.apiRef}</summary>
                  <div style={styles.apiList}>
                    {API_HELP.map((fn) => <div key={fn} style={styles.apiLine}>{fn}</div>)}
                  </div>
                </details>
              </div>
            </div>

            {/* Code / JS preview */}
            {jsPreview ? (
              <pre style={styles.jsPreview}>{currentJs}</pre>
            ) : (
              <textarea
                style={styles.codeArea}
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                spellCheck={false}
                placeholder="# Python code here..."
              />
            )}

            {/* Output */}
            {output.length > 0 && (
              <div style={styles.outputArea} ref={outputRef}>
                {output.map((line, i) => (
                  <div key={i} style={{ ...styles.outputLine, color: line.startsWith('[error]') ? '#ff6b6b' : line.startsWith('✓') ? '#51cf66' : '#a0c0a0' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* Footer actions */}
            <div style={styles.editFooter}>
              <button style={styles.saveBtn} onClick={saveScript}>{L.save}</button>
              <button style={styles.cancelBtn} onClick={() => setView('list')}>{L.cancel}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  panel: { background: '#1a1a3a', border: '1px solid #3a3a6a', borderRadius: 10, width: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #2a2a4a', flexShrink: 0 },
  title: { fontSize: 15, fontWeight: 700, color: '#e0e0ff' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  newBtn: { background: '#1a3a6a', border: '1px solid #4a9eff', borderRadius: 5, color: '#4a9eff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
  closeBtn: { background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 16, padding: 2 },
  body: { display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 },
  scriptList: { overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  empty: { textAlign: 'center', color: '#666688', fontSize: 13, padding: 24 },
  scriptRow: { display: 'flex', alignItems: 'center', background: '#12122a', borderRadius: 7, padding: '8px 12px', gap: 8 },
  scriptMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  scriptName: { fontSize: 13, color: '#e0e0ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  scriptLines: { fontSize: 10, color: '#555577' },
  scriptActions: { display: 'flex', gap: 5, flexShrink: 0 },
  runBtn: { background: '#1a4a2a', border: '1px solid #2a8a4a', borderRadius: 5, color: '#51cf66', padding: '4px 8px', cursor: 'pointer', fontSize: 11 },
  editBtn: { background: '#1a2a4a', border: '1px solid #2a4a8a', borderRadius: 5, color: '#74c0fc', padding: '4px 8px', cursor: 'pointer', fontSize: 11 },
  delBtn: { background: '#3a1a1a', border: '1px solid #8a2a2a', borderRadius: 5, color: '#ff6b6b', padding: '4px 7px', cursor: 'pointer', fontSize: 11 },
  outputArea: { background: '#0d0d1a', borderTop: '1px solid #2a2a4a', padding: '8px 12px', maxHeight: 140, overflowY: 'auto', flexShrink: 0 },
  outputHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  outputLabel: { fontSize: 10, color: '#555577', textTransform: 'uppercase' },
  clearBtn: { background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 10 },
  outputLine: { fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 },
  editBody: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '10px 14px 12px' },
  editTop: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  nameInput: { flex: 1, background: '#12122a', border: '1px solid #3a3a6a', borderRadius: 5, color: '#e0e0ff', padding: '6px 10px', fontSize: 13, outline: 'none' },
  runBtnLg: { background: '#1a4a2a', border: '1px solid #2a8a4a', borderRadius: 5, color: '#51cf66', padding: '6px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' },
  tab: { background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 5, color: '#8888aa', padding: '4px 12px', cursor: 'pointer', fontSize: 11 },
  tabActive: { background: '#1a2a4a', border: '1px solid #4a9eff', color: '#4a9eff' },
  apiToggleWrap: { marginLeft: 'auto' },
  apiSummary: { color: '#666688', fontSize: 10, cursor: 'pointer', userSelect: 'none' },
  apiList: { position: 'absolute', right: 14, background: '#12122a', border: '1px solid #3a3a6a', borderRadius: 7, padding: '8px 12px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 400 },
  apiLine: { fontSize: 10, fontFamily: 'monospace', color: '#a0c0a0' },
  codeArea: { flex: 1, background: '#0d0d1a', border: '1px solid #2a2a4a', borderRadius: 6, color: '#a0d0a0', padding: '10px', fontSize: 12, fontFamily: 'monospace', resize: 'none', outline: 'none', lineHeight: 1.6, minHeight: 260 },
  jsPreview: { flex: 1, background: '#0d0d1a', border: '1px solid #2a2a4a', borderRadius: 6, color: '#a0a0d0', padding: '10px', fontSize: 11, fontFamily: 'monospace', overflow: 'auto', margin: 0, minHeight: 260 },
  editFooter: { display: 'flex', gap: 8, marginTop: 10 },
  saveBtn: { flex: 1, background: '#1a4a2a', border: '1px solid #2a8a4a', borderRadius: 5, color: '#51cf66', padding: '8px', cursor: 'pointer', fontSize: 13 },
  cancelBtn: { flex: 1, background: '#1e1e3a', border: '1px solid #2a2a4a', borderRadius: 5, color: '#c0c0e0', padding: '8px', cursor: 'pointer', fontSize: 13 },
}
