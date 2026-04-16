import { useState, useEffect, useRef } from "react";
import "./Streamtrack.css";

// ── Config //
const ADMIN_PIN = "1234";
const MAX_SLOTS = 6;

const SERVICES = [
  { id: "netflix", name: "Netflix",     color: "#E50914", icon: "N",  monthlyFee: 0 },
  { id: "disney",  name: "Disney+",     color: "#006EFF", icon: "D+", monthlyFee: 0 },
  { id: "prime",   name: "Prime Video", color: "#00A8E1", icon: "P",  monthlyFee: 0 },
  { id: "max",     name: "Max",         color: "#9B59FF", icon: "M",  monthlyFee: 0 },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const NOW   = new Date();
const CUR_M = NOW.getMonth();
const CUR_Y = NOW.getFullYear();

// ── Design tokens (used for dynamic inline styles only) ───────────────────────
const G = {
  bg:      "#07090f",
  card:    "#0d1117",
  border:  "#1a2235",
  text:    "#dde4f0",
  muted:   "#4a5a78",
  accent:  "#3b7ef8",
  success: "#1fd690",
  danger:  "#f05252",
  warn:    "#f5a623",
  inp:     "#090d14",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Generate month objects from a start ISO date up to the current month */
const genMonths = (fromIso) => {
  const result = [];
  let d = fromIso
    ? new Date(fromIso + "T00:00:00")
    : new Date(CUR_Y, CUR_M - 5, 1);
  d = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(CUR_Y, CUR_M, 1);
  while (d <= end) {
    result.push({
      month: d.getMonth(),
      year:  d.getFullYear(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return result;
};

/** Default 6-month window used in admin tracker views */
const MONTH_KEYS = genMonths(null);

const peso = (v) =>
  `₱${Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const daysLeft = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso + "T00:00:00") - new Date()) / 86400000);
};

const expiryColor = (iso) => {
  const d = daysLeft(iso);
  if (d === null) return G.muted;
  if (d < 0)     return G.danger;
  if (d <= 7)    return G.warn;
  return G.success;
};

// ── LocalStorage ──────────────────────────────────────────────────────────────
const ls = {
  get: (k, fb) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
    catch { return fb; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [services,    setServices]    = useState(() => ls.get("st3_services",    SERVICES));
  const [people,      setPeople]      = useState(() => ls.get("st3_people",      []));
  const [payments,    setPayments]    = useState(() => ls.get("st3_payments",    {}));
  const [accounts,    setAccounts]    = useState(() => ls.get("st3_accounts",    {}));
  const [screenshots, setScreenshots] = useState(() => ls.get("st3_screenshots", []));
  const [role,        setRole]        = useState(null);

  useEffect(() => { ls.set("st3_services",    services);    }, [services]);
  useEffect(() => { ls.set("st3_people",      people);      }, [people]);
  useEffect(() => { ls.set("st3_payments",    payments);    }, [payments]);
  useEffect(() => { ls.set("st3_accounts",    accounts);    }, [accounts]);
  useEffect(() => { ls.set("st3_screenshots", screenshots); }, [screenshots]);

  const pk   = (pid, sid, m, y) => `${pid}__${sid}__${y}__${m}`;
  const paid = (pid, sid, m, y) => !!payments[pk(pid, sid, m, y)];
  const tog  = (pid, sid, m, y) =>
    setPayments((p) => ({ ...p, [pk(pid, sid, m, y)]: !p[pk(pid, sid, m, y)] }));
  const svc  = (id) => services.find((s) => s.id === id);

  const shared = {
    services, setServices, people, setPeople, payments, setPayments,
    accounts, setAccounts, screenshots, setScreenshots,
    paid, tog, svc, onLogout: () => setRole(null),
  };

  if (!role)            return <LoginScreen people={people} services={services} onAdmin={() => setRole("admin")} onMember={(id) => setRole(id)} />;
  if (role === "admin") return <AdminApp {...shared} />;
  const person = people.find((p) => p.id === role);
  return <MemberApp person={person} {...shared} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginScreen
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ people, services, onAdmin, onMember }) {
  const [mode, setMode] = useState("choose");
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState(false);
  const [sel,  setSel]  = useState(null);

  const shake = () => { setErr(true); setPin(""); setTimeout(() => setErr(false), 900); };

  const submitPin = () => {
    if (mode === "admin-pin") { pin === ADMIN_PIN ? onAdmin() : shake(); }
    else { pin === sel.pin ? onMember(sel.id) : shake(); }
  };

  return (
    <div className="login-root">
      <div className="fade" style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📺</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 30, color: G.text, letterSpacing: "-1.5px" }}>
            StreamTrack
          </div>
          <div style={{ fontSize: 10, color: G.muted, marginTop: 4, letterSpacing: ".12em" }}>
            SUBSCRIPTION MANAGER
          </div>
        </div>

        {/* Choose role */}
        {mode === "choose" && (
          <div className="fade" style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Admin",  sub: "Full control & management",         icon: "🔐", bg: "#0d1a2e", next: "admin-pin" },
              { label: "Member", sub: "View your subscriptions & balance", icon: "👤", bg: "#0d2218", next: "member-select" },
            ].map((b) => (
              <button key={b.label} className="btn hl" onClick={() => setMode(b.next)}
                style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 13, padding: 18, color: G.text, display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: b.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{b.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* PIN entry */}
        {(mode === "admin-pin" || mode === "member-pin") && (
          <div className="fade card" style={{ padding: 26 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              {mode === "admin-pin" ? "Admin PIN" : `Hi, ${sel?.name}!`}
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 16 }}>Enter your PIN to continue</div>
            <input
              className="inp"
              type="password"
              maxLength={6}
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPin()}
              style={{ fontSize: 24, letterSpacing: 12, textAlign: "center", borderColor: err ? G.danger : undefined }}
            />
            {err && <div style={{ color: G.danger, fontSize: 11, textAlign: "center", marginTop: 8 }}>Wrong PIN — try again.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => { setMode(mode === "admin-pin" ? "choose" : "member-select"); setPin(""); setErr(false); }}
                style={{ flex: 1, background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
                Back
              </button>
              <button className="btn" onClick={submitPin}
                style={{ flex: 1, background: G.accent, color: "#fff", borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600 }}>
                Enter
              </button>
            </div>
          </div>
        )}

        {/* Member select */}
        {mode === "member-select" && (
          <div className="fade card" style={{ padding: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Select Your Name</div>
            {people.length === 0 ? (
              <div style={{ color: G.muted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                No members yet — ask your admin to add you.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                {people.map((p) => {
                  const subs = (p.subscriptions || []).map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);
                  return (
                    <button key={p.id} className="btn" onClick={() => { setSel(p); setMode("member-pin"); setPin(""); setErr(false); }}
                      style={{ background: G.inp, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", color: G.text, display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          {subs.map((s) => (
                            <span key={s.id} style={{ fontSize: 9, background: s.color + "22", color: s.color, border: `1px solid ${s.color}44`, borderRadius: 4, padding: "1px 5px" }}>
                              {s.icon}
                            </span>
                          ))}
                          {subs.length === 0 && <span style={{ fontSize: 10, color: G.muted }}>No subscriptions</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button className="btn" onClick={() => setMode("choose")}
              style={{ width: "100%", background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 12 }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminApp
// ─────────────────────────────────────────────────────────────────────────────
function AdminApp({ services, setServices, people, setPeople, accounts, setAccounts, screenshots, setScreenshots, paid, tog, svc, onLogout }) {
  const [tab,           setTab]           = useState("dashboard");
  const [activeService, setActiveService] = useState(null);
  const [editPerson,    setEditPerson]    = useState(null);
  const [profilePerson, setProfilePerson] = useState(null);
  const [fees,          setFees]          = useState({});
  const [showFees,      setShowFees]      = useState(false);
  const [acModal,       setAcModal]       = useState(null);
  const [acEdit,        setAcEdit]        = useState({ email: "", password: "", note: "" });
  const [viewShot,      setViewShot]      = useState(null);
  const fileRef = useRef();

  const allSubs   = () => people.flatMap((p) => (p.subscriptions || []).map((sid) => ({ person: p, sid })));
  const membersOf = (sid) => people.filter((p) => (p.subscriptions || []).includes(sid));
  const slotCount = (sid) => membersOf(sid).length;

  const totalCollected = () =>
    allSubs().reduce((s, { person, sid }) =>
      s + MONTH_KEYS.filter(({ month, year }) => paid(person.id, sid, month, year)).length * (svc(sid)?.monthlyFee || 0), 0);

  const totalOwed = () =>
    allSubs().reduce((s, { person, sid }) =>
      s + MONTH_KEYS.filter(({ month, year }) => !paid(person.id, sid, month, year)).length * (svc(sid)?.monthlyFee || 0), 0);

  const savePerson = () => {
    if (!editPerson?.name?.trim() || !editPerson?.pin?.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    if (editPerson.id) {
      setPeople((p) => p.map((x) => (x.id === editPerson.id ? { ...x, ...editPerson } : x)));
    } else {
      setPeople((p) => [...p, { ...editPerson, id: Date.now().toString(), subscriptions: editPerson.subscriptions || [], joinDate: editPerson.joinDate || today }]);
    }
    setEditPerson(null);
  };

  const openFees = () => { const f = {}; services.forEach((s) => { f[s.id] = s.monthlyFee; }); setFees(f); setShowFees(true); };
  const saveFees = () => { setServices((p) => p.map((s) => ({ ...s, monthlyFee: parseFloat(fees[s.id]) || 0 }))); setShowFees(false); };

  const openAc = (sid) => { setAcEdit({ ...(accounts[sid] || { email: "", password: "", note: "" }) }); setAcModal(sid); };
  const saveAc = () => { setAccounts((p) => ({ ...p, [acModal]: acEdit })); setAcModal(null); };

  const handleUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (ev) =>
      setScreenshots((p) => [{ id: Date.now().toString(), name: file.name, date: new Date().toLocaleDateString("en-PH"), dataUrl: ev.target.result }, ...p]);
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard",      icon: "⬛" },
    { id: "people",    label: "People",          icon: "👥" },
    { id: "tracker",   label: "Payment Tracker", icon: "📊" },
    { id: "accounts",  label: "Account Info",    icon: "🔑" },
    { id: "payments",  label: "Payment Method",  icon: "💳" },
  ];

  return (
    <div className="app-root">
      {/* Top bar */}
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📺</span>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-.5px" }}>StreamTrack</div>
            <div style={{ fontSize: 9, color: G.muted, letterSpacing: ".1em" }}>ADMIN</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={openFees} style={{ background: G.card, color: G.muted, border: `1px solid ${G.border}`, padding: "6px 11px", borderRadius: 7, fontSize: 11 }}>⚙ Fees</button>
          <button className="btn" onClick={() => setEditPerson({ name: "", pin: "", subscriptions: [], joinDate: "", endDate: "" })}
            style={{ background: G.accent, color: "#fff", padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600 }}>
            + Person
          </button>
          <button className="btn" onClick={onLogout} style={{ background: "#111827", color: G.muted, border: `1px solid ${G.border}`, padding: "6px 9px", borderRadius: 7, fontSize: 11 }}>✕</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => {
          const active = tab === t.id || (tab === "service" && t.id === "tracker");
          return (
            <button key={t.id} className={`tab-btn ${active ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      <div className="page-content">

        {/* ── Dashboard ── */}
        {tab === "dashboard" && (
          <div className="fade">
            <div className="summary-grid">
              {[
                { l: "PEOPLE",      v: people.length,          c: G.text,    i: "👥" },
                { l: "COLLECTED",   v: peso(totalCollected()), c: G.success, i: "✅" },
                { l: "OUTSTANDING", v: peso(totalOwed()),      c: G.danger,  i: "⏳" },
              ].map((x) => (
                <div key={x.l} className="card">
                  <div className="summary-label">{x.i} {x.l}</div>
                  <div className="summary-value" style={{ color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>

            <div className="services-grid">
              {services.map((s) => {
                const subs    = allSubs().filter((x) => x.sid === s.id);
                const paidCnt = subs.reduce((acc, { person }) => acc + MONTH_KEYS.filter(({ month, year }) => paid(person.id, s.id, month, year)).length, 0);
                const total   = subs.length * MONTH_KEYS.length;
                const pct     = total ? Math.round((paidCnt / total) * 100) : 0;
                const cnt     = slotCount(s.id);
                return (
                  <div key={s.id} className="card hl" onClick={() => { setActiveService(s.id); setTab("service"); }} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: s.color + "22", border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.color }}>
                        {s.icon}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: cnt >= MAX_SLOTS ? G.danger : G.muted }}>
                          {peso(s.monthlyFee)}/mo · {cnt}/{MAX_SLOTS} slots{cnt >= MAX_SLOTS ? " — FULL" : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                      {[{ v: subs.length, l: "members", c: G.text }, { v: paidCnt, l: "paid", c: G.success }, { v: total - paidCnt, l: "unpaid", c: G.danger }].map((x) => (
                        <div key={x.l}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: x.c }}>{x.v}</div>
                          <div style={{ fontSize: 9, color: G.muted }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ background: s.color, width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 9, color: G.muted, marginTop: 4 }}>{pct}% paid this period</div>
                  </div>
                );
              })}
            </div>

            {people.length > 0 && (
              <div className="card">
                <div className="section-title">This Month — All Subscriptions</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {people.map((person) => (
                    <PersonMonthCard key={person.id} person={person} services={services} paid={paid} tog={tog} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── People ── */}
        {tab === "people" && (
          <div className="fade">
            {people.length === 0 ? (
              <div style={{ textAlign: "center", color: G.muted, padding: "60px 0", fontSize: 13 }}>No people yet. Click "+ Person" to add someone.</div>
            ) : (
              <div className="people-list">
                {people.map((person) => {
                  const subs       = (person.subscriptions || []).map((sid) => svc(sid)).filter(Boolean);
                  const unpaidThis = subs.filter((s) => !paid(person.id, s.id, CUR_M, CUR_Y));
                  const totalDue   = MONTH_KEYS.reduce((acc, { month, year }) =>
                    acc + subs.filter((s) => !paid(person.id, s.id, month, year)).length * (s?.monthlyFee || 0), 0);
                  const dl = daysLeft(person.endDate);
                  const sc = expiryColor(person.endDate);
                  return (
                    <div key={person.id} className="card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setProfilePerson(person)}>
                          <div style={{ width: 42, height: 42, borderRadius: 11, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 19, color: G.text }}>
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: G.muted }}>
                              {person.name}
                            </div>
                            <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>PIN: {person.pin} · {subs.length} subscription{subs.length !== 1 ? "s" : ""}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn" onClick={() => setProfilePerson(person)} style={{ background: "#1a2540", color: G.text, border: `1px solid ${G.border}`, borderRadius: 7, padding: "5px 11px", fontSize: 11 }}>👤 Profile</button>
                          <button className="btn" onClick={() => setEditPerson({ ...person })} style={{ background: G.accent + "22", color: G.accent, border: `1px solid ${G.accent}44`, borderRadius: 7, padding: "5px 11px", fontSize: 11 }}>✏ Edit</button>
                          <button className="btn" onClick={() => setPeople((p) => p.filter((x) => x.id !== person.id))} style={{ background: G.danger + "22", color: G.danger, border: `1px solid ${G.danger}44`, borderRadius: 7, padding: "5px 11px", fontSize: 11 }}>✕</button>
                        </div>
                      </div>

                      <div className="date-row">
                        <div>
                          <div className="date-label">📅 JOINED</div>
                          <div className="date-value">{fmtDate(person.joinDate)}</div>
                        </div>
                        <div className="date-row-divider" />
                        <div>
                          <div className="date-label">🔚 LAST SUBSCRIPTION</div>
                          <div className="date-value" style={{ color: sc }}>{fmtDate(person.endDate)}</div>
                        </div>
                        {person.endDate && (
                          <>
                            <div className="date-row-divider" />
                            <div>
                              <div className="date-label">⏱ STATUS</div>
                              <div className="date-value" style={{ color: sc }}>
                                {dl < 0 ? `Expired ${Math.abs(dl)}d ago` : dl === 0 ? "Expires today!" : `${dl}d left`}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="svc-badges">
                        {subs.length === 0 ? (
                          <span style={{ fontSize: 11, color: G.muted }}>No subscriptions assigned</span>
                        ) : subs.map((s) => {
                          const p = paid(person.id, s.id, CUR_M, CUR_Y);
                          return (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: s.color + "18", border: `1px solid ${s.color}44`, borderRadius: 8, padding: "5px 10px" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.icon} {s.name}</span>
                              <span className="chip" style={{ background: p ? G.success + "22" : G.danger + "22", color: p ? G.success : G.danger, fontSize: 9 }}>{p ? "✓ PAID" : "DUE"}</span>
                            </div>
                          );
                        })}
                      </div>

                      {totalDue > 0 && (
                        <div className="alert-bar">
                          ⚠ Total outstanding: <strong>{peso(totalDue)}</strong>
                          {unpaidThis.length > 0 && <span style={{ color: G.muted }}> · This month: {unpaidThis.map((s) => s.name).join(", ")}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payment Tracker ── */}
        {tab === "tracker" && (
          <div className="fade tracker-list">
            {services.map((s) => {
              const members    = membersOf(s.id);
              const paidCnt    = members.reduce((acc, p) => acc + MONTH_KEYS.filter(({ month, year }) => paid(p.id, s.id, month, year)).length, 0);
              const unpaidThis = members.filter((p) => !paid(p.id, s.id, CUR_M, CUR_Y));
              return (
                <div key={s.id} className="card hl" onClick={() => { setActiveService(s.id); setTab("service"); }}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: s.color + "22", border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: s.color, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: s.color }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: G.muted, marginTop: 3 }}>{peso(s.monthlyFee)}/mo · {slotCount(s.id)}/{MAX_SLOTS} slots</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {unpaidThis.length > 0 ? (
                      <div style={{ fontSize: 12, color: G.danger, fontWeight: 600 }}>{unpaidThis.length} unpaid this month</div>
                    ) : members.length > 0 ? (
                      <div style={{ fontSize: 12, color: G.success, fontWeight: 600 }}>All paid ✓</div>
                    ) : (
                      <div style={{ fontSize: 12, color: G.muted }}>No members</div>
                    )}
                    <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{paidCnt} payments recorded</div>
                  </div>
                  <span style={{ fontSize: 18, color: G.muted }}>›</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Service Detail ── */}
        {tab === "service" && activeService && (
          <ServiceDetail sid={activeService} services={services} people={people} paid={paid} tog={tog} svc={svc} onBack={() => setTab("tracker")} />
        )}

        {/* ── Account Info ── */}
        {tab === "accounts" && (
          <div className="fade" style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 11, color: G.muted, padding: "8px 12px", background: G.card, borderRadius: 8, border: `1px solid ${G.border}` }}>
              🔒 Admin only — not visible to members
            </div>
            {services.map((s) => {
              const ac = accounts[s.id] || {};
              return (
                <div key={s.id} className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.color }}>{s.icon}</div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14 }}>{s.name}</div>
                    </div>
                    <button className="btn" onClick={() => openAc(s.id)} style={{ background: G.accent + "22", color: G.accent, border: `1px solid ${G.accent}44`, borderRadius: 7, padding: "5px 11px", fontSize: 11 }}>✏ Edit</button>
                  </div>
                  {ac.email ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {[["EMAIL", ac.email], ["PASSWORD", ac.password], ac.note && ["NOTES", ac.note]].filter(Boolean).map(([l, v]) => (
                        <div key={l} style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 9, color: G.muted, width: 72, flexShrink: 0, letterSpacing: ".07em", paddingTop: 2 }}>{l}</span>
                          <span style={{ fontSize: 12, wordBreak: "break-all" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: G.muted }}>No credentials saved yet.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Payment Method ── */}
        {tab === "payments" && (
          <div className="fade">
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14, padding: "8px 12px", background: G.card, borderRadius: 8, border: `1px solid ${G.border}` }}>
              📎 Upload GCash QR, PayMaya, or bank details — members will see this
            </div>
            <div className="drop" onClick={() => fileRef.current?.click()} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>📷</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14 }}>Upload Payment Screenshot</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>PNG · JPG · WEBP</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
            </div>
            {screenshots.length === 0 ? (
              <div style={{ textAlign: "center", color: G.muted, padding: "30px 0", fontSize: 12 }}>No screenshots yet.</div>
            ) : (
              <div className="screenshot-grid">
                {screenshots.map((s) => (
                  <div key={s.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <img src={s.dataUrl} alt={s.name} onClick={() => setViewShot(s)} style={{ width: "100%", height: 140, objectFit: "cover", cursor: "pointer", display: "block" }} />
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{s.name}</div>
                        <div style={{ fontSize: 9, color: G.muted }}>{s.date}</div>
                      </div>
                      <button className="btn" onClick={() => setScreenshots((p) => p.filter((x) => x.id !== s.id))}
                        style={{ background: G.danger + "22", color: G.danger, borderRadius: 5, padding: "3px 7px", fontSize: 11 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Add / Edit Person ── */}
      {editPerson !== null && (
        <Modal onClose={() => setEditPerson(null)}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 18 }}>
            {editPerson.id ? "Edit Person" : "Add New Person"}
          </div>
          {[
            { label: "FULL NAME",  field: "name", ph: "e.g. Juan Dela Cruz", type: "text",     max: 100 },
            { label: "LOGIN PIN",  field: "pin",  ph: "e.g. 1234",           type: "text",     max: 6   },
          ].map(({ label, field, ph, type, max }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 5, letterSpacing: ".07em" }}>{label}</div>
              <input className="inp" type={type} maxLength={max} value={editPerson[field]}
                onChange={(e) => setEditPerson((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={ph} autoFocus={field === "name"} />
              {field === "pin" && <div style={{ fontSize: 9, color: G.muted, marginTop: 5 }}>Share this PIN with them so they can log in</div>}
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "📅 JOIN DATE",         field: "joinDate" },
              { label: "🔚 LAST SUBSCRIPTION", field: "endDate"  },
            ].map(({ label, field }) => (
              <div key={field}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 5, letterSpacing: ".07em" }}>{label}</div>
                <input className="inp" type="date" value={editPerson[field] || ""}
                  onChange={(e) => setEditPerson((p) => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: G.muted, marginBottom: 10, letterSpacing: ".07em" }}>SUBSCRIPTIONS</div>
            <div style={{ display: "grid", gap: 8 }}>
              {services.map((s) => {
                const has          = (editPerson.subscriptions || []).includes(s.id);
                const currentCount = people.filter((p) => p.id !== editPerson.id && (p.subscriptions || []).includes(s.id)).length;
                const full         = !has && currentCount >= MAX_SLOTS;
                return (
                  <div key={s.id} onClick={() => {
                    if (full) return;
                    const cur = editPerson.subscriptions || [];
                    setEditPerson((p) => ({ ...p, subscriptions: has ? cur.filter((x) => x !== s.id) : [...cur, s.id] }));
                  }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: has ? s.color + "18" : G.inp, border: `1px solid ${full ? G.danger + "33" : has ? s.color + "55" : G.border}`, borderRadius: 9, cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.6 : 1 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: full ? G.muted : s.color, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: full ? G.muted : has ? s.color : G.text }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: G.muted, display: "flex", gap: 8 }}>
                        <span>{peso(s.monthlyFee)}/mo</span>
                        <span style={{ color: full ? G.danger : currentCount >= MAX_SLOTS - 1 && !has ? G.warn : G.muted }}>
                          {currentCount + (has ? 1 : 0)}/{MAX_SLOTS} slots{full ? " — FULL" : ""}
                        </span>
                      </div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: has ? s.color : "transparent", border: `2px solid ${has ? s.color : full ? G.danger + "55" : G.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
                      {has ? "✓" : full ? "✕" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setEditPerson(null)} style={{ flex: 1, background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>Cancel</button>
            <button className="btn" onClick={savePerson} style={{ flex: 1, background: G.accent, color: "#fff", borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600 }}>Save</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Fees ── */}
      {showFees && (
        <Modal onClose={() => setShowFees(false)}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 18 }}>Monthly Fee per Slot (₱)</div>
          {services.map((s) => (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: s.color, marginBottom: 5, letterSpacing: ".07em" }}>{s.name.toUpperCase()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: G.muted, fontSize: 16 }}>₱</span>
                <input className="inp" type="number" min="0" step="0.01" value={fees[s.id] || 0}
                  onChange={(e) => setFees((f) => ({ ...f, [s.id]: e.target.value }))} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="btn" onClick={() => setShowFees(false)} style={{ flex: 1, background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>Cancel</button>
            <button className="btn" onClick={saveFees} style={{ flex: 1, background: G.accent, color: "#fff", borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600 }}>Save</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Account ── */}
      {acModal && (
        <Modal onClose={() => setAcModal(null)}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{svc(acModal)?.name} — Account Info</div>
          <div style={{ fontSize: 11, color: G.muted, marginBottom: 18 }}>🔒 Admin only</div>
          {[["EMAIL / USERNAME", "email", "account@email.com", "text"], ["PASSWORD", "password", "your password", "text"], ["NOTES", "note", "Profile, plan, etc.", "textarea"]].map(([l, f, ph, t]) => (
            <div key={f} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 5, letterSpacing: ".07em" }}>{l}</div>
              {t === "textarea"
                ? <textarea className="inp" rows={2} value={acEdit[f]} onChange={(e) => setAcEdit((a) => ({ ...a, [f]: e.target.value }))} placeholder={ph} />
                : <input className="inp" value={acEdit[f]} onChange={(e) => setAcEdit((a) => ({ ...a, [f]: e.target.value }))} placeholder={ph} />
              }
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="btn" onClick={() => setAcModal(null)} style={{ flex: 1, background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>Cancel</button>
            <button className="btn" onClick={saveAc} style={{ flex: 1, background: G.accent, color: "#fff", borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600 }}>Save</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Profile ── */}
      {profilePerson && (
        <ProfileModal person={profilePerson} services={services} paid={paid} onClose={() => setProfilePerson(null)} />
      )}

      {/* ── Modal: Screenshot ── */}
      {viewShot && (
        <Modal onClose={() => setViewShot(null)} wide>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{viewShot.name}</div>
          <img src={viewShot.dataUrl} alt={viewShot.name} style={{ width: "100%", borderRadius: 8, maxHeight: 480, objectFit: "contain" }} />
          <button className="btn" onClick={() => setViewShot(null)} style={{ width: "100%", background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 12 }}>Close</button>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileModal
// ─────────────────────────────────────────────────────────────────────────────
function ProfileModal({ person, services, paid, onClose }) {
  const subs         = (person.subscriptions || []).map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const memberMonths = genMonths(person.joinDate || null);
  const dl           = daysLeft(person.endDate);
  const sc           = expiryColor(person.endDate);

  const totalCollected = subs.reduce((acc, s) =>
    acc + memberMonths.filter(({ month, year }) => paid(person.id, s.id, month, year)).length * (s.monthlyFee || 0), 0);
  const totalOwed = subs.reduce((acc, s) =>
    acc + memberMonths.filter(({ month, year }) => !paid(person.id, s.id, month, year)).length * (s.monthlyFee || 0), 0);

  return (
    <Modal onClose={onClose} wide>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: G.text, margin: "0 auto 10px" }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>{person.name}</div>
        <div style={{ fontSize: 11, color: G.muted, marginTop: 3 }}>{subs.length} subscription{subs.length !== 1 ? "s" : ""}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: G.inp, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div className="date-label">📅 MEMBER SINCE</div>
          <div className="date-value">{fmtDate(person.joinDate)}</div>
        </div>
        <div style={{ background: G.inp, border: `1px solid ${person.endDate ? sc + "55" : G.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div className="date-label">🔚 LAST SUBSCRIPTION</div>
          <div className="date-value" style={{ color: sc }}>{fmtDate(person.endDate)}</div>
          {person.endDate && <div style={{ fontSize: 10, color: sc, marginTop: 3 }}>{dl < 0 ? `Expired ${Math.abs(dl)}d ago` : dl === 0 ? "Expires today!" : `${dl}d left`}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: G.success + "11", border: `1px solid ${G.success}33`, borderRadius: 10, padding: "12px 14px" }}>
          <div className="date-label">✅ TOTAL COLLECTED</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: G.success }}>{peso(totalCollected)}</div>
        </div>
        <div style={{ background: totalOwed > 0 ? G.danger + "11" : G.success + "11", border: `1px solid ${totalOwed > 0 ? G.danger + "33" : G.success + "33"}`, borderRadius: 10, padding: "12px 14px" }}>
          <div className="date-label">⏳ BALANCE DUE</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: totalOwed > 0 ? G.danger : G.success }}>{peso(totalOwed)}</div>
        </div>
      </div>

      {subs.map((s) => {
        const paidMs   = memberMonths.filter(({ month, year }) =>  paid(person.id, s.id, month, year));
        const unpaidMs = memberMonths.filter(({ month, year }) => !paid(person.id, s.id, month, year));
        return (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: s.color }}>{s.icon}</div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: s.color }}>{s.name}</span>
              <span style={{ fontSize: 10, color: G.muted, marginLeft: "auto" }}>{paidMs.length} paid · {unpaidMs.length} unpaid</span>
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {[...memberMonths].reverse().map(({ month, year, label }) => {
                const p   = paid(person.id, s.id, month, year);
                const cur = month === CUR_M && year === CUR_Y;
                return (
                  <div key={`${month}-${year}`} className="month-row" style={{ border: `1px solid ${p ? G.success + "22" : cur ? s.color + "33" : G.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {cur && <span style={{ fontSize: 8, color: s.color, border: `1px solid ${s.color}55`, borderRadius: 99, padding: "1px 5px" }}>NOW</span>}
                      {label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, color: p ? G.success : G.muted }}>{peso(s.monthlyFee)}</span>
                      <span className="chip" style={{ background: p ? G.success + "22" : G.danger + "22", color: p ? G.success : G.danger, border: `1px solid ${p ? G.success + "44" : G.danger + "44"}`, fontSize: 9 }}>{p ? "PAID" : "DUE"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {unpaidMs.length > 0 && (
              <div style={{ marginTop: 6, background: G.danger + "0d", border: `1px solid ${G.danger}33`, borderRadius: 7, padding: "6px 10px", fontSize: 10, color: G.danger }}>
                Missing {unpaidMs.length} month{unpaidMs.length !== 1 ? "s" : ""} · {peso(unpaidMs.length * (s.monthlyFee || 0))} total due
              </div>
            )}
          </div>
        );
      })}

      <button className="btn" onClick={onClose} style={{ width: "100%", background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 4 }}>Close</button>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceDetail
// ─────────────────────────────────────────────────────────────────────────────
function ServiceDetail({ sid, services, people, paid, tog, svc, onBack }) {
  const s       = svc(sid);
  const members = people.filter((p) => (p.subscriptions || []).includes(sid));
  return (
    <div className="fade">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn" onClick={onBack} style={{ background: G.card, color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: s.color + "22", border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: s.color }}>{s.icon}</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: s.color }}>{s.name}</div>
            <div style={{ fontSize: 10, color: G.muted }}>{peso(s.monthlyFee)}/mo · {members.length}/{MAX_SLOTS} slots</div>
          </div>
        </div>
      </div>
      {members.length === 0 ? (
        <div style={{ textAlign: "center", color: G.muted, padding: "40px 0", fontSize: 13 }}>No members on this service yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {members.map((person) => {
            const p         = paid(person.id, sid, CUR_M, CUR_Y);
            const earned    = MONTH_KEYS.filter(({ month, year }) => paid(person.id, sid, month, year)).length * (s?.monthlyFee || 0);
            const unpaidCnt = MONTH_KEYS.filter(({ month, year }) => !paid(person.id, sid, month, year)).length;
            return (
              <div key={person.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: G.card, borderRadius: 11, border: `1px solid ${p ? G.success + "33" : G.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: G.text, flexShrink: 0 }}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{person.name}</div>
                    <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
                      Collected: <span style={{ color: G.success }}>{peso(earned)}</span>
                      {unpaidCnt > 0 && <span style={{ color: G.danger, marginLeft: 6 }}>· {unpaidCnt} mo unpaid</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="chip" style={{ background: p ? G.success + "22" : G.danger + "22", color: p ? G.success : G.danger, border: `1px solid ${p ? G.success + "44" : G.danger + "44"}`, fontSize: 11 }}>
                    {p ? "PAID" : "UNPAID"}
                  </span>
                  <div className="tog" onClick={() => tog(person.id, sid, CUR_M, CUR_Y)} style={{ background: p ? G.success : "#1e2a44" }}>
                    <span style={{ left: p ? 20 : 3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonMonthCard
// ─────────────────────────────────────────────────────────────────────────────
function PersonMonthCard({ person, services, paid, tog }) {
  const [open, setOpen] = useState(true);
  const subs        = (person.subscriptions || []).map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const unpaidCount = subs.filter((s) => !paid(person.id, s.id, CUR_M, CUR_Y)).length;
  const allPaid     = unpaidCount === 0 && subs.length > 0;
  const totalDue    = subs.reduce((acc, s) => acc + (!paid(person.id, s.id, CUR_M, CUR_Y) ? (s.monthlyFee || 0) : 0), 0);

  return (
    <div style={{ background: G.inp, border: `1px solid ${allPaid ? G.success + "33" : unpaidCount > 0 ? G.danger + "22" : G.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer", userSelect: "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: G.text, flexShrink: 0 }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14 }}>{person.name}</div>
          <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
            {subs.length} service{subs.length !== 1 ? "s" : ""}
            {unpaidCount > 0 && <span style={{ color: G.danger, marginLeft: 8 }}>· {unpaidCount} unpaid · {peso(totalDue)} due</span>}
            {allPaid && <span style={{ color: G.success, marginLeft: 8 }}>· All paid ✓</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
          {subs.map((s) => {
            const p = paid(person.id, s.id, CUR_M, CUR_Y);
            return (
              <div key={s.id} style={{ width: 24, height: 24, borderRadius: 5, background: s.color + "22", border: `1px solid ${p ? s.color + "66" : G.danger + "55"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: p ? s.color : G.danger }}>
                {s.icon}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 14, color: G.muted, display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
      </div>
      {open && subs.length > 0 && (
        <div style={{ borderTop: `1px solid ${G.border}`, padding: "8px 12px", display: "grid", gap: 7 }}>
          {subs.map((s) => {
            const p = paid(person.id, s.id, CUR_M, CUR_Y);
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: G.card, borderRadius: 8, border: `1px solid ${p ? G.success + "22" : G.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: G.muted }}>{peso(s.monthlyFee)}/mo</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="chip" style={{ background: p ? G.success + "22" : G.danger + "22", color: p ? G.success : G.danger, border: `1px solid ${p ? G.success + "44" : G.danger + "44"}` }}>{p ? "PAID" : "UNPAID"}</span>
                  <div className="tog" onClick={(e) => { e.stopPropagation(); tog(person.id, s.id, CUR_M, CUR_Y); }} style={{ background: p ? G.success : "#1e2a44" }}>
                    <span style={{ left: p ? 20 : 3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && subs.length === 0 && (
        <div style={{ borderTop: `1px solid ${G.border}`, padding: "10px 14px", fontSize: 11, color: G.muted }}>No subscriptions assigned.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MemberApp
// ─────────────────────────────────────────────────────────────────────────────
function MemberApp({ person, services, paid, screenshots, onLogout }) {
  const [viewShot, setViewShot] = useState(null);

  if (!person) return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", alignItems: "center", justifyContent: "center", color: G.muted }}>
      Person not found. <button className="btn" onClick={onLogout} style={{ marginLeft: 10, color: G.accent, background: "none", fontSize: 13 }}>Logout</button>
    </div>
  );

  const subs         = (person.subscriptions || []).map((id) => services.find((s) => s.id === id)).filter(Boolean);
  const memberMonths = genMonths(person.joinDate || null);
  const unpaidThisM  = subs.filter((s) => !paid(person.id, s.id, CUR_M, CUR_Y));
  const allPaidThisM = unpaidThisM.length === 0 && subs.length > 0;
  const dl           = daysLeft(person.endDate);
  const sc           = expiryColor(person.endDate);

  const totalPaidAmt = subs.reduce((acc, s) =>
    acc + memberMonths.filter(({ month, year }) =>  paid(person.id, s.id, month, year)).length * (s.monthlyFee || 0), 0);
  const totalOwedAmt = subs.reduce((acc, s) =>
    acc + memberMonths.filter(({ month, year }) => !paid(person.id, s.id, month, year)).length * (s.monthlyFee || 0), 0);

  return (
    <div className="app-root">
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1a2540", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16 }}>{person.name}</div>
            <div style={{ fontSize: 10, color: G.muted }}>{subs.length} subscription{subs.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <button className="btn" onClick={onLogout} style={{ background: "#111827", color: G.muted, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 7, fontSize: 11 }}>✕ Logout</button>
      </div>

      <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }} className="fade">
        {/* Status banner */}
        <div className="status-banner" style={{ background: allPaidThisM ? G.success + "11" : G.danger + "11", border: `1px solid ${allPaidThisM ? G.success + "44" : G.danger + "44"}` }}>
          <div className="status-banner-icon">{subs.length === 0 ? "📭" : allPaidThisM ? "🎉" : "⚠️"}</div>
          <div className="status-banner-title" style={{ color: allPaidThisM ? G.success : G.danger }}>
            {subs.length === 0 ? "No subscriptions" : allPaidThisM ? "All paid this month!" : `${unpaidThisM.length} unpaid this month`}
          </div>
          {unpaidThisM.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {unpaidThisM.map((s) => (
                <span key={s.id} style={{ background: s.color + "22", color: s.color, border: `1px solid ${s.color}55`, borderRadius: 99, fontSize: 11, padding: "3px 10px", fontWeight: 600 }}>
                  {s.icon} {s.name} — {peso(s.monthlyFee)} due
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Subscription end */}
        {person.endDate && (
          <div style={{ background: G.card, border: `1px solid ${sc}55`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="date-label">🔚 SUBSCRIPTION ENDS</div>
              <div className="date-value" style={{ color: sc }}>{fmtDate(person.endDate)}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: sc }}>
              {dl < 0 ? `Expired ${Math.abs(dl)}d ago` : dl === 0 ? "Today!" : `${dl}d left`}
            </div>
          </div>
        )}

        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { l: "✅ TOTAL PAID",  v: peso(totalPaidAmt), c: G.success },
            { l: "⏳ BALANCE DUE", v: peso(totalOwedAmt), c: totalOwedAmt > 0 ? G.danger : G.success },
          ].map((x) => (
            <div key={x.l} className="card">
              <div className="date-label">{x.l}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>

        {/* Per-service monthly calendar */}
        {subs.map((s) => {
          const dueMs = memberMonths.filter(({ month, year }) => !paid(person.id, s.id, month, year));
          const curPd = paid(person.id, s.id, CUR_M, CUR_Y);
          return (
            <div key={s.id} className="card" style={{ border: `1px solid ${curPd ? G.border : s.color + "44"}`, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: s.color + "22", border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.color }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: G.muted }}>{peso(s.monthlyFee)}/mo</div>
                </div>
                <span className="chip" style={{ background: curPd ? G.success + "22" : G.danger + "22", color: curPd ? G.success : G.danger, border: `1px solid ${curPd ? G.success + "44" : G.danger + "44"}`, fontSize: 10 }}>
                  {curPd ? "✓ PAID" : "DUE THIS MONTH"}
                </span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {[...memberMonths].reverse().map(({ month, year, label }) => {
                  const p   = paid(person.id, s.id, month, year);
                  const cur = month === CUR_M && year === CUR_Y;
                  return (
                    <div key={`${month}-${year}`} className="month-row" style={{ border: `1px solid ${p ? G.success + "22" : cur ? s.color + "33" : G.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        {cur && <span style={{ fontSize: 8, color: s.color, border: `1px solid ${s.color}55`, borderRadius: 99, padding: "1px 5px" }}>NOW</span>}
                        {label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, color: p ? G.success : G.muted }}>{peso(s.monthlyFee)}</span>
                        <span className="chip" style={{ background: p ? G.success + "22" : G.danger + "22", color: p ? G.success : G.danger, border: `1px solid ${p ? G.success + "44" : G.danger + "44"}`, fontSize: 9 }}>{p ? "PAID" : "DUE"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {dueMs.length > 0 && (
                <div style={{ marginTop: 10, background: G.danger + "0d", border: `1px solid ${G.danger}33`, borderRadius: 7, padding: "7px 10px", fontSize: 11, color: G.danger }}>
                  Missing {dueMs.length} month{dueMs.length !== 1 ? "s" : ""} · {peso(dueMs.length * (s.monthlyFee || 0))} total due
                </div>
              )}
            </div>
          );
        })}

        {/* How to Pay */}
        {screenshots.length > 0 && (
          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>How to Pay</div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14 }}>Send payment via the details below, then message your admin.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {screenshots.map((s) => (
                <div key={s.id} onClick={() => setViewShot(s)} style={{ cursor: "pointer", borderRadius: 9, overflow: "hidden", border: `1px solid ${G.border}` }}>
                  <img src={s.dataUrl} alt={s.name} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "5px 8px", fontSize: 9, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewShot && (
        <Modal onClose={() => setViewShot(null)} wide>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{viewShot.name}</div>
          <img src={viewShot.dataUrl} alt={viewShot.name} style={{ width: "100%", borderRadius: 8, maxHeight: 500, objectFit: "contain" }} />
          <button className="btn" onClick={() => setViewShot(null)} style={{ width: "100%", background: "#111827", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, padding: 10, fontSize: 12, marginTop: 12 }}>Close</button>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, wide }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box fade ${wide ? "wide" : "narrow"}`}>
        {children}
      </div>
    </div>
  );
}