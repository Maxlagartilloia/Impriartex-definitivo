import React, { useState, useEffect, useMemo } from 'react';
// Importación desde CDN para asegurar compatibilidad en el entorno de previsualización
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { 
  Printer, Wrench, ShieldCheck, PlusCircle, Clock, CheckCircle, 
  Download, Users, ClipboardList, LogOut, BarChart3, Search, 
  Package, UploadCloud, FileSpreadsheet, ChevronRight, Settings, 
  Building2, UserCog, AlertCircle, FileText, Calendar, Bell, 
  MoreVertical, Filter, ArrowUpRight, ArrowDownRight, Activity,
  Cpu, Zap, HardDrive, Info, MapPin
} from 'lucide-react';

// --- CONFIGURACIÓN DE NÚCLEO ---
const supabaseUrl = "https://kqxqkjfhnirkampkitgu.supabase.co";
// Manejo seguro de variables de entorno para evitar errores de compilación en el target es2015
const getEnv = (key) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
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

  // 1. Ciclo de Vida & Auth
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

  // 2. Real-time Subscription (El alma del sistema)
  useEffect(() => {
    if (session && profile) {
      loadData();
      const channel = supabase.channel('impriartex_global')
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

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginScreen supabase={supabase} />;

  return (
    <div className="flex h-screen bg-[#0F172A] font-sans text-slate-200 overflow-hidden">
      {/* SIDEBAR NAVEGACIÓN - PREMIUM DARK */}
      <aside className="w-72 bg-slate-950/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shrink-0 z-40">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-2xl shadow-blue-900/40 border border-blue-400/20">
            <Printer className="text-white" size={24} />
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tighter block uppercase">Impriartex</span>
            <span className="text-[10px] font-bold text-blue-500 tracking-[0.3em] uppercase opacity-80">Enterprise OS</span>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-600 uppercase px-4 mb-4 tracking-widest">Consola Principal</p>
          <SidebarItem active={view === 'overview'} icon={<Activity size={20}/>} label="Operaciones" onClick={() => setView('overview')} />
          <SidebarItem active={view === 'tickets'} icon={<ClipboardList size={20}/>} label="Centro de Tickets" onClick={() => setView('tickets')} />
          
          {profile?.role === 'supervisor' && (
            <>
              <p className="text-[10px] font-black text-slate-600 uppercase px-4 py-4 tracking-widest border-t border-slate-800/50 mt-4">Gestión</p>
              <SidebarItem active={view === 'inventory'} icon={<Cpu size={20}/>} label="Flota Ricoh" onClick={() => setView('inventory')} />
              <SidebarItem active={view === 'customers'} icon={<Building2 size={20}/>} label="Instituciones" onClick={() => setView('customers')} />
              <SidebarItem active={view === 'stats'} icon={<BarChart3 size={20}/>} label="Auditoría & SLA" onClick={() => setView('stats')} />
            </>
          )}
        </nav>

        <div className="p-6 bg-slate-900/30 border-t border-slate-800/50">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/20 border border-slate-700/30 group hover:border-blue-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-black text-xs ring-2 ring-slate-800 group-hover:ring-blue-500/20">
              {profile?.role[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Admin'}</p>
              <p className="text-[9px] uppercase font-black text-blue-500">{profile?.role}</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="mt-6 flex items-center justify-center gap-2 w-full py-3 text-xs font-bold text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all border border-transparent hover:border-red-400/20">
            <LogOut size={14} /> Finalizar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN FRAME AREA */}
      <main className="flex-1 flex flex-col bg-[#0F172A] relative">
        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-10 shrink-0 backdrop-blur-md bg-[#0F172A]/80 z-30">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
               {view === 'overview' && "Dashboard Operativo"}
               {view === 'tickets' && "Gestión de Incidencias"}
               {view === 'inventory' && "Inventario de Flota RICOH"}
               {view === 'customers' && "Directorio de Clientes"}
               {view === 'stats' && "Análisis de Rendimiento"}
            </h2>
            <div className="h-4 w-[1px] bg-slate-800 hidden md:block"></div>
            <div className="relative hidden lg:block">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar serial, institución o ticket..." 
                className="bg-slate-900/50 border border-slate-800 rounded-full pl-12 pr-6 py-2 text-xs focus:ring-2 focus:ring-blue-600/50 outline-none w-80 text-slate-300 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-slate-900"></span>
             </button>
             {profile?.role === 'cliente' && (
               <button onClick={() => setView('create')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-2xl shadow-blue-900/40 transition-all active:scale-95 uppercase tracking-widest">
                 + Nuevo Ticket
               </button>
             )}
          </div>
        </header>

        {/* ÁREA DE CONTENIDO FLUIDA */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {notification && <TopNotification msg={notification.msg} type={notification.type} />}

          {view === 'overview' && <OverviewDashboard tickets={tickets} equipment={equipment} />}
          {view === 'tickets' && <TicketsManager tickets={tickets} role={profile?.role} techs={techs} />}
          {view === 'inventory' && <InventoryPro equipment={equipment} techs={techs} customers={customers} />}
          {view === 'customers' && <CustomersManager customers={customers} techs={techs} />}
          {view === 'stats' && <StatsCenter tickets={tickets} />}
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
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all duration-300 group relative ${
        active 
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 border border-blue-500/50' 
        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <span className={`${active ? 'text-white' : 'group-hover:text-blue-500'} transition-colors`}>{icon}</span>
      <span>{label}</span>
      {active && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>}
    </button>
  );
}

function OverviewDashboard({ tickets, equipment }) {
  const pending = tickets.filter(t => t.status === 'Abierto').length;
  const inProgress = tickets.filter(t => t.status === 'Asignado' || t.status === 'En Proceso').length;
  const completed = tickets.filter(t => t.status === 'Completado').length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="Tickets Pendientes" value={pending} trend="+12%" color="text-red-500" icon={<AlertCircle />} />
        <KPICard label="En Atención" value={inProgress} trend="SLA 98%" color="text-blue-500" icon={<Clock />} />
        <KPICard label="Completados" value={completed} trend="+45 este mes" color="text-emerald-500" icon={<CheckCircle />} />
        <KPICard label="Flota Total" value={equipment.length} trend="Online 92%" color="text-slate-400" icon={<Printer />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 italic tracking-tight"><Activity className="text-blue-500" size={18}/> Actividad del Sistema</h3>
            <button className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition tracking-widest">Ver todo</button>
          </div>
          <div className="space-y-4">
             {tickets.slice(0, 5).map(t => (
               <div key={t.id} className="flex items-center justify-between p-5 bg-slate-800/20 border border-slate-700/30 rounded-3xl hover:bg-slate-800/40 transition-all border-l-4 border-l-blue-600">
                 <div className="flex items-center gap-4">
                   <div className="bg-slate-900 p-3 rounded-2xl border border-slate-700">
                     <Printer size={16} className="text-slate-400" />
                   </div>
                   <div>
                     <p className="font-bold text-slate-200">{t.equipment?.model || 'Equipo Ricoh'}</p>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.customers?.name || 'Cliente'}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-blue-500 mb-1">{t.status}</p>
                   <p className="text-[10px] font-bold text-slate-600 italic">{new Date(t.created_at).toLocaleTimeString()}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-950/20">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Zap className="text-yellow-500" size={18}/> Salud de Flota</h3>
           <div className="space-y-6">
              <HealthItem label="IM 550 (Gral)" percentage={94} color="bg-emerald-500" />
              <HealthItem label="IM C400 (Alcaldía)" percentage={82} color="bg-blue-500" />
              <HealthItem label="MP C3503 (Secretaría)" percentage={35} color="bg-red-500" />
              <div className="pt-6 border-t border-slate-800/50 mt-6">
                 <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                   <Info size={16} className="text-blue-500 shrink-0" />
                   <p className="text-[10px] text-slate-400 font-medium italic">Hay 3 equipos Ricoh requiriendo mantenimiento preventivo según contadores.</p>
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
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 hover:bg-slate-800/50 transition-all group shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-slate-950 border border-slate-800 ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 ${color === 'text-red-500' ? 'text-red-400' : 'text-emerald-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-white tracking-tighter mb-1">{value}</p>
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
    </div>
  );
}

function HealthItem({ label, percentage, color }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
         <span className="text-slate-400">{label}</span>
         <span className="text-white">{percentage}%</span>
       </div>
       <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
         <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
       </div>
    </div>
  );
}

function InventoryPro({ equipment, techs, customers }) {
  const [activeTab, setActiveTab] = useState('grid');
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/30 p-4 rounded-3xl border border-slate-800/50 gap-4">
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setActiveTab('grid')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Vista Cuadrícula</button>
          <button onClick={() => setActiveTab('table')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Listado Detallado</button>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-all shadow-xl shadow-blue-500/10 active:scale-95">
            <UploadCloud size={14} /> Importar Flota RICOH
            <input type="file" accept=".csv" className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {equipment.map(item => (
          <div key={item.id} className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-blue-500/50 transition-all group shadow-xl">
             <div className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                   <div className="bg-slate-950 p-4 rounded-[1.5rem] border border-slate-800 text-blue-500 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <Printer size={32} strokeWidth={1.5} />
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-1">Estatus</span>
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${item.status === 'Operativo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                         {item.status}
                      </span>
                   </div>
                </div>
                <h4 className="text-2xl font-black text-white italic tracking-tighter mb-1 uppercase group-hover:text-blue-500 transition-colors">{item.model}</h4>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-6 flex items-center gap-2">
                   <ShieldCheck size={12} className="text-slate-700"/> Serial: {item.serial}
                </p>
                <div className="space-y-4 pt-6 border-t border-slate-800/50 text-[10px]">
                   <div className="flex items-center justify-between">
                      <span className="font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><MapPin size={10}/> Ubicación Física</span>
                      <span className="font-bold text-slate-300 italic">{item.physical_location}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Zap size={10}/> Dirección IP</span>
                      <span className="font-mono font-bold text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-lg border border-blue-500/20">{item.ip_address}</span>
                   </div>
                </div>
             </div>
             <div className="p-4 bg-slate-800/20 mt-4 flex gap-2">
                <button className="flex-1 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95">Diagnóstico</button>
                <button className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all active:scale-95">Nuevo Caso</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketsManager({ tickets, role, techs }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in duration-700">
       <div className="p-8 bg-slate-950 border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500"><ClipboardList /></div>
            <div>
              <h3 className="text-xl font-bold text-white italic">Centro de Control de Tickets</h3>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monitoreo en tiempo real de servicios técnicos</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl flex p-1 shadow-inner">
                <button className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl">Todos</button>
                <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Urgentes</button>
                <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Completados</button>
             </div>
          </div>
       </div>

       <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
             <thead className="bg-slate-950/30 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-800/50">
               <tr>
                 <th className="px-8 py-6">ID / Apertura</th>
                 <th className="px-6 py-6">Equipo & Cliente</th>
                 <th className="px-6 py-6 text-center">Estado / SLA</th>
                 <th className="px-6 py-6">Técnico Asignado</th>
                 <th className="px-8 py-6 text-right">Acciones</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/50 text-[11px]">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-6">
                       <span className="block font-black text-white group-hover:text-blue-500 transition-colors uppercase tracking-widest">REQ-{t.id.slice(0,5)}</span>
                       <span className="text-[9px] font-black text-slate-600 uppercase italic tracking-widest">{new Date(t.created_at).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-4">
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400"><Printer size={18}/></div>
                          <div>
                            <p className="font-black text-slate-200 uppercase tracking-tighter">{t.equipment?.model || 'Desconocido'}</p>
                            <p className="text-[10px] font-black text-blue-500 uppercase italic">{t.customers?.name || 'Institución'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex flex-col items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1.5 w-fit ${
                            t.status === 'Abierto' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                            t.status === 'En Proceso' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Abierto' ? 'bg-red-500 animate-pulse' : 'bg-current'}`}></span>
                            {t.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       {t.technician_id ? (
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-black border border-slate-600 shadow-xl ring-2 ring-slate-800">TP</div>
                           <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Staff Técnico</span>
                         </div>
                       ) : (
                         <button className="text-[10px] font-black uppercase text-red-400/60 bg-red-400/5 px-3 py-1.5 rounded-xl border border-red-400/10 hover:bg-red-400/10 hover:text-red-400 transition-all">Asignar Ahora</button>
                       )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 hover:text-blue-500 transition-all shadow-xl"><MoreVertical size={16}/></button>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function StatsCenter({ tickets }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in zoom-in-95 duration-700">
       <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
          <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-500 mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-700 ring-8 ring-slate-900/50">
             <Download size={40} strokeWidth={1}/>
          </div>
          <h3 className="text-2xl font-black text-white italic mb-2">Exportación de Auditoría</h3>
          <p className="text-slate-500 font-medium text-sm max-w-xs mb-10 leading-relaxed italic">Genera el reporte consolidado de tiempos de atención y cumplimiento de contratos para auditoría externa e informes ejecutivos.</p>
          <button className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-900/40 uppercase tracking-widest text-[10px] transition-all active:scale-95">Descargar Data (CSV)</button>
       </div>

       <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2 tracking-tight uppercase"><BarChart3 size={18} className="text-emerald-500"/> Métricas de Cumplimiento</h3>
          <div className="space-y-8">
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Atención en Tiempo Real (&lt; 4h)</p>
                   <p className="text-lg font-black text-emerald-400 tracking-tighter">92%</p>
                </div>
                <div className="h-4 bg-slate-800 rounded-2xl overflow-hidden p-1 shadow-inner">
                   <div className="h-full bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20" style={{ width: '92%' }}></div>
                </div>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Repuestos Stock RICOH Global</p>
                   <p className="text-lg font-black text-blue-400 tracking-tighter">76%</p>
                </div>
                <div className="h-4 bg-slate-800 rounded-2xl overflow-hidden p-1 shadow-inner">
                   <div className="h-full bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20" style={{ width: '76%' }}></div>
                </div>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Satisfacción del Cliente Pro</p>
                   <p className="text-lg font-black text-yellow-400 tracking-tighter">4.8/5</p>
                </div>
                <div className="h-4 bg-slate-800 rounded-2xl overflow-hidden p-1 shadow-inner">
                   <div className="h-full bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20" style={{ width: '96%' }}></div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// --- PANTALLAS DE CARGA Y LOGIN ---

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white font-black italic relative overflow-hidden">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
       <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-slate-800 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-6 relative z-10">
         <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl animate-spin shadow-blue-500/20 duration-[3000ms]">
            <Printer size={64} />
         </div>
         <div className="text-center">
            <h1 className="text-4xl tracking-tighter uppercase font-black italic">Impriartex Cloud</h1>
            <p className="text-[10px] text-blue-500 uppercase font-black tracking-[0.5em] mt-2 animate-pulse italic">Establishing Secure Neural Link...</p>
         </div>
       </div>
    </div>
  );
}

function LoginScreen({ supabase }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 p-16 rounded-[4rem] shadow-2xl max-w-xl w-full text-center relative z-10 animate-in zoom-in-95 duration-1000">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-900/40 text-white font-black italic text-4xl ring-8 ring-slate-900">R</div>
        <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-2 leading-none italic">Impriartex <span className="text-blue-500">Service</span></h2>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-16 italic opacity-60">Corporate Asset Management System</p>
        
        <form onSubmit={handleLogin} className="space-y-6 text-left">
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">Corporate Access Email</label>
             <input className="w-full p-5 bg-slate-950/50 border border-slate-800 rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600/50 transition-all placeholder:text-slate-800 text-sm" placeholder="nombre@impriartex.com" value={email} onChange={e=>setEmail(e.target.value)} />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">Security Access Key</label>
             <input className="w-full p-5 bg-slate-950/50 border border-slate-800 rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600/50 transition-all placeholder:text-slate-800 text-sm" type="password" placeholder="••••••••••••" value={pass} onChange={e=>setPass(e.target.value)} />
           </div>
           <button 
             disabled={loading}
             className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-900/40 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 mt-10"
           >
             {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Validar Credenciales"}
           </button>
        </form>
        <p className="mt-12 text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Propiedad de Impriartex S.A. © 2026 | Cloud Engine 1.0.4</p>
      </div>
    </div>
  );
}

function TopNotification({ msg, type }) {
  return (
    <div className={`fixed top-24 right-10 px-8 py-5 rounded-[2rem] shadow-2xl z-[60] flex items-center gap-4 border-l-8 backdrop-blur-xl animate-in slide-in-from-right-10 duration-500 ${
      type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-l-emerald-500' : 'bg-red-950/80 text-red-400 border-l-red-500'
    }`}>
       <div className={`p-2 rounded-xl bg-slate-900 border ${type === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          {type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
       </div>
       <p className="text-sm font-black tracking-tight italic">{msg}</p>
    </div>
  );
}

function CustomersManager({ customers, techs }) {
   return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in">
       <div className="p-8 border-b bg-slate-950 border-slate-800/50 font-black text-xs text-slate-500 uppercase tracking-[0.3em] italic">Directorio de Entidades e Instituciones</div>
       <table className="w-full text-left">
          <thead className="bg-slate-950/20 text-[10px] font-black uppercase text-slate-600 tracking-widest border-b border-slate-800/50">
            <tr><th className="px-10 py-6">Institución Cliente</th><th className="px-10 py-6 text-right">Técnico Fijo Encargado</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs font-bold">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/40 transition-all">
                <td className="px-10 py-6">
                   <div className="flex items-center gap-4">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-blue-500 shadow-xl"><Building2 size={20}/></div>
                      <span className="text-xl font-black text-white italic tracking-tighter uppercase">{c.name}</span>
                   </div>
                </td>
                <td className="px-10 py-6 text-right">
                   <select className="text-[10px] font-black p-3 border rounded-2xl bg-slate-950 border-blue-500/20 outline-none text-blue-500 shadow-xl focus:ring-2 focus:ring-blue-600/30 ring-inset">
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
