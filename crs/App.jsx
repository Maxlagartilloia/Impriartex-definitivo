import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Printer, Wrench, ShieldCheck, PlusCircle, Clock, CheckCircle, 
  Download, Users, ClipboardList, LogOut, BarChart3, Search, 
  Package, UploadCloud, FileSpreadsheet, ChevronRight, Settings, 
  Building2, UserCog, AlertCircle, FileText, Trash2
} from 'lucide-react';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = "https://kqxqkjfhnirkampkitgu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  const [tickets, setTickets] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && profile) {
      loadAllData();
      const channel = supabase.channel('impriartex_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadAllData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, loadAllData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, loadAllData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadAllData)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session, profile]);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const loadAllData = async () => {
    const { data: profs } = await supabase.from('profiles').select('*');
    setAllUsers(profs || []);

    const { data: custs } = await supabase.from('customers').select('*');
    setCustomers(custs || []);

    const { data: equip } = await supabase.from('equipment').select('*, customers(name)');
    setEquipment(equip || []);

    let tQ = supabase.from('tickets').select('*, equipment(*), customers(*)').order('created_at', { ascending: false });
    if (profile?.role === 'cliente') {
      // Logic to filter by customer linked to profile if needed
    }
    if (profile?.role === 'tecnico') tQ = tQ.eq('technician_id', session.user.id);
    const { data: t } = await tQ;
    setTickets(t || []);
  };

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // --- ACCIONES SUPERVISOR (ALEX LOOR) ---

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').slice(1);
      const formatted = rows.map(row => {
        const c = row.split(',');
        if (c.length < 7) return null;
        return {
          physical_location: c[0]?.trim(),
          model: c[1]?.trim(),
          brand: c[2]?.trim() || 'RICOH',
          serial: c[3]?.trim(),
          ip_address: c[4]?.trim(),
          location_details: c[5]?.trim(),
          institution_id: c[6]?.trim()
        };
      }).filter(Boolean);
      const { error } = await supabase.from('equipment').insert(formatted);
      if (!error) notify(`${formatted.length} equipos importados.`);
    };
    reader.readAsText(file);
  };

  const handleLinkTech = async (customerId, techId) => {
    await supabase.from('customers').update({ assigned_tech_id: techId }).eq('id', customerId);
    notify("Técnico fijo asignado a la institución.");
  };

  const handleCreateTicket = async (equipId, desc) => {
    const item = equipment.find(e => e.id === equipId);
    const inst = customers.find(c => c.id === item.customer_id);

    if (!inst?.assigned_tech_id) {
      alert("Error: Esta institución no tiene un técnico asignado por el supervisor.");
      return;
    }

    await supabase.from('tickets').insert([{
      equipment_id: equipId,
      customer_id: item.customer_id,
      technician_id: inst.assigned_tech_id, // DIRECCIONAMIENTO AUTOMÁTICO
      description: desc,
      status: 'Abierto'
    }]);
    setView('dashboard');
    notify("Ticket generado y direccionado al técnico encargado.");
  };

  const downloadAudit = () => {
    const filtered = tickets.filter(t => {
      if (!dateRange.start || !dateRange.end) return true;
      const d = t.created_at.split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });
    const csv = "ID,FECHA,CLIENTE,SERIAL,ESTADO,NOTAS\n" + 
      filtered.map(t => `${t.id.slice(0,5)},${t.created_at},${t.customers?.name},${t.equipment?.serial},${t.status},${t.resolution_notes || ''}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'auditoria_impriartex.csv'; a.click();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black italic animate-pulse">CARGANDO IMPRIARTEX...</div>;
  if (!session) return <LoginScreen supabase={supabase} />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Corporativo */}
      <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Printer size={20} /></div>
          <span className="text-xl font-black text-white italic tracking-tighter">IMPRIARTEX</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem active={view === 'dashboard'} icon={<ClipboardList size={18}/>} label="Tickets Central" onClick={() => setView('dashboard')} />
          {profile?.role === 'supervisor' && (
            <>
              <NavItem active={view === 'customers'} icon={<Building2 size={18}/>} label="Asignación Clientes" onClick={() => setView('customers')} />
              <NavItem active={view === 'inventory'} icon={<Package size={18}/>} label="Inventario RICOH" onClick={() => setView('inventory')} />
            </>
          )}
        </nav>
        <div className="p-4 mt-auto border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xs">{profile?.role[0].toUpperCase()}</div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{profile?.role}</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 w-full px-3 text-xs font-bold hover:text-red-400 transition"><LogOut size={14} /> Salir</button>
        </div>
      </aside>

      {/* Area Central */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 italic">Service Level Audit Management</h2>
            <p className="text-lg font-bold text-slate-800">Control de Operaciones</p>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'supervisor' && (
              <div className="flex gap-2">
                <input type="date" className="text-[10px] p-1.5 border rounded-lg" onChange={e => setDateRange({...dateRange, start: e.target.value})}/>
                <input type="date" className="text-[10px] p-1.5 border rounded-lg" onChange={e => setDateRange({...dateRange, end: e.target.value})}/>
                <button onClick={downloadAudit} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2"><Download size={12}/> Auditoría</button>
              </div>
            )}
            {profile?.role === 'cliente' && <button onClick={() => setView('create')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg">Nuevo Ticket</button>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {notification && (
            <div className="fixed top-24 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border-l-4 border-l-emerald-500 animate-in slide-in-from-right-10">
               <CheckCircle size={18} className="text-emerald-400" />
               <p className="text-sm font-bold">{notification}</p>
            </div>
          )}

          {view === 'dashboard' && <TicketGrid tickets={tickets} role={profile?.role} onResolve={async (id) => {
            const note = prompt("Notas de resolución:");
            if(note) await supabase.from('tickets').update({ status: 'Completado', resolution_notes: note, completed_at: new Date().toISOString() }).eq('id', id);
          }} />}

          {view === 'customers' && <CustomerPanel customers={customers} techs={allUsers.filter(u=>u.role==='tecnico')} onAssign={handleLinkTech} />}

          {view === 'inventory' && <InventoryPanel equipment={equipment} onImport={handleCSVImport} customers={customers} onLink={async (eid, cid) => {
            await supabase.from('equipment').update({ customer_id: cid }).eq('id', eid);
            loadAllData();
          }} />}

          {view === 'create' && <TicketForm equipment={equipment} onSubmit={handleCreateTicket} onCancel={() => setView('dashboard')} />}
        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES UI ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function TicketGrid({ tickets, role, onResolve }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
          <tr><th className="px-6 py-4">ID / Fecha</th><th className="px-6 py-4">Equipo RICOH</th><th className="px-6 py-4 text-center">Estado</th><th className="px-6 py-4 text-right">Acción</th></tr>
        </thead>
        <tbody className="divide-y text-slate-700">
          {tickets.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 font-bold">{t.id.slice(0,5).toUpperCase()}<br/><span className="text-[10px] font-medium text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span></td>
              <td className="px-6 py-4 font-bold">{t.equipment?.model} <span className="text-slate-400 text-[10px] font-normal italic">S/N: {t.equipment?.serial}</span></td>
              <td className="px-6 py-4 text-center">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'Abierto' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                {role === 'tecnico' && t.status === 'Abierto' && (
                  <button onClick={() => onResolve(t.id)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition shadow-md"><CheckCircle size={14}/></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerPanel({ customers, techs, onAssign }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-slate-50 font-black text-xs text-slate-400 uppercase tracking-widest">Matriz de Asignación Automática</div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
          <tr><th className="px-6 py-4">Institución / Cliente</th><th className="px-6 py-4 text-right">Técnico Fijo Encargado</th></tr>
        </thead>
        <tbody className="divide-y">
          {customers.map(c => (
            <tr key={c.id}>
              <td className="px-6 py-4 font-bold text-slate-800 italic">{c.name}</td>
              <td className="px-6 py-4 text-right">
                <select className="text-[10px] font-bold p-1.5 border rounded-lg bg-white border-blue-100 outline-none" onChange={(e) => onAssign(c.id, e.target.value)} defaultValue={c.assigned_tech_id || ""}>
                  <option value="">No Asignado</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryPanel({ equipment, onImport, customers, onLink }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 italic">Parque Tecnológico RICOH</h3>
        <label className="bg-white border-2 border-slate-200 hover:border-blue-500 px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-md">
          <UploadCloud size={16} className="text-blue-500" /> Importar CSV
          <input type="file" accept=".csv" onChange={onImport} className="hidden" />
        </label>
      </div>
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-[10px] font-bold uppercase text-slate-500 tracking-tighter">
          <thead className="bg-slate-50 border-b tracking-widest">
            <tr><th className="px-6 py-4">Ubicación</th><th className="px-6 py-4">Modelo</th><th className="px-6 py-4">Serial RICOH</th><th className="px-6 py-4 text-right">Vincular Cliente</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {equipment.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-black">{p.physical_location}</td>
                <td className="px-6 py-4 font-bold text-blue-600 italic">{p.model}</td>
                <td className="px-6 py-4 font-mono">{p.serial}</td>
                <td className="px-6 py-4 text-right">
                  <select className="p-1 border rounded text-[9px] font-bold outline-none" value={p.customer_id || ""} onChange={(e) => onLink(p.id, e.target.value)}>
                    <option value="">Asignar...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketForm({ equipment, onSubmit, onCancel }) {
  return (
    <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border shadow-2xl">
      <h3 className="text-2xl font-black mb-8 flex items-center gap-3 italic tracking-tighter text-slate-800"><FileText className="text-blue-600" size={32}/> Apertura de Ticket</h3>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.target.equip.value, e.target.desc.value); }} className="space-y-6">
        <select name="equip" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none border-transparent focus:border-blue-100 transition" required>
          <option value="">Seleccionar Equipo RICOH</option>
          {equipment.map(p => <option key={p.id} value={p.id}>{p.model} - {p.serial} ({p.physical_location})</option>)}
        </select>
        <textarea name="desc" className="w-full p-4 bg-slate-50 border rounded-2xl h-40 font-bold outline-none border-transparent focus:border-blue-100 transition" placeholder="Describe la falla técnica..." required></textarea>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 font-bold text-slate-400 hover:text-red-500 transition">Cancelar</button>
          <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition">Enviar Soporte</button>
        </div>
      </form>
    </div>
  );
}

function LoginScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-md w-full text-center border relative z-10">
        <div className="bg-blue-600 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40 text-white font-black italic tracking-tighter text-3xl">RICOH</div>
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900">IMPRIARTEX OS</h2>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-12 italic">Corporate Service Hub</p>
        <div className="space-y-4">
           <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100 transition" placeholder="Email Supervisor/Cliente" value={email} onChange={e=>setEmail(e.target.value)} />
           <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-100 transition" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} />
           <button onClick={() => supabase.auth.signInWithPassword({ email, password: pass })} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition uppercase tracking-widest text-sm">Entrar al Sistema</button>
        </div>
      </div>
    </div>
  );
}

