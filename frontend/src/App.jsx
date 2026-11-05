import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Compass, MapPin, Menu, X, ArrowRight, Waves, CalendarDays, Ticket, ShieldCheck, LogOut, LayoutDashboard, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { api, rupiah } from './lib/api';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const fallbackImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85';

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  async function loadProfile(current) {
    if (!current?.user) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', current.user.id).maybeSingle();
    setProfile(data || null);
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await loadProfile(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => { setSession(next); await loadProfile(next); setLoading(false); });
    return () => listener.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>;
}

function Header() {
  const { session, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  async function logout() { await supabase.auth.signOut(); navigate('/'); }
  const nav = <><NavLink to="/destinasi">Destinasi</NavLink><a href="/#tentang">Tentang</a><a href="/#kontak">Kontak</a>{session && <NavLink to="/reservasi-saya">Reservasi Saya</NavLink>}{profile?.role === 'admin' && <NavLink to="/admin">Dashboard</NavLink>}</>;
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" to="/"><span className="brand-mark"><Compass size={22}/></span><span>explore<span className="brand-accent">madura</span><small>DISCOVER THE ISLAND</small></span></Link>
    <nav className="desktop-nav">{nav}</nav>
    <div className="nav-actions">{session ? <button className="btn btn-outline btn-small" onClick={logout}><LogOut size={15}/> Keluar</button> : <Link className="btn btn-dark btn-small" to="/login">Masuk</Link>}<button className="mobile-toggle" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
    {open && <nav className="mobile-nav" onClick={() => setOpen(false)}>{nav}</nav>}
  </div></header>;
}

function Footer() { return <footer id="kontak"><div className="container footer-grid"><div><Link className="brand brand-light" to="/"><span className="brand-mark"><Compass size={22}/></span><span>explore<span className="brand-accent">madura</span><small>DISCOVER THE ISLAND</small></span></Link><p>Temukan pesona wisata alam Madura. Rencanakan perjalananmu dengan lebih mudah.</p></div><div><b>Jelajahi</b><Link to="/destinasi">Destinasi wisata</Link><a href="/#tentang">Tentang kami</a></div><div><b>Informasi</b><span>Sumenep, Madura, Jawa Timur</span><span>Informasi kontak pengelola akan diperbarui.</span></div></div><div className="container copyright">© {new Date().getFullYear()} Explore Madura. Platform informasi dan reservasi wisata.</div></footer>; }

function Shell({ children }) { return <><Header/>{children}<Footer/></>; }

function Home() {
  const [destinations, setDestinations] = useState([]);
  useEffect(() => { api('/destinations').then(setDestinations).catch(console.error); }, []);
  const featured = destinations[0];
  return <Shell>
    <section className="hero" style={{backgroundImage:`linear-gradient(90deg,rgba(8,35,30,.82),rgba(8,35,30,.22)),url(${featured?.hero_image || fallbackImage})`}}>
      <div className="container hero-content"><span className="eyebrow"><Waves size={15}/> THE BEAUTY OF MADURA</span><h1>Temukan sisi lain<br/><em>keindahan Madura.</em></h1><p>Jelajahi pesona alam, pantai, dan pengalaman lokal yang menunggu untuk kamu temukan.</p><div className="hero-actions"><Link className="btn btn-coral" to="/destinasi">Jelajahi wisata <ArrowRight size={17}/></Link><a className="btn btn-glass" href="#tentang">Kenali Explore Madura</a></div><div className="hero-note"><MapPin size={15}/> Madura, Jawa Timur, Indonesia</div></div>
      <div className="hero-bottom"><span>01 / DESTINASI ALAM</span><span>EXPLORE • EXPERIENCE • ENJOY</span></div>
    </section>
    <section className="intro section" id="tentang"><div className="container intro-grid"><div><span className="eyebrow dark">JELAJAHI MADURA</span><h2>Perjalanan indah<br/>dimulai dari <em>sini.</em></h2></div><div className="intro-copy"><p>Explore Madura hadir untuk membantu wisatawan menemukan informasi destinasi, mengenal daya tarik lokal, dan merencanakan kunjungan dengan lebih praktis melalui satu platform digital.</p><Link className="text-link" to="/destinasi">Lihat semua destinasi <ArrowRight size={16}/></Link></div></div></section>
    <section className="section destinations-section"><div className="container"><div className="section-heading"><div><span className="eyebrow dark">PILIH PERJALANANMU</span><h2>Destinasi pilihan</h2></div><Link className="text-link" to="/destinasi">Semua destinasi <ArrowRight size={16}/></Link></div>
      {destinations.length ? <div className="destination-grid">{destinations.slice(0,3).map(d => <DestinationCard key={d.id} d={d}/>)}</div> : <div className="empty-state"><Waves size={28}/><h3>Destinasi sedang disiapkan</h3><p>Pastikan konfigurasi Supabase dan data destinasi sudah tersedia.</p></div>}
    </div></section>
    <section className="cta-band"><div className="container cta-inner"><div><span className="eyebrow">YOUR NEXT ESCAPE</span><h2>Waktunya membuat<br/><em>cerita perjalanan baru.</em></h2></div><Link className="btn btn-coral" to="/destinasi">Mulai jelajahi <ArrowRight size={17}/></Link></div></section>
  </Shell>;
}

function DestinationCard({ d }) { return <Link to={`/destinasi/${d.slug}`} className="destination-card"><div className="card-image"><img src={d.hero_image || fallbackImage} alt={d.name}/><span className="image-tag">WISATA ALAM</span></div><div className="card-body"><span className="card-location"><MapPin size={13}/>{d.district || 'Madura'}, {d.regency || 'Sumenep'}</span><h3>{d.name}</h3><p>{d.short_description}</p><span className="card-more">Lihat destinasi <ArrowRight size={15}/></span></div></Link>; }

function Destinations() {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api('/destinations').then(setData).catch(e => setError(e.message)); }, []);
  return <Shell><main className="page-main"><div className="container"><div className="page-title"><span className="eyebrow dark">EXPLORE THE ISLAND</span><h1>Destinasi <em>Madura.</em></h1><p>Temukan tempat, suasana, dan pengalaman baru di Pulau Madura.</p></div>{error && <Notice>{error}</Notice>}{data.length ? <div className="destination-grid">{data.map(d => <DestinationCard key={d.id} d={d}/>)}</div> : <div className="empty-state"><Waves/><h3>Belum ada destinasi</h3><p>Tambahkan destinasi melalui dashboard admin atau periksa koneksi Supabase.</p></div>}</div></main></Shell>;
}

