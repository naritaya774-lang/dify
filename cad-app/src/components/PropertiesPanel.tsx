import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'
import type { GeometryParams, Vec3 } from '../types'

function NumInput({ label, value, onChange, step = 0.1, min }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  return (
    <div style={styles.paramRow}>
      <span style={styles.paramLabel}>{label}</span>
      <input
        type="number"
        style={styles.numInput}
        value={Math.round(value * 1000) / 1000}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}

function Vec3Input({ label, value, onChange, step = 0.1 }: {
  label: string; value: Vec3; onChange: (v: Vec3) => void; step?: number
}) {
  return (
    <div style={styles.vec3Block}>
      <div style={styles.vec3Label}>{label}</div>
      {(['x', 'y', 'z'] as (keyof Vec3)[]).map((axis) => (
        <div key={axis} style={styles.axisRow}>
          <span style={{ ...styles.axisLabel, color: axis === 'x' ? '#ff6b6b' : axis === 'y' ? '#51cf66' : '#4a9eff' }}>
            {axis.toUpperCase()}
          </span>
          <input
            type="number"
            style={styles.numInput}
            value={Math.round(value[axis] * 1000) / 1000}
            step={step}
            onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
          />
        </div>
      ))}
    </div>
  )
}

function GeometryParamsSection({ type, params, onChange }: {
  type: string; params: GeometryParams; onChange: (p: Partial<GeometryParams>) => void
}) {
  const { t } = useLang()
  if (type === 'boolean') return null

  return (
    <div style={styles.section}>
      <label style={styles.label}>{t('geomParams')}</label>
      {type === 'box' && (<>
        <NumInput label={t('width')} value={params.width ?? 1} onChange={(v) => onChange({ width: v })} min={0.01} />
        <NumInput label={t('heightParam')} value={params.height ?? 1} onChange={(v) => onChange({ height: v })} min={0.01} />
        <NumInput label={t('depth')} value={params.depth ?? 1} onChange={(v) => onChange({ depth: v })} min={0.01} />
        <NumInput label={t('segsW')} value={params.widthSegments ?? 1} onChange={(v) => onChange({ widthSegments: Math.max(1, Math.round(v)) })} step={1} min={1} />
        <NumInput label={t('segsH')} value={params.heightSegments ?? 1} onChange={(v) => onChange({ heightSegments: Math.max(1, Math.round(v)) })} step={1} min={1} />
      </>)}
      {type === 'sphere' && (<>
        <NumInput label={t('radius')} value={params.radius ?? 0.5} onChange={(v) => onChange({ radius: v })} min={0.01} />
        <NumInput label={t('segsPhi')} value={params.phiSegments ?? 32} onChange={(v) => onChange({ phiSegments: Math.max(3, Math.round(v)) })} step={1} min={3} />
        <NumInput label={t('segsTheta')} value={params.thetaSegments ?? 16} onChange={(v) => onChange({ thetaSegments: Math.max(2, Math.round(v)) })} step={1} min={2} />
      </>)}
      {(type === 'cylinder') && (<>
        <NumInput label={t('radiusTop')} value={params.radiusTop ?? 0.5} onChange={(v) => onChange({ radiusTop: v })} min={0} />
        <NumInput label={t('radiusBottom')} value={params.radiusBottom ?? 0.5} onChange={(v) => onChange({ radiusBottom: v })} min={0} />
        <NumInput label={t('heightParam')} value={params.height ?? 1} onChange={(v) => onChange({ height: v })} min={0.01} />
        <NumInput label={t('segsR')} value={params.radialSegments ?? 32} onChange={(v) => onChange({ radialSegments: Math.max(3, Math.round(v)) })} step={1} min={3} />
      </>)}
      {type === 'cone' && (<>
        <NumInput label={t('radius')} value={params.radiusBottom ?? 0.5} onChange={(v) => onChange({ radiusBottom: v })} min={0} />
        <NumInput label={t('heightParam')} value={params.height ?? 1} onChange={(v) => onChange({ height: v })} min={0.01} />
        <NumInput label={t('segsR')} value={params.radialSegments ?? 32} onChange={(v) => onChange({ radialSegments: Math.max(3, Math.round(v)) })} step={1} min={3} />
      </>)}
      {type === 'torus' && (<>
        <NumInput label={t('radius')} value={params.radius ?? 0.5} onChange={(v) => onChange({ radius: v })} min={0.01} />
        <NumInput label={t('tube')} value={params.tube ?? 0.2} onChange={(v) => onChange({ tube: v })} min={0.01} />
        <NumInput label={t('segsR')} value={params.radialSegments ?? 16} onChange={(v) => onChange({ radialSegments: Math.max(2, Math.round(v)) })} step={1} min={2} />
        <NumInput label={t('segsT')} value={params.tubularSegments ?? 64} onChange={(v) => onChange({ tubularSegments: Math.max(3, Math.round(v)) })} step={1} min={3} />
      </>)}
      {type === 'plane' && (<>
        <NumInput label={t('width')} value={params.planeWidth ?? 2} onChange={(v) => onChange({ planeWidth: v })} min={0.01} />
        <NumInput label={t('heightParam')} value={params.planeHeight ?? 2} onChange={(v) => onChange({ planeHeight: v })} min={0.01} />
        <NumInput label={t('segsW')} value={params.widthSegments ?? 1} onChange={(v) => onChange({ widthSegments: Math.max(1, Math.round(v)) })} step={1} min={1} />
        <NumInput label={t('segsH')} value={params.heightSegments ?? 1} onChange={(v) => onChange({ heightSegments: Math.max(1, Math.round(v)) })} step={1} min={1} />
      </>)}
    </div>
  )
}

export default function PropertiesPanel() {
  const { objects, selectedIds, updateObject, updateParams } = useSceneStore()
  const { t } = useLang()
  const selected = objects.find((o) => o.id === selectedIds[0])

  if (!selected) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>{t('properties')}</div>
        <div style={styles.empty}>{t('noSelection')}</div>
        {selectedIds.length > 1 && (
          <div style={{ ...styles.empty, color: '#4a9eff' }}>
            {selectedIds.length}{t('multiSelected')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>{t('properties')}</div>

      {selectedIds.length > 1 && (
        <div style={styles.multiBadge}>{selectedIds.length} {t('multiSelected')}</div>
      )}

      <div style={styles.section}>
        <label style={styles.label}>{t('name')}</label>
        <input style={styles.textInput} value={selected.name}
          onChange={(e) => updateObject(selected.id, { name: e.target.value })} />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>{t('type')}</label>
        <div style={styles.typeTag}>{t(selected.type as Parameters<typeof t>[0])}</div>
      </div>

      <Vec3Input label={t('position')} value={selected.position}
        onChange={(position) => updateObject(selected.id, { position })} />
      <Vec3Input label={t('rotationRad')} value={selected.rotation}
        onChange={(rotation) => updateObject(selected.id, { rotation })} step={0.05} />
      <Vec3Input label={t('scaleLabel')} value={selected.scale}
        onChange={(scale) => updateObject(selected.id, { scale })} step={0.1} />

      <GeometryParamsSection
        type={selected.type}
        params={selected.params}
        onChange={(p) => updateParams(selected.id, p)}
      />

      <div style={styles.section}>
        <label style={styles.label}>{t('color')}</label>
        <div style={styles.colorRow}>
          <input type="color" value={selected.color}
            onChange={(e) => updateObject(selected.id, { color: e.target.value })}
            style={styles.colorPicker} />
          <span style={styles.colorHex}>{selected.color}</span>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>{t('options')}</label>
        <div style={styles.checkRow}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={selected.wireframe}
              onChange={(e) => updateObject(selected.id, { wireframe: e.target.checked })} />
            {t('wireframe')}
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={selected.visible}
              onChange={(e) => updateObject(selected.id, { visible: e.target.checked })} />
            {t('visible')}
          </label>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 230,
    background: '#12122a',
    borderLeft: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    overflowY: 'auto',
  },
  header: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1px solid #2a2a4a',
    flexShrink: 0,
  },
  multiBadge: {
    background: '#1a3a6a',
    color: '#4a9eff',
    fontSize: 11,
    padding: '4px 14px',
    borderBottom: '1px solid #2a2a4a',
  },
  empty: { padding: 16, color: '#444466', fontSize: 12, textAlign: 'center' },
  section: { padding: '8px 14px', borderBottom: '1px solid #1e1e3a' },
  label: { display: 'block', fontSize: 10, color: '#666688', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  textInput: {
    width: '100%',
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    color: '#c0c0e0',
    padding: '4px 8px',
    fontSize: 12,
    boxSizing: 'border-box',
  },
  typeTag: {
    display: 'inline-block',
    background: '#1a3a6a',
    border: '1px solid #4a9eff',
    color: '#4a9eff',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
  },
  vec3Block: { padding: '8px 14px', borderBottom: '1px solid #1e1e3a' },
  vec3Label: { fontSize: 10, color: '#666688', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  axisRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  axisLabel: { fontSize: 10, fontWeight: 700, width: 12, flexShrink: 0 },
  paramRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  paramLabel: { fontSize: 10, color: '#8888aa', width: 72, flexShrink: 0 },
  numInput: {
    flex: 1,
    background: '#1e1e3a',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    color: '#c0c0e0',
    padding: '3px 6px',
    fontSize: 11,
  },
  colorRow: { display: 'flex', alignItems: 'center', gap: 8 },
  colorPicker: { width: 36, height: 24, cursor: 'pointer', border: 'none', background: 'none', padding: 0 },
  colorHex: { fontSize: 11, color: '#8888aa' },
  checkRow: { display: 'flex', gap: 16 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#c0c0e0', cursor: 'pointer' },
}
