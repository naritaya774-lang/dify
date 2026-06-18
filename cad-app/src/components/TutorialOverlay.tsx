import { useState } from 'react'
import { useLang } from '../i18n/useLang'

interface Props {
  onClose: () => void
}

interface Step {
  icon: string
  en: { title: string; desc: string }
  ja: { title: string; desc: string }
}

const STEPS: Step[] = [
  {
    icon: '◈',
    en: { title: 'Welcome to Dify CAD!', desc: 'This tutorial covers the core features. You can skip anytime and reopen it from the toolbar.' },
    ja: { title: 'Dify CADへようこそ！', desc: 'このチュートリアルで基本操作を学べます。いつでもスキップでき、ツールバーから再度開けます。' },
  },
  {
    icon: '⬜',
    en: { title: 'Add an Object', desc: 'Find the "Add" section in the toolbar at the top.\nClick ⬜ Box to add a 3D box to the scene.\nTry adding a ⚪ Sphere or 🥫 Cylinder too!' },
    ja: { title: 'オブジェクトを追加', desc: '上部ツールバーの「Add」セクションを探しましょう。\n「⬜ Box」をクリックするとシーンにボックスが追加されます。\n⚪ Sphere や 🥫 Cylinder も試してみましょう！' },
  },
  {
    icon: '✥',
    en: { title: 'Select & Move', desc: 'Click an object to select it — it glows blue.\nDrag it directly to move it around.\nShift+click to select multiple objects at once.' },
    ja: { title: '選択と移動', desc: 'オブジェクトをクリックして選択（青く光ります）。\nそのままドラッグして自由に動かせます。\nShift+クリックで複数選択も可能です。' },
  },
  {
    icon: '↻',
    en: { title: 'Precise Transform', desc: 'With an object selected, press keys to switch mode:\n• G → Move\n• R → Rotate\n• S → Scale\nThen drag the colored arrows (gizmo) for fine control.' },
    ja: { title: '精密な変形', desc: 'オブジェクトを選択した状態でキーを押してモード切替：\n• G → 移動\n• R → 回転\n• S → スケール\nカラーの矢印（ギズモ）をドラッグして精密に操作できます。' },
  },
  {
    icon: '◈',
    en: { title: 'Camera Navigation', desc: '• Drag on empty space → Rotate view\n• Right drag / middle drag → Pan\n• Scroll wheel → Zoom in/out\n\nUse the Camera buttons (Top/Front/Right/3D) for preset angles.' },
    ja: { title: 'カメラ操作', desc: '• 空白をドラッグ → 視点回転\n• 右ドラッグ / 中ドラッグ → 平行移動\n• スクロール → ズーム\n\nツールバーの「Camera」ボタンで上面・前面などの視点に切り替えられます。' },
  },
  {
    icon: '⊖',
    en: { title: 'Boolean Operations', desc: 'Add two overlapping objects. Shift+click both to select them.\nIn the Boolean section choose:\n⊕ Union → merge into one shape\n⊖ Subtract → cut the second from the first\n⊗ Intersect → keep only the overlapping part' },
    ja: { title: 'ブーリアン演算', desc: '2つのオブジェクトを重ね、Shift+クリックで両方選択。\nBooleanセクションで操作を選びます：\n⊕ Union → 結合\n⊖ Subtract → 差分（くり抜き）\n⊗ Intersect → 交差部分のみ残す' },
  },
  {
    icon: '✏',
    en: { title: 'Sketch & Extrude', desc: 'Click "Sketch" in the toolbar to draw a 2D shape.\nClick to place points, double-click to close the shape.\nClick "Extrude" to push it into a 3D solid.\nTry "Revolve" to spin a profile into a round object.' },
    ja: { title: 'スケッチ & 押し出し', desc: 'ツールバーの「Sketch」をクリックして2D形状を描きます。\nクリックで点を追加、ダブルクリックで閉じます。\n「Extrude」ボタンで3D立体に変換。\n「Revolve」で回転体（コップなど）も作れます。' },
  },
  {
    icon: '🐍',
    en: { title: 'Python Scripting', desc: 'Click the 🐍 Python button to open the script editor.\nWrite Python code to generate complex shapes automatically.\nA "Hexagonal Pattern" example is included — press ▶ Run to try it!' },
    ja: { title: 'Pythonスクリプト', desc: '🐍 Python ボタンでスクリプトエディターを開きます。\nPythonコードで複雑な形状を自動生成できます。\n「Hexagonal Pattern」サンプルが入っているので▶ Runで実行してみましょう！' },
  },
  {
    icon: '⏺',
    en: { title: 'Macro Recording', desc: 'Click ⏺ Record to start recording your actions.\nCreate some objects, move them around.\nClick ⏹ Stop and give it a name to save.\nRun the macro anytime to replay all those actions instantly!' },
    ja: { title: 'マクロ録画', desc: '⏺ Record をクリックして操作の記録を開始。\nオブジェクトの追加・移動などを行います。\n⏹ Stop で名前をつけて保存。\n保存したマクロを実行すると全操作を即座に再現できます！' },
  },
  {
    icon: '🖨',
    en: { title: 'Save & Export', desc: '• 💾 Save → saves scene as .json (can reopen later)\n• Export STL → for 3D printers\n• Export OBJ → for Blender, Maya, etc.\n\n⌨ Click Shortcuts in the toolbar to see all hotkeys.\nCtrl+Z undoes any mistake!' },
    ja: { title: '保存 & エクスポート', desc: '• 💾 Save → シーンを.jsonで保存（後で開き直せます）\n• Export STL → 3Dプリンター向け\n• Export OBJ → Blender・Maya など他のソフト向け\n\n⌨ ツールバーの Shortcuts で全ショートカット確認。\nCtrl+Z でいつでも元に戻せます！' },
  },
  {
    icon: '🎉',
    en: { title: "You're All Set!", desc: "You now know the basics of Dify CAD!\nStart experimenting — add some shapes, combine them with Boolean operations, or write a Python script to generate something cool.\n\nHave fun!" },
    ja: { title: 'チュートリアル完了！', desc: 'Dify CADの基本操作をマスターしました！\nシェイプを追加して、ブーリアンで組み合わせたり、Pythonスクリプトで複雑なモデルを生成してみましょう。\n\n楽しんで作ってください！' },
  },
]

