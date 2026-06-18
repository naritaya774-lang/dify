import { useSketchStore } from '../store/sketchStore'
import { viewportActions } from './Viewport3D'
import { useLang } from '../i18n/useLang'
import type { SketchTool } from '../types'

export default function SketchPanel() {
  const sketch = useSketchStore()
  const { t } = useLang()

  if (!sketch.active) return null

  const isExtrude = sketch.mode === 'extrude'
  const canClose = sketch.tool === 'polyline' && sketch.currentPoints.length >= 3

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#1a3a6a' : '#1e1e3a',
    border: `1px solid ${active ? '#4a9eff' : '#2a2a4a'}`,
    color: active ? '#4a9eff' : '#c0c0e0',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  })

  const tools: SketchTool[] = ['polyline', 'circle', 'rect']

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      background: 'rgba(18,18,42,0.92)',
      border: '1px solid #2a2a5a',
      borderRadius: 8,
      padding: 14,
      minWidth: 200,
      zIndex: 100,
      color: '#c0c0e0',
      fontSize: 12,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#4a9eff', marginBottom: 10 }}>
        {isExtrude ? t('sketchExtrude') : t('sketchRevolve')}
      </div>

      {/* Tool selection */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#666688', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>ツール</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {tools.map((tool) => (
            <button key={tool} style={btnStyle(sketch.tool === tool)} onClick={() => sketch.setTool(tool)}>
              {tool === 'polyline' ? t('polyline') : tool === 'circle' ? t('circle') : t('rect')}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ color: '#666688', fontSize: 11, marginBottom: 8 }}>
        完成図形: {sketch.shapes.length} 個 · 現在の点: {sketch.currentPoints.length}
      </div>

      {/* Depth / Angle */}
      {isExtrude ? (
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 2 }}>
            {t('extrudeDepth')}
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={sketch.extrudeDepth}
            onChange={(e) => sketch.setExtrudeDepth(Math.max(0.1, parseFloat(e.target.value) || 1))}
            style={{ width: '100%', background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 4, color: '#c0c0e0', padding: '3px 6px', fontSize: 12 }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 2 }}>
            {t('revolveAngle')}
          </label>
          <input
            type="number"
            min={1}
            max={360}
            step={1}
            value={Math.round(sketch.revolveAngle * 180 / Math.PI)}
            onChange={(e) => sketch.setRevolveAngle(Math.min(360, Math.max(1, parseFloat(e.target.value) || 360)) * Math.PI / 180)}
            style={{ width: '100%', background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 4, color: '#c0c0e0', padding: '3px 6px', fontSize: 12 }}
          />
        </div>
      )}

      {/* Close shape button for polyline */}
      {canClose && (
        <button
          style={{ ...btnStyle(false), width: '100%', marginBottom: 6, background: '#1a3a2a', borderColor: '#51cf66', color: '#51cf66' }}
          onClick={() => sketch.closeShape()}
        >
          {t('closeShape')}
        </button>
      )}

      {/* Commit button */}
      <button
        style={{
          ...btnStyle(false),
          width: '100%',
          marginBottom: 6,
          background: sketch.shapes.length > 0 ? '#1a3a6a' : '#1a1a3a',
          borderColor: sketch.shapes.length > 0 ? '#4a9eff' : '#2a2a4a',
          color: sketch.shapes.length > 0 ? '#4a9eff' : '#444466',
          cursor: sketch.shapes.length > 0 ? 'pointer' : 'not-allowed',
        }}
        disabled={sketch.shapes.length === 0}
        onClick={() => viewportActions.commitSketch?.()}
      >
        {isExtrude ? t('finishExtrude') : t('finishRevolve')}
      </button>

      {/* Cancel */}
      <button
        style={{ ...btnStyle(false), width: '100%', borderColor: '#ff6b6b', color: '#ff6b6b', background: '#2a1a1a' }}
        onClick={() => sketch.cancelSketch()}
      >
        {t('delete')} / キャンセル
      </button>

      <div style={{ color: '#444466', fontSize: 10, marginTop: 8 }}>
        {t('sketchModeHint')}
      </div>
    </div>
  )
}
