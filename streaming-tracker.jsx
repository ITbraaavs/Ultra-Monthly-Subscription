import { useState, useEffect } from "react";

const SERVICES = [
  { id: "netflix", name: "Netflix", color: "#E50914", bg: "#1a0000", icon: "N", monthlyFee: 0 },
  { id: "disney", name: "Disney+", color: "#006EFF", bg: "#00071a", icon: "D+", monthlyFee: 0 },
  { id: "prime", name: "Prime Video", color: "#00A8E1", bg: "#001a24", icon: "P", monthlyFee: 0 },
  { id: "max", name: "Max", color: "#9B59FF", bg: "#0d001a", icon: "M", monthlyFee: 0 },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();
const CURRENT_MONTH = now.getMonth();
const CURRENT_YEAR = now.getFullYear();

function generateMonths(count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(CURRENT_YEAR, CURRENT_MONTH - i, 1);
    months.push({ month: d.getMonth(), year: d.getFullYear(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return months;
}

const MONTH_KEYS = generateMonths(6);

export default function App() {
  const [services, setServices] = useState(() => {
    try {
      const saved = localStorage.getItem("st_services");
      return saved ? JSON.parse(saved) : SERVICES;
    } catch { return SERVICES; }
  });

  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem("st_members");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem("st_payments");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [view, setView] = useState("dashboard");
  const [activeService, setActiveService] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", service: "netflix" });
  const [showFeeEditor, setShowFeeEditor] = useState(false);
  const [fees, setFees] = useState({});

  useEffect(() => {
    try { localStorage.setItem("st_members", JSON.stringify(members)); } catch {}
  }, [members]);
  useEffect(() => {
    try { localStorage.setItem("st_payments", JSON.stringify(payments)); } catch {}
  }, [payments]);
  useEffect(() => {
    try { localStorage.setItem("st_services", JSON.stringify(services)); } catch {}
  }, [services]);

  const getPaymentKey = (memberId, month, year) => `${memberId}_${year}_${month}`;

  const togglePayment = (memberId, month, year) => {
    const key = getPaymentKey(memberId, month, year);
    setPayments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPaid = (memberId, month, year) => {
    return !!payments[getPaymentKey(memberId, month, year)];
  };

  const getMembersForService = (serviceId) => members.filter(m => m.service === serviceId);

  const getServiceStats = (serviceId) => {
    const svcMembers = getMembersForService(serviceId);
    const svc = services.find(s => s.id === serviceId);
    let totalPaid = 0, totalDue = 0;
    svcMembers.forEach(m => {
      MONTH_KEYS.forEach(({ month, year }) => {
        if (isPaid(m.id, month, year)) totalPaid++;
        else totalDue++;
      });
    });
    const fee = svc?.monthlyFee || 0;
    return { totalPaid, totalDue, members: svcMembers.length, fee };
  };

  const getTotalOwed = () => {
    let total = 0;
    members.forEach(m => {
      const svc = services.find(s => s.id === m.service);
      MONTH_KEYS.forEach(({ month, year }) => {
        if (!isPaid(m.id, month, year)) total += (svc?.monthlyFee || 0);
      });
    });
    return total;
  };

  const getTotalCollected = () => {
    let total = 0;
    members.forEach(m => {
      const svc = services.find(s => s.id === m.service);
      MONTH_KEYS.forEach(({ month, year }) => {
        if (isPaid(m.id, month, year)) total += (svc?.monthlyFee || 0);
      });
    });
    return total;
  };

  const addMember = () => {
    if (!newMember.name.trim()) return;
    setMembers(prev => [...prev, { id: Date.now().toString(), name: newMember.name.trim(), service: newMember.service }]);
    setNewMember({ name: "", service: newMember.service });
    setShowAddMember(false);
  };

  const removeMember = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const saveFees = () => {
    setServices(prev => prev.map(s => ({ ...s, monthlyFee: parseFloat(fees[s.id]) || 0 })));
    setShowFeeEditor(false);
  };

  const openFeeEditor = () => {
    const f = {};
    services.forEach(s => { f[s.id] = s.monthlyFee; });
    setFees(f);
    setShowFeeEditor(true);
  };

  const currentService = services.find(s => s.id === activeService);
  const serviceMembers = activeService ? getMembersForService(activeService) : [];

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .btn { cursor: pointer; border: none; transition: all 0.15s ease; }
        .btn:active { transform: scale(0.97); }
        .card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .card-hover:hover { transform: translateY(-2px); }
        .toggle-paid { cursor: pointer; border-radius: 4px; transition: all 0.15s ease; }
        .toggle-paid:hover { opacity: 0.85; }
        input { outline: none; }
        input:focus { border-color: #fff !important; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        select { appearance: none; cursor: pointer; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f1f1f", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0a0a0a", zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>📺 StreamTrack</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>SUBSCRIPTION PAYMENT TRACKER</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={openFeeEditor} style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a", padding: "6px 12px", borderRadius: 6, fontSize: 11 }}>⚙ Fees</button>
          <button className="btn" onClick={() => { setShowAddMember(true); setView("dashboard"); setActiveService(null); }} style={{ background: "#fff", color: "#000", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>+ Add Member</button>
        </div>
      </div>

      <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }} className="fade-in">
          <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>TOTAL MEMBERS</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{members.length}</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #1a2a1a", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>COLLECTED</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#4ade80" }}>${getTotalCollected().toFixed(2)}</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #2a1a1a", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>OUTSTANDING</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#f87171" }}>${getTotalOwed().toFixed(2)}</div>
          </div>
        </div>

        {/* Service Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {services.map(svc => {
            const stats = getServiceStats(svc.id);
            const isActive = activeService === svc.id;
            return (
              <div key={svc.id} className="card-hover" onClick={() => { setActiveService(isActive ? null : svc.id); setView("service"); }}
                style={{ background: isActive ? svc.bg : "#111", border: `1px solid ${isActive ? svc.color + "55" : "#1f1f1f"}`, borderRadius: 12, padding: 16, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                {isActive && <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${svc.color}22, transparent 70%)` }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: svc.color + "22", border: `1px solid ${svc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: svc.color }}>
                    {svc.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>${svc.monthlyFee}/mo per member</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{stats.members}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>members</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#4ade80" }}>{stats.totalPaid}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>paid</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#f87171" }}>{stats.totalDue}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>unpaid</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Service Detail */}
        {activeService && currentService && (
          <div className="fade-in" style={{ background: "#111", border: `1px solid ${currentService.color}33`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: currentService.color }}>{currentService.name} — Members</div>
              <button className="btn" onClick={() => { setShowAddMember(true); setNewMember(n => ({ ...n, service: activeService })); }}
                style={{ background: currentService.color + "22", color: currentService.color, border: `1px solid ${currentService.color}44`, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                + Add
              </button>
            </div>

            {serviceMembers.length === 0 ? (
              <div style={{ textAlign: "center", color: "#444", padding: "30px 0", fontSize: 13 }}>No members yet. Add someone above!</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#444", fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", borderBottom: "1px solid #1f1f1f", minWidth: 120 }}>MEMBER</th>
                      {MONTH_KEYS.map(({ label }, i) => (
                        <th key={i} style={{ textAlign: "center", padding: "8px 6px", color: "#444", fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", borderBottom: "1px solid #1f1f1f", minWidth: 70 }}>
                          {label.toUpperCase()}
                        </th>
                      ))}
                      <th style={{ textAlign: "center", padding: "8px 6px", color: "#444", fontWeight: 400, fontSize: 10, borderBottom: "1px solid #1f1f1f", minWidth: 60 }}>DEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceMembers.map(member => (
                      <tr key={member.id} style={{ borderBottom: "1px solid #161616" }}>
                        <td style={{ padding: "10px 10px", fontWeight: 500 }}>{member.name}</td>
                        {MONTH_KEYS.map(({ month, year, label }, i) => {
                          const paid = isPaid(member.id, month, year);
                          const isCurrent = month === CURRENT_MONTH && year === CURRENT_YEAR;
                          return (
                            <td key={i} style={{ textAlign: "center", padding: "10px 6px" }}>
                              <div className="toggle-paid" onClick={() => togglePayment(member.id, month, year)}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 22, borderRadius: 4, background: paid ? "#4ade8022" : "#1a1a1a", border: `1px solid ${paid ? "#4ade8066" : isCurrent ? currentService.color + "66" : "#2a2a2a"}`, fontSize: 11, color: paid ? "#4ade80" : isCurrent ? currentService.color : "#333", fontWeight: 600 }}>
                                {paid ? "✓" : "—"}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "center", padding: "10px 6px" }}>
                          <button className="btn" onClick={() => removeMember(member.id)}
                            style={{ background: "transparent", color: "#444", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* All Members Overview */}
        {!activeService && members.length > 0 && (
          <div className="fade-in" style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>All Members — This Month</div>
            <div style={{ display: "grid", gap: 8 }}>
              {members.map(member => {
                const svc = services.find(s => s.id === member.service);
                const paid = isPaid(member.id, CURRENT_MONTH, CURRENT_YEAR);
                return (
                  <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#0d0d0d", borderRadius: 8, border: `1px solid ${paid ? "#4ade8022" : "#1f1f1f"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: svc?.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: svc?.color }}>{svc?.icon}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{member.name}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{svc?.name} · ${svc?.monthlyFee}/mo</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="pill" style={{ background: paid ? "#4ade8022" : "#f8717122", color: paid ? "#4ade80" : "#f87171", border: `1px solid ${paid ? "#4ade8044" : "#f8717144"}` }}>
                        {paid ? "PAID" : "UNPAID"}
                      </span>
                      <div className="toggle-paid" onClick={() => togglePayment(member.id, CURRENT_MONTH, CURRENT_YEAR)}
                        style={{ width: 36, height: 20, borderRadius: 10, background: paid ? "#4ade80" : "#2a2a2a", position: "relative", transition: "background 0.2s" }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 3, left: paid ? 19 : 3, transition: "left 0.2s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={e => e.target === e.currentTarget && setShowAddMember(false)}>
          <div className="fade-in" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Add New Member</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>NAME</div>
              <input value={newMember.name} onChange={e => setNewMember(n => ({ ...n, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addMember()}
                placeholder="e.g. John Doe" autoFocus
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>SERVICE</div>
              <select value={newMember.service} onChange={e => setNewMember(n => ({ ...n, service: e.target.value }))}
                style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 13, fontFamily: "inherit" }}>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={() => setShowAddMember(false)} style={{ flex: 1, background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a", padding: "10px", borderRadius: 8, fontSize: 13 }}>Cancel</button>
              <button className="btn" onClick={addMember} style={{ flex: 1, background: "#fff", color: "#000", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Editor Modal */}
      {showFeeEditor && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={e => e.target === e.currentTarget && setShowFeeEditor(false)}>
          <div className="fade-in" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Monthly Fees per Member</div>
            {services.map(svc => (
              <div key={svc.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: svc.color, marginBottom: 6 }}>{svc.name.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#555", fontSize: 14 }}>$</span>
                  <input type="number" min="0" step="0.01" value={fees[svc.id] || 0} onChange={e => setFees(f => ({ ...f, [svc.id]: e.target.value }))}
                    style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 13, fontFamily: "inherit" }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn" onClick={() => setShowFeeEditor(false)} style={{ flex: 1, background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a", padding: "10px", borderRadius: 8, fontSize: 13 }}>Cancel</button>
              <button className="btn" onClick={saveFees} style={{ flex: 1, background: "#fff", color: "#000", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Save Fees</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
