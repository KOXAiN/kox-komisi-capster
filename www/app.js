(() => {
  const $ = id => document.getElementById(id);
  const rates = { Hairspa: 5000, Premium: 17000, Clasiy: 21000, Royal: 27000, Perming: 50000, Smoothing: 50000 };
  const storageKey = 'koxCapsterDailyV2';
  let serviceCounts = {};
  let history = loadHistory();
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  $('recapDate').value = localDate;
  function money(n) { return 'Rp' + Math.max(0, Math.round(n || 0)).toLocaleString('id-ID'); }
  function num(id) { return Math.max(0, Math.floor(Number($(id).value) || 0)); }
  function cutCommission(q) { let total=0; for(let i=1;i<=q;i++) total += i<=5 ? 5000 : i<=9 ? 7500 : 10000; return total; }
  function loadHistory() { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) { return []; } }
  function saveHistory() { localStorage.setItem(storageKey, JSON.stringify(history)); }
  function currentService() { return $('serviceType').value; }
  function serviceTotalFor(name) { return (Number(serviceCounts[name]) || 0) * rates[name]; }
  function totalServices() { return Object.keys(rates).reduce((s,name)=>s+serviceTotalFor(name),0); }
  function render() {
    const cuts = cutCommission(num('cutCount'));
    const svcName = currentService();
    const svcCommission = serviceTotalFor(svcName);
    $('cutCommission').textContent = money(cuts);
    $('serviceCommission').textContent = money(svcCommission);
    $('serviceCommissionLabel').textContent = `Komisi ${svcName}`;
    $('serviceRate').textContent = `Tarif ${money(rates[svcName])} per pelanggan`;
    $('cutTotal').textContent = money(cuts);
    $('serviceTotal').textContent = money(totalServices());
    $('totalToday').textContent = money(cuts + totalServices());
    $('serviceCount').value = Number(serviceCounts[svcName]) || 0;
    renderHistory();
  }
  function snapshot() { return { date: $('recapDate').value || localDate, cutCount: num('cutCount'), serviceCounts: {...serviceCounts}, total: cutCommission(num('cutCount'))+totalServices(), savedAt: new Date().toISOString() }; }
  function summaryText(item=snapshot()) {
    const lines = [`KOMISI CAPSTER BY DOEL`, `Tanggal: ${item.date}`, `Potong biasa (${item.cutCount} potong): ${money(cutCommission(item.cutCount))}`];
    Object.keys(rates).forEach(name => { const q=Number(item.serviceCounts?.[name])||0; if(q>0) lines.push(`${name} (${q} pelanggan): ${money(q*rates[name])}`); });
    lines.push(`TOTAL KOMISI: ${money(item.total)}`); return lines.join('\n');
  }
  function toast(msg) { const el=$('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
  function renderHistory() {
    const root=$('historyList'); root.innerHTML='';
    if(!history.length){ root.innerHTML='<p class="empty">Belum ada rekap tersimpan.</p>'; return; }
    history.slice().reverse().forEach((item,revIndex)=>{
      const row=document.createElement('div'); row.className='history-item';
      const info=document.createElement('div'); const title=document.createElement('strong'); title.textContent=item.date || 'Tanggal tidak diketahui';
      const detail=document.createElement('small'); detail.textContent=`Total ${money(item.total)}`; info.append(title,detail);
      const btn=document.createElement('button'); btn.textContent='Muat'; btn.addEventListener('click',()=>{ $('recapDate').value=item.date || localDate; $('cutCount').value=item.cutCount ?? item.counts?.potong ?? 0; serviceCounts={...(item.serviceCounts||{})}; if(item.counts){Object.keys(rates).forEach(k=>{if(serviceCounts[k]===undefined)serviceCounts[k]=item.counts[k]||0;});} $('serviceCount').value=serviceCounts[currentService()]||0; render(); window.scrollTo({top:0,behavior:'smooth'}); toast('Rekap dimuat'); });
      row.append(info,btn); root.append(row);
    });
  }
  function updateServiceCount(delta=0) { const name=currentService(); serviceCounts[name]=Math.max(0,(Number(serviceCounts[name])||0)+delta); $('serviceCount').value=serviceCounts[name]; render(); }
  $('cutCount').addEventListener('input',render);
  $('cutMinus').addEventListener('click',()=>{ $('cutCount').value=Math.max(0,num('cutCount')-1); render(); });
  $('cutPlus').addEventListener('click',()=>{ $('cutCount').value=num('cutCount')+1; render(); });
  $('serviceType').addEventListener('change',render);
  $('serviceCount').addEventListener('input',()=>{serviceCounts[currentService()]=num('serviceCount');render();});
  $('serviceMinus').addEventListener('click',()=>updateServiceCount(-1));
  $('servicePlus').addEventListener('click',()=>updateServiceCount(1));
  $('saveBtn').addEventListener('click',()=>{ const item=snapshot(); const idx=history.findIndex(h=>h.date===item.date); if(idx>=0) history[idx]=item; else history.push(item); saveHistory(); renderHistory(); toast('Rekap berhasil disimpan'); });
  async function copySummary(){try{await navigator.clipboard.writeText(summaryText());toast('Rekap berhasil disalin');}catch(_){const ta=document.createElement('textarea');ta.value=summaryText();document.body.append(ta);ta.select();try{document.execCommand('copy');toast('Rekap berhasil disalin');}catch(e){toast('Gagal menyalin rekap');}ta.remove();}}
  $('copyBtn').addEventListener('click',copySummary); $('navCopy').addEventListener('click',copySummary);
  $('clearHistory').addEventListener('click',()=>{if(confirm('Hapus semua riwayat rekap?')){history=[];saveHistory();renderHistory();toast('Riwayat dihapus');}});
  $('settingsBtn').addEventListener('click',()=>toast('Tarif komisi mengikuti aturan aplikasi'));
  document.querySelectorAll('.bottom-nav [data-target]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');window.scrollTo({top:btn.dataset.target==='history'?document.body.scrollHeight:0,behavior:'smooth'});}));
  // Restore legacy history format if it exists.
  try { const old=JSON.parse(localStorage.getItem('koxKomisiHistory')||'null'); if(Array.isArray(old)&&history.length===0){history=old.map(h=>({date:h.date||h.tanggal||localDate,cutCount:h.cutCount??h.counts?.potong??0,serviceCounts:h.serviceCounts||h.counts||{},total:h.total||0}));saveHistory();} } catch(_){}
  render();
})();
