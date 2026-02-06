import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { 
  Printer, Wrench, ShieldCheck, PlusCircle, Clock, CheckCircle, 
  Download, Users, ClipboardList, LogOut, BarChart3, Search, 
  Package, UploadCloud, FileSpreadsheet, ChevronRight, Settings, 
  Building2, UserCog, AlertCircle, FileText, Calendar, Bell, 
  MoreVertical, Filter, ArrowUpRight, ArrowDownRight, Activity,
  Cpu, Zap, MapPin, Info, Server, Database, Globe
} from 'lucide-react';

// --- NÚCLEO DE CONFIGURACIÓN ---
const supabaseUrl = "https://kqxqkjfhnirkampkitgu.supabase.co";
const getEnv = (key) => {
  try { return import.meta.env[key] || ""; } 
  catch (e) { return ""; }
};
const supabaseKey = getEnv("VITE_SUPABASE_ANON_KEY"); 
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  const [tickets, setTickets] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Verificación de Configuración
  if (!supabaseKey) {
    return <ConfigErrorScreen url={supabaseUrl} />;
  }

  // 2. Ciclo de Vida de Autenticación
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 3. Sincronización en Tiempo Real
  useEffect(() => {
    if (session && profile) {
      loadCoreData();
      const channel = supabase.channel('impriartex_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadCoreData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, loadCoreData)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [session, profile]);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const loadCoreData = async () => {
    const { data: c } = await supabase.from('customers').select('*');
    setCustomers(c || []);
    const { data: tList } = await supabase.from('profiles').select('*').eq('role', 'tecnico');
    setTechs(tList || []);
    const { data: eq } = await supabase.from('equipment').select('*, customers(name)');
    setEquipment(eq || []);

    let tQ = supabase.from('tickets').select('*, equipment(*), customers(*)').order('created_at', { ascending: false });
    if (profile?.role === 'tecnico') tQ = tQ.eq('technician_id', session.user.id);
    const { data: t } = await tQ;
    setTickets(t || []);
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- LÓGICA DE OPERACIONES ---

  const handleImportCSV = async (e) => {
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
      if (!error) notify(`${formatted.length} equipos RICOH sincronizados.`);
      else notify("Error: Verifique el formato o seriales duplicados.", "error");
    };
    reader.readAsText(file);
  };

  const exportAuditReport = () => {
    const headers = "ID_TICKET,FECHA,CLIENTE,MODELO,SERIAL,ESTADO,SLA_CUMPLIDO\n";
    const data = tickets.map(t => {
      const sla = t.completed_at ? "SI" : "PTE";
      return `${t.id.slice(0,8)},${t.created_at},${t.customers?.name},${t.equipment?.model},${t.equipment?.serial},${t.status},${sla}`;
    }).join("\n");
    const blob = new Blob([headers + data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auditoria_impriartex_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginScreen supabase={supabase} />;

  return (
    <div className="flex h-screen bg-[#020617] font-sans text-slate-200 overflow-hidden">
      {/* SIDEBAR NAVEGACIÓN */}
      <aside className="w-80 bg-slate-950/40 backdrop-blur-3xl border-r border-white/5 flex flex-col shrink-0 z-50">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
            <Printer className="text-white" size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-white tracking-tighter block uppercase leading-none italic">Impriartex</span>
            <span className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase opacity-70 mt-1.5 block">Enterprise OS</span>
          </div>
        </div>

        <nav className="flex-1 px-8 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-600 uppercase px-4 mb-4 tracking-widest italic">Consola de Mando</p>
          <SidebarItem active={view === 'overview'} icon={<Activity size={20}/>} label="Dashboard" onClick={() => setView('overview')} />
          <SidebarItem active={view === 'tickets'} icon={<ClipboardList size={20}/>} label="Monitoreo Soporte" onClick={() => setView('tickets')} />
          
          {profile?.role === 'supervisor' && (
            <>
              <p className="text-[10px] font-black text-slate-600 uppercase px-4 py-6 tracking-widest border-t border-white/5 mt-6">Gestión de Flota</p>
              <SidebarItem active={view === 'inventory'} icon={<Cpu size={20}/>} label="Inventario RICOH" onClick={() => setView('inventory')} />
              <SidebarItem active={view === 'customers'} icon={<Building2 size={20}/>} label="Gestión Clientes" onClick={() => setView('customers')} />
              <SidebarItem active={view === 'analytics'} icon={<BarChart3 size={20}/>} label="Auditoría & SLA" onClick={() => setView('analytics')} />
            </>
          )}
        </nav>

        <div className="p-8 bg-slate-900/20 border-t border-white/5">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-black text-sm shadow-xl ring-2 ring-slate-900">
              {profile?.role[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate uppercase tracking-tight">{profile?.full_name || 'Supervisor'}</p>
              <p className="text-[9px] uppercase font-black text-blue-500 flex items-center gap-1.5 italic">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> {profile?.role} Conectado
              </p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="mt-6 flex items-center justify-center gap-3 w-full py-4 text-xs font-black text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all uppercase tracking-widest">
            <LogOut size={16} /> Finalizar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col bg-[#020617] relative">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 shrink-0 backdrop-blur-xl bg-[#020617]/50 z-40">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase leading-none">
               {view === 'overview' && "Resumen de Operaciones"}
               {view === 'tickets' && "Centro de Control de Tickets"}
               {view === 'inventory' && "Inventario de Activos RICOH"}
               {view === 'customers' && "Matriz Institucional"}
               {view === 'analytics' && "Data, Auditoría & SLA"}
            </h2>
            <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
            <div className="relative hidden lg:block">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar por serial, IP o institución..." 
                className="bg-white/5 border border-white/10 rounded-2xl pl-14 pr-8 py-3 text-xs focus:ring-2 focus:ring-blue-600/50 outline-none w-96 text-slate-300 transition-all font-bold italic"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
             <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-500 transition-all relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-blue-600 rounded-full border-2 border-slate-950 animate-pulse"></span>
             </button>
             {profile?.role === 'cliente' && (
               <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-2xl shadow-blue-900/40 transition-all active:scale-95 uppercase tracking-widest">
                 + Solicitar Soporte
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          {notification && <TopNotification msg={notification.msg} type={notification.type} />}

          {view === 'overview' && <OverviewDashboard tickets={tickets} equipment={equipment} />}
          {view === 'tickets' && <TicketsList tickets={tickets} techs={techs} />}
          {view === 'inventory' && <InventoryPro equipment={equipment} onImport={handleImportCSV} />}
          {view === 'customers' && <CustomersManager customers={customers} techs={techs} />}
          {view === 'analytics' && <AnalyticsSection tickets={tickets} onExport={exportAuditReport} />}
        </div>
      </main>
    </div>
  );
}

// --- COMPONENTES MODULARES ---

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-5 px-6 py-4.5 rounded-[1.5rem] font-black text-sm transition-all duration-500 group relative ${
        active 
        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] ring-1 ring-white/20' 
        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <span className={`${active ? 'text-white' : 'group-hover:text-blue-500'} transition-colors`}>{icon}</span>
      <span className="tracking-tight italic">{label}</span>
      {active && <div className="absolute right-6 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#fff]"></div>}
    </button>
  );
}

function OverviewDashboard({ tickets, equipment }) {
  const pending = tickets.filter(t => t.status === 'Abierto').length;
  const inProgress = tickets.filter(t => t.status === 'Asignado').length;
  const completed = tickets.filter(t => t.status === 'Completado').length;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPICard label="Pendientes" value={pending} trend="+12%" color="text-red-500" icon={<AlertCircle size={24}/>} />
        <KPICard label="En Atención" value={inProgress} trend="98% SLA" color="text-blue-500" icon={<Clock size={24}/>} />
        <KPICard label="Finalizados" value={completed} trend="+45 mes" color="text-emerald-500" icon={<CheckCircle size={24}/>} />
        <KPICard label="Flota Ricoh" value={equipment.length} trend="Online" color="text-slate-400" icon={<Printer size={24}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-slate-900/20 border border-white/5 rounded-[3rem] p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-white italic flex items-center gap-3 tracking-tighter uppercase leading-none italic"><Activity className="text-blue-500" size={22}/> Operaciones en Vivo</h3>
          </div>
          <div className="space-y-5">
             {tickets.slice(0, 5).map(t => (
               <div key={t.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/[0.08] transition-all border-l-4 border-l-blue-600">
                 <div className="flex items-center gap-5">
                   <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-slate-500 shadow-inner">
                     <Printer size={20} />
                   </div>
                   <div>
                     <p className="font-black text-slate-100 text-lg tracking-tighter uppercase italic">{t.equipment?.model || 'Activo Ricoh'}</p>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{t.customers?.name || 'GAD Municipal'}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-600/20 block mb-2">{t.status}</span>
                   <p className="text-[10px] font-bold text-slate-600 italic uppercase">{new Date(t.created_at).toLocaleTimeString()}</p>
                 </div>
               </div>
             ))}
             {tickets.length === 0 && <div className="py-20 text-center text-slate-700 font-black italic text-xl uppercase tracking-[0.4em]">Sin actividad reciente</div>}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/[0.08] to-transparent border border-white/5 rounded-[3rem] p-10 shadow-2xl">
           <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 tracking-tighter uppercase italic leading-none"><Zap className="text-yellow-500" size={22}/> Salud de Flota</h3>
           <div className="space-y-8">
              <HealthBar label="ALCALDÍA" percentage={94} color="bg-emerald-500" />
              <HealthBar label="PLANIFICACIÓN" percentage={85} color="bg-blue-500" />
              <HealthBar label="ARCHIVO" percentage={42} color="bg-red-500" />
              <div className="pt-10 border-t border-white/5 mt-10 space-y-4">
                 <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                   <Info size={20} className="text-blue-500 shrink-0" />
                   <p className="text-[11px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-tight">Alerta: Hay 4 equipos Ricoh en mantenimiento preventivo este mes.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, color, icon }) {
  return (
    <div className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.05] transition-all group shadow-2xl">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl bg-slate-950 border border-white/5 ${color} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 ${color === 'text-red-500' ? 'text-red-400' : 'text-emerald-400'} tracking-widest uppercase`}>
          {trend}
        </span>
      </div>
      <p className="text-5xl font-black text-white tracking-tighter mb-2 italic">{value}</p>
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{label}</p>
    </div>
  );
}

function HealthBar({ label, percentage, color }) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
         <span className="text-slate-400 italic">{label}</span>
         <span className="text-white">{percentage}%</span>
       </div>
       <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
         <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)]`} style={{ width: `${percentage}%` }}></div>
       </div>
    </div>
  );
}

function InventoryPro({ equipment, onImport }) {
  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 gap-6">
        <div>
           <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Inventario de Activos RICOH</h3>
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1 italic">Gestión de flota corporativa GAD 2026</p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-200 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] active:scale-95 italic">
            <UploadCloud size={16} /> Importar Datos (.CSV)
            <input type="file" accept=".csv" className="hidden" onChange={onImport} />
          </label>
        </div>
      </div>

      <div className="bg-slate-950/50 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 border-b border-white/5 tracking-[0.2em]">
            <tr>
              <th className="px-10 py-7">Ubicación Física</th>
              <th className="px-8 py-7">Modelo</th>
              <th className="px-8 py-7">Serial</th>
              <th className="px-8 py-7">Dirección IP</th>
              <th className="px-10 py-7 text-right">Detalle Ubicación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px] font-bold">
            {equipment.map(item => (
              <tr key={item.id} className="hover:bg-white/[0.03] transition-all group">
                <td className="px-10 py-6">
                   <p className="font-black text-slate-100 uppercase tracking-tighter italic text-lg leading-none group-hover:text-blue-500 transition-colors">{item.physical_location}</p>
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1 italic">{item.brand}</p>
                </td>
                <td className="px-8 py-6">
                   <span className="text-blue-400 font-black uppercase italic text-sm tracking-tighter leading-none">{item.model}</span>
                </td>
                <td className="px-8 py-6 font-mono text-slate-400 tracking-[0.2em] uppercase">{item.serial}</td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                     <span className="font-mono text-emerald-500/80 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10 italic text-[12px]">{item.ip_address}</span>
                   </div>
                </td>
                <td className="px-10 py-6 text-right">
                   <span className="text-[10px] font-black text-slate-500 bg-slate-900 border border-white/5 px-4 py-2 rounded-2xl italic uppercase tracking-tighter">
                     {item.location_details}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {equipment.length === 0 && <div className="text-center py-32 text-slate-700 font-black italic text-3xl opacity-20 uppercase tracking-[0.5em]">Inventory Data Node Empty</div>}
      </div>
    </div>
  );
}

function TicketsList({ tickets, techs }) {
  return (
    <div className="bg-slate-950/40 border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in duration-1000">
       <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
             <thead className="bg-slate-950/30 text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] border-b border-white/5">
               <tr>
                 <th className="px-10 py-7 text-center">ID Protocolo</th>
                 <th className="px-8 py-7">Activo & Sede</th>
                 <th className="px-8 py-7 text-center">Estatus</th>
                 <th className="px-8 py-7">Especialista Staff</th>
                 <th className="px-10 py-7 text-right">Gestión</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5 text-[12px] font-bold italic">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.04] transition-all group">
                    <td className="px-10 py-6 text-center">
                       <span className="block font-black text-white group-hover:text-blue-500 transition-colors uppercase tracking-[0.2em] italic text-base">REQ-{t.id.slice(0,6)}</span>
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">{new Date(t.created_at).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-5">
                          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-slate-500 group-hover:text-blue-400 transition-all"><Printer size={20}/></div>
                          <div>
                            <p className="font-black text-slate-100 uppercase tracking-tighter text-lg leading-none mb-1 italic">{t.equipment?.model || 'Desconocido'}</p>
                            <p className="text-[10px] font-black text-blue-500 uppercase italic tracking-widest leading-none">{t.customers?.name || 'GAD Regional'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl border italic tracking-widest shadow-xl inline-block ${
                         t.status === 'Abierto' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                         t.status === 'Asignado' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                         'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                       }`}>
                         {t.status}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       {t.technician_id ? (
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[10px] text-white font-black border border-white/10 shadow-2xl ring-2 ring-slate-950">TP</div>
                           <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Staff Especializado</span>
                         </div>
                       ) : (
                         <button className="text-[10px] font-black uppercase text-red-400/80 bg-red-400/5 px-4 py-2 rounded-2xl border border-red-400/20 hover:bg-red-400/10 transition-all italic">Pendiente Asignación</button>
                       )}
                    </td>
                    <td className="px-10 py-6 text-right">
                       <button className="p-3.5 bg-slate-950 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all shadow-2xl"><MoreVertical size={18}/></button>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
          {tickets.length === 0 && <div className="text-center py-32 text-slate-800 font-black italic text-3xl opacity-20 uppercase tracking-[0.5em]">No Logged Requests</div>}
       </div>
    </div>
  );
}

function AnalyticsSection({ tickets, onExport }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in zoom-in-95 duration-700">
       <div className="bg-slate-950/50 border border-white/5 rounded-[4rem] p-16 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/[0.08] transition-all"></div>
          <div className="w-28 h-28 rounded-[2.5rem] bg-slate-900 border border-white/10 flex items-center justify-center text-blue-500 mb-10 shadow-2xl group-hover:scale-110 transition-transform duration-700 ring-8 ring-slate-950/80">
             <Download size={48} strokeWidth={1}/>
          </div>
          <h3 className="text-3xl font-black text-white italic mb-4 tracking-tighter uppercase leading-none">Exportación de Auditoría</h3>
          <p className="text-slate-500 font-bold text-sm max-w-sm mb-12 leading-relaxed italic uppercase tracking-tight opacity-70">Generación de reportes contractuales para revisión fiscal y cumplimiento de SLA (GAD-SD).</p>
          <button onClick={onExport} className="px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[1.5rem] shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] uppercase tracking-[0.4em] text-[10px] transition-all active:scale-95 ring-1 ring-white/20 italic">Descargar Reporte (.CSV)</button>
       </div>

       <div className="bg-slate-950/50 border border-white/5 rounded-[4rem] p-16 shadow-2xl backdrop-blur-3xl">
          <h3 className="text-xl font-black text-white mb-12 flex items-center gap-3 tracking-tighter uppercase italic leading-none"><BarChart3 size={24} className="text-emerald-500"/> Métricas de Rendimiento</h3>
          <div className="space-y-10">
             <MetricRow label="Respuesta < 4h (SLA)" value={94} color="bg-emerald-500" />
             <MetricRow label="Stock RICOH Global" value={78} color="bg-blue-500" />
             <MetricRow label="Satisfacción GAD" value={98} color="bg-indigo-500" />
          </div>
       </div>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-end">
          <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] italic">{label}</p>
          <p className="text-2xl font-black text-white tracking-tighter italic leading-none">{value}%</p>
       </div>
       <div className="h-4 bg-slate-900 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-white/5">
          <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.2)]`} style={{ width: `${value}%` }}></div>
       </div>
    </div>
  );
}

// --- SCREENS ---

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center text-white font-black italic relative overflow-hidden">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full animate-pulse"></div>
       <div className="bg-slate-900/40 p-12 rounded-[4rem] border border-white/5 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-10 relative z-10 animate-in zoom-in-95 duration-1000">
         <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl animate-spin shadow-blue-500/20 duration-[4000ms] ring-8 ring-slate-950/50">
            <Printer size={80} strokeWidth={1.5} />
         </div>
         <div className="text-center">
            <h1 className="text-5xl tracking-tighter uppercase font-black italic leading-none">Impriartex Cloud</h1>
            <p className="text-[11px] text-blue-500 uppercase font-black tracking-[0.6em] mt-4 animate-pulse italic leading-none">Neural Link Establishing...</p>
         </div>
       </div>
    </div>
  );
}

function ConfigErrorScreen({ url }) {
  return (
    <div className="h-screen bg-[#020617] flex items-center justify-center p-8">
      <div className="max-w-xl w-full bg-slate-900/50 border border-red-500/20 p-16 rounded-[4rem] backdrop-blur-3xl text-center shadow-2xl animate-in zoom-in-90">
         <div className="w-24 h-24 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-10 text-red-500">
            <AlertCircle size={48} />
         </div>
         <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none italic">Llave de Conexión Ausente</h2>
         <p className="text-slate-400 font-bold text-sm mb-12 leading-relaxed uppercase tracking-tight italic">El sistema Enterprise requiere el token de Supabase para iniciar. Configure 'VITE_SUPABASE_ANON_KEY' en Netlify.</p>
         <div className="p-6 bg-slate-950 border border-white/5 rounded-[2rem] text-left">
            <p className="text-[10px] font-black text-slate-600 uppercase mb-2 italic">Endpoint de Servicio:</p>
            <p className="text-xs font-mono text-blue-400 font-bold truncate">{url}</p>
         </div>
      </div>
    </div>
  );
}

function LoginScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Error de Acceso: " + error.message);
    setAuthLoading(false);
  };

  return (
    <div className="h-screen bg-[#020617] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-blue-600/[0.04] blur-[180px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-20 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] max-w-2xl w-full text-center relative z-10 animate-in zoom-in-95 duration-1000 ring-1 ring-white/5">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.5)] text-white font-black italic text-5xl ring-8 ring-slate-950/80 italic">R</div>
        <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase mb-4 leading-none italic italic">Impriartex <span className="text-blue-500">Service</span></h2>
        <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.6em] mb-20 italic opacity-60">Enterprise Asset Monitoring System</p>
        
        <form onSubmit={handleAuth} className="space-y-8 text-left">
           <div className="space-y-4">
             <label className="text-[11px] font-black uppercase text-slate-500 ml-6 tracking-[0.3em] italic">Acceso Corporativo</label>
             <input className="w-full p-6 bg-slate-950/60 border border-slate-800 rounded-[2.5rem] font-bold text-white outline-none focus:ring-4 focus:ring-blue-600/20 transition-all placeholder:text-slate-800 text-sm shadow-inner italic" placeholder="usuario@impriartex.com" value={email} onChange={e=>setEmail(e.target.value)} />
           </div>
           <div className="space-y-4">
             <label className="text-[11px] font-black uppercase text-slate-500 ml-6 tracking-[0.3em] italic">Llave de Seguridad</label>
             <input className="w-full p-6 bg-slate-950/60 border border-slate-800 rounded-[2.5rem] font-bold text-white outline-none focus:ring-4 focus:ring-blue-600/20 transition-all placeholder:text-slate-800 text-sm shadow-inner italic" type="password" placeholder="••••••••••••" value={pass} onChange={e=>setPass(e.target.value)} />
           </div>
           <button 
             disabled={authLoading}
             className="w-full py-7 bg-blue-600 text-white font-black rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-4 mt-12 ring-1 ring-white/20 italic italic"
           >
             {authLoading ? <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : "Establecer Vínculo"}
           </button>
        </form>
        <p className="mt-20 text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic opacity-40 italic">Sistema Propiedad de Impriartex S.A. | V1.0.8-SD</p>
      </div>
    </div>
  );
}

function TopNotification({ msg, type }) {
  return (
    <div className={`fixed top-28 right-12 px-10 py-6 rounded-[2.5rem] shadow-2xl z-[100] flex items-center gap-6 border-l-[12px] backdrop-blur-3xl animate-in slide-in-from-right-10 duration-500 ring-1 ring-white/10 ${
      type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-l-emerald-500' : 'bg-red-950/80 text-red-400 border-l-red-500'
    }`}>
       <div className={`p-3 rounded-2xl bg-slate-900 border ${type === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'} shadow-inner`}>
          {type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
       </div>
       <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5 italic">{type === 'success' ? 'Protocolo Exitoso' : 'Alerta de Sistema'}</span>
          <p className="text-base font-black tracking-tighter italic uppercase">{msg}</p>
       </div>
    </div>
  );
}

function CustomersManager({ customers, techs }) {
   return (
    <div className="bg-slate-950/40 border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in duration-1000">
       <div className="p-12 border-b bg-slate-900/30 border-white/5 font-black text-xs text-slate-500 uppercase tracking-[0.4em] italic flex justify-between items-center italic">
          <span>Matriz de Control Institucional y Sede</span>
          <span className="flex items-center gap-2 text-blue-500"><Server size={14}/> Node Link Active</span>
       </div>
       <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] border-b border-white/5">
            <tr><th className="px-12 py-8">Institución / Sede GAD</th><th className="px-12 py-8 text-right">Especialista Staff Asignado</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-bold italic">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.04] transition-all group">
                <td className="px-12 py-8">
                   <div className="flex items-center gap-6">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 text-blue-500 shadow-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500"><Building2 size={24}/></div>
                      <span className="text-2xl font-black text-white italic tracking-tighter uppercase group-hover:text-blue-500 transition-colors duration-500 leading-none">{c.name}</span>
                   </div>
                </td>
                <td className="px-12 py-8 text-right">
                   <select className="text-[11px] font-black p-4 border rounded-[1.5rem] bg-slate-950 border-blue-500/10 outline-none text-blue-500 shadow-2xl focus:ring-4 focus:ring-blue-600/20 transition-all cursor-pointer hover:bg-slate-900 italic uppercase">
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

const customStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
`;
const styleTag = document.createElement("style");
styleTag.innerHTML = customStyles;
document.head.appendChild(styleTag);
