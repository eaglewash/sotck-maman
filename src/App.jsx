import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'

// ══════════════════════════════════════
// ICONS
// ══════════════════════════════════════
const I = ({ d, s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const IC = {
  stock:    "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  recipe:   "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 7h6m-6 4h4",
  shop:     "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  plus:     "M12 5v14M5 12h14",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  close:    "M18 6 6 18M6 6l12 12",
  check:    "M20 6 9 17l-5-5",
  warn:     "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  search:   "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  fire:     "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z",
  refresh:  "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15",
  leaf:     "M2 22 16 8M22 2s-5 0-10 5c-3 3-4 6-4 9M7 15s1-3 4-6",
  grid:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  euro:     "M4 9a6 6 0 1 0 12 0A6 6 0 0 0 4 9zM2 9h4M2 12h4",
  trend:    "M22 12h-4l-3 9L9 3l-3 9H2",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  chevL:    "M15 18l-6-6 6-6",
  chevR:    "M9 18l6-6-6-6",
  share:    "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
}

// ══════════════════════════════════════
// OPEN FOOD FACTS
// ══════════════════════════════════════
function parseOFFProduct(p) {
  const name = (p.product_name_fr || p.product_name || '').trim()
  const brand = (p.brands || '').split(',')[0].trim()
  const fullName = brand && name && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name} (${brand})` : name

  let unit = 'pièce(s)', quantity = ''
  const qs = (p.quantity || '').replace(/\s+/g, ' ')
  const m = qs.match(/^([\d.,]+)\s*(g|kg|ml|cl|l|pièces?)?/i)
  if (m) {
    const v = parseFloat(m[1].replace(',', '.'))
    const u = (m[2] || '').toLowerCase()
    if (u === 'kg')  { quantity = String(v * 1000); unit = 'g' }
    else if (u === 'l')  { quantity = String(v * 1000); unit = 'ml' }
    else if (u === 'cl') { quantity = String(v * 10);   unit = 'ml' }
    else if (u === 'g')  { quantity = String(v);        unit = 'g' }
    else if (u === 'ml') { quantity = String(v);        unit = 'ml' }
    else                 { quantity = String(v);        unit = 'pièce(s)' }
  }

  const cats = (p.categories_tags || []).join(' ')
  let category = 'Épicerie sèche'
  if (/dairy|lait|fromage|yaourt|crème/.test(cats))           category = 'Produits laitiers'
  else if (/beverage|boisson|drink|jus|soda|eau/.test(cats))  category = 'Boissons'
  else if (/meat|viande|fish|poisson|seafood/.test(cats))     category = 'Viandes & Poissons'
  else if (/frozen|surgel/.test(cats))                        category = 'Surgelés'
  else if (/canned|conserve/.test(cats))                      category = 'Conserves'
  else if (/vegetable|fruit|légume|produce/.test(cats))       category = 'Fruits & Légumes'
  else if (/hygiene|hygène|soap|savon|shampoo/.test(cats))    category = 'Hygiène'
  else if (/cleaning|nettoy|laundry|lessive/.test(cats))      category = 'Ménage'

  return { name: fullName, quantity, unit, category, image: p.image_small_url || p.image_url || '' }
}

async function searchOFF(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,product_name_fr,brands,quantity,image_small_url,categories_tags&lc=fr&cc=fr`
  const res = await fetch(url)
  const data = await res.json()
  return (data.products || []).filter(p => p.product_name || p.product_name_fr)
}

async function lookupOFFBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_fr,brands,quantity,image_small_url,categories_tags`
  const res = await fetch(url)
  const data = await res.json()
  return data.status === 1 ? data.product : null
}

// ── Scan Modal ──
function ScanModal({ open, onScan, onClose }) {
  const containerRef = useRef(null)
  const scannerRef   = useRef(null)

  useEffect(() => {
    if (!open) return
    let stopped = false

    const timer = setTimeout(() => {
      if (!containerRef.current || stopped) return
      const scannerId = 'barcode-scanner-div'
      containerRef.current.id = scannerId
      const scanner = new Html5Qrcode(scannerId)
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 100 } },
        (code) => {
          stopped = true
          scanner.stop().then(() => { onScan(code); onClose() }).catch(() => {})
        },
        () => {}
      ).catch(() => {})
    }, 120)

    return () => {
      stopped = true
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2 className="modal-title">📷 Scanner un code-barres</h2>
          <button className="icon-btn" onClick={onClose}><I d={IC.close} s={18} /></button>
        </div>
        <div className="modal-body">
          <div ref={containerRef} style={{ width: '100%', minHeight: 200 }} />
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--stone)', marginTop: 12 }}>
            Pointez la caméra vers le code-barres du produit
          </p>
        </div>
      </div>
    </div>
  )
}

// ── OFF Search Bar ──
function OFFSearchBar({ onSelect }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const debounceRef = useRef(null)

  const search = (q) => {
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await searchOFF(q)) } catch {}
      setLoading(false)
    }, 500)
  }

  const select = (product) => {
    onSelect(parseOFFProduct(product))
    setResults([])
    setQuery('')
  }

  return (
    <div className="off-wrap">
      <div className="off-bar">
        <I d={IC.search} s={15} />
        <input
          className="off-input"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Rechercher un produit (OFF)..."
        />
        {loading && <span className="spin" style={{ width:15, height:15, borderWidth:2, flexShrink:0 }} />}
        <button className="off-scan-btn" onClick={() => setScanOpen(true)} title="Scanner">📷</button>
      </div>

      {results.length > 0 && (
        <div className="off-results">
          {results.slice(0, 5).map((p, i) => {
            const parsed = parseOFFProduct(p)
            if (!parsed.name) return null
            return (
              <button key={i} className="off-result-row" onClick={() => select(p)}>
                {parsed.image
                  ? <img src={parsed.image} alt="" className="off-img" />
                  : <div className="off-img-ph" />}
                <div className="off-result-info">
                  <span className="off-result-name">{parsed.name}</span>
                  {p.quantity && <span className="off-result-qty">{p.quantity}</span>}
                </div>
                <I d={IC.plus} s={14} />
              </button>
            )
          })}
        </div>
      )}

      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={async (barcode) => {
          setLoading(true)
          try {
            const product = await lookupOFFBarcode(barcode)
            if (product) select(product)
          } catch {}
          setLoading(false)
        }}
      />
    </div>
  )
}

const CATEGORIES   = ['Épicerie sèche','Fruits & Légumes','Produits laitiers','Viandes & Poissons','Surgelés','Conserves','Boissons','Hygiène','Ménage','Autre']
const UNITS        = ['g','kg','ml','L','pièce(s)','boîte(s)','sachet(s)','bouteille(s)','paquet(s)','pot(s)','cuil. à soupe','cuil. à café']
const RECIPE_TYPES = ['Entrée','Plat principal','Dessert','Soupe','Apéritif','Petit-déjeuner','Snack','Autre']

// ══════════════════════════════════════
// SPARKLINE
// ══════════════════════════════════════
function Sparkline({ data }) {
  if (!data || data.length < 2) return <span className="spark-empty">—</span>
  const W = 72, H = 26
  const prices = data.map(d => d.price)
  const min = Math.min(...prices), max = Math.max(...prices)
  const range = max - min || 1
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W
    const y = H - 2 - ((p - min) / range) * (H - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last  = prices[prices.length - 1]
  const prev  = prices[prices.length - 2]
  const delta = last - prev
  const color = delta > 0 ? '#C0392B' : delta < 0 ? '#27AE60' : '#9CA3AF'
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'
  const lastPts = pts.split(' ').at(-1).split(',')
  return (
    <div className="spark-wrap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPts[0]} cy={lastPts[1]} r="2.5" fill={color} />
      </svg>
      <div className="spark-footer">
        <span className="spark-price">{last.toFixed(2)} €</span>
        <span className="spark-delta" style={{color}}>
          {arrow} {Math.abs(delta).toFixed(2)} €
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// MODAL
// ══════════════════════════════════════
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  if (!open) return null
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose}><I d={IC.close} s={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// PACK FORM (conditionnement + quantité intelligente)
// ══════════════════════════════════════
function PackForm({ form, setForm }) {
  const hasPack = form.pack_label.trim() && parseFloat(form.pack_size) > 0
  const packSize = parseFloat(form.pack_size) || 1

  const packCount = hasPack ? Math.round((parseFloat(form.quantity || 0) / packSize) * 10) / 10 : null
  const packMin   = hasPack ? Math.round((parseFloat(form.min_quantity || 0) / packSize) * 10) / 10 : null

  return (
    <>
      {/* Conditionnement */}
      <div className="pack-section">
        <div className="pack-label-row">
          <span className="section-label" style={{margin:0}}>Conditionnement</span>
          <span className="pack-hint">optionnel</span>
        </div>
        <p className="pack-explainer">
          Comment est vendu cet article ?<br/>
          <em>Ex : chocolat → 1 tablette = 200 g · œufs → 1 boîte = 12 pièces</em>
        </p>
        <div className="pack-row">
          <span className="pack-text">1</span>
          <input className="pack-input-label" value={form.pack_label}
            onChange={e => setForm(f=>({...f, pack_label: e.target.value}))}
            placeholder="tablette / boîte / sachet..." />
          <span className="pack-text">=</span>
          <input className="pack-input-size" type="number" value={form.pack_size}
            onChange={e => setForm(f=>({...f, pack_size: e.target.value}))}
            placeholder="ex: 200" min="0" step="0.1" />
          <span className="pack-text">{form.unit || 'unité(s)'}</span>
        </div>
      </div>

      {/* Quantité — s'adapte selon le conditionnement */}
      {hasPack ? (
        <>
          <label>
            Combien de {form.pack_label}s en stock ?
            <input type="number" min="0" step="0.5"
              value={packCount || ''}
              onChange={e => {
                const n = parseFloat(e.target.value) || 0
                setForm(f => ({...f, quantity: String(n * packSize)}))
              }}
              placeholder="ex: 3"
            />
            <span className="pack-qty-sub">= {parseFloat(form.quantity) || 0} {form.unit} au total</span>
          </label>
          <label>
            Alerter quand il reste moins de… ({form.pack_label}s)
            <input type="number" min="0" step="0.5"
              value={packMin || ''}
              onChange={e => {
                const n = parseFloat(e.target.value) || 0
                setForm(f => ({...f, min_quantity: String(n * packSize)}))
              }}
              placeholder="ex: 1"
            />
            <span className="pack-qty-sub">= {parseFloat(form.min_quantity) || 0} {form.unit}</span>
          </label>
        </>
      ) : (
        <div className="row2">
          <label>Quantité en stock<input type="number" value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))} placeholder="0" min="0" step="0.1" /></label>
          <label>Quantité min. (alerte)<input type="number" value={form.min_quantity} onChange={e => setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="1" min="0" step="0.1" /></label>
        </div>
      )}

      <label>Prix actuel (€)
        <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="0.00" min="0" step="0.01" />
      </label>
    </>
  )
}

// Helper dates de péremption
function expiryBadge(expiryDate) {
  if (!expiryDate) return null
  const t = new Date()
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  const [ey, em, ed] = expiryDate.slice(0,10).split('-').map(Number)
  const exp = new Date(ey, em - 1, ed)
  const diff = Math.round((exp - today) / 86400000)
  if (diff < 0)  return { label: 'Expiré ⚠️', cls: 'expired' }
  if (diff === 0) return { label: "Expire auj.", cls: 'expires-today' }
  if (diff === 1) return { label: 'Expire demain', cls: 'expires-soon' }
  if (diff <= 7)  return { label: `Expire dans ${diff} j`, cls: 'expires-warn' }
  return null
}

// Helper pour afficher la quantité d'un item en paquets si disponible
function itemDisplayQty(item) {
  if (item.pack_size && item.pack_label && item.pack_size > 0) {
    const packs = item.quantity / item.pack_size
    const rounded = Math.round(packs * 10) / 10
    return { num: rounded, unit: item.pack_label + (rounded !== 1 ? 's' : ''), sub: `${item.quantity} ${item.unit}` }
  }
  return { num: item.quantity, unit: item.unit, sub: null }
}

// ══════════════════════════════════════
// STOCK TAB
// ══════════════════════════════════════
function StockTab() {
  const [items, setItems] = useState([])
  const [priceHistory, setPriceHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tout')
  const [view, setView] = useState('grid')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', quantity:'', unit:'g', category:'Épicerie sèche', min_quantity:'1', price:'', pack_label:'', pack_size:'', expiry_date:'' })
  const [customCats, setCustomCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customCats') || '[]') } catch { return [] }
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: it }, { data: ph }] = await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('price_history').select('*').order('recorded_at', { ascending: true }),
    ])
    setItems(it || [])
    // Group price history by item_id
    const grouped = {}
    for (const row of (ph || [])) {
      if (!grouped[row.item_id]) grouped[row.item_id] = []
      grouped[row.item_id].push(row)
    }
    setPriceHistory(grouped)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name:'', quantity:'', unit:'g', category:'Épicerie sèche', min_quantity:'1', price:'', pack_label:'', pack_size:'', expiry_date:'' })
    setModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit, category: item.category, min_quantity: String(item.min_quantity), price: item.price != null ? String(item.price) : '', pack_label: item.pack_label || '', pack_size: item.pack_size ? String(item.pack_size) : '', expiry_date: item.expiry_date ? item.expiry_date.slice(0,10) : '' })
    setModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    const price = form.price !== '' ? parseFloat(form.price) : null
    const pack_size = form.pack_size !== '' ? parseFloat(form.pack_size) : null
    const pack_label = form.pack_label.trim() || null
    const payload = { name: form.name.trim(), quantity: parseFloat(form.quantity)||0, unit: form.unit, category: form.category, min_quantity: parseFloat(form.min_quantity)||0, price, pack_size, pack_label, expiry_date: form.expiry_date || null }
    let itemId
    if (editing) {
      await supabase.from('items').update(payload).eq('id', editing.id)
      itemId = editing.id
    } else {
      const { data } = await supabase.from('items').insert([payload]).select().single()
      itemId = data?.id
    }
    // Record price history if price changed
    if (price != null && itemId) {
      const prevPrice = editing?.price
      if (prevPrice !== price) {
        await supabase.from('price_history').insert([{ item_id: itemId, price }])
      }
    }
    setModal(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('items').delete().eq('id', id)
    load()
  }

  const status = (i) => i.quantity <= 0 ? 'empty' : i.quantity <= i.min_quantity ? 'low' : 'ok'
  const filtered = items.filter(i =>
    (cat === 'Tout' || i.category === cat) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  const addCategory = () => {
    const name = prompt('Nom de la nouvelle catégorie :')
    if (!name || !name.trim()) return
    const trimmed = name.trim()
    if (allCats.includes(trimmed)) return
    const updated = [...customCats, trimmed]
    setCustomCats(updated)
    localStorage.setItem('customCats', JSON.stringify(updated))
  }

  // Toutes les catégories (prédéfinies + custom + utilisées), triées alphabétiquement
  const allCats = [...new Set([...CATEGORIES, ...customCats, ...items.map(i => i.category)])].sort((a, b) => a.localeCompare(b, 'fr'))
  const cats = ['Tout', ...allCats]

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <div className="searchbox">
          <I d={IC.search} s={15} />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${view==='grid'?'on':''}`} onClick={() => setView('grid')} title="Vue grille">
            <I d={IC.grid} s={15} />
          </button>
          <button className={`view-btn ${view==='list'?'on':''}`} onClick={() => setView('list')} title="Vue liste">
            <I d={IC.list} s={15} />
          </button>
        </div>
        <button className="btn-cat" onClick={addCategory}><I d={IC.plus} s={14} /> Catégorie</button>
        <button className="btn-prim" onClick={openAdd}><I d={IC.plus} s={16} /> Ajouter</button>
      </div>

      <div className="chips">
        {cats.map(c => (
          <button key={c} className={`chip ${cat===c?'on':''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : filtered.length === 0 ? (
        <div className="empty"><I d={IC.leaf} s={36} /><p>Aucun article</p></div>
      ) : view === 'grid' ? (
        <div className="grid">
          {filtered.map(item => {
            const s = status(item)
            const ph = priceHistory[item.id] || []
            const dq = itemDisplayQty(item)
            const eb = expiryBadge(item.expiry_date)
            return (
              <div key={item.id} className={`card s-${s}`}>
                <div className="card-top">
                  <span className="card-cat">{item.category}</span>
                  <div className="card-acts">
                    <button className="icon-btn sm" onClick={() => openEdit(item)}><I d={IC.edit} s={14} /></button>
                    <button className="icon-btn sm danger" onClick={() => del(item.id)}><I d={IC.trash} s={14} /></button>
                  </div>
                </div>
                <div className="card-name">{item.name}</div>
                <div className="card-qty">
                  <span className="qty-num">{dq.num}</span>
                  <span className="qty-unit">{dq.unit}</span>
                </div>
                {dq.sub && <span className="card-qty-sub">{dq.sub}</span>}
                {ph.length >= 2 && <Sparkline data={ph} />}
                {item.price != null && ph.length < 2 && <span className="card-price">{item.price.toFixed(2)} €</span>}
                {eb && <span className={`badge ${eb.cls}`}>{eb.label}</span>}
                {s !== 'ok' && <span className={`badge ${s}`}>{s==='empty'?'Épuisé':'Stock bas'}</span>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="list-view">
          {filtered.map(item => {
            const s = status(item)
            const ph = priceHistory[item.id] || []
            const dq = itemDisplayQty(item)
            const eb = expiryBadge(item.expiry_date)
            return (
              <div key={item.id} className={`list-item s-${s}`}>
                <div className="list-left">
                  <div className="list-name">{item.name}</div>
                  <div className="list-meta">
                    <span className="list-cat">{item.category}</span>
                    {eb && <span className={`badge ${eb.cls}`}>{eb.label}</span>}
                    {s !== 'ok' && <span className={`badge ${s}`}>{s==='empty'?'Épuisé':'Stock bas'}</span>}
                  </div>
                </div>
                <div className="list-mid">
                  <span className="list-qty">{dq.num}<span className="list-unit"> {dq.unit}</span></span>
                  {dq.sub && <span className="list-qty-sub">{dq.sub}</span>}
                </div>
                <div className="list-spark">
                  {ph.length >= 2 ? <Sparkline data={ph} /> : item.price != null ? <span className="card-price">{item.price.toFixed(2)} €</span> : <span className="spark-empty">—</span>}
                </div>
                <div className="list-acts">
                  <button className="icon-btn sm" onClick={() => openEdit(item)}><I d={IC.edit} s={14} /></button>
                  <button className="icon-btn sm danger" onClick={() => del(item.id)}><I d={IC.trash} s={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier' : 'Nouvel article'}>
        <div className="form">
          {!editing && (
            <OFFSearchBar onSelect={p => setForm(f => ({
              ...f,
              name: p.name || f.name,
              quantity: p.quantity || f.quantity,
              unit: p.unit || f.unit,
              category: p.category || f.category,
            }))} />
          )}
          <label>Nom<input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Farine de blé" /></label>
          <label>Catégorie
            <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
              {allCats.map(c=><option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Unité de base (utilisée dans les recettes)
            <select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
          </label>
          <PackForm form={form} setForm={setForm} />
          <label>Date de péremption (optionnel)
            <input type="date" value={form.expiry_date} onChange={e => setForm(f=>({...f,expiry_date:e.target.value}))} />
          </label>
          <div className="form-actions">
            <button className="btn-sec" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn-prim" onClick={save}>{editing?'Modifier':'Ajouter'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════
// RECIPES TAB
// ══════════════════════════════════════
function RecipesTab() {
  const [recipes, setRecipes] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [cookModal, setCookModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [cooking, setCooking] = useState(null)
  const [preview, setPreview] = useState([])
  const [form, setForm] = useState({ name:'', description:'', type:'Plat principal' })
  const [ings, setIngs] = useState([{ item_id:'', quantity:'', unit:'g' }])
  const [cooked, setCooked] = useState(false)
  const [cookedSummary, setCookedSummary] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tout')
  const [customTypes, setCustomTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customRecipeTypes') || '[]') } catch { return [] }
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: it }] = await Promise.all([
      supabase.from('recipes').select('*, recipe_ingredients(*, items(*))').order('name'),
      supabase.from('items').select('*').order('name'),
    ])
    setRecipes(r || [])
    setItems(it || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name:'', description:'', type:'Plat principal' })
    setIngs([{ item_id:'', quantity:'', unit:'g' }])
    setModal(true)
  }

  const openCook = (recipe) => {
    setCooking(recipe)
    setCooked(false)
    const p = recipe.recipe_ingredients.map(ri => {
      const stock = items.find(i => i.id === ri.item_id)
      return { name: ri.items?.name || '?', needed: ri.quantity, unit: ri.unit, have: stock?.quantity || 0, ok: (stock?.quantity||0) >= ri.quantity }
    })
    setPreview(p)
    setCookModal(true)
  }

  const doCook = async () => {
    const summary = []
    for (const ri of cooking.recipe_ingredients) {
      const it = items.find(i => i.id === ri.item_id)
      if (it) {
        const before = it.quantity
        const after = Math.max(0, it.quantity - ri.quantity)
        await supabase.from('items').update({ quantity: after }).eq('id', it.id)
        summary.push({ name: it.name, unit: it.unit, before, after, used: ri.quantity })
      }
    }
    await supabase.from('usage_history').insert([{ recipe_id: cooking.id, recipe_name: cooking.name }])
    setCookedSummary(summary)
    setCooked(true)
    load()
  }

  const saveRecipe = async () => {
    if (!form.name.trim()) return
    const validIngs = ings.filter(i => i.item_id && i.quantity)
    let rid
    if (editing) {
      await supabase.from('recipes').update({ name: form.name, description: form.description, type: form.type }).eq('id', editing.id)
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', editing.id)
      rid = editing.id
    } else {
      const { data } = await supabase.from('recipes').insert([{ name: form.name, description: form.description, type: form.type }]).select().single()
      rid = data.id
    }
    if (validIngs.length > 0) {
      await supabase.from('recipe_ingredients').insert(validIngs.map(i => ({ recipe_id: rid, item_id: i.item_id, quantity: parseFloat(i.quantity), unit: i.unit })))
    }
    setModal(false)
    load()
  }

  const delRecipe = async (id) => {
    if (!confirm('Supprimer cette recette ?')) return
    await supabase.from('recipes').delete().eq('id', id)
    load()
  }

  const addIng = () => setIngs(p => [...p, { item_id:'', quantity:'', unit:'g' }])
  const rmIng = (i) => setIngs(p => p.filter((_,j) => j!==i))
  const setIng = (i, field, val) => setIngs(p => p.map((x, j) => {
    if (j!==i) return x
    const u = {...x, [field]: val}
    if (field==='item_id') { const it = items.find(t => t.id===val); if(it) u.unit=it.unit }
    return u
  }))

  const cookable = (r) => r.recipe_ingredients.every(ri => {
    const it = items.find(i => i.id===ri.item_id)
    return it && it.quantity >= ri.quantity
  })

  const addRecipeType = () => {
    const name = prompt('Nom du nouveau type de recette :')
    if (!name || !name.trim()) return
    const trimmed = name.trim()
    if (allTypes.includes(trimmed)) return
    const updated = [...customTypes, trimmed]
    setCustomTypes(updated)
    localStorage.setItem('customRecipeTypes', JSON.stringify(updated))
  }

  const allTypes = [...new Set([...RECIPE_TYPES, ...customTypes])].sort((a, b) => a.localeCompare(b, 'fr'))
  const typeCounts = recipes.reduce((acc, r) => { acc[r.type || 'Plat principal'] = (acc[r.type || 'Plat principal'] || 0) + 1; return acc }, {})

  const filtered = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'Tout' || (r.type || 'Plat principal') === typeFilter
    return matchSearch && matchType
  })

  const typeOptions = ['Tout', ...allTypes]

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <div className="searchbox">
          <I d={IC.search} s={15} />
          <input placeholder="Rechercher une recette..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-cat" onClick={addRecipeType}><I d={IC.plus} s={14} /> Type</button>
        <button className="btn-prim" onClick={openAdd}><I d={IC.plus} s={16} /> Nouvelle</button>
      </div>

      <div className="chips">
        {typeOptions.map(t => (
          <button key={t} className={`chip ${typeFilter===t?'on':''}`} onClick={() => setTypeFilter(t)}>
            {t}{t !== 'Tout' && typeCounts[t] ? ` · ${typeCounts[t]}` : ''}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : filtered.length === 0 ? (
        <div className="empty">
          <I d={IC.recipe} s={36} />
          <p>{recipes.length === 0 ? 'Aucune recette' : 'Aucun résultat'}</p>
          {recipes.length === 0 && <button className="btn-prim" onClick={openAdd}>Créer ma première recette</button>}
        </div>
      ) : (
        <div className="recipe-list">
          {filtered.map(r => (
            <div key={r.id} className="recipe-card">
              <div className="recipe-info">
                <div className="recipe-head">
                  <div className="recipe-name">{r.name}</div>
                  <span className="recipe-type-badge">{r.type || 'Plat principal'}</span>
                </div>
                {r.description && <div className="recipe-desc">{r.description}</div>}
                <div className="ing-tags">
                  {r.recipe_ingredients.map(ri => (
                    <span key={ri.id} className="ing-tag">{ri.items?.name} · {ri.quantity}{ri.unit}</span>
                  ))}
                  {r.recipe_ingredients.length === 0 && <span className="ing-tag muted">Aucun ingrédient</span>}
                </div>
              </div>
              <div className="recipe-acts">
                <button className={`cook-btn ${cookable(r)?'yes':'no'}`} onClick={() => openCook(r)}>
                  <I d={IC.fire} s={14} /> Cuisiner
                </button>
                <button className="icon-btn sm" onClick={() => {
                  setEditing(r)
                  setForm({ name:r.name, description:r.description||'', type: r.type || 'Plat principal' })
                  setIngs(r.recipe_ingredients.map(ri => ({ item_id:ri.item_id, quantity:String(ri.quantity), unit:ri.unit })))
                  setModal(true)
                }}><I d={IC.edit} s={14} /></button>
                <button className="icon-btn sm danger" onClick={() => delRecipe(r.id)}><I d={IC.trash} s={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing?'Modifier la recette':'Nouvelle recette'}>
        <div className="form">
          <label>Nom de la recette<input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Bœuf bourguignon" /></label>
          <label>Type de recette
            <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
              {allTypes.map(t=><option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Description (optionnel)<textarea rows={2} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Notes, temps de cuisson..." /></label>
          <div className="section-label">Ingrédients</div>
          {ings.map((ing, idx) => (
            <div key={idx} className="ing-row">
              <select value={ing.item_id} onChange={e => setIng(idx,'item_id',e.target.value)} className="ing-sel">
                <option value="">Choisir...</option>
                {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
              <input type="number" value={ing.quantity} onChange={e => setIng(idx,'quantity',e.target.value)} placeholder="Qté" className="ing-qty" min="0" step="0.1" />
              <select value={ing.unit} onChange={e => setIng(idx,'unit',e.target.value)} className="ing-unit">
                {UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
              <button className="icon-btn sm danger" onClick={() => rmIng(idx)}><I d={IC.close} s={13} /></button>
            </div>
          ))}
          <button className="btn-sec sm" onClick={addIng}><I d={IC.plus} s={14} /> Ajouter un ingrédient</button>
          <div className="form-actions">
            <button className="btn-sec" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn-prim" onClick={saveRecipe}>{editing?'Modifier':'Créer'}</button>
          </div>
        </div>
      </Modal>

      {/* Cook Modal */}
      <Modal open={cookModal} onClose={() => { setCookModal(false); if(cooked) load() }} title={`🍳 ${cooking?.name}`}>
        {cooked ? (
          <div className="cook-done">
            <div className="cook-done-icon"><I d={IC.check} s={32} /></div>
            <p className="cook-done-text">Stock mis à jour !</p>
            <div className="cook-summary">
              {cookedSummary.map((s, i) => (
                <div key={i} className="cook-summary-row">
                  <span className="cook-summary-name">{s.name}</span>
                  <span className="cook-summary-change">
                    <span className="cook-before">{s.before}{s.unit}</span>
                    <span className="cook-arrow">→</span>
                    <span className={`cook-after ${s.after <= 0 ? 'zero' : ''}`}>{s.after}{s.unit}</span>
                    <span className="cook-used">(-{s.used}{s.unit})</span>
                  </span>
                </div>
              ))}
            </div>
            <button className="btn-prim" onClick={() => setCookModal(false)}>Fermer</button>
          </div>
        ) : (
          <div className="form">
            <p className="cook-sub">Ingrédients déduits du stock :</p>
            {preview.map((p, i) => (
              <div key={i} className={`cook-item ${p.ok?'ok':'bad'}`}>
                <div className="cook-item-left"><I d={p.ok?IC.check:IC.warn} s={15} /><span>{p.name}</span></div>
                <div className="cook-item-right">
                  <span>Besoin : <b>{p.needed}{p.unit}</b></span>
                  <span>Stock : <b>{p.have}{p.unit}</b></span>
                </div>
              </div>
            ))}
            {preview.some(p => !p.ok) && <div className="cook-warn">⚠️ Stock insuffisant pour certains ingrédients.</div>}
            <div className="form-actions">
              <button className="btn-sec" onClick={() => setCookModal(false)}>Annuler</button>
              <button className="btn-prim" onClick={doCook}><I d={IC.fire} s={15} /> Confirmer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════
// SHOPPING TAB
// ══════════════════════════════════════
function ShoppingTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState({})
  const [restockItem, setRestockItem] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockManualId, setRestockManualId] = useState(null)
  const [newStockModal, setNewStockModal] = useState(false)
  const [newStockManualId, setNewStockManualId] = useState(null)
  const [newStockForm, setNewStockForm] = useState({ name:'', quantity:'', unit:'pièce(s)', category:'Épicerie sèche', min_quantity:'1', pack_label:'', pack_size:'' })
  const [addModal, setAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addNote, setAddNote] = useState('')
  const [manualItems, setManualItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('manualShopItems') || '[]') } catch { return [] }
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('items').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const urgent = items.filter(i => i.quantity <= 0)
  const low    = items.filter(i => i.quantity > 0 && i.quantity <= i.min_quantity)
  const needShopping = items.filter(i => i.quantity <= i.min_quantity)

  const suggestPacks = (item) => {
    if (!item.pack_size || item.pack_size <= 0) return null
    const needed = Math.max(item.min_quantity * 2 - item.quantity, item.min_quantity)
    return Math.ceil(needed / item.pack_size)
  }

  const openRestock = (item, manualId = null) => {
    setRestockItem(item)
    setRestockManualId(manualId)
    const hasPack = item.pack_size && item.pack_size > 0 && item.pack_label
    if (hasPack) {
      setRestockQty(String(suggestPacks(item) || 1))
    } else {
      const needed = Math.max(item.min_quantity * 2 - item.quantity, item.min_quantity)
      setRestockQty(String(Math.max(needed, 1)))
    }
  }

  const confirmRestock = async () => {
    if (!restockItem) return
    const hasPack = restockItem.pack_size && restockItem.pack_size > 0 && restockItem.pack_label
    const qty = parseFloat(restockQty)
    if (isNaN(qty) || qty < 0) return
    const bought = hasPack ? qty * restockItem.pack_size : qty
    await supabase.from('items').update({ quantity: restockItem.quantity + bought }).eq('id', restockItem.id)
    setChecked(p => ({...p, [restockItem.id]: false}))
    // Retirer de la liste manuelle si applicable
    if (restockManualId) {
      saveManual(manualItems.filter(m => m.id !== restockManualId))
    }
    setRestockItem(null)
    setRestockManualId(null)
    load()
  }

  const openNewStock = (manualItem) => {
    setNewStockManualId(manualItem.id)
    setNewStockForm({ name: manualItem.name, quantity:'', unit:'pièce(s)', category:'Épicerie sèche', min_quantity:'1', pack_label:'', pack_size:'' })
    setNewStockModal(true)
  }

  const confirmNewStock = async () => {
    if (!newStockForm.name.trim() || !newStockForm.quantity) return
    const pack_size = newStockForm.pack_size !== '' ? parseFloat(newStockForm.pack_size) : null
    const pack_label = newStockForm.pack_label.trim() || null
    await supabase.from('items').insert([{
      name: newStockForm.name.trim(),
      quantity: parseFloat(newStockForm.quantity),
      unit: newStockForm.unit,
      category: newStockForm.category,
      min_quantity: parseFloat(newStockForm.min_quantity) || 1,
      pack_size,
      pack_label,
    }])
    if (newStockManualId) saveManual(manualItems.filter(m => m.id !== newStockManualId))
    setNewStockModal(false)
    setNewStockManualId(null)
    load()
  }

  // Calcul aperçu en temps réel
  const restockPreview = () => {
    if (!restockItem) return null
    const hasPack = restockItem.pack_size && restockItem.pack_size > 0 && restockItem.pack_label
    const qty = parseFloat(restockQty) || 0
    const bought = hasPack ? qty * restockItem.pack_size : qty
    const total = restockItem.quantity + bought
    return { bought, total, hasPack }
  }

  const saveManual = (updated) => {
    setManualItems(updated)
    localStorage.setItem('manualShopItems', JSON.stringify(updated))
  }

  const addManualItem = (name, note = '', item_id = null) => {
    if (!name.trim()) return
    const updated = [...manualItems, { id: crypto.randomUUID(), name: name.trim(), note, item_id, checkedManual: false }]
    saveManual(updated)
    setAddModal(false)
    setAddSearch('')
    setAddNote('')
  }

  const removeManualItem = (id) => {
    saveManual(manualItems.filter(m => m.id !== id))
  }

  const toggleManual = (id) => {
    saveManual(manualItems.map(m => m.id === id ? {...m, checkedManual: !m.checkedManual} : m))
  }

  const expiringItems = items.filter(i => i.quantity > 0 && expiryBadge(i.expiry_date) !== null)

  const checkedCount = needShopping.filter(i => checked[i.id]).length + manualItems.filter(m => m.checkedManual).length
  const totalCount = needShopping.length + manualItems.length
  const preview = restockPreview()

  const shareList = () => {
    const lines = ['🛒 *Liste de courses*']
    if (urgent.length > 0) {
      lines.push('\n🔴 *Épuisé — urgence :*')
      urgent.forEach(i => {
        const ps = suggestPacks(i)
        lines.push(ps && i.pack_label ? `  • ${i.name} (${ps} ${i.pack_label}${ps>1?'s':''})` : `  • ${i.name}`)
      })
    }
    if (low.length > 0) {
      lines.push('\n🟡 *Stock bas :*')
      low.forEach(i => {
        const ps = suggestPacks(i)
        lines.push(ps && i.pack_label ? `  • ${i.name} (${ps} ${i.pack_label}${ps>1?'s':''})` : `  • ${i.name}`)
      })
    }
    if (manualItems.length > 0) {
      lines.push('\n📝 *Autres :*')
      manualItems.forEach(m => lines.push(`  • ${m.name}${m.note ? ` (${m.note})` : ''}`))
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  // Suggestions pour l'ajout manuel : items du stock non déjà dans la liste automatique
  const addSuggestions = items.filter(i =>
    i.quantity > i.min_quantity &&
    i.name.toLowerCase().includes(addSearch.toLowerCase())
  )

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <h2 className="section-title">Courses</h2>
        <button className="btn-sec" onClick={load}><I d={IC.refresh} s={15} /> Actualiser</button>
        {totalCount > 0 && <button className="btn-sec" onClick={shareList} title="Partager sur WhatsApp"><I d={IC.share} s={15} /> Partager</button>}
        <button className="btn-prim" onClick={() => { setAddModal(true); setAddSearch(''); setAddNote('') }}>
          <I d={IC.plus} s={16} /> Ajouter
        </button>
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : (
        totalCount === 0 && expiringItems.length === 0 ? (
          <div className="empty success">
            <div className="check-big"><I d={IC.check} s={30} /></div>
            <p>Tout est en stock !</p>
            <p className="empty-sub">Rien à acheter pour le moment</p>
          </div>
        ) : (
          <div className="shop-list">
            <div className="shop-summary">
              <div className="shop-summary-stat"><span className="summary-num">{totalCount}</span><span className="summary-label">à acheter</span></div>
              <div className="shop-summary-divider" />
              {urgent.length > 0 && <><div className="shop-summary-stat"><span className="summary-num red">{urgent.length}</span><span className="summary-label">épuisé{urgent.length>1?'s':''}</span></div><div className="shop-summary-divider" /></>}
              <div className="shop-summary-stat"><span className="summary-num green">{checkedCount}</span><span className="summary-label">coché{checkedCount>1?'s':''}</span></div>
            </div>

            {urgent.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-title urgent">Épuisé — à acheter en priorité</div>
                {urgent.map(item => <ShopItem key={item.id} item={item} checked={checked[item.id]} onCheck={() => setChecked(p=>({...p,[item.id]:!p[item.id]}))} onRestock={() => openRestock(item)} packs={suggestPacks(item)} />)}
              </div>
            )}
            {low.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-title warning">Stock bas — à prévoir</div>
                {low.map(item => <ShopItem key={item.id} item={item} checked={checked[item.id]} onCheck={() => setChecked(p=>({...p,[item.id]:!p[item.id]}))} onRestock={() => openRestock(item)} packs={suggestPacks(item)} />)}
              </div>
            )}
            {expiringItems.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-title expiring">⏰ À consommer bientôt</div>
                {expiringItems.map(item => {
                  const eb = expiryBadge(item.expiry_date)
                  return (
                    <div key={`exp-${item.id}`} className="shop-item2 expiring">
                      <div className="shop-info2" style={{flex:1}}>
                        <div className="shop-name2">{item.name}</div>
                        <div className="shop-meta">
                          <span className="shop-cat-tag">{item.category}</span>
                          <span className="shop-stock">{item.quantity} {item.unit} en stock</span>
                        </div>
                      </div>
                      <span className={`badge ${eb.cls}`}>{eb.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {manualItems.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-title manual">Ajoutés manuellement</div>
                {manualItems.map(m => {
                  const stockItem = m.item_id ? items.find(i => i.id === m.item_id) : null
                  return (
                    <div key={m.id} className={`shop-item2 manual ${m.checkedManual ? 'done' : ''}`}>
                      <button className="shop-check2" onClick={() => toggleManual(m.id)}>
                        {m.checkedManual && <I d={IC.check} s={12} />}
                      </button>
                      <div className="shop-info2" onClick={() => !stockItem && toggleManual(m.id)}>
                        <div className="shop-name2">{m.name}</div>
                        {stockItem && (
                          <div className="shop-meta">
                            <span className="shop-cat-tag">{stockItem.category}</span>
                            <span className="shop-stock">En stock : {stockItem.quantity} {stockItem.unit}</span>
                          </div>
                        )}
                        {stockItem?.pack_size && stockItem?.pack_label && (
                          <div className="shop-pack-info">
                            <span className="shop-pack-suggest">1 {stockItem.pack_label} = {stockItem.pack_size} {stockItem.unit}</span>
                          </div>
                        )}
                        {m.note && <div className="shop-stock">{m.note}</div>}
                      </div>
                      <div className="shop-right">
                        {stockItem ? (
                          <button className="restock-btn" onClick={() => openRestock(stockItem, m.id)}>
                            <I d={IC.check} s={13} /> Acheté
                          </button>
                        ) : (
                          <button className="restock-btn new" onClick={() => openNewStock(m)}>
                            <I d={IC.plus} s={13} /> Acheté
                          </button>
                        )}
                        <button className="icon-btn sm danger" onClick={() => removeManualItem(m.id)}>
                          <I d={IC.trash} s={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      )}
      {/* New Stock Item Modal */}
      <Modal open={newStockModal} onClose={() => setNewStockModal(false)} title="Ajouter au stock">
        <div className="form">
          <p className="cook-sub">Cet article n'est pas encore dans le stock. Remplis les infos pour l'ajouter.</p>
          <OFFSearchBar onSelect={p => setNewStockForm(f => ({
            ...f,
            name: p.name || f.name,
            quantity: p.quantity || f.quantity,
            unit: p.unit || f.unit,
            category: p.category || f.category,
          }))} />
          <label>Nom<input value={newStockForm.name} onChange={e => setNewStockForm(f=>({...f,name:e.target.value}))} /></label>
          <label>Catégorie
            <select value={newStockForm.category} onChange={e => setNewStockForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Unité de base (utilisée dans les recettes)
            <select value={newStockForm.unit} onChange={e => setNewStockForm(f=>({...f,unit:e.target.value}))}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
          </label>
          <PackForm form={newStockForm} setForm={setNewStockForm} />
          <div className="form-actions">
            <button className="btn-sec" onClick={() => setNewStockModal(false)}>Annuler</button>
            <button className="btn-prim" onClick={confirmNewStock}><I d={IC.check} s={15} /> Ajouter au stock</button>
          </div>
        </div>
      </Modal>

      {/* Add Manual Item Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Ajouter à la liste">
        <div className="form">
          <label>Article
            <input
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="Ex: Sel, Huile d'olive..."
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && addSearch.trim()) addManualItem(addSearch, addNote) }}
            />
          </label>
          <label>Note (optionnel)
            <input value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Ex: marque préférée, quantité..." />
          </label>
          {addSearch.trim() && (
            <button className="btn-prim" onClick={() => addManualItem(addSearch, addNote)}>
              <I d={IC.plus} s={15} /> Ajouter "{addSearch}"
            </button>
          )}
          {addSuggestions.length > 0 && (
            <div className="add-suggestions">
              <div className="section-label">Du stock (en stock suffisant)</div>
              {addSuggestions.slice(0, 8).map(it => (
                <button key={it.id} className="add-suggestion-row" onClick={() => addManualItem(it.name, '', it.id)}>
                  <div className="add-sug-left">
                    <span className="add-sug-name">{it.name}</span>
                    {it.pack_size && it.pack_label && (
                      <span className="add-sug-pack">1 {it.pack_label} = {it.pack_size} {it.unit}</span>
                    )}
                  </div>
                  <span className="add-sug-qty">{it.quantity} {it.unit}</span>
                  <I d={IC.plus} s={13} />
                </button>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button className="btn-sec" onClick={() => setAddModal(false)}>Fermer</button>
          </div>
        </div>
      </Modal>

      {/* Restock Modal */}
      <Modal open={!!restockItem} onClose={() => setRestockItem(null)} title="Réapprovisionner">
        {restockItem && (
          <div className="form">
            <div className="restock-item-name">{restockItem.name}</div>
            <div className="restock-current">
              Stock actuel : <b>{restockItem.quantity} {restockItem.unit}</b>
            </div>

            {restockItem.pack_size && restockItem.pack_label ? (
              <label>
                Nombre de {restockItem.pack_label}s achetés
                <div className="restock-pack-hint">1 {restockItem.pack_label} = {restockItem.pack_size} {restockItem.unit}</div>
                <input
                  type="number" min="0" step="1"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  autoFocus
                />
              </label>
            ) : (
              <label>
                Quantité achetée ({restockItem.unit})
                <input
                  type="number" min="0" step="0.1"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            {preview && parseFloat(restockQty) > 0 && (
              <div className="restock-preview">
                <div className="restock-calc">
                  <span className="restock-calc-old">{restockItem.quantity} {restockItem.unit}</span>
                  {restockItem.pack_size && restockItem.pack_label && (
                    <span className="restock-calc-op"> + {parseFloat(restockQty) || 0} × {restockItem.pack_size}</span>
                  )}
                  <span className="restock-calc-op"> = </span>
                  <span className="restock-calc-new">{preview.total} {restockItem.unit}</span>
                </div>
                {restockItem.pack_size && restockItem.pack_label && (
                  <div className="restock-calc-detail">
                    ({parseFloat(restockQty)} {restockItem.pack_label}{parseFloat(restockQty) > 1 ? 's' : ''} × {restockItem.pack_size} {restockItem.unit} = +{preview.bought} {restockItem.unit})
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button className="btn-sec" onClick={() => setRestockItem(null)}>Annuler</button>
              <button className="btn-prim" onClick={confirmRestock}><I d={IC.check} s={15} /> Confirmer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ShopItem({ item, checked, onCheck, onRestock, packs }) {
  const hasPack = item.pack_size && item.pack_label
  return (
    <div className={`shop-item2 ${checked?'done':''} ${item.quantity<=0?'urgent':'low'}`}>
      <button className="shop-check2" onClick={onCheck}>{checked && <I d={IC.check} s={12} />}</button>
      <div className="shop-info2" onClick={onCheck}>
        <div className="shop-name2">{item.name}</div>
        <div className="shop-meta">
          <span className="shop-cat-tag">{item.category}</span>
          <span className="shop-stock">{item.quantity <= 0 ? 'Aucun en stock' : `Reste : ${item.quantity} ${item.unit}`}</span>
        </div>
        {hasPack && (
          <div className="shop-pack-info">
            {packs
              ? <span className="shop-pack-suggest">→ acheter <b>{packs} {item.pack_label}{packs > 1 ? 's' : ''}</b> de {item.pack_size} {item.unit}</span>
              : <span>1 {item.pack_label} = {item.pack_size} {item.unit}</span>
            }
          </div>
        )}
      </div>
      <div className="shop-right">
        <button className="restock-btn" onClick={onRestock}><I d={IC.check} s={13} /> Acheté</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// PLANNING TAB
// ══════════════════════════════════════
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']
const MEAL_TYPES = ['Petit-déjeuner','Déjeuner','Dîner','Snack','Autre']

function PlanningTab() {
  const _t = new Date()
  const todayStr = `${_t.getFullYear()}-${String(_t.getMonth()+1).padStart(2,'0')}-${String(_t.getDate()).padStart(2,'0')}`
  const today = new Date(_t.getFullYear(), _t.getMonth(), _t.getDate())

  const [current, setCurrent] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [mealPlan, setMealPlan] = useState([])
  const [history, setHistory] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dayModal, setDayModal] = useState(null)
  const [planModal, setPlanModal] = useState(false)
  const [planForm, setPlanForm] = useState({ recipe_name:'', meal_type:'Dîner', notes:'' })
  const [selRecipeId, setSelRecipeId] = useState('')

  const dStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: mp }, { data: uh }, { data: rec }] = await Promise.all([
      supabase.from('meal_plan').select('*').order('planned_date'),
      supabase.from('usage_history').select('*').order('cooked_at', { ascending: false }),
      supabase.from('recipes').select('id,name,recipe_ingredients(quantity,unit,items(name))').order('name'),
    ])
    setMealPlan(mp || [])
    setHistory(uh || [])
    setRecipes(rec || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const year  = current.getFullYear()
  const month = current.getMonth()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0

  const mealsForDay = (iso) => ({
    planned: mealPlan.filter(m => m.planned_date === iso),
    cooked:  history.filter(h => (h.cooked_at || '').slice(0,10) === iso),
  })

  const openDay = (day) => {
    setDayModal(new Date(year, month, day))
    setPlanForm({ recipe_name:'', meal_type:'Dîner', notes:'' })
    setSelRecipeId('')
    setPlanModal(false)
  }

  const addMeal = async () => {
    const name = selRecipeId
      ? (recipes.find(r => r.id === selRecipeId)?.name || planForm.recipe_name)
      : planForm.recipe_name
    if (!name.trim()) return
    await supabase.from('meal_plan').insert([{
      recipe_id: selRecipeId || null,
      recipe_name: name.trim(),
      planned_date: dStr(dayModal),
      meal_type: planForm.meal_type,
      notes: planForm.notes || null,
    }])
    load()
    setPlanModal(false)
  }

  const deletePlan = async (id) => {
    await supabase.from('meal_plan').delete().eq('id', id)
    load()
  }

  const markCooked = async (meal) => {
    // Déduire les ingrédients du stock si la recette est connue
    if (meal.recipe_id) {
      const { data: ings } = await supabase
        .from('recipe_ingredients')
        .select('*, items(*)')
        .eq('recipe_id', meal.recipe_id)
      if (ings) {
        for (const ri of ings) {
          if (ri.items) {
            const after = Math.max(0, ri.items.quantity - ri.quantity)
            await supabase.from('items').update({ quantity: after }).eq('id', ri.item_id)
          }
        }
      }
    }
    // Enregistrer dans l'historique
    await supabase.from('usage_history').insert([{
      recipe_id: meal.recipe_id || null,
      recipe_name: meal.recipe_name,
    }])
    // Marquer comme cuisiné dans le planning
    await supabase.from('meal_plan').update({ cooked: true }).eq('id', meal.id)
    load()
  }

  const dayDateStr  = dayModal ? dStr(dayModal) : null
  const dayMeals    = dayDateStr ? mealsForDay(dayDateStr) : { planned:[], cooked:[] }
  const dayIsPast   = dayModal ? dayModal < today : false

  // Build calendar cells
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <h2 className="section-title">Planning</h2>
        <button className="btn-sec" onClick={load}><I d={IC.refresh} s={15} /> Actualiser</button>
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : (
        <div className="cal-wrap">
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
              <I d={IC.chevL} s={18} />
            </button>
            <span className="cal-month-label">{MONTHS_FR[month]} {year}</span>
            <button className="icon-btn" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
              <I d={IC.chevR} s={18} />
            </button>
          </div>

          <div className="cal-grid">
            {DAYS_FR.map(d => <div key={d} className="cal-head-cell">{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`b${i}`} className="cal-cell blank" />
              const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const { planned, cooked } = mealsForDay(iso)
              const isToday = iso === todayStr
              const isPast  = new Date(year, month, day) < today
              const total   = planned.length + cooked.length
              return (
                <div key={day} className={`cal-cell ${isToday?'today':''} ${isPast?'past':''}`} onClick={() => openDay(day)}>
                  <span className="cal-day-num">{day}</span>
                  {total > 0 && (
                    <div className="cal-cell-meals">
                      {cooked.map(h => <span key={h.id} className="cal-meal-tag cooked">{h.recipe_name}</span>)}
                      {planned.map(m => (
                        <span key={m.id} className={`cal-meal-tag planned ${m.cooked?'done':''}`}>{m.recipe_name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="cal-legend">
            <span className="cal-legend-item"><span className="cal-dot-demo cooked" />Cuisiné</span>
            <span className="cal-legend-item"><span className="cal-dot-demo planned" />Planifié</span>
          </div>
        </div>
      )}

      {/* Day Modal */}
      <Modal
        open={!!dayModal}
        onClose={() => setDayModal(null)}
        title={dayModal ? `${dayModal.getDate()} ${MONTHS_FR[dayModal.getMonth()]} ${dayModal.getFullYear()}` : ''}
      >
        <div className="form">
          {dayMeals.cooked.length > 0 && <>
            <div className="section-label">🍳 Cuisiné ce jour</div>
            {dayMeals.cooked.map(h => (
              <div key={h.id} className="plan-row cooked">
                <span className="plan-recipe">{h.recipe_name}</span>
                {h.cooked_at && <span className="plan-time">{new Date(h.cooked_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</span>}
              </div>
            ))}
          </>}

          {dayMeals.planned.length > 0 && <>
            <div className="section-label">📅 Planifié</div>
            {dayMeals.planned.map(m => {
              const recipeData = m.recipe_id ? recipes.find(r => r.id === m.recipe_id) : null
              return (
              <div key={m.id} className={`plan-row ${m.cooked?'cooked':''}`}>
                <div className="plan-left">
                  <span className="plan-recipe">{m.recipe_name}</span>
                  <span className="plan-type">{m.meal_type}</span>
                  {recipeData?.recipe_ingredients?.length > 0 && (
                    <div className="plan-ings">
                      {recipeData.recipe_ingredients.map((ri, i) => (
                        <span key={i} className="plan-ing-tag">{ri.items?.name} · {ri.quantity}{ri.unit}</span>
                      ))}
                    </div>
                  )}
                  {m.notes && <span className="plan-notes">{m.notes}</span>}
                </div>
                <div className="plan-acts">
                  {!m.cooked && !dayIsPast && (
                    <button className="icon-btn sm" title="Marquer cuisiné" onClick={() => markCooked(m)}><I d={IC.check} s={13} /></button>
                  )}
                  <button className="icon-btn sm danger" onClick={() => deletePlan(m.id)}><I d={IC.trash} s={13} /></button>
                </div>
              </div>
            )})}

          </>}

          {dayMeals.cooked.length === 0 && dayMeals.planned.length === 0 && (
            <p className="plan-empty">Aucun repas ce jour.</p>
          )}

          {!planModal ? (
            <button className="btn-prim" style={{marginTop:12}} onClick={() => setPlanModal(true)}>
              <I d={IC.plus} s={15} /> Planifier un repas
            </button>
          ) : (
            <div className="plan-add-form">
              <div className="section-label">Nouveau repas</div>
              <label>Recette
                <select value={selRecipeId} onChange={e => {
                  setSelRecipeId(e.target.value)
                  if (e.target.value) {
                    const r = recipes.find(x => x.id === e.target.value)
                    if (r) setPlanForm(f => ({...f, recipe_name: r.name}))
                  } else {
                    setPlanForm(f => ({...f, recipe_name: ''}))
                  }
                }}>
                  <option value="">— Saisir le nom manuellement —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              {!selRecipeId && (
                <label>Nom du repas
                  <input value={planForm.recipe_name} onChange={e => setPlanForm(f=>({...f,recipe_name:e.target.value}))} placeholder="Ex: Pasta, Pizza..." autoFocus />
                </label>
              )}
              <label>Moment du repas
                <select value={planForm.meal_type} onChange={e => setPlanForm(f=>({...f,meal_type:e.target.value}))}>
                  {MEAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>Notes (optionnel)
                <input value={planForm.notes} onChange={e => setPlanForm(f=>({...f,notes:e.target.value}))} placeholder="Invités, occasion..." />
              </label>
              <div className="form-actions">
                <button className="btn-sec" onClick={() => setPlanModal(false)}>Annuler</button>
                <button className="btn-prim" onClick={addMeal}><I d={IC.check} s={15} /> Ajouter</button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('stock')
  const tabs = [
    { id:'stock',    label:'Stock',    icon: IC.stock    },
    { id:'recipes',  label:'Recettes', icon: IC.recipe   },
    { id:'shop',     label:'Courses',  icon: IC.shop     },
    { id:'planning', label:'Planning', icon: IC.calendar },
  ]
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-icon">🧺</div>
          <div>
            <h1 className="app-name">Mon Garde-Manger</h1>
            <p className="app-tagline">Votre stock, toujours à jour</p>
          </div>
        </div>
      </header>
      <nav className="nav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-btn ${tab===t.id?'on':''}`} onClick={() => setTab(t.id)}>
            <I d={t.icon} s={19} /><span>{t.label}</span>
          </button>
        ))}
      </nav>
      <main className="main">
        {tab==='stock'    && <StockTab />}
        {tab==='recipes'  && <RecipesTab />}
        {tab==='shop'     && <ShoppingTab />}
        {tab==='planning' && <PlanningTab />}
      </main>
    </div>
  )
}