export default function TutorialOverlay({ onClose }: Props) {
  const { lang } = useLang()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const text = lang === 'ja' ? current.ja : current.en
  const isLast = step === STEPS.length - 1

  const handleClose = () => {
    localStorage.setItem('cad-tutorial-done', '1')
    onClose()
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        {/* Progress dots */}
        <div style={styles.dots}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              style={{ ...styles.dot, ...(i === step ? styles.dotActive : i < step ? styles.dotDone : {}) }}
              onClick={() => setStep(i)}
              title={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Icon + title */}
        <div style={styles.iconWrap}>
          <span style={styles.icon}>{current.icon}</span>
        </div>
        <div style={styles.stepLabel}>{lang === 'ja' ? 'ステップ' : 'Step'} {step + 1} / {STEPS.length}</div>
        <div style={styles.title}>{text.title}</div>

        {/* Description */}
        <div style={styles.desc}>
          {text.desc.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </div>

        {/* Navigation */}
        <div style={styles.nav}>
          <button style={styles.skipBtn} onClick={handleClose}>
            {lang === 'ja' ? 'スキップ' : 'Skip'}
          </button>
          <div style={styles.navRight}>
            {step > 0 && (
              <button style={styles.backBtn} onClick={() => setStep(step - 1)}>
                {lang === 'ja' ? '← 戻る' : '← Back'}
              </button>
            )}
            {isLast ? (
              <button style={styles.nextBtn} onClick={handleClose}>
                {lang === 'ja' ? '完了 ✓' : 'Done ✓'}
              </button>
            ) : (
              <button style={styles.nextBtn} onClick={() => setStep(step + 1)}>
                {lang === 'ja' ? '次へ →' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 20,
  },
  card: {
    pointerEvents: 'all',
    background: '#12122a',
    border: '1px solid #2a2a5a',
    borderRadius: 12,
    padding: '20px 24px',
    width: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  dots: {
    display: 'flex',
    gap: 5,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#2a2a4a',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
  },
  dotActive: { background: '#4a9eff', transform: 'scale(1.3)' },
  dotDone: { background: '#51cf66' },
  iconWrap: { textAlign: 'center', marginTop: 4 },
  icon: { fontSize: 40 },
  stepLabel: { textAlign: 'center', fontSize: 10, color: '#555577', letterSpacing: 1, textTransform: 'uppercase' },
  title: { textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#c0c0ff' },
  desc: {
    fontSize: 12,
    color: '#9090b0',
    lineHeight: 1.7,
    background: '#0e0e22',
    borderRadius: 6,
    padding: '10px 12px',
    whiteSpace: 'pre-wrap',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  navRight: { display: 'flex', gap: 8 },
  skipBtn: {
    background: 'none',
    border: 'none',
    color: '#555577',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 4,
  },
  backBtn: {
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    color: '#8888aa',
    cursor: 'pointer',
    fontSize: 12,
    padding: '6px 14px',
    borderRadius: 6,
  },
  nextBtn: {
    background: '#1a3a6a',
    border: '1px solid #4a9eff',
    color: '#4a9eff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 18px',
    borderRadius: 6,
  },
}
