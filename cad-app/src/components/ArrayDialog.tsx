import { useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useLang } from '../i18n/useLang'

interface Props {
  objectId: string
  onClose: () => void
}

export default function ArrayDialog({ objectId, onClose }: Props) {
  const { t } = useLang()
  const { linearArray, circularArray } = useSceneStore()
  const [tab, setTab] = useState<'linear' | 'circular'>('linear')
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x')
  const [count, setCount] = useState(3)
  const [spacing, setSpacing] = useState(2)
  const [radius, setRadius] = useState(3)

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#1a3a6a' : '#1e1e3a',
    border: `1px solid ${active ? '#4a9eff' : '#2a2a4a'}`,
    color: active ? '#4a9eff' : '#c0c0e0',
    borderRadius: 4,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 12,
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#12122a',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    color: '#c0c0e0',
    padding: '4px 8px',
    fontSize: 12,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#888',
    fontSize: 11,
    marginBottom: 3,
  }

  const handleOk = () => {
    if (tab === 'linear') {
      linearArray(objectId, axis, Math.max(2, count), spacing)
    } else {
      circularArray(objectId, 'y', Math.max(2, count), radius)
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        padding: 24,
        minWidth: 300,
        color: '#c0c0e0',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#4a9eff', marginBottom: 16 }}>
          {t('array')}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button style={btnStyle(tab === 'linear')} onClick={() => setTab('linear')}>
            {t('linear')}
          </button>
          <button style={btnStyle(tab === 'circular')} onClick={() => setTab('circular')}>
            {t('circular')}
          </button>
        </div>

        {tab === 'linear' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('arrayAxis')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['x', 'y', 'z'] as const).map((a) => (
                  <button key={a} style={btnStyle(axis === a)} onClick={() => setAxis(a)}>
                    {a.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t('arrayCount')} (2–20)</label>
              <input type="number" min={2} max={20} value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('arraySpacing')} (0.1–10)</label>
              <input type="number" min={0.1} max={10} step={0.1} value={spacing}
                onChange={(e) => setSpacing(Math.min(10, Math.max(0.1, parseFloat(e.target.value) || 1)))}
                style={inputStyle} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('arrayCount')} (2–20)</label>
              <input type="number" min={2} max={20} value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('arrayRadius')} (0.5–10)</label>
              <input type="number" min={0.5} max={10} step={0.1} value={radius}
                onChange={(e) => setRadius(Math.min(10, Math.max(0.5, parseFloat(e.target.value) || 3)))}
                style={inputStyle} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button style={{ ...btnStyle(false), padding: '6px 18px' }} onClick={onClose}>
            キャンセル
          </button>
          <button
            style={{ ...btnStyle(true), padding: '6px 18px' }}
            onClick={handleOk}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