function Detail() {
  const { slug } = useParams(); const [d,setD] = useState(null); const [error,setError] = useState('');
  useEffect(() => { api(`/destinations/${slug}`).then(setD).catch(e=>setError(e.message)); }, [slug]);
  if (error) return <Shell><main className="container page-main"><Notice>{error}</Notice><Link to="/destinasi" className="text-link">Kembali ke destinasi</Link></main></Shell>;
  if (!d) return <Shell><main className="container page-main">Memuat informasi destinasi...</main></Shell>;
  return <Shell><main className="detail-page"><div className="detail-hero" style={{backgroundImage:`linear-gradient(0deg,rgba(5,24,21,.78),transparent 70%),url(${d.hero_image || fallbackImage})`}}><div className="container detail-hero-content"><span className="eyebrow">DESTINASI WISATA ALAM</span><h1>{d.name}</h1><p><MapPin size={16}/>{d.address}</p></div></div><div className="container detail-layout"><article><span className="eyebrow dark">TENTANG DESTINASI</span><h2>Kenali lebih dekat</h2><p className="long-copy">{d.description || d.short_description}</p><h2>Fasilitas wisata</h2><div className="facility-list">{(d.facilities || []).length ? d.facilities.map(f=><span key={f.id}><CheckCircle2 size={16}/>{f.name}</span>) : <p>Informasi fasilitas akan diperbarui oleh pengelola.</p>}</div>{(d.galleries || []).length > 0 && <><h2>Galeri</h2><div className="gallery-grid">{d.galleries.map(g=><img key={g.id} src={g.image_url} alt={g.caption || d.name}/>)}</div></>}</article><aside className="booking-panel"><span className="eyebrow dark">RENCANAKAN KUNJUNGAN</span><h3>Informasi tiket</h3>{(d.ticket_types || []).map(t=><div className="ticket-row" key={t.id}><span>{t.name}</span><b>{rupiah(t.price)}</b></div>)}{!d.ticket_types?.length && <p>Harga tiket belum tersedia.</p>}<Link className="btn btn-dark full" to={`/booking/${d.id}`}>Pesan tiket <ArrowRight size={16}/></Link><small>Harga dan ketentuan perlu dikonfirmasi kepada pengelola.</small></aside></div></main></Shell>;
}

