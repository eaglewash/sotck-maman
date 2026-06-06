import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

// ══════════════════════════════════════
// ICONS (SVG inline)
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
}

const CATEGORIES = ['Épicerie sèche','Fruits & Légumes','Produits laitiers','Viandes & Poissons','Surgelés','Conserves','Boissons','Hygiène','Ménage','Autre']
const UNITS = ['g','kg','ml','L','pièce(s)','boîte(s)','sachet(s)','bouteille(s)','paquet(s)','pot(s)','cuil. à soupe','cuil. à café']

// ══════════════════════════════════════
// MODAL
// ══════════════════════════════════════
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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
// STOCK TAB
// ══════════════════════════════════════
function StockTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tout')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', quantity:'', unit:'g', category:'Épicerie sèche', min_quantity:'1' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('items').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name:'', quantity:'', unit:'g', category:'Épicerie sèche', min_quantity:'1' })
    setModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit, category: item.category, min_quantity: String(item.min_quantity) })
    setModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    const payload = { name: form.name.trim(), quantity: parseFloat(form.quantity)||0, unit: form.unit, category: form.category, min_quantity: parseFloat(form.min_quantity)||0 }
    if (editing) await supabase.from('items').update(payload).eq('id', editing.id)
    else await supabase.from('items').insert([payload])
    setModal(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('items').delete().eq('id', id)
    load()
  }

  const status = (i) => i.quantity <= 0 ? 'empty' : i.quantity <= i.min_quantity ? 'low' : 'ok'
  const filtered = items.filter(i => (cat === 'Tout' || i.category === cat) && i.name.toLowerCase().includes(search.toLowerCase()))
  const cats = ['Tout', ...CATEGORIES]

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <div className="searchbox">
          <I d={IC.search} s={15} />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-prim" onClick={openAdd}><I d={IC.plus} s={16} /> Ajouter</button>
      </div>

      <div className="chips">
        {cats.map(c => (
          <button key={c} className={`chip ${cat===c?'on':''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : filtered.length === 0 ? (
        <div className="empty"><I d={IC.leaf} s={36} /><p>Aucun article</p></div>
      ) : (
        <div className="grid">
          {filtered.map(item => {
            const s = status(item)
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
                  <span className="qty-num">{item.quantity}</span>
                  <span className="qty-unit">{item.unit}</span>
                </div>
                {s !== 'ok' && <span className={`badge ${s}`}>{s==='empty'?'Épuisé':'Stock bas'}</span>}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier' : 'Nouvel article'}>
        <div className="form">
          <label>Nom<input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Farine de blé" /></label>
          <div className="row2">
            <label>Quantité<input type="number" value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))} placeholder="0" min="0" step="0.1" /></label>
            <label>Unité<select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></label>
          </div>
          <label>Catégorie<select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Quantité min. (alerte courses)<input type="number" value={form.min_quantity} onChange={e => setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="1" min="0" step="0.1" /></label>
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
  const [form, setForm] = useState({ name:'', description:'' })
  const [ings, setIngs] = useState([{ item_id:'', quantity:'', unit:'g' }])
  const [cooked, setCooked] = useState(false)

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
    setForm({ name:'', description:'' })
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
    for (const ri of cooking.recipe_ingredients) {
      const it = items.find(i => i.id === ri.item_id)
      if (it) await supabase.from('items').update({ quantity: Math.max(0, it.quantity - ri.quantity) }).eq('id', it.id)
    }
    await supabase.from('usage_history').insert([{ recipe_id: cooking.id, recipe_name: cooking.name }])
    setCooked(true)
    load()
  }

  const saveRecipe = async () => {
    if (!form.name.trim()) return
    const validIngs = ings.filter(i => i.item_id && i.quantity)
    let rid
    if (editing) {
      await supabase.from('recipes').update({ name: form.name, description: form.description }).eq('id', editing.id)
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', editing.id)
      rid = editing.id
    } else {
      const { data } = await supabase.from('recipes').insert([{ name: form.name, description: form.description }]).select().single()
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

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <h2 className="section-title">Mes recettes</h2>
        <button className="btn-prim" onClick={openAdd}><I d={IC.plus} s={16} /> Nouvelle</button>
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : recipes.length === 0 ? (
        <div className="empty">
          <I d={IC.recipe} s={36} />
          <p>Aucune recette</p>
          <button className="btn-prim" onClick={openAdd}>Créer ma première recette</button>
        </div>
      ) : (
        <div className="recipe-list">
          {recipes.map(r => (
            <div key={r.id} className="recipe-card">
              <div className="recipe-info">
                <div className="recipe-name">{r.name}</div>
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
                  setForm({ name:r.name, description:r.description||'' })
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
            <button className="btn-prim" onClick={() => setCookModal(false)}>Fermer</button>
          </div>
        ) : (
          <div className="form">
            <p className="cook-sub">Ingrédients déduits du stock :</p>
            {preview.map((p, i) => (
              <div key={i} className={`cook-item ${p.ok?'ok':'bad'}`}>
                <div className="cook-item-left">
                  <I d={p.ok?IC.check:IC.warn} s={15} />
                  <span>{p.name}</span>
                </div>
                <div className="cook-item-right">
                  <span>Besoin : <b>{p.needed}{p.unit}</b></span>
                  <span>Stock : <b>{p.have}{p.unit}</b></span>
                </div>
              </div>
            ))}
            {preview.some(p => !p.ok) && (
              <div className="cook-warn">⚠️ Stock insuffisant pour certains ingrédients — la mise à jour sera quand même effectuée.</div>
            )}
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

  const suggestQty = (item) => {
    const needed = item.min_quantity * 2 - item.quantity
    return Math.max(needed, item.min_quantity)
  }

  const restock = async (item) => {
    const suggested = suggestQty(item)
    const raw = prompt(`Quelle quantité as-tu achetée pour "${item.name}" ?\n(suggéré : ${suggested}${item.unit})`, String(suggested))
    if (raw === null) return
    const bought = parseFloat(raw)
    if (isNaN(bought) || bought < 0) return
    const newQty = item.quantity + bought
    await supabase.from('items').update({ quantity: newQty }).eq('id', item.id)
    setChecked(p => ({...p, [item.id]: false}))
    load()
  }

  const checkedCount = needShopping.filter(i => checked[i.id]).length

  return (
    <div className="tab-content">
      <div className="tab-bar">
        <h2 className="section-title">Courses</h2>
        <button className="btn-sec" onClick={load}><I d={IC.refresh} s={15} /> Actualiser</button>
      </div>

      {loading ? <div className="loading"><span className="spin" /></div> : needShopping.length === 0 ? (
        <div className="empty success">
          <div className="check-big"><I d={IC.check} s={30} /></div>
          <p>Tout est en stock !</p>
          <p className="empty-sub">Rien à acheter pour le moment</p>
        </div>
      ) : (
        <div className="shop-list">

          {/* Résumé en haut */}
          <div className="shop-summary">
            <div className="shop-summary-stat">
              <span className="summary-num">{needShopping.length}</span>
              <span className="summary-label">à acheter</span>
            </div>
            <div className="shop-summary-divider" />
            {urgent.length > 0 && (
              <div className="shop-summary-stat">
                <span className="summary-num red">{urgent.length}</span>
                <span className="summary-label">épuisé{urgent.length>1?'s':''}</span>
              </div>
            )}
            {urgent.length > 0 && <div className="shop-summary-divider" />}
            <div className="shop-summary-stat">
              <span className="summary-num green">{checkedCount}</span>
              <span className="summary-label">coché{checkedCount>1?'s':''}</span>
            </div>
          </div>

          {/* Section ÉPUISÉ */}
          {urgent.length > 0 && (
            <div className="shop-section">
              <div className="shop-section-title urgent">Épuisé — à acheter en priorité</div>
              {urgent.map(item => (
                <ShopItem key={item.id} item={item} checked={checked[item.id]} onCheck={() => setChecked(p=>({...p,[item.id]:!p[item.id]}))} onRestock={() => restock(item)} suggest={suggestQty(item)} />
              ))}
            </div>
          )}

          {/* Section STOCK BAS */}
          {low.length > 0 && (
            <div className="shop-section">
              <div className="shop-section-title warning">Stock bas — à prévoir</div>
              {low.map(item => (
                <ShopItem key={item.id} item={item} checked={checked[item.id]} onCheck={() => setChecked(p=>({...p,[item.id]:!p[item.id]}))} onRestock={() => restock(item)} suggest={suggestQty(item)} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function ShopItem({ item, checked, onCheck, onRestock, suggest }) {
  return (
    <div className={`shop-item2 ${checked?'done':''} ${item.quantity<=0?'urgent':'low'}`}>
      <button className="shop-check2" onClick={onCheck}>
        {checked && <I d={IC.check} s={12} />}
      </button>
      <div className="shop-info2" onClick={onCheck}>
        <div className="shop-name2">{item.name}</div>
        <div className="shop-meta">
          <span className="shop-cat-tag">{item.category}</span>
          <span className="shop-stock">
            {item.quantity <= 0 ? 'Aucun en stock' : `Reste : ${item.quantity} ${item.unit}`}
          </span>
        </div>
      </div>
      <div className="shop-right">
        <div className="shop-suggest">≈ {suggest}{item.unit}</div>
        <button className="restock-btn" onClick={onRestock}>
          <I d={IC.check} s={13} /> Acheté
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('stock')

  const tabs = [
    { id:'stock',   label:'Stock',    icon: IC.stock  },
    { id:'recipes', label:'Recettes', icon: IC.recipe },
    { id:'shop',    label:'Courses',  icon: IC.shop   },
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
            <I d={t.icon} s={19} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        {tab==='stock'   && <StockTab />}
        {tab==='recipes' && <RecipesTab />}
        {tab==='shop'    && <ShoppingTab />}
      </main>
    </div>
  )
}
