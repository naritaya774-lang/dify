import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'
import type { Vec3 } from '../types'

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string
  value: Vec3
  onChange: (v: Vec3) => void
  step?: number
}) {
  const input = (axis: keyof Vec3) => (
    <div style={styles.axisRow}>
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
  )
  return (
    <div style={styles.vec3Block}>
      <div style={styles.vec3Label}>{label}</div>
      <div style={styles.vec3Inputs}>
        {input('x')}
        {input('y')}
        {input('z')}
      </div>
    </div>
  )
}

export default function PropertiesPanel() {
  const { objects, selectedId, updateObject } = useSceneStore()
  const { t } = useLang()
  const selected = objects.find((o) => o.id === selectedId)

  if (!selected) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>{t('properties')}</div>
        <div style={styles.empty}>{t('noSelection')}</div>
      </div>
    )
  }

  const upd = (partial: Parameters<typeof updateObject>[1]) => updateObject(selected.id, partial)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>{t('properties')}</div>

      <div style={styles.section}>
        <label style={styles.label}>{t('name')}</label>
        <input
          style={styles.textInput}
          value={selected.name}
          onChange={(e) => upd({ name: e.target.value })}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>{t('type')}</label>
        <div style={styles.typeTag}>{t(selected.type)}</div>
      </div>

      <Vec3Input label={t('position')} value={selected.position} onChange={(position) => upd({ position })} />
      <Vec3Input label={t('rotationRad')} value={selected.rotation} onChange={(rotation) => upd({ rotation })} step={0.05} />
      <Vec3Input label={t('scaleLabel')} value={selected.scale} onChange={(scale) => upd({ scale })} step={0.1} />

      <div style={styles.section}>
        <label style={styles.label}>{t('color')}</label>
        <div style={styles.colorRow}>
          <input
            type="color"
            value={selected.color}
            onChange={(e) => upd({ color: e.target.value })}
            style={styles.colorPicker}
          />
          <span style={styles.colorHex}>{selected.color}</span>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>{t('options')}</label>
        <div style={styles.checkRow}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={selected.wireframe} onChange={(e) => upd({ wireframe: e.target.checked })} />
            {t('wireframe')}
          </label>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={selected.visible} onChange={(e) => upd({ visible: e.target.checked })} />
            {t('visible')}
          </label>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 220,
    background: '#12122a',
    borderLeft: '1px solid #2a2a4a',
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
  vec3Inputs: { display: 'flex', flexDirection: 'column', gap: 4 },
  axisRow: { display: 'flex', alignItems: 'center', gap: 6 },
  axisLabel: { fontSize: 10, fontWeight: 700, width: 12, flexShrink: 0 },
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
