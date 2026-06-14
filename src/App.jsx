import { useState, useEffect, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'

const C = {
  espresso:       '#2C1F14',
  mahogany:       '#543A27',
  sage:           '#4A5240',
  herb:           '#82805A',
  parchment:      '#EDE5CF',
  parchmentLight: '#F5EFE3',
  parchmentMid:   '#E0D9C4',
}

const OZ_TO_ML = 29.5735
function fmtOz(n)   { return parseFloat((Math.round(n * 4) / 4).toFixed(2)).toString() }
function fmtMl(n)   { return Math.round(n).toString() }
function fmtDash(n) { return Math.max(1, Math.round(n)).toString() }

function scaleAmt(amt, unit, serves) {
  const v = (parseFloat(amt) || 0) * serves
  if (unit === 'dashes') return fmtDash(v)
  if (unit === 'ml')     return fmtMl(v)
  return fmtOz(v)
}

function convertAmt(amt, from, to) {
  const n = parseFloat(amt) || 0
  if (from === to || from === 'dashes' || to === 'dashes') return amt
  if (from === 'oz' && to === 'ml') return fmtMl(n * OZ_TO_ML)
  if (from === 'ml' && to === 'oz') return fmtOz(n / OZ_TO_ML)
  return amt
}

const METHODS = ['stirred', 'shaken', 'built', 'blended', 'thrown']
const GLASSES = ['Rocks', 'Coupe', 'Martini', 'Highball', 'Collins', 'Nick & Nora', 'Flute', 'Wine', 'Tiki', 'Mule Mug', 'Neat']
const GARNISH_CHIPS = ['Orange twist', 'Lemon twist', 'Lime wedge', 'Maraschino cherry', 'Mint sprig', 'Olive', 'Salt rim', 'Sugar rim', 'Grapefruit peel', 'Cocktail onion']

let _uid = 100
const uid = () => ++_uid

// ─── Image crop helpers ───────────────────────────────────────────────────────

async function getCroppedDataUrl(imageSrc, croppedAreaPixels) {
  const image = await new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = imageSrc
  })
  const canvas = document.createElement('canvas')
  const SIZE = 800
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, SIZE, SIZE
  )
  return canvas.toDataURL('image/jpeg', 0.88)
}

function CropModal({ src, onDone, onCancel }) {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 })
  const [zoom,       setZoom]       = useState(1)
  const [croppedArea, setCroppedArea] = useState(null)

  const onCropComplete = useCallback((_, pixels) => setCroppedArea(pixels), [])

  const handleDone = async () => {
    const dataUrl = await getCroppedDataUrl(src, croppedArea)
    onDone(dataUrl)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(44,31,20,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '320px', height: '320px', borderRadius: '12px', overflow: 'hidden' }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))}
        style={{ width: '320px', margin: '18px 0 0', accentColor: C.mahogany }} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button onClick={onCancel}
          style={{ padding: '10px 24px', borderRadius: '8px', border: `0.5px solid rgba(255,255,255,0.2)`, background: 'transparent', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleDone}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: C.mahogany, color: C.parchment, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Use photo
        </button>
      </div>
    </div>
  )
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const lbl = {
  display: 'block', fontSize: '9px', letterSpacing: '0.15em',
  textTransform: 'uppercase', color: C.herb, marginBottom: '8px',
  fontWeight: 600, fontFamily: "'Josefin Sans', sans-serif",
}

const inpStyle = (extra = {}) => ({
  background: C.parchmentLight,
  border: `0.5px solid rgba(84,58,39,0.22)`,
  borderRadius: '8px', outline: 'none',
  color: C.espresso, fontFamily: "'Josefin Sans', sans-serif",
  ...extra,
})

const pillStyle = (active, dark = false) => ({
  padding: '7px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer',
  fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase',
  fontFamily: "'Josefin Sans', sans-serif", fontWeight: 400,
  background: active ? (dark ? C.mahogany : C.sage) : C.parchmentMid,
  color: active ? C.parchment : C.herb,
  transition: 'background 0.14s, color 0.14s',
})

const methodColor = { stirred: C.sage, shaken: C.mahogany, built: C.herb, blended: C.sage, thrown: C.mahogany }