function Notice({ children }) { return <div className="notice">{children}</div>; }
function AuthPage({ register=false }) {
  const [form,setForm]=useState({name:'',email:'',password:'',phone:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const navigate=useNavigate();
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try {
    if(register) { const {error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name,phone:form.phone}}}); if(error) throw error; setError('Pendaftaran berhasil. Jika konfirmasi email aktif, buka email untuk verifikasi sebelum login.'); }
    else { const {error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password}); if(error) throw error; navigate('/'); }
  } catch(err){setError(err.message || 'Terjadi kesalahan.');} finally{setBusy(false);} }
  return <Shell><main className="auth-wrap"><div className="auth-card"><span className="eyebrow dark">{register?'JOIN THE JOURNEY':'WELCOME BACK'}</span><h1>{register?'Buat akun':'Selamat datang'}<br/><em>{register?'Explore Madura.':'kembali.'}</em></h1><p>{register?'Daftar untuk mulai merencanakan kunjungan wisatamu.':'Masuk untuk mengelola reservasi perjalananmu.'}</p>{error && <Notice>{error}</Notice>}<form onSubmit={submit} className="form-stack">{register && <label>Nama lengkap<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>{register && <label>Nomor WhatsApp<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>}<label>Password<input required minLength="6" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button className="btn btn-dark full" disabled={busy}>{busy?'Memproses...':register?'Daftar akun':'Masuk'}</button></form><p className="auth-switch">{register?'Sudah punya akun? ':'Belum punya akun? '}<Link to={register?'/login':'/register'}>{register?'Masuk':'Daftar'}</Link></p></div></main></Shell>;
}

function Booking() {
  const { id }=useParams(); const {session}=useAuth(); const navigate=useNavigate();
  const [destination,setDestination]=useState(null); const [date,setDate]=useState(''); const [name,setName]=useState(''); const [email,setEmail]=useState(session?.user?.email || ''); const [phone,setPhone]=useState(''); const [quantities,setQuantities]=useState({}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{api('/destinations').then(ds=>setDestination(ds.find(x=>x.id===id)||null)).catch(e=>setError(e.message));},[id]);
  const tickets=destination?.ticket_types || [];
  const total=tickets.reduce((s,t)=>s+(Number(quantities[t.id]||0)*t.price),0);
  async function submit(e){e.preventDefault();if(!session){navigate('/login');return;}const items=tickets.filter(t=>Number(quantities[t.id]||0)>0).map(t=>({ticket_type_id:t.id,quantity:Number(quantities[t.id])}));if(!items.length){setError('Pilih minimal satu tiket.');return;}setBusy(true);setError('');try{const result=await api('/reservations',{method:'POST',body:JSON.stringify({destination_id:id,visit_date:date,customer_name:name,customer_email:email,customer_phone:phone,items})});navigate('/reservasi-saya',{state:{created:result.booking_code}});}catch(err){setError(err.message);}finally{setBusy(false);}}
  if(!destination)return <Shell><main className="container page-main">{error||'Memuat...'}</main></Shell>;
  return <Shell><main className="page-main"><div className="container booking-layout"><div><span className="eyebrow dark">RESERVASI ONLINE</span><h1>Pesan tiket <em>{destination.name}.</em></h1><p>Isi informasi kunjungan berikut. Pesanan akan menunggu konfirmasi pengelola.</p><form className="form-stack booking-form" onSubmit={submit}><label>Tanggal kunjungan<input type="date" min={new Date().toISOString().slice(0,10)} required value={date} onChange={e=>setDate(e.target.value)}/></label><div className="form-two"><label>Nama pemesan<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Nomor WhatsApp<input required value={phone} onChange={e=>setPhone(e.target.value)}/></label></div><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><h3>Pilih tiket</h3>{tickets.map(t=><div className="quantity-row" key={t.id}><div><b>{t.name}</b><span>{rupiah(t.price)} / tiket</span></div><input aria-label={`Jumlah ${t.name}`} type="number" min="0" max="20" value={quantities[t.id]||0} onChange={e=>setQuantities({...quantities,[t.id]:e.target.value})}/></div>)}<label>Catatan (opsional)<textarea rows="3" placeholder="Catatan tambahan untuk pengelola"/></label>{error&&<Notice>{error}</Notice>}<button className="btn btn-dark full" disabled={busy}>{busy?'Mengirim reservasi...':'Buat reservasi'}</button></form></div><aside className="booking-panel"><span className="eyebrow dark">RINGKASAN</span><h3>{destination.name}</h3><div className="ticket-row"><span>Total tiket</span><b>{tickets.reduce((s,t)=>s+Number(quantities[t.id]||0),0)}</b></div><div className="total-row"><span>Total pembayaran</span><b>{rupiah(total)}</b></div><small>Harga merupakan data yang diatur pengelola. Reservasi belum dikonfirmasi sampai pembayaran diverifikasi.</small></aside></div></main></Shell>;
}

