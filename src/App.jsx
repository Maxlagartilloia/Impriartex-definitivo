import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Printer, Wrench, ShieldCheck, PlusCircle, Clock, CheckCircle, 
  Download, Users, ClipboardList, LogOut, BarChart3, Search, 
  Package, UploadCloud, FileSpreadsheet, ChevronRight, Settings, 
  Building2, UserCog, AlertCircle, FileText
} from 'lucide-react';

// --- CONEXIÓN DE SUPABASE ---
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
  const [techs, setTechs] = useState([]);
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
      loadData();
      const channel = supabase.channel('impriartex_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, loadData)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session, profile]);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const loadData = async () => {
    const { data: cust } = await supabase.from('customers').select('*');
    setCustomers(cust || []);

    const { data: techList } = await supabase.from('profiles').select('*').eq('role', 'tecnico');
    setTechs(techList || []);

    const { data: eq } = await supabase.from('equipment').select('*, customers(name)');
    setEquipment(eq || []);

    let tQ = supabase.from('tickets').select('*, equipment(*), customers(*)').order('created_at', { ascending: false });
    if (profile?.role === 'tecnico') tQ = tQ.eq('technician_id', session.user.id);
    const { data: t } = await tQ;
    setTickets(t || []);
  };

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // --- CARGA MASIVA RICOH (Estructura de tu Imagen) ---
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
      if (!error) notify(`${formatted.length} equipos integrados correctamente.`);
      else alert("Error: Verifica si hay seriales duplicados.");
    };
    reader.readAsText(file);
  };

  const handleCreateTicket = async (equipId, desc) => {
    const item = equipment.find(e => e.id === equipId);
    const inst = customers.find(c => c.id === item.customer_id);
    
    if (!inst?.assigned_tech_id) {
      alert("Error: Esta institución no tiene un técnico encargado asignado por Alex Loor.");
      return;
    }

    await supabase.from('tickets').insert([{
      equipment_id: equipId,
      customer_id: item.customer_id,
      technician_id: inst.assigned_tech_id,
      description: desc,
      status: 'Abierto'
    }]);
    setView('dashboard');
    notify("Ticket generado. Su técnico asignado ha sido notificado.");
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-black italic animate-pulse">
    <Printer className="mb-4" size={48}/>
    IMPRIARTEX ERP...
  </div>;
  
  if (!session) return <LoginScreen supabase={supabase} />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden text-sm">
      <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20"><Printer size={20} /></div>
          <span className="text-xl font-black text-white italic tracking-tighter">IMPRIARTEX</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem active={view === 'dashboard'} icon={<ClipboardList size={18}/>} label="Monitoreo Soporte" onClick={() => setView('dashboard')} />
          {profile?.role === 'supervisor' && (
            <>
              <NavItem active={view === 'customers'} icon={<Building2 size={18}/>} label="Gestión Clientes" onClick={() => setView('customers')} />
              <NavItem active={view === 'inventory'} icon={<Package size={18}/>} label="Inventario RICOH" onClick={() => setView('inventory')} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xs uppercase">{profile?.role[0]}</div>
            <div className="overflow-hidden">
              <p className="font-bold text-white truncate text-xs">{profile?.full_name}</p>
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{profile?.role}</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 w-full px-3 text-xs font-bold hover:text-red-400 transition"><LogOut size={14} /> Salir</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between shrink-0">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Impriartex Cloud Engine v1.0</h2>
          <div className="flex gap-4">
             {profile?.role === 'cliente' && <button onClick={() => setView('create')} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg">Nuevo Ticket</button>}
             <div className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border italic">{new Date().toLocaleDateString()}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 relative">
          {notification && (
            <div className="fixed top-20 right-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-top-4 border-l-4 border-l-blue-500">
              <CheckCircle className="text-blue-400" size={18} />
              <p className="text-sm font-bold">{notification}</p>
            </div>
          )}

          {view === 'dashboard' && <TicketGrid tickets={tickets} role={profile?.role} onResolve={async (id) => {
            const note = prompt("Notas de resolución:");
            if(note) await supabase.from('tickets').update({ status: 'Completado', resolution_notes: note, completed_at: new Date().toISOString() }).eq(id);
          }} />}

          {view === 'customers' && <CustomerPanel customers={customers} techs={techs} onAssign={async (cid, tid) => {
            await supabase.from('customers').update({ assigned_tech_id: tid }).eq('id', cid);
            notify("Técnico asignado correctamente.");
            loadData();
          }} />}

          {view === 'inventory' && <InventoryPanel equipment={equipment} onImport={handleCSVImport} customers={customers} onLink={async (eid, cid) => {
             await supabase.from('equipment').update({ customer_id: cid }).eq('id', eid);
             loadData();
          }} />}

          {view === 'create' && <TicketForm equipment={equipment} onSubmit={handleCreateTicket} onCancel={() => setView('dashboard')} />}
        </div>
      </main>
    </div>
  );
}

// COMPONENTES AUXILIARES
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-xs ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function TicketGrid({ tickets, role, onResolve }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
          <tr><th className="px-6 py-4 tracking-widest">ID Ticket</th><th className="px-6 py-4 tracking-widest">Equipo / Cliente</th><th className="px-6 py-4 tracking-widest text-center">Estado</th><th className="px-6 py-4 text-right">Gestión</th></tr>
        </thead>
        <tbody className="divide-y text-slate-700">
          {tickets.map(t => (
            <tr key={t.id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-5 font-bold">{t.id.slice(0,5).toUpperCase()}<p className="text-[10px] text-slate-400 font-medium italic">{new Date(t.created_at).toLocaleDateString()}</p></td>
              <td className="px-6 py-5">
                <p className="font-bold text-slate-800 tracking-tighter uppercase">{t.equipment?.model}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest">{t.customers?.name}</p>
              </td>
              <td className="px-6 py-5 text-center">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${t.status === 'Abierto' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.status}</span>
              </td>
              <td className="px-6 py-5 text-right">
                {role === 'tecnico' && t.status === 'Abierto' && (
                  <button onClick={() => onResolve(t.id)} className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition"><CheckCircle size={14}/></button>
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
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in duration-500">
       <div className="p-6 border-b bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest">Matriz de Personal Técnico Asignado</div>
       <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 border-b">
            <tr><th className="px-8 py-4">Institución / Sede</th><th className="px-8 py-4 text-right">Responsable del Servicio</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map(c => (
              <tr key={c.id}>
                <td className="px-8 py-5 font-bold text-slate-800 italic">{c.name}</td>
                <td className="px-8 py-5 text-right">
                   <select className="text-[10px] font-bold p-1.5 border rounded-lg bg-white outline-none border-blue-50" onChange={(e) => onAssign(c.id, e.target.value)} defaultValue={c.assigned_tech_id || ""}>
                     <option value="" disabled>Seleccionar Técnico...</option>
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

function InventoryPanel({ equipment, onImport, onLink, customers }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 italic">Inventario RICOH Cloud</h3>
        <label className="bg-white border-2 border-slate-200 hover:border-blue-500 px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-md">
          <UploadCloud size={16} className="text-blue-500" /> Importar CSV
          <input type="file" accept=".csv" onChange={onImport} className="hidden" />
        </label>
      </div>
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-[9px] font-bold uppercase text-slate-400 tracking-tighter">
          <thead className="bg-slate-50 border-b tracking-widest">
            <tr><th className="px-6 py-4 text-slate-500">Ubicación</th><th className="px-6 py-4 text-slate-500">Modelo</th><th className="px-6 py-4 text-slate-500">Serial</th><th className="px-6 py-4 text-right text-slate-500">Vincular Institución</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {equipment.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 font-black">{p.physical_location}</td>
                <td className="px-6 py-4 font-bold text-blue-600">{p.model}</td>
                <td className="px-6 py-4 font-mono">{p.serial}</td>
                <td className="px-6 py-4 text-right">
                  <select className="p-1 border rounded text-[9px] font-bold outline-none bg-slate-50" value={p.customer_id || ""} onChange={(e) => onLink(p.id, e.target.value)}>
                    <option value="">Sin Asignar</option>
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
    <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border shadow-2xl animate-in zoom-in-95">
      <h3 className="text-2xl font-black mb-8 flex items-center gap-3 italic"><PlusCircle size={32} className="text-blue-600"/> Nuevo Caso RICOH</h3>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.target.equip.value, e.target.desc.value); }} className="space-y-4">
        <select name="equip" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" required>
          <option value="">Seleccionar Equipo...</option>
          {equipment.map(p => <option key={p.id} value={p.id}>{p.model} - {p.serial} ({p.physical_location})</option>)}
        </select>
        <textarea name="desc" className="w-full p-4 bg-slate-50 border rounded-2xl h-40 font-bold outline-none" placeholder="Describa la falla detalladamente..." required></textarea>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 font-bold text-slate-400">Cancelar</button>
          <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl">Enviar Soporte</button>
        </div>
      </form>
    </div>
  );
}

function LoginScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-md w-full text-center border">
        <div className="bg-blue-600 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white font-black italic text-3xl shadow-xl shadow-blue-500/20">RICOH</div>
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 italic">IMPRIARTEX OS</h2>
        <div className="space-y-4 mt-12">
           <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Correo Corporativo" value={email} onChange={e=>setEmail(e.target.value)} />
           <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" type="password" placeholder="Código de Acceso" value={pass} onChange={e=>setPass(e.target.value)} />
           <button onClick={() => supabase.auth.signInWithPassword({ email, password: pass })} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition">Entrar al Sistema</button>
        </div>
      </div>
    </div>
  );
}