// ─── Login / Register screen ──────────────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { user } = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
        onAuth(user)
      } else {
        const { user } = await apiFetch('/api/auth/register', { method: 'POST', body: { email, password, name } })
        onAuth(user)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '52px', color: C.espresso, lineHeight: 1 }}>The Grove Bar</span>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {mode === 'register' && (
          <div>
            <label style={lbl}>Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Rachel"
              style={inpStyle({ width: '100%', padding: '13px 14px', fontSize: '15px', boxSizing: 'border-box' })} />
          </div>
        )}

        <div>
          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
            style={inpStyle({ width: '100%', padding: '13px 14px', fontSize: '15px', boxSizing: 'border-box' })} />
        </div>

        <div>
          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={inpStyle({ width: '100%', padding: '13px 14px', fontSize: '15px', boxSizing: 'border-box' })} />
        </div>

        {error && (
          <div style={{ color: C.mahogany, fontFamily: "'Josefin Sans', sans-serif", fontSize: '12px', letterSpacing: '0.03em' }}>{error}</div>
        )}

        <button type="submit" disabled={loading}
          style={{ background: C.espresso, color: C.parchment, border: 'none', borderRadius: '8px', padding: '15px 24px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, cursor: 'pointer', marginTop: '4px', opacity: loading ? 0.6 : 1 }}>
          {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button type="button" onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
          style={{ background: 'transparent', border: 'none', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '4px 0' }}>
          {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ view, setView, query, setQuery, user, onLogout }) {
  return (
    <div style={{ background: C.espresso, padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px', height: '68px', position: 'sticky', top: 0, zIndex: 10 }}>
      <div onClick={() => setView('browse')} style={{ cursor: 'pointer', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '38px', color: C.parchment, lineHeight: 1, display: 'block' }}>The Grove Bar</span>
      </div>

      {view === 'browse' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0 12px', gap: '8px' }}>
          <span style={{ color: C.herb, fontSize: '16px', lineHeight: 1 }}>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search recipes…"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: C.parchment, fontFamily: "'Josefin Sans', sans-serif", fontSize: '13px', letterSpacing: '0.03em', width: '100%', padding: '10px 0' }}
          />
        </div>
      )}

      {view !== 'add' ? (
        <button onClick={() => setView('add')}
          style={{ background: C.mahogany, border: 'none', borderRadius: '8px', padding: '8px 16px', color: C.parchment, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          + Add
        </button>
      ) : (
        <button onClick={() => setView('browse')}
          style={{ background: 'transparent', border: `0.5px solid rgba(255,255,255,0.2)`, borderRadius: '8px', padding: '8px 16px', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
          Cancel
        </button>
      )}

      <button onClick={onLogout}
        style={{ background: 'transparent', border: 'none', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
        title={`Signed in as ${user?.name || user?.email}`}>
        Sign out
      </button>
    </div>
  )
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: C.parchmentLight, borderRadius: '12px', border: `0.5px solid rgba(84,58,39,0.15)`, overflow: 'hidden', cursor: 'pointer', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', transition: 'transform 0.18s ease', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ height: '140px', background: C.parchmentMid, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {recipe.hasImage
          ? <img src={`/api/recipes/${recipe.id}/image`} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: '44px', opacity: 0.15 }}>🍸</span>
        }
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: methodColor[recipe.method] || C.herb, color: C.parchment, padding: '4px 10px', borderRadius: '20px', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
          {recipe.method}
        </div>
        {recipe.glass && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(44,31,20,0.45)', color: C.parchment, padding: '4px 10px', borderRadius: '20px', fontSize: '9px', fontFamily: "'Josefin Sans', sans-serif" }}>
            {recipe.glass}
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 16px', flex: 1 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: C.espresso, marginBottom: '4px' }}>{recipe.name}</div>
        <div style={{ fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: '12px', color: C.herb, marginBottom: '10px' }}>
          {recipe.ingredients.filter(i => i.ingUnit !== 'dashes').slice(0, 3).map(i => i.name).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {recipe.garnishes.slice(0, 2).map(g => (
            <span key={g} style={{ background: C.parchmentMid, color: C.mahogany, padding: '3px 8px', borderRadius: '20px', fontSize: '9px', letterSpacing: '0.06em', fontFamily: "'Josefin Sans', sans-serif" }}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Browse View ──────────────────────────────────────────────────────────────

function BrowseView({ recipes, setView, setDetail, loading }) {
  const [filter, setFilter] = useState('')

  const visible = recipes.filter(r => !filter || r.method === filter)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: C.herb, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: '20px' }}>
        Loading recipes…
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button onClick={() => setFilter('')} style={pillStyle(!filter)}>All</button>
        {METHODS.map(m => (
          <button key={m} onClick={() => setFilter(f => f === m ? '' : m)} style={pillStyle(filter === m)}>{m}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: C.herb, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: '20px' }}>
          No recipes yet — add the first one!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {visible.map(r => (
            <RecipeCard key={r.id} recipe={r} onClick={() => { setDetail(r); setView('detail') }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ recipe, setView, onDelete, onEdit, onDuplicate, onUpdate }) {
  const [serves,        setServes]        = useState(1)
  const [unit,          setUnit]          = useState('oz')
  const [variantText,   setVariantText]   = useState(recipe.variants || '')
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantSaved,  setVariantSaved]  = useState(false)

  const getDisplay = (ing) => {
    if (ing.ingUnit === 'dashes') {
      const a = scaleAmt(ing.amt, 'dashes', serves)
      return { amt: a, unit: parseFloat(a) === 1 ? 'dash' : 'dashes' }
    }
    const converted = unit === ing.ingUnit ? ing.amt : convertAmt(ing.amt, ing.ingUnit, unit)
    return { amt: scaleAmt(converted, unit, serves), unit }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${recipe.name}"?`)) return
    await apiFetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
    onDelete(recipe.id)
    setView('browse')
  }

  const saveVariants = async () => {
    setVariantSaving(true)
    try {
      const updated = await apiFetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        body: { ...recipe, variants: variantText },
      })
      onUpdate(updated)
      setVariantSaved(true)
      setTimeout(() => setVariantSaved(false), 2000)
    } finally {
      setVariantSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setView('browse')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button onClick={() => onDuplicate(recipe)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
            Duplicate
          </button>
          <button onClick={() => onEdit(recipe)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
            Edit
          </button>
          <button onClick={handleDelete}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4 }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ margin: '16px 20px', borderRadius: '14px', background: C.parchmentMid, height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {recipe.hasImage
          ? <img src={`/api/recipes/${recipe.id}/image`} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: '90px', opacity: 0.1 }}>🍸</span>
        }
        <div style={{ position: 'absolute', bottom: '14px', left: '14px', display: 'flex', gap: '8px' }}>
          <span style={{ background: methodColor[recipe.method] || C.sage, color: C.parchment, padding: '5px 12px', borderRadius: '20px', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>{recipe.method}</span>
          {recipe.glass && <span style={{ background: 'rgba(44,31,20,0.5)', color: C.parchment, padding: '5px 12px', borderRadius: '20px', fontSize: '9px', fontFamily: "'Josefin Sans', sans-serif" }}>{recipe.glass}</span>}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '34px', color: C.espresso, lineHeight: 1.05 }}>{recipe.name}</div>
          <div style={{ fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: '14px', color: C.herb, marginTop: '5px' }}>
            {recipe.ingredients.filter(i => i.ingUnit !== 'dashes').map(i => i.name).join(' · ')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <div style={lbl}>Serves</div>
            <div style={{ display: 'flex', alignItems: 'center', background: C.parchmentLight, border: `0.5px solid rgba(84,58,39,0.22)`, borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setServes(s => Math.max(1, s - 1))} style={{ width: '48px', height: '44px', background: 'transparent', border: 'none', fontSize: '22px', color: serves > 1 ? C.mahogany : C.parchmentMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: C.espresso }}>{serves}</span>
              <button onClick={() => setServes(s => s + 1)} style={{ width: '48px', height: '44px', background: 'transparent', border: 'none', fontSize: '22px', color: C.mahogany, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          <div>
            <div style={lbl}>Unit</div>
            <div style={{ display: 'flex', background: C.parchmentLight, border: `0.5px solid rgba(84,58,39,0.22)`, borderRadius: '8px', overflow: 'hidden' }}>
              {['oz', 'ml'].map(u => (
                <button key={u} onClick={() => setUnit(u)} style={{ padding: '11px 18px', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, background: unit === u ? C.mahogany : 'transparent', color: unit === u ? C.parchment : C.herb, transition: 'background 0.14s' }}>{u}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={lbl}>Ingredients</div>
          <div style={{ background: C.parchmentLight, borderRadius: '10px', border: `0.5px solid rgba(84,58,39,0.15)`, overflow: 'hidden' }}>
            {recipe.ingredients.map((ing, i) => {
              const d = getDisplay(ing)
              return (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: i < recipe.ingredients.length - 1 ? `0.5px solid rgba(84,58,39,0.1)` : 'none' }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '17px', color: C.mahogany, minWidth: '54px' }}>{d.amt}</span>
                  <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '9px', color: C.herb, letterSpacing: '0.08em', minWidth: '40px' }}>{d.unit}</span>
                  <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '13px', color: C.espresso, letterSpacing: '0.03em' }}>{ing.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {recipe.garnishes.length > 0 && (
          <div>
            <div style={lbl}>Garnish</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recipe.garnishes.map(g => (
                <span key={g} style={{ background: C.mahogany, color: C.parchment, padding: '6px 14px', borderRadius: '20px', fontSize: '11px', letterSpacing: '0.06em', fontFamily: "'Josefin Sans', sans-serif" }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        {recipe.notes && (
          <div>
            <div style={lbl}>Technique</div>
            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: '15px', color: C.mahogany, lineHeight: '1.75', fontStyle: 'italic', padding: '16px', background: C.parchmentLight, borderRadius: '10px', border: `0.5px solid rgba(84,58,39,0.15)` }}>
              {recipe.notes}
            </div>
          </div>
        )}

        {/* Variants */}
        <div>
          <div style={lbl}>Variations & tweaks</div>
          <textarea
            value={variantText}
            onChange={e => { setVariantText(e.target.value); setVariantSaved(false) }}
            placeholder="e.g. Try with mezcal instead of gin · Add a pinch of salt · Use honey syrup for a richer finish…"
            rows={4}
            style={inpStyle({ width: '100%', padding: '12px 14px', fontSize: '13px', resize: 'vertical', lineHeight: '1.7', fontFamily: "'EB Garamond', serif", boxSizing: 'border-box' })}
          />
          <button
            onClick={saveVariants}
            disabled={variantSaving || variantText === (recipe.variants || '')}
            style={{ marginTop: '8px', background: variantSaved ? C.sage : C.parchmentMid, border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: variantSaved ? C.parchment : C.mahogany, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', opacity: (variantSaving || variantText === (recipe.variants || '')) ? 0.4 : 1 }}>
            {variantSaved ? '✓ Saved' : 'Save variations'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add View ─────────────────────────────────────────────────────────────────

function AddView({ onSave, initialRecipe }) {
  const editing = !!initialRecipe
  const [name,         setName]         = useState(initialRecipe?.name        || '')
  const [method,       setMethod]       = useState(initialRecipe?.method      || 'stirred')
  const [glass,        setGlass]        = useState(initialRecipe?.glass       || '')
  const [serves,       setServes]       = useState(initialRecipe?.baseServes  || 1)
  const [globalUnit,   setGlobalUnit]   = useState('oz')
  const [garnishes,    setGarnishes]    = useState(initialRecipe?.garnishes   || [])
  const [garnishInput, setGarnishInput] = useState('')
  const [notes,        setNotes]        = useState(initialRecipe?.notes       || '')
  const [ingredients,  setIngredients]  = useState(initialRecipe?.ingredients || [
    { id: 1, name: 'Spirit',   amt: '2',    ingUnit: 'oz'     },
    { id: 2, name: 'Modifier', amt: '1',    ingUnit: 'oz'     },
    { id: 3, name: 'Citrus',   amt: '0.75', ingUnit: 'oz'     },
    { id: 4, name: 'Bitters',  amt: '2',    ingUnit: 'dashes' },
  ])
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')
  const [imageSrc,  setImageSrc]  = useState(null)
  const [croppedImg, setCroppedImg] = useState(null)
  const fileRef = useRef()

  const switchGlobalUnit = (u) => {
    if (u === globalUnit) return
    setIngredients(p => p.map(i => ({
      ...i,
      amt:     i.ingUnit === 'dashes' ? i.amt : convertAmt(i.amt, i.ingUnit, u),
      ingUnit: i.ingUnit === 'dashes' ? 'dashes' : u,
    })))
    setGlobalUnit(u)
  }

  const updateAmt  = (id, v) => setIngredients(p => p.map(i => i.id === id ? { ...i, amt: v } : i))
  const updateName = (id, v) => setIngredients(p => p.map(i => i.id === id ? { ...i, name: v } : i))
  const setIngUnit = (id, u) => setIngredients(p => p.map(i => i.id === id ? { ...i, amt: convertAmt(i.amt, i.ingUnit, u), ingUnit: u } : i))
  const removeIng  = (id)    => setIngredients(p => p.filter(i => i.id !== id))
  const addIng     = ()      => setIngredients(p => [...p, { id: uid(), name: '', amt: globalUnit === 'ml' ? '30' : '1', ingUnit: globalUnit }])

  const addGarnish    = (g) => { const t = g.trim(); if (!t || garnishes.includes(t)) return; setGarnishes(p => [...p, t]); setGarnishInput('') }
  const removeGarnish = (g) => setGarnishes(p => p.filter(x => x !== g))

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const url    = editing ? `/api/recipes/${initialRecipe.id}` : '/api/recipes'
      const recipe = await apiFetch(url, {
        method: editing ? 'PUT' : 'POST',
        body: { name: name.trim(), method, glass, baseServes: serves, notes, garnishes, ingredients, image: croppedImg || undefined },
      })
      onSave(recipe)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const stepFor = (u) => u === 'dashes' ? '1' : u === 'ml' ? '5' : '0.25'
  const availableChips = GARNISH_CHIPS.filter(g => !garnishes.includes(g))

  return (
    <>
    {imageSrc && (
      <CropModal
        src={imageSrc}
        onDone={(dataUrl) => { setCroppedImg(dataUrl); setImageSrc(null) }}
        onCancel={() => setImageSrc(null)}
      />
    )}

    <div style={{ padding: '24px 20px 60px', maxWidth: '540px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Photo */}
      <div>
        <label style={lbl}>Photo</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
        {croppedImg ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => fileRef.current.click()}>
            <img src={croppedImg} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,31,20,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}>
              <span style={{ color: C.parchment, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Change photo</span>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()}
            style={{ width: '100%', aspectRatio: '1', background: C.parchmentMid, border: `0.5px dashed rgba(84,58,39,0.35)`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: C.herb, fontFamily: "'Josefin Sans', sans-serif", fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '36px', opacity: 0.25 }}>🍸</span>
            + Add photo
          </button>
        )}
      </div>

      <div>
        <label style={lbl}>Cocktail name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rosemary Gimlet"
          style={inpStyle({ width: '100%', padding: '13px 16px', fontSize: '20px', fontFamily: "'DM Serif Display', serif", boxSizing: 'border-box' })} />
      </div>

      <div>
        <label style={lbl}>Method</label>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {METHODS.map(m => <button key={m} onClick={() => setMethod(m)} style={pillStyle(method === m)}>{m}</button>)}
        </div>
      </div>

      <div>
        <label style={lbl}>Glass</label>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {GLASSES.map(g => <button key={g} onClick={() => setGlass(p => p === g ? '' : g)} style={pillStyle(glass === g, true)}>{g}</button>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'end' }}>
        <div>
          <label style={lbl}>Makes how many</label>
          <div style={{ display: 'flex', alignItems: 'center', background: C.parchmentLight, border: `0.5px solid rgba(84,58,39,0.22)`, borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setServes(s => Math.max(1, s - 1))} style={{ width: '52px', height: '48px', background: 'transparent', border: 'none', fontSize: '24px', color: serves > 1 ? C.mahogany : C.parchmentMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ flex: 1, textAlign: 'center', fontFamily: "'DM Serif Display', serif", fontSize: '24px', color: C.espresso }}>{serves}</span>
            <button onClick={() => setServes(s => s + 1)} style={{ width: '52px', height: '48px', background: 'transparent', border: 'none', fontSize: '24px', color: C.mahogany, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>
        <div>
          <label style={lbl}>Default unit</label>
          <div style={{ display: 'flex', background: C.parchmentLight, border: `0.5px solid rgba(84,58,39,0.22)`, borderRadius: '8px', overflow: 'hidden' }}>
            {['oz', 'ml'].map(u => (
              <button key={u} onClick={() => switchGlobalUnit(u)} style={{ padding: '13px 20px', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, background: globalUnit === u ? C.mahogany : 'transparent', color: globalUnit === u ? C.parchment : C.herb, transition: 'background 0.14s' }}>{u}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <label style={{ ...lbl, marginBottom: 0 }}>Ingredients</label>
          {serves > 1 && <span style={{ fontSize: '9px', color: C.sage, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif" }}>per 1 · for {serves}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ingredients.map(ing => {
            const isDash = ing.ingUnit === 'dashes'
            const scaledAmt = scaleAmt(ing.amt, ing.ingUnit, serves)
            return (
              <div key={ing.id} style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'stretch', background: C.parchmentLight, border: `0.5px solid rgba(84,58,39,0.22)`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <input type="number" min="0" step={stepFor(ing.ingUnit)} value={ing.amt} onChange={e => updateAmt(ing.id, e.target.value)}
                    style={{ width: '50px', padding: '11px 4px 11px 10px', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.espresso, fontFamily: "'Josefin Sans', sans-serif" }} />
                  <div style={{ display: 'flex', borderLeft: `0.5px solid rgba(84,58,39,0.14)` }}>
                    {[['oz', 'oz'], ['ml', 'ml'], ['dashes', 'dsh']].map(([u, label]) => (
                      <button key={u} onClick={() => setIngUnit(ing.id, u)} style={{ padding: '0 7px', border: 'none', cursor: 'pointer', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, borderRight: u !== 'dashes' ? `0.5px solid rgba(84,58,39,0.12)` : 'none', background: ing.ingUnit === u ? (u === 'dashes' ? C.sage : C.mahogany) : 'transparent', color: ing.ingUnit === u ? C.parchment : C.herb, transition: 'background 0.12s' }}>{label}</button>
                    ))}
                  </div>
                </div>
                {serves > 1 && (
                  <div style={{ flexShrink: 0, minWidth: '60px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ color: C.parchmentMid, fontSize: '11px' }}>→</span>
                    <span style={{ fontSize: '12px', color: C.sage, fontFamily: "'Josefin Sans', sans-serif" }}>
                      {scaledAmt} <span style={{ fontSize: '8px', opacity: 0.8 }}>{isDash ? (parseFloat(scaledAmt) === 1 ? 'dash' : 'dashes') : ing.ingUnit}</span>
                    </span>
                  </div>
                )}
                <input value={ing.name} onChange={e => updateName(ing.id, e.target.value)} placeholder={isDash ? 'e.g. Angostura' : 'ingredient'}
                  style={inpStyle({ flex: 1, padding: '11px 12px', fontSize: '13px', letterSpacing: '0.03em', minWidth: 0 })} />
                <button onClick={() => removeIng(ing.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'transparent', color: C.herb, fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.45, cursor: 'pointer', flexShrink: 0 }}>×</button>
              </div>
            )
          })}
        </div>
        <button onClick={addIng} style={{ marginTop: '10px', background: 'transparent', border: `0.5px dashed rgba(84,58,39,0.28)`, borderRadius: '8px', padding: '11px 16px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.herb, width: '100%', fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer' }}>
          + add ingredient
        </button>
      </div>

      <div>
        <label style={lbl}>Garnish</label>
        {garnishes.length > 0 && (
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {garnishes.map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: C.mahogany, color: C.parchment, padding: '6px 12px', borderRadius: '20px', fontSize: '10px', fontFamily: "'Josefin Sans', sans-serif" }}>
                {g}<span onClick={() => removeGarnish(g)} style={{ cursor: 'pointer', opacity: 0.55, fontSize: '14px', lineHeight: 1 }}>×</span>
              </div>
            ))}
          </div>
        )}
        {availableChips.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {availableChips.map(g => <button key={g} onClick={() => addGarnish(g)} style={{ padding: '5px 11px', borderRadius: '20px', border: `0.5px dashed rgba(84,58,39,0.28)`, fontSize: '10px', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, background: 'transparent', color: C.herb, cursor: 'pointer' }}>+ {g}</button>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={garnishInput} onChange={e => setGarnishInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGarnish(garnishInput)} placeholder="Custom garnish…"
            style={inpStyle({ flex: 1, padding: '11px 14px', fontSize: '13px' })} />
          <button onClick={() => addGarnish(garnishInput)} style={{ background: C.parchmentMid, border: 'none', borderRadius: '8px', padding: '11px 16px', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.mahogany, fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, cursor: 'pointer' }}>Add</button>
        </div>
      </div>

      <div>
        <label style={lbl}>Notes & technique</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Stir over large ice for 30 seconds…" rows={3}
          style={inpStyle({ width: '100%', padding: '12px 14px', fontSize: '13px', resize: 'vertical', lineHeight: '1.7', fontFamily: "'EB Garamond', serif", boxSizing: 'border-box' })} />
      </div>

      {error && <div style={{ color: C.mahogany, fontFamily: "'Josefin Sans', sans-serif", fontSize: '12px' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving}
        style={{ background: saved ? C.sage : C.espresso, color: C.parchment, border: 'none', borderRadius: '8px', padding: '15px 24px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, width: '100%', cursor: 'pointer', transition: 'background 0.25s', opacity: saving ? 0.6 : 1 }}>
        {saved ? '✓  Saved' : saving ? 'Saving…' : editing ? 'Save changes' : 'Save recipe'}
      </button>
    </div>
    </>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user,    setUser]    = useState(null)
  const [checked, setChecked] = useState(false)
  const [view,    setView]    = useState('browse')
  const [detail,  setDetail]  = useState(null)
  const [editRecipe, setEditRecipe] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [query,   setQuery]   = useState('')

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiFetch('/api/recipes')
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const handleAuth   = (u) => setUser(u)
  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setUser(null); setRecipes([]); setView('browse')
  }

  const handleSave = (recipe) => {
    if (editRecipe) {
      setRecipes(p => p.map(r => r.id === recipe.id ? recipe : r))
      setDetail(recipe)
      setView('detail')
    } else {
      setRecipes(p => [recipe, ...p])
      setView('browse')
    }
    setEditRecipe(null)
  }

  const handleDelete    = (id)     => setRecipes(p => p.filter(r => r.id !== id))
  const handleUpdate    = (recipe) => { setRecipes(p => p.map(r => r.id === recipe.id ? recipe : r)); setDetail(recipe) }

  const handleEdit = (recipe) => {
    setEditRecipe(recipe)
    setView('add')
  }

  const handleDuplicate = async (recipe) => {
    const copy = await apiFetch('/api/recipes', {
      method: 'POST',
      body: {
        ...recipe,
        name: `Copy of ${recipe.name}`,
        image: undefined,
      },
    })
    setEditRecipe(copy)
    setRecipes(p => [copy, ...p])
    setView('add')
  }

  const filtered = recipes.filter(r =>
    !query || r.name.toLowerCase().includes(query.toLowerCase())
  )

  if (!checked) return null
  if (!user) return <AuthScreen onAuth={handleAuth} />

  return (
    <div style={{ fontFamily: "'Josefin Sans', sans-serif", background: C.parchment, minHeight: '100vh' }}>
      <Nav view={view} setView={(v) => { if (v !== 'add') setEditRecipe(null); setView(v) }} query={query} setQuery={setQuery} user={user} onLogout={handleLogout} />
      {view === 'browse' && <BrowseView recipes={filtered} setView={setView} setDetail={setDetail} loading={loading} />}
      {view === 'detail' && detail && (
        <DetailView
          recipe={detail}
          setView={setView}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onUpdate={handleUpdate}
        />
      )}
      {view === 'add' && <AddView onSave={handleSave} initialRecipe={editRecipe} />}
    </div>
  )
}