function MyBookings() {
  const {session}=useAuth();const [rows,setRows]=useState([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function load(){try{setRows(await api('/reservations/mine'));}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function uploadProof(id,file){if(!file)return;setBusy(true);setError('');try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('File harus JPG, PNG, atau WEBP maksimal 5 MB.');const path=`payments/${session.user.id}/${id}-${Date.now()}.${file.name.split('.').pop()}`;const {error:upErr}=await supabase.storage.from('tourism-media').upload(path,file,{upsert:false});if(upErr)throw upErr;await api(`/reservations/${id}/payment-proof`,{method:'POST',body:JSON.stringify({file_path:path})});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <Shell><main className="page-main"><div className="container"><div className="page-title"><span className="eyebrow dark">YOUR BOOKINGS</span><h1>Reservasi <em>saya.</em></h1><p>Pantau status pemesanan tiket wisatamu.</p></div>{error&&<Notice>{error}</Notice>}{rows.length?<div className="booking-list">{rows.map(r=><div className="booking-item" key={r.id}><div><span className="eyebrow dark">{r.booking_code}</span><h3>{r.destinations?.name}</h3><p>{r.visit_date} · {rupiah(r.total_amount)}</p><span className={`status status-${r.status}`}>{r.status.replace('_',' ')}</span></div><div className="booking-item-actions">{r.status==='pending'&&<label className="upload-label">Unggah bukti pembayaran<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>uploadProof(r.id,e.target.files?.[0])}/></label>}{r.payment_proof&&<span className="muted">Bukti pembayaran telah diunggah</span>}</div></div>)}</div>:<div className="empty-state"><Ticket/><h3>Belum ada reservasi</h3><p>Reservasi yang kamu buat akan tampil di sini.</p><Link className="btn btn-dark" to="/destinasi">Cari destinasi</Link></div>}</div></main></Shell>;
}

function Admin() {
  const {profile}=useAuth();const [summary,setSummary]=useState(null);const [rows,setRows]=useState([]);const [destinations,setDestinations]=useState([]);const [error,setError]=useState('');const [ticketForm,setTicketForm]=useState({destination_id:'',name:'Tiket masuk',description:'',price:'10000'});const [form,setForm]=useState({name:'',slug:'',short_description:'',description:'',address:'Desa Bringsang, Giligenting, Sumenep, Madura',hero_image:''});
  async function load(){try{const [s,r,d]=await Promise.all([api('/admin/summary'),api('/admin/reservations'),api('/destinations')]);setSummary(s);setRows(r);setDestinations(d);if(!ticketForm.destination_id && d[0])setTicketForm(v=>({...v,destination_id:d[0].id}));}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  if(profile?.role!=='admin')return <Shell><main className="container page-main"><Notice>Akses hanya tersedia untuk administrator.</Notice></main></Shell>;
  async function changeStatus(id,status){try{await api(`/admin/reservations/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});await load();}catch(e){setError(e.message);}}
  async function addDestination(e){e.preventDefault();try{await api('/admin/destinations',{method:'POST',body:JSON.stringify({...form,published:true})});setForm({name:'',slug:'',short_description:'',description:'',address:'',hero_image:''});await load();}catch(e){setError(e.message);}}
  async function removeDestination(id){if(!confirm('Hapus destinasi ini?'))return;try{await api(`/admin/destinations/${id}`,{method:'DELETE'});await load();}catch(e){setError(e.message);}}
  async function addTicket(e){e.preventDefault();try{await api('/admin/tickets',{method:'POST',body:JSON.stringify({...ticketForm,price:Number(ticketForm.price)})});setError('Jenis tiket berhasil ditambahkan.');await load();}catch(e){setError(e.message);}}
  async function deleteTicket(id){if(!confirm('Hapus jenis tiket ini?'))return;try{await api(`/admin/tickets/${id}`,{method:'DELETE'});await load();}catch(e){setError(e.message);}}
  return <Shell><main className="page-main admin-page"><div className="container"><div className="admin-heading"><div><span className="eyebrow dark">MANAGEMENT CONSOLE</span><h1>Dashboard <em>admin.</em></h1><p>Selamat datang, {profile.full_name || profile.email}.</p></div><span className="admin-label"><ShieldCheck size={16}/> Administrator</span></div>{error&&<Notice>{error}</Notice>}
    <div className="stats-grid">{[['Destinasi',summary?.destinations ?? '—'],['Total reservasi',summary?.reservations ?? '—'],['Perlu ditinjau',summary?.pending ?? '—'],['Pendapatan terkonfirmasi',summary?rupiah(summary.confirmedRevenue):'—']].map(([label,value])=><div className="stat-card" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
    <section className="admin-section"><h2>Tambah destinasi</h2><form className="admin-form" onSubmit={addDestination}><input placeholder="Nama destinasi" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="Slug (contoh: pantai-x)" required value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})}/><input placeholder="Deskripsi singkat" value={form.short_description} onChange={e=>setForm({...form,short_description:e.target.value})}/><input placeholder="URL gambar utama" value={form.hero_image} onChange={e=>setForm({...form,hero_image:e.target.value})}/><textarea placeholder="Deskripsi lengkap" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input placeholder="Alamat" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/><button className="btn btn-dark">Simpan destinasi</button></form>
      <div className="admin-table">{destinations.map(d=><div className="admin-row" key={d.id}><span>{d.name}<small>/{d.slug}</small></span><button className="btn btn-danger btn-small" onClick={()=>removeDestination(d.id)}>Hapus</button></div>)}</div>
    </section>
    <section className="admin-section"><h2>Kelola jenis tiket</h2><form className="admin-form" onSubmit={addTicket}><select required value={ticketForm.destination_id} onChange={e=>setTicketForm({...ticketForm,destination_id:e.target.value})}><option value="">Pilih destinasi</option>{destinations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input required placeholder="Nama tiket" value={ticketForm.name} onChange={e=>setTicketForm({...ticketForm,name:e.target.value})}/><input type="number" min="0" required placeholder="Harga tiket (rupiah)" value={ticketForm.price} onChange={e=>setTicketForm({...ticketForm,price:e.target.value})}/><input placeholder="Deskripsi tiket" value={ticketForm.description} onChange={e=>setTicketForm({...ticketForm,description:e.target.value})}/><button className="btn btn-dark">Tambah jenis tiket</button></form><div className="admin-table">{destinations.flatMap(d=>(d.ticket_types||[]).map(t=><div className="admin-row" key={t.id}><span>{d.name} — {t.name}<small>{rupiah(t.price)} · {t.active?'Aktif':'Nonaktif'}</small></span><button className="btn btn-danger btn-small" onClick={()=>deleteTicket(t.id)}>Hapus</button></div>))}</div></section>
    <section className="admin-section"><h2>Kelola reservasi</h2>{rows.length?<div className="admin-table">{rows.map(r=><div className="reservation-admin-row" key={r.id}><div><b>{r.booking_code}</b><span>{r.customer_name} · {r.destinations?.name}</span><small>{r.visit_date} · {rupiah(r.total_amount)}</small><span className={`status status-${r.status}`}>{r.status.replace('_',' ')}</span></div><div className="admin-row-actions">{r.payment_proof&&<a target="_blank" rel="noreferrer" href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tourism-media/${r.payment_proof}`}>Lihat bukti</a>}{r.status!=='confirmed'&&<button className="btn btn-small btn-success" onClick={()=>changeStatus(r.id,'confirmed')}>Konfirmasi</button>}{r.status!=='rejected'&&<button className="btn btn-small btn-danger" onClick={()=>changeStatus(r.id,'rejected')}>Tolak</button>}</div></div>)}</div>:<p>Belum ada reservasi.</p>}</section>
  </div></main></Shell>;
}

function Guard({children,admin=false}) {const {session,profile,loading}=useAuth();if(loading)return <div className="loading-screen">Memuat akun...</div>;if(!session)return <AuthPage/>;if(admin&&profile?.role!=='admin')return <Shell><main className="container page-main"><Notice>Akun ini bukan administrator.</Notice></main></Shell>;return children;}

export default function App(){return <AuthProvider><Routes><Route path="/" element={<Home/>}/><Route path="/destinasi" element={<Destinations/>}/><Route path="/destinasi/:slug" element={<Detail/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/><Route path="/booking/:id" element={<Guard><Booking/></Guard>}/><Route path="/reservasi-saya" element={<Guard><MyBookings/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="*" element={<Shell><main className="container page-main"><h1>Halaman tidak ditemukan</h1><Link to="/">Kembali ke beranda</Link></main></Shell>}/></Routes></AuthProvider>}
