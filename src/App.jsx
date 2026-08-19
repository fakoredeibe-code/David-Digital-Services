import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Layout, PenTool, Image as ImageIcon, Megaphone, FileCheck,
  ShoppingCart, User, LogOut, Star, Check, X, Trash2, Search,
  Lock, Plus, Edit3, ChevronRight, Package, Clock, ShieldCheck
} from "lucide-react";

const ADMIN_PASSWORD = "Davido1"; 
const SUPABASE_URL = "https://jhqicdypkajgvcqpgehb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gHQqVy9UHSUh3h_mJiIZMg_WojlEQUi";
const SB_REST = `${SUPABASE_URL}/rest/v1`;
const SB_AUTH = `${SUPABASE_URL}/auth/v1`;

const ICONS = {
  cv: FileText,
  mise_en_forme: Layout,
  logo: PenTool,
  visuel: ImageIcon,
  affiche: Megaphone,
  administratif: FileCheck,
};

const STATUS = {
  panier: { label: "Dans le panier", color: "#7a7263" },
  paiement_a_valider: { label: "Paiement à valider", color: "#a8762c" },
  en_traitement: { label: "En traitement", color: "#2f6f62" },
  termine: { label: "Terminé", color: "#2f6f62" },
  rejete: { label: "Rejeté", color: "#b1402b" },
};

const DEFAULT_SERVICES = [
  { id: "s1", key: "cv", name: "CV professionnel", description: "Rédaction et mise en page d'un CV clair, moderne et adapté à votre secteur.", priceMin: 5000, priceMax: 10000, delay: "24h", active: true },
  { id: "s2", key: "mise_en_forme", name: "Mise en forme de documents", description: "Mise en page soignée de vos rapports, mémoires ou dossiers Word/PDF.", priceMin: 2000, priceMax: 6000, delay: "12h", active: true },
  { id: "s3", key: "logo", name: "Création de logo", description: "Un logo original et professionnel pour votre marque ou activité.", priceMin: 10000, priceMax: 25000, delay: "48h", active: true },
  { id: "s4", key: "visuel", name: "Création de visuels", description: "Visuels pour réseaux sociaux, bannières et supports de communication.", priceMin: 3000, priceMax: 8000, delay: "24h", active: true },
  { id: "s5", key: "affiche", name: "Affiche publicitaire", description: "Conception d'affiches percutantes pour vos événements ou promotions.", priceMin: 7000, priceMax: 15000, delay: "24-48h", active: true },
  { id: "s6", key: "administratif", name: "Pièces administratives", description: "Rédaction d'attestations, lettres et autres documents administratifs.", priceMin: 2000, priceMax: 5000, delay: "24h", active: true },
];

const DEFAULT_SETTINGS = {
  mobileMoneyNumber: "+229 01 50 56 49 13", 
  mobileMoneyName: "David Olaéwé FAKOREDE",
  mobileMoneyProvider: "MTN Money",
};

const DEFAULT_REVIEWS = [
  { id: "r1", userName: "Aïcha K.", rating: 5, comment: "CV livré rapidement et très professionnel, je recommande.", status: "approved", createdAt: Date.now() - 86400000 * 5 },
  { id: "r2", userName: "Moussa D.", rating: 5, comment: "Logo parfait dès le premier essai, excellent travail.", status: "approved", createdAt: Date.now() - 86400000 * 12 },
  { id: "r3", userName: "Fatou S.", rating: 4, comment: "Bonne réactivité, quelques retouches mais résultat au top.", status: "approved", createdAt: Date.now() - 86400000 * 20 },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const genTrackingCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DDS-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};
const formatFCFA = (n) => n.toLocaleString("fr-FR") + " FCFA";
const formatDate = (ts) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

