(() => {
  'use strict';
  const RATES = { hairspa: 5000, premium: 17000, clasiy: 21000, royal: 27000, perming: 50000, smoothing: 50000 };
  const NAMES = { hairspa: 'Hairspa', premium: 'Premium', clasiy: 'Clasiy', royal: 'Royal', perming: 'Perming', smoothing: 'Smoothing' };
  const STORAGE_KEY = 'koxKomisiCapsterDataV2';
  const LEGACY_KEYS = ['koxKomisiCapsterData', 'komisiCapsterData', 'capsterHistory'];
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(Number(n) || 0)));
  const safeQty = n => Math.max(0, Math.floor(Number(n) || 0));
  const freshCounts = () => Object.fromEntries(Object.keys(RATES).map(k => [k, 0]));
  let serviceCounts = freshCounts();
  let history = loadHistory();

  function cutCommission(qty) {
    qty = safeQty(qty);
    return Math.min(qty, 5) * 5000 + Math.max(0, Math.min(qty - 5, 4)) * 7500 + Math.max(0, qty - 9) * 10000;
  }
  function serviceCommission(counts) {
    return Object.keys(RATES).reduce((sum, key) => sum + safeQty(counts[key]) * RATES[key], 0);
  }
  function totalFor(data) { return cutCommission(data.cutQty) + serviceCommission(data.serviceCounts || {}); }
  function snapshot() {
    return { date: $('entryDate').value || today(), note: $('entryNote').value.trim(), cutQty: safeQty($('cutQty').value), serviceCounts: { ...serviceCounts } };
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function loadHistory() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!raw) {
      for (const key of LEGACY_KEYS) { try { raw = localStorage.getItem(key); if (raw) break; } catch (_) {} }
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.history) ? parsed.history : []);
      return rows.map((item, i) => {
        const old = item.serviceCounts || item.counts || {};
        const counts = freshCounts();
        Object.keys(counts).forEach(k => counts[k] = safeQty(old[k]));
        return { id: item.id || `${Date.now()}-${i}`, date: item.date || today(), note: item.note || '', cutQty: safeQty(item.cutQty ?? old.potong ?? old['Potong Biasa'] ?? 0), serviceCounts: counts };
      });
    } catch (_) { return []; }
  }
  function persistHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); return true; } catch (_) { return false; }
  }
  function renderBreakdown() {
    const host = $('serviceBreakdown');
    const used = Object.keys(RATES).filter(k => safeQty(serviceCounts[k]) > 0);
    if (!used.length) { host.innerHTML = ''; return; }
    host.innerHTML = used.map(k => `<div class="breakdown-row"><span>${NAMES[k]} · ${safeQty(serviceCounts[k])} pelanggan</span><span>${money(safeQty(serviceCounts[k]) * RATES[k])}</span></div>`).join('');
  }
  function render() {
    const cutQty = safeQty($('cutQty').value);
    const selected = $('serviceSelect').value;
    $('cutCommission').textContent = money(cutCommission(cutQty));
    $('serviceQty').value = safeQty(serviceCounts[selected]);
    $('selectedServiceLabel').textContent = `Komisi ${NAMES[selected]} (${money(RATES[selected])}/pelanggan)`;
    $('selectedServiceCommission').textContent = money(safeQty(serviceCounts[selected]) * RATES[selected]);
    $('cutTotalSmall').textContent = money(cutCommission(cutQty));
    $('serviceTotalSmall').textContent = money(serviceCommission(serviceCounts));
    $('grandTotal').textContent = money(cutCommission(cutQty) + serviceCommission(serviceCounts));
    renderBreakdown();
    renderHistory();
  }
  function summary(data) {
    const lines = [`KOMISI CAPSTER BY DOEL`, `Tanggal: ${data.date}${data.note ? ` · ${data.note}` : ''}`, '', `Potong Biasa: ${safeQty(data.cutQty)} potong — ${money(cutCommission(data.cutQty))}`, 'Menu Servis:'];
    let any = false;
    Object.keys(RATES).forEach(k => { const q = safeQty((data.serviceCounts || {})[k]); if (q) { any = true; lines.push(`- ${NAMES[k]}: ${q} pelanggan × ${money(RATES[k])} = ${money(q * RATES[k])}`); } });
    if (!any) lines.push('- Belum ada servis');
    lines.push('', `TOTAL KOMISI: ${money(totalFor(data))}`);
    return lines.join('\n');
  }
  function renderHistory() {
    const host = $('historyList');
    if (!history.length) { host.innerHTML = '<p class="muted">Belum ada rekap tersimpan.</p>'; return; }
    host.innerHTML = history.slice().reverse().map(item => `<article class="history-item"><div class="history-head"><span>${escapeHtml(item.date)}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</span><span class="history-total">${money(totalFor(item))}</span></div><div class="history-detail">${escapeHtml(summary(item))}</div><div class="history-actions"><button type="button" data-action="load" data-id="${escapeHtml(item.id)}">Muat lagi</button><button type="button" data-action="copy" data-id="${escapeHtml(item.id)}">Salin</button><button type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Hapus</button></div></article>`).join('');
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); showStatus('Ringkasan berhasil disalin.'); }
    catch (_) { const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); try { document.execCommand('copy'); showStatus('Ringkasan disalin.'); } catch (_) { showStatus('Gagal menyalin otomatis.'); } area.remove(); }
  }
  function showStatus(message) { $('statusMessage').textContent = message; }
  $('entryDate').value = today();
  $('cutQty').addEventListener('input', render);
  $('serviceSelect').addEventListener('change', render);
  $('serviceQty').addEventListener('input', () => { serviceCounts[$('serviceSelect').value] = safeQty($('serviceQty').value); render(); });
  document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.step, delta = Number(btn.dataset.delta);
    if (id === 'cutQty') $('cutQty').value = safeQty($('cutQty').value) + delta;
    else { const key = $('serviceSelect').value; serviceCounts[key] = Math.max(0, safeQty(serviceCounts[key]) + delta); }
    render();
  }));
  $('saveBtn').addEventListener('click', () => {
    const item = snapshot(); item.id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    history.push(item);
    if (persistHistory()) showStatus('Rekap harian berhasil disimpan.'); else { history.pop(); showStatus('Penyimpanan gagal. Periksa ruang penyimpanan perangkat.'); }
    render();
  });
  $('copyBtn').addEventListener('click', () => copyText(summary(snapshot())));
  $('historyList').addEventListener('click', event => {
    const btn = event.target.closest('button[data-action]'); if (!btn) return;
    const item = history.find(row => String(row.id) === btn.dataset.id); if (!item) return;
    if (btn.dataset.action === 'copy') copyText(summary(item));
    if (btn.dataset.action === 'load') {
      $('entryDate').value = item.date || today(); $('entryNote').value = item.note || ''; $('cutQty').value = safeQty(item.cutQty); serviceCounts = { ...freshCounts(), ...(item.serviceCounts || {}) }; render(); showStatus('Rekap dimuat ke kalkulator.'); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (btn.dataset.action === 'delete' && confirm('Hapus rekap ini?')) { history = history.filter(row => String(row.id) !== btn.dataset.id); persistHistory(); render(); showStatus('Rekap dihapus.'); }
  });
  $('clearHistoryBtn').addEventListener('click', () => {
    if (!history.length) { showStatus('Riwayat masih kosong.'); return; }
    if (confirm('Hapus semua riwayat rekap?')) { history = []; persistHistory(); render(); showStatus('Semua riwayat dihapus.'); }
  });
  render();
})();