async function sbRest(path, options = {}) {
  const res = await fetch(`${SB_REST}/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function sbAuth(path, body) {
  const res = await fetch(`${SB_AUTH}/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Une erreur est survenue.");
  return data;
}

async function sbProfile(accessToken, userId) {
  const res = await fetch(`${SB_REST}/profiles?id=eq.${userId}&select=*`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const rows = await res.json();
  return rows?.[0] || null;
}
async function sbSaveProfile(accessToken, row) {
  await fetch(`${SB_REST}/profiles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([row]),
  });
}

const svcFromDb = (r) => ({ id: r.id, key: r.key, name: r.name, description: r.description, priceMin: r.price_min, priceMax: r.price_max, delay: r.delay, active: r.active });
const svcToDb = (s) => ({ id: s.id, key: s.key, name: s.name, description: s.description, price_min: s.priceMin, price_max: s.priceMax, delay: s.delay, active: s.active });
const orderFromDb = (r) => ({ id: r.id, trackingCode: r.tracking_code, userId: r.user_id, userName: r.user_name, serviceId: r.service_id, serviceName: r.service_name, priceMin: r.price_min, status: r.status, paymentRef: r.payment_ref, paymentPhone: r.payment_phone, createdAt: Date.parse(r.created_at) });
const orderToDb = (o) => ({ id: o.id, tracking_code: o.trackingCode, user_id: o.userId, user_name: o.userName, service_id: o.serviceId, service_name: o.serviceName, price_min: o.priceMin, status: o.status, payment_ref: o.paymentRef, payment_phone: o.paymentPhone });
const reviewFromDb = (r) => ({ id: r.id, userName: r.user_name, rating: r.rating, comment: r.comment, status: r.status, createdAt: Date.parse(r.created_at) });
const reviewToDb = (r) => ({ id: r.id, user_name: r.userName, rating: r.rating, comment: r.comment, status: r.status });
const settingsFromDb = (r) => ({ mobileMoneyNumber: r.mobile_money_number, mobileMoneyName: r.mobile_money_name, mobileMoneyProvider: r.mobile_money_provider });
const settingsToDb = (s) => ({ mobile_money_number: s.mobileMoneyNumber, mobile_money_name: s.mobileMoneyName, mobile_money_provider: s.mobileMoneyProvider });

async function loadPersonal(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    return res ? JSON.parse(res.value) : fallback;
  } catch {
    return fallback;
  }
}
async function savePersonal(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("Erreur de sauvegarde", key, e);
  }
}

function Stars({ value }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= value ? "#a8762c" : "none"} color="#a8762c" strokeWidth={1.5} />
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, color: "#7a7263" };
  return (
    <span className="badge" style={{ color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  );
}

function StampCode({ code }) {
  return (
    <div className="stamp">
      <div className="stamp-inner">
        <span className="stamp-label">SUIVI</span>
        <span className="stamp-code">{code}</span>
      </div>
    </div>
  );
}

function Nav({ view, setView, cartCount, currentUser, isAdmin }) {
  const items = [
    { id: "home", label: "Accueil" },
    { id: "order", label: "Commander" },
    { id: "cart", label: "Panier", badge: cartCount },
    { id: "account", label: currentUser ? "Mon compte" : "Connexion" },
  ];
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <div className="brand" onClick={() => setView("home")}>
          David<span> Digital Services</span>
        </div>
        <nav className="nav-links">
          {items.map((it) => (
            <button
              key={it.id}
              className={"nav-link" + (view === it.id ? " active" : "")}
              onClick={() => setView(it.id)}
            >
              {it.label}
              {it.badge > 0 && <span className="nav-badge">{it.badge}</span>}
            </button>
          ))}
          <button
            className={"nav-link nav-admin" + (view === "admin" ? " active" : "")}
            onClick={() => setView("admin")}
            title="Espace administrateur"
          >
            <Lock size={13} /> {isAdmin ? "Admin" : ""}
          </button>
        </nav>
      </div>
    </header>
  );
}

function HomePage({ services, reviews, setView }) {
  const approved = reviews.filter((r) => r.status === "approved");
  const avg = approved.length ? (approved.reduce((a, r) => a + r.rating, 0) / approved.length).toFixed(1) : null;

  return (
    <div>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Studio de services numériques</div>
            <h1>
              Vos documents, <em>parfaitement</em> réalisés.
            </h1>
            <p className="hero-sub">
              CV professionnels, mise en forme de documents, logos, visuels, affiches et pièces
              administratives — livrés avec soin, dans les délais annoncés.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => setView("order")}>
                Passer une commande <ChevronRight size={16} />
              </button>
              {avg && (
                <span className="rating-pill">
                  <Stars value={Math.round(avg)} /> {avg}/5 · {approved.length} avis
                </span>
              )}
            </div>
          </div>
          <div className="ticket">
            <div className="ticket-row">
              <Package size={18} /> <span>6 services disponibles</span>
            </div>
            <div className="ticket-row">
              <Clock size={18} /> <span>Livraison dès 12h</span>
            </div>
            <div className="ticket-row">
              <ShieldCheck size={18} /> <span>Suivi de commande par code</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="wrap">
          <div className="section-label">Nos services</div>
          <h2 className="section-title">Un tarif clair, un délai annoncé</h2>
          <div className="services-grid">
            {services.filter((s) => s.active).map((s) => {
              const Icon = ICONS[s.key] || FileText;
              return (
                <div key={s.id} className="service-card">
                  <Icon size={22} strokeWidth={1.5} color="#2f6f62" />
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="service-foot">
                    <span className="price">{formatFCFA(s.priceMin)} – {formatFCFA(s.priceMax)}</span>
                    <span className="delay"><Clock size={12} /> {s.delay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <div className="wrap">
          <div className="section-label">Avis clients</div>
          <h2 className="section-title">Ce qu'en disent nos clients</h2>
          <div className="reviews-grid">
            {approved.length === 0 && <p style={{ color: "var(--ink-dim)" }}>Pas encore d'avis publiés.</p>}
            {approved.slice(0, 6).map((r) => (
              <div key={r.id} className="review-card">
                <Stars value={r.rating} />
                <p>"{r.comment}"</p>
                <span className="review-name">— {r.userName}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderPage({ services, currentUser, onOrder, setView, notice, setNotice }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-label">Commander</div>
        <h2 className="section-title">Choisissez un service</h2>
        {!currentUser && (
          <div className="alert">
            Connectez-vous ou créez un compte pour passer commande.{" "}
            <button className="link-btn" onClick={() => setView("account")}>Se connecter</button>
          </div>
        )}
        {notice && <div className="alert alert-success">{notice}</div>}
        <div className="services-grid">
          {services.filter((s) => s.active).map((s) => {
            const Icon = ICONS[s.key] || FileText;
            return (
              <div key={s.id} className="service-card">
                <Icon size={22} strokeWidth={1.5} color="#2f6f62" />
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <div className="service-foot">
                  <span className="price">{formatFCFA(s.priceMin)} – {formatFCFA(s.priceMax)}</span>
                  <span className="delay"><Clock size={12} /> {s.delay}</span>
                </div>
                <button
                  className="btn btn-primary btn-full"
                  disabled={!currentUser}
                  onClick={() => onOrder(s)}
                >
                  Commander
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function CartPage({ orders, currentUser, onRemove, onPay, setView, settings }) {
  const myCart = orders.filter((o) => o.userId === currentUser?.id && o.status === "panier");
  const myPending = orders.filter((o) => o.userId === currentUser?.id && o.status !== "panier");
  const total = myCart.reduce((a, o) => a + o.priceMin, 0);
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  if (!currentUser) {
    return (
      <section className="section">
        <div className="wrap">
          <div className="alert">
            Connectez-vous pour voir votre panier.{" "}
            <button className="link-btn" onClick={() => setView("account")}>Se connecter</button>
          </div>
        </div>
      </section>
    );
  }

  const submit = () => {
    if (!phone.trim() || !ref.trim()) {
      setError("Merci de renseigner votre numéro et la référence du paiement.");
      return;
    }
    setError("");
    onPay(myCart, phone.trim(), ref.trim());
    setPhone("");
    setRef("");
  };

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-label">Panier</div>
        <h2 className="section-title">Vos commandes en attente</h2>

        {myCart.length === 0 ? (
          <p style={{ color: "var(--ink-dim)" }}>Votre panier est vide.</p>
        ) : (
          <>
            <div className="cart-list">
              {myCart.map((o) => (
                <div key={o.id} className="cart-item">
                  <div>
                    <h4>{o.serviceName}</h4>
                    <span className="code-inline">{o.trackingCode}</span>
                  </div>
                  <div className="cart-item-right">
                    <span className="price">{formatFCFA(o.priceMin)}</span>
                    <button className="icon-btn" onClick={() => onRemove(o.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">Total : <b>{formatFCFA(total)}</b></div>

            <div className="pay-box">
              <h3>Payer par Mobile Money</h3>
              <div className="mm-number">
                <span className="mm-label">Envoyez {formatFCFA(total)} à</span>
                <span className="mm-value">{settings.mobileMoneyNumber}</span>
                <span className="mm-sub">{settings.mobileMoneyName} · {settings.mobileMoneyProvider}</span>
              </div>
              <p style={{ color: "var(--ink-dim)", fontSize: "0.88rem" }}>
                Une fois l'envoi effectué, indiquez ci-dessous votre numéro et la référence de la transaction.
                Votre paiement sera validé manuellement.
              </p>
              <div className="form-row">
                <input placeholder="Votre numéro Mobile Money" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <input placeholder="Référence de la transaction" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <button className="btn btn-primary" onClick={submit}>Confirmer le paiement</button>
            </div>
          </>
        )}

        {myPending.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 48 }}>Historique</div>
            <div className="cart-list">
              {myPending.map((o) => (
                <div key={o.id} className="cart-item">
                  <div>
                    <h4>{o.serviceName}</h4>
                    <span className="code-inline">{o.trackingCode}</span>
                  </div>
                  <div className="cart-item-right">
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function AccountPage({ currentUser, onLogin, onRegister, onLogout, orders }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submitLogin = async () => {
    if (!form.email.trim() || !form.password) { setError("Merci de renseigner votre email et votre mot de passe."); return; }
    setError(""); setInfo(""); setBusy(true);
    try {
      await onLogin({ email: form.email.trim().toLowerCase(), password: form.password });
    } catch (e) {
      setError(e.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : e.message);
    } finally { setBusy(false); }
  };

  const submitRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    if (form.password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setError(""); setInfo(""); setBusy(true);
    try {
      const res = await onRegister({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      if (res?.needsConfirmation) {
        setInfo("Compte créé — vérifiez votre email pour confirmer avant de vous connecter.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message.includes("already registered") ? "Un compte existe déjà avec cet email." : e.message);
    } finally { setBusy(false); }
  };

  const track = () => {
    const order = orders.find((o) => o.trackingCode.toLowerCase() === trackCode.trim().toLowerCase());
    if (!order) { setTrackError("Aucune commande trouvée avec ce code."); setTrackResult(null); return; }
    setTrackError("");
    setTrackResult(order);
  };

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-label">Suivre une commande</div>
        <div className="track-box">
          <div className="form-row">
            <input placeholder="Code de suivi (ex: DDS-A1B2C3)" value={trackCode} onChange={(e) => setTrackCode(e.target.value)} />
            <button className="btn btn-ghost" onClick={track}><Search size={15} /> Vérifier</button>
          </div>
          {trackError && <div className="alert alert-error">{trackError}</div>}
          {trackResult && (
            <div className="track-result">
              <StampCode code={trackResult.trackingCode} />
              <div>
                <h4>{trackResult.serviceName}</h4>
                <StatusBadge status={trackResult.status} />
              </div>
            </div>
          )}
        </div>

        <div className="section-label" style={{ marginTop: 48 }}>
          {currentUser ? "Mon compte" : "Connexion / Inscription"}
        </div>

        {currentUser ? (
          <div className="profile-box">
            <div className="avatar"><User size={26} /></div>
            <div className="profile-info">
              <h3>{currentUser.name}</h3>
              <p>{currentUser.email}</p>
              <p>{currentUser.phone}</p>
            </div>
            <button className="btn btn-ghost" onClick={onLogout}><LogOut size={15} /> Se déconnecter</button>
          </div>
        ) : (
          <div className="auth-box">
            <div className="auth-tabs">
              <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Connexion</button>
              <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Inscription</button>
            </div>
            {mode === "register" && (
              <input placeholder="Nom complet" value={form.name} onChange={update("name")} />
            )}
            <input placeholder="Email" type="email" value={form.email} onChange={update("email")} />
            {mode === "register" && (
              <input placeholder="Numéro de téléphone" value={form.phone} onChange={update("phone")} />
            )}
            <input placeholder="Mot de passe (6 caractères min.)" type="password" value={form.password} onChange={update("password")} />
            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-success">{info}</div>}
            <button className="btn btn-primary btn-full" disabled={busy} onClick={mode === "login" ? submitLogin : submitRegister}>
              {busy ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminPage({
  isAdmin, onAdminLogin,
  services, onAddService, onUpdateService, onDeleteService,
  orders, onUpdateOrderStatus,
  reviews, onReviewDecision,
  settings, onUpdateSettings,
}) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("services");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", key: "cv", description: "", priceMin: "", priceMax: "", delay: "" });
  const [settingsForm, setSettingsForm] = useState(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  if (!isAdmin) {
    return (
      <section className="section">
        <div className="wrap" style={{ maxWidth: 420 }}>
          <div className="section-label">Espace administrateur</div>
          <h2 className="section-title">Accès réservé</h2>
          <div className="auth-box">
            <input placeholder="Mot de passe" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            {error && <div className="alert alert-error">{error}</div>}
            <button
              className="btn btn-primary btn-full"
              onClick={() => (pwd === ADMIN_PASSWORD ? onAdminLogin() : setError("Mot de passe incorrect."))}
            >
              Entrer
            </button>
          </div>
        </div>
      </section>
    );
  }

  const startEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, key: s.key, description: s.description, priceMin: s.priceMin, priceMax: s.priceMax, delay: s.delay });
  };
  const startNew = () => {
    setEditing("new");
    setForm({ name: "", key: "cv", description: "", priceMin: "", priceMax: "", delay: "" });
  };
  const saveForm = () => {
    const payload = {
      name: form.name.trim(),
      key: form.key,
      description: form.description.trim(),
      priceMin: Number(form.priceMin) || 0,
      priceMax: Number(form.priceMax) || 0,
      delay: form.delay.trim(),
    };
    if (editing === "new") onAddService({ id: uid(), active: true, ...payload });
    else onUpdateService(editing, payload);
    setEditing(null);
  };

  const pendingReviews = reviews.filter((r) => r.status === "pending");

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-label">Espace administrateur</div>
        <h2 className="section-title">Gestion de David Digital Services</h2>

        <div className="admin-tabs">
          <button className={tab === "services" ? "active" : ""} onClick={() => setTab("services")}>Services</button>
          <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Commandes ({orders.length})</button>
          <button className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>
            Avis {pendingReviews.length > 0 && <span className="nav-badge">{pendingReviews.length}</span>}
          </button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Paiement</button>
        </div>

        {tab === "services" && (
          <div>
            <button className="btn btn-ghost" style={{ marginBottom: 20 }} onClick={startNew}><Plus size={15} /> Ajouter un service</button>

            {editing && (
              <div className="admin-form">
                <div className="form-row">
                  <input placeholder="Nom du service" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <select value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}>
                    {Object.keys(ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="form-row">
                  <input placeholder="Prix min (FCFA)" type="number" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} />
                  <input placeholder="Prix max (FCFA)" type="number" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} />
                  <input placeholder="Délai (ex: 24h)" value={form.delay} onChange={(e) => setForm({ ...form, delay: e.target.value })} />
                </div>
                <div className="form-row">
                  <button className="btn btn-primary" onClick={saveForm}><Check size={15} /> Enregistrer</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)}><X size={15} /> Annuler</button>
                </div>
              </div>
            )}

            <div className="admin-list">
              {services.map((s) => (
                <div key={s.id} className="admin-row">
                  <div>
                    <h4>{s.name} {!s.active && <span className="tag-inactive">masqué</span>}</h4>
                    <span className="code-inline">{formatFCFA(s.priceMin)} – {formatFCFA(s.priceMax)} · {s.delay}</span>
                  </div>
                  <div className="admin-row-actions">
                    <button className="icon-btn" onClick={() => startEdit(s)}><Edit3 size={15} /></button>
                    <button className="icon-btn" onClick={() => onUpdateService(s.id, { active: !s.active })}>
                      {s.active ? "Masquer" : "Publier"}
                    </button>
                    <button className="icon-btn" onClick={() => onDeleteService(s.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="admin-list">
            {orders.length === 0 && <p style={{ color: "var(--ink-dim)" }}>Aucune commande pour l'instant.</p>}
            {orders.slice().sort((a, b) => b.createdAt - a.createdAt).map((o) => (
              <div key={o.id} className="admin-row">
                <div>
                  <h4>{o.serviceName} — {formatFCFA(o.priceMin)}</h4>
                  <span className="code-inline">{o.trackingCode} · {o.userName} · {formatDate(o.createdAt)}</span>
                  {o.paymentRef && <div style={{ fontSize: "0.78rem", color: "var(--ink-dim)" }}>Réf. paiement : {o.paymentRef} ({o.paymentPhone})</div>}
                </div>
                <div className="admin-row-actions">
                  <select value={o.status} onChange={(e) => onUpdateOrderStatus(o.id, e.target.value)}>
                    {Object.keys(STATUS).filter((k) => k !== "panier").map((k) => (
                      <option key={k} value={k}>{STATUS[k].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="admin-list">
            {reviews.length === 0 && <p style={{ color: "var(--ink-dim)" }}>Aucun avis pour l'instant.</p>}
            {reviews.slice().sort((a, b) => b.createdAt - a.createdAt).map((r) => (
              <div key={r.id} className="admin-row">
                <div>
                  <Stars value={r.rating} />
                  <p style={{ margin: "6px 0" }}>"{r.comment}"</p>
                  <span className="code-inline">{r.userName} · {formatDate(r.createdAt)} · {r.status}</span>
                </div>
                {r.status === "pending" && (
                  <div className="admin-row-actions">
                    <button className="icon-btn" onClick={() => onReviewDecision(r.id, "approved")}><Check size={15} /></button>
                    <button className="icon-btn" onClick={() => onReviewDecision(r.id, "rejected")}><X size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <div className="admin-form" style={{ maxWidth: 440 }}>
            <label className="field-label">Numéro Mobile Money à afficher aux clients</label>
            <input
              placeholder="+225 07 00 00 00 00"
              value={settingsForm.mobileMoneyNumber}
              onChange={(e) => { setSettingsForm({ ...settingsForm, mobileMoneyNumber: e.target.value }); setSettingsSaved(false); }}
            />
            <label className="field-label">Nom du titulaire</label>
            <input
              placeholder="Ton nom"
              value={settingsForm.mobileMoneyName}
              onChange={(e) => { setSettingsForm({ ...settingsForm, mobileMoneyName: e.target.value }); setSettingsSaved(false); }}
            />
            <label className="field-label">Opérateur(s)</label>
            <input
              placeholder="Orange Money / MTN Money / Wave"
              value={settingsForm.mobileMoneyProvider}
              onChange={(e) => { setSettingsForm({ ...settingsForm, mobileMoneyProvider: e.target.value }); setSettingsSaved(false); }}
            />
            <button
              className="btn btn-primary"
              style={{ marginTop: 10 }}
              onClick={() => { onUpdateSettings(settingsForm); setSettingsSaved(true); }}
            >
              <Check size={15} /> Enregistrer
            </button>
            {settingsSaved && <div className="alert alert-success" style={{ marginTop: 12, marginBottom: 0 }}>Numéro mis à jour — visible immédiatement dans le panier des clients.</div>}
          </div>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);
  const [currentUser, setCurrentUser] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [svcRows, ordRows, revRows, settRows] = await Promise.all([
          sbRest("services?select=*&order=created_at.asc"),
          sbRest("orders?select=*&order=created_at.desc"),
          sbRest("reviews?select=*&order=created_at.desc"),
          sbRest("settings?id=eq.1&select=*"),
        ]);
        setServices((svcRows || []).map(svcFromDb));
        setOrders((ordRows || []).map(orderFromDb));
        setReviews((revRows || []).map(reviewFromDb));
        if (settRows && settRows[0]) setSettings(settingsFromDb(settRows[0]));

        const session = await loadPersonal("session", null);
        if (session?.accessToken && session?.userId) {
          const profile = await sbProfile(session.accessToken, session.userId).catch(() => null);
          if (profile) {
            setCurrentUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone });
            setAuthSession(session);
          } else {
            await savePersonal("session", null);
          }
        }
      } catch (e) {
        console.error(e);
        setLoadError("Connexion à la base de données impossible. Vérifie ta connexion internet ou réessaie.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const cartCount = currentUser ? orders.filter((o) => o.userId === currentUser.id && o.status === "panier").length : 0;

  const addService = async (s) => {
    setServices((prev) => [...prev, s]);
    try { await sbRest("services", { method: "POST", body: JSON.stringify([svcToDb(s)]) }); }
    catch (e) { console.error(e); }
  };
  const updateService = async (id, patch) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try { await sbRest(`services?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(svcToDb({ ...patch })), prefer: "return=minimal" }); }
    catch (e) { console.error(e); }
  };
  const deleteService = async (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    try { await sbRest(`services?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); }
    catch (e) { console.error(e); }
  };
  const placeOrder = async (service) => {
    if (!currentUser) { setView("account"); return; }
    const order = {
      id: uid(),
      trackingCode: genTrackingCode(),
      userId: currentUser.id,
      userName: currentUser.name,
      serviceId: service.id,
      serviceName: service.name,
      priceMin: service.priceMin,
      status: "panier",
      createdAt: Date.now(),
      paymentRef: null,
      paymentPhone: null,
    };
    setOrders((prev) => [order, ...prev]);
    try { await sbRest("orders", { method: "POST", body: JSON.stringify([orderToDb(order)]) }); }
    catch (e) { console.error(e); }
    setOrderNotice(`"${service.name}" ajouté à votre panier — code de suivi ${order.trackingCode}`);
    setTimeout(() => setOrderNotice(""), 5000);
  };

  const removeFromCart = async (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try { await sbRest(`orders?id=eq.${orderId}`, { method: "DELETE", prefer: "return=minimal" }); }
    catch (e) { console.error(e); }
  };

  const payCart = async (items, phone, ref) => {
    const ids = new Set(items.map((i) => i.id));
    setOrders((prev) => prev.map((o) => (ids.has(o.id) ? { ...o, status: "paiement_a_valider", paymentPhone: phone, paymentRef: ref } : o)));
    try {
      await Promise.all(items.map((o) =>
        sbRest(`orders?id=eq.${o.id}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ status: "paiement_a_valider", payment_phone: phone, payment_ref: ref }),
        })
      ));
    } catch (e) { console.error(e); }
  };

  const updateOrderStatus = async (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try { await sbRest(`orders?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status }) }); }
    catch (e) { console.error(e); }
  };

  /* ---- Compte (Supabase Auth) ---- */
  const registerUser = async ({ name, email, phone, password }) => {
    const data = await sbAuth("signup", { email, password, data: { name, phone } });
    if (!data.access_token) {
      return { success: false, needsConfirmation: true };
    }
    const profileRow = { id: data.user.id, name, phone, email };
    await sbSaveProfile(data.access_token, profileRow);
    const session = { accessToken: data.access_token, refreshToken: data.refresh_token, userId: data.user.id };
    setAuthSession(session);
    setCurrentUser(profileRow);
    await savePersonal("session", session);
    return { success: true };
  };

  const loginUser = async ({ email, password }) => {
    const data = await sbAuth("token?grant_type=password", { email, password });
    const profile = await sbProfile(data.access_token, data.user.id);
    const session = { accessToken: data.access_token, refreshToken: data.refresh_token, userId: data.user.id };
    setAuthSession(session);
    setCurrentUser(profile ? { id: profile.id, name: profile.name, email: profile.email, phone: profile.phone } : { id: data.user.id, name: "", email, phone: "" });
    await savePersonal("session", session);
    return { success: true };
  };

  const logoutUser = async () => {
    setCurrentUser(null);
    setAuthSession(null);
    await savePersonal("session", null);
  };

  /* ---- Avis ---- */
  const reviewDecision = async (id, status) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try { await sbRest(`reviews?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status }) }); }
    catch (e) { console.error(e); }
  };

  /* ---- Paramètres ---- */
  const updateSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { await sbRest("settings?id=eq.1", { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(settingsToDb(next)) }); }
    catch (e) { console.error(e); }
  };

  if (!ready) {
    return (
      <div className="loading-screen">
        <GlobalStyles />
        <p>Chargement…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-screen">
        <GlobalStyles />
        <p style={{ color: "#b1402b", maxWidth: 420, textAlign: "center", padding: "0 20px" }}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <GlobalStyles />
      <Nav view={view} setView={setView} cartCount={cartCount} currentUser={currentUser} isAdmin={isAdmin} />
      {view === "home" && <HomePage services={services} reviews={reviews} setView={setView} />}
      {view === "order" && (
        <OrderPage services={services} currentUser={currentUser} onOrder={placeOrder} setView={setView} notice={orderNotice} setNotice={setOrderNotice} />
      )}
      {view === "cart" && (
        <CartPage orders={orders} currentUser={currentUser} onRemove={removeFromCart} onPay={payCart} setView={setView} settings={settings} />
      )}
      {view === "account" && (
        <AccountPage currentUser={currentUser} onLogin={loginUser} onRegister={registerUser} onLogout={logoutUser} orders={orders} />
      )}
      {view === "admin" && (
        <AdminPage
          isAdmin={isAdmin}
          onAdminLogin={() => setIsAdmin(true)}
          services={services} onAddService={addService} onUpdateService={updateService} onDeleteService={deleteService}
          orders={orders} onUpdateOrderStatus={updateOrderStatus}
          reviews={reviews} onReviewDecision={reviewDecision}
          settings={settings} onUpdateSettings={updateSettings}
        />
      )}
      <footer className="footer">
        <div className="wrap footer-inner">
          <p>© 2026 David Digital Services. Tous droits réservés.</p>
          <p>contact@daviddigitalservices.com</p>
        </div>
      </footer>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

      :root{
        --ink:#1c2333;
        --ink-dim:#6b7280;
        --paper:#f5f1e6;
        --paper-2:#ece5d3;
        --green:#2f6f62;
        --green-dim:#254f46;
        --stamp:#b1402b;
        --gold:#a8762c;
        --line: rgba(28,35,51,0.14);
      }
      *{box-sizing:border-box;}
      .app{ font-family:'Inter', sans-serif; background:var(--paper); color:var(--ink); min-height:100vh; }
      .loading-screen{ background:var(--paper); color:var(--ink); min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; }
      .wrap{ max-width:1080px; margin:0 auto; padding:0 24px; }
      h1,h2,h3,h4{ font-family:'Spectral', serif; font-weight:600; }
      button{ font-family:inherit; cursor:pointer; }
      input, select, textarea{ font-family:inherit; }

      /* NAV */
      .nav{ position:sticky; top:0; z-index:50; background:rgba(245,241,230,0.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
      .nav-inner{ display:flex; align-items:center; justify-content:space-between; height:68px; flex-wrap:wrap; }
      .brand{ font-family:'Spectral', serif; font-weight:600; font-size:1.1rem; cursor:pointer; }
      .brand span{ color:var(--green); font-weight:500; font-style:italic; }
      .nav-links{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .nav-link{ background:none; border:none; padding:9px 14px; font-size:0.86rem; color:var(--ink-dim); border-radius:3px; position:relative; display:flex; align-items:center; gap:6px; }
      .nav-link:hover{ color:var(--ink); }
      .nav-link.active{ background:var(--ink); color:var(--paper); }
      .nav-admin{ color:var(--stamp); }
      .nav-badge{ background:var(--stamp); color:#fff; font-size:0.68rem; padding:1px 6px; border-radius:20px; font-family:'IBM Plex Mono', monospace; }

      /* HERO */
      .hero{ padding:72px 0 64px; border-bottom:1px solid var(--line); }
      .hero-grid{ display:grid; grid-template-columns:1.15fr 0.85fr; gap:56px; align-items:center; }
      .eyebrow{ font-family:'IBM Plex Mono', monospace; font-size:0.72rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--green); margin-bottom:18px; display:flex; align-items:center; gap:10px; }
      .eyebrow::before{ content:''; width:22px; height:1px; background:var(--green); }
      h1{ font-size:clamp(2.1rem,4vw,3.2rem); line-height:1.12; margin-bottom:22px; }
      h1 em{ color:var(--green); font-style:italic; }
      .hero-sub{ color:var(--ink-dim); font-size:1.02rem; max-width:48ch; margin-bottom:30px; }
      .hero-cta{ display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
      .rating-pill{ display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--ink-dim); }
      .ticket{ background:var(--paper-2); border:1px dashed var(--ink-dim); border-radius:4px; padding:26px; display:flex; flex-direction:column; gap:16px; }
      .ticket-row{ display:flex; align-items:center; gap:12px; font-size:0.9rem; color:var(--ink); }
      .ticket-row svg{ color:var(--green); flex-shrink:0; }

      /* BUTTONS */
      .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; font-weight:600; font-size:0.86rem; padding:11px 20px; border-radius:3px; border:none; transition:transform .15s ease, opacity .15s ease; }
      .btn-primary{ background:var(--green); color:#fff; }
      .btn-primary:hover{ transform:translateY(-1px); }
      .btn-primary:disabled{ opacity:0.45; cursor:not-allowed; transform:none; }
      .btn-ghost{ background:transparent; border:1px solid var(--ink); color:var(--ink); }
      .btn-full{ width:100%; margin-top:14px; }

      /* SECTIONS */
      .section{ padding:76px 0; border-bottom:1px solid var(--line); }
      .section-label{ font-family:'IBM Plex Mono', monospace; font-size:0.72rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--green); margin-bottom:12px; }
      .section-title{ font-size:clamp(1.5rem,2.6vw,2rem); margin-bottom:36px; max-width:26ch; }

      /* SERVICES */
      .services-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
      .service-card{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:26px; display:flex; flex-direction:column; gap:10px; }
      .service-card h3{ font-size:1.08rem; }
      .service-card p{ color:var(--ink-dim); font-size:0.87rem; flex:1; }
      .service-foot{ display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; border-top:1px dashed var(--line); padding-top:12px; margin-top:4px; }
      .price{ font-family:'IBM Plex Mono', monospace; font-weight:500; color:var(--ink); }
      .delay{ display:flex; align-items:center; gap:4px; color:var(--ink-dim); }

      /* REVIEWS */
      .reviews-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
      .review-card{ background:var(--paper-2); border-radius:4px; padding:22px; }
      .review-card p{ margin:12px 0; font-style:italic; color:var(--ink); font-size:0.92rem; }
      .review-name{ font-size:0.8rem; color:var(--ink-dim); }

      /* ALERTS */
      .alert{ background:#fff; border:1px solid var(--gold); color:var(--ink); padding:14px 16px; border-radius:3px; font-size:0.86rem; margin-bottom:24px; }
      .alert-success{ border-color:var(--green); }
      .alert-error{ border-color:var(--stamp); color:var(--stamp); margin:10px 0; }
      .link-btn{ background:none; border:none; color:var(--green); text-decoration:underline; cursor:pointer; font-size:inherit; font-weight:600; }

      /* CART */
      .cart-list{ display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line); border-radius:4px; overflow:hidden; }
      .cart-item{ background:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
      .cart-item h4{ font-size:0.96rem; }
      .code-inline{ font-family:'IBM Plex Mono', monospace; font-size:0.76rem; color:var(--ink-dim); }
      .cart-item-right{ display:flex; align-items:center; gap:14px; }
      .icon-btn{ background:none; border:1px solid var(--line); border-radius:3px; padding:6px 8px; color:var(--ink-dim); display:flex; align-items:center; gap:4px; font-size:0.78rem; }
      .icon-btn:hover{ color:var(--stamp); border-color:var(--stamp); }
      .cart-total{ text-align:right; margin-top:16px; font-size:1rem; }
      .pay-box{ background:var(--paper-2); border-radius:4px; padding:26px; margin-top:32px; }
      .pay-box h3{ margin-bottom:6px; }
      .mm-number{ background:#fff; border:1px dashed var(--green); border-radius:4px; padding:16px 18px; margin:14px 0; display:flex; flex-direction:column; gap:2px; }
      .mm-label{ font-size:0.78rem; color:var(--ink-dim); }
      .mm-value{ font-family:'IBM Plex Mono', monospace; font-size:1.15rem; font-weight:600; color:var(--green); }
      .mm-sub{ font-size:0.76rem; color:var(--ink-dim); }
      .field-label{ font-size:0.78rem; color:var(--ink-dim); margin-top:8px; }
      .form-row{ display:flex; gap:12px; margin:16px 0; flex-wrap:wrap; }
      .form-row input, .form-row select{ flex:1; min-width:180px; padding:11px 14px; border:1px solid var(--line); border-radius:3px; background:#fff; font-size:0.88rem; }

      /* ACCOUNT */
      .track-box{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:24px; }
      .track-result{ display:flex; align-items:center; gap:20px; margin-top:18px; padding-top:18px; border-top:1px dashed var(--line); }
      .stamp{ width:74px; height:74px; border:2px solid var(--stamp); border-radius:50%; display:flex; align-items:center; justify-content:center; transform:rotate(-8deg); flex-shrink:0; }
      .stamp-inner{ display:flex; flex-direction:column; align-items:center; }
      .stamp-label{ font-family:'IBM Plex Mono', monospace; font-size:0.55rem; color:var(--stamp); letter-spacing:0.1em; }
      .stamp-code{ font-family:'IBM Plex Mono', monospace; font-size:0.62rem; font-weight:600; color:var(--stamp); text-align:center; }
      .auth-box{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:26px; max-width:420px; display:flex; flex-direction:column; gap:12px; }
      .auth-box input{ padding:11px 14px; border:1px solid var(--line); border-radius:3px; font-size:0.9rem; }
      .auth-tabs{ display:flex; gap:6px; margin-bottom:8px; }
      .auth-tabs button{ flex:1; background:var(--paper-2); border:none; padding:10px; border-radius:3px; font-size:0.84rem; font-weight:600; color:var(--ink-dim); }
      .auth-tabs button.active{ background:var(--ink); color:#fff; }
      .profile-box{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:26px; display:flex; align-items:center; gap:18px; max-width:480px; flex-wrap:wrap; }
      .avatar{ width:52px; height:52px; border-radius:50%; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .profile-info p{ font-size:0.84rem; color:var(--ink-dim); }

      /* ADMIN */
      .admin-tabs{ display:flex; gap:8px; margin-bottom:28px; border-bottom:1px solid var(--line); }
      .admin-tabs button{ background:none; border:none; padding:10px 4px; margin-right:20px; font-size:0.88rem; color:var(--ink-dim); border-bottom:2px solid transparent; display:flex; align-items:center; gap:6px; }
      .admin-tabs button.active{ color:var(--ink); border-color:var(--green); font-weight:600; }
      .admin-form{ background:#fff; border:1px solid var(--line); border-radius:4px; padding:22px; margin-bottom:24px; display:flex; flex-direction:column; gap:6px; }
      .admin-form textarea{ padding:11px 14px; border:1px solid var(--line); border-radius:3px; min-height:70px; font-size:0.88rem; }
      .admin-list{ display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line); border-radius:4px; overflow:hidden; }
      .admin-row{ background:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
      .admin-row h4{ font-size:0.94rem; font-family:'Inter',sans-serif; font-weight:600; }
      .admin-row-actions{ display:flex; align-items:center; gap:8px; }
      .tag-inactive{ font-family:'IBM Plex Mono', monospace; font-size:0.65rem; color:var(--stamp); border:1px solid var(--stamp); padding:1px 6px; border-radius:20px; margin-left:8px; }
      .badge{ font-family:'IBM Plex Mono', monospace; font-size:0.74rem; border:1px solid; padding:3px 9px; border-radius:20px; }

      .footer{ padding:32px 0; }
      .footer-inner{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:0.78rem; color:var(--ink-dim); }

      @media (max-width:900px){
        .hero-grid{ grid-template-columns:1fr; }
        .services-grid{ grid-template-columns:1fr 1fr; }
        .reviews-grid{ grid-template-columns:1fr; }
      }
      @media (max-width:600px){
        .services-grid{ grid-template-columns:1fr; }
        .nav-links{ gap:2px; }
        .nav-link{ padding:8px 9px; font-size:0.78rem; }
      }
    `}</style>
  );
}
