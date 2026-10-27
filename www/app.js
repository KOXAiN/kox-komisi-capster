function komisiApp() {
  return {
    services: [
      { id: 'potong', name: 'Potong biasa', rate: 0 },
      { id: 'hairspa', name: 'Hairspa', rate: 4000 },
      { id: 'premium', name: 'Premium', rate: 17000 },
      { id: 'clasiy', name: 'Clasiy', rate: 21000 },
      { id: 'royal', name: 'Royal', rate: 27000 },
      { id: 'perming', name: 'Perming', rate: 50000 },
      { id: 'smoothing', name: 'Smoothing', rate: 50000 }
    ],
    counts: {
      potong: 0, hairspa: 0, premium: 0, clasiy: 0,
      royal: 0, perming: 0, smoothing: 0
    },
    history: [],
    notice: '',

    init() {
      try {
        this.history = JSON.parse(
          localStorage.getItem('kox-komisi-history') || '[]'
        );
      } catch (e) {
        this.history = [];
      }
    },

    count(id) {
      return Math.max(0, Math.floor(Number(this.counts[id]) || 0));
    },

    clean(id) {
      this.counts[id] = this.count(id);
    },

    get cutRate() {
      const n = this.count('potong');
      return n <= 5 ? 5000 : n <= 10 ? 7500 : 10000;
    },

    get cutRateLabel() {
      const n = this.count('potong');
      const tier = n <= 5 ? '1–5' : n <= 10 ? '6–10' : '11+';
      return this.rupiah(this.cutRate) + ' / potong (' + tier + ' customer)';
    },

    
get cutTotal() {
  const n = this.count('potong');

  const tarif5000 = Math.min(n, 5) * 5000;
  const tarif7500 = Math.min(Math.max(n - 5, 0), 4) * 7500;
  const tarif10000 = Math.max(n - 9, 0) * 10000;

  return tarif5000 + tarif7500 + tarif10000;
},

    get customers() {
      return this.services.reduce((sum, s) => sum + this.count(s.id), 0);
    },

    get total() {
      return this.services.reduce((sum, s) =>
        sum + (s.id === 'potong'
          ? this.cutTotal
          : s.rate * this.count(s.id)), 0);
    },

    rupiah(n) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(n || 0);
    },

    snapshot() {
      return {
        id: Date.now(),
        date: new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }),
        counts: { ...this.counts },
        customers: this.customers,
        total: this.total,
        cutTotal: this.cutTotal
      };
    },

    saveDay() {
      this.history.unshift(this.snapshot());
      this.history = this.history.slice(0, 100);

      try {
        localStorage.setItem(
          'kox-komisi-history',
          JSON.stringify(this.history)
        );
        this.notice = 'Rekap berhasil disimpan.';
      } catch (e) {
        this.notice = 'Penyimpanan gagal. Silakan salin rekap.';
      }
    },

    loadEntry(i) {
      const entry = this.history[i];
      if (entry) {
        this.counts = { ...entry.counts };
        this.notice = 'Rekap ' + entry.date + ' dimuat.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    exportSummary() {
      const lines = [
        'KOX KOMISI CAPSTER',
        new Date().toLocaleDateString('id-ID'),
        ''
      ];

      this.services.forEach(s => {
        const amount = s.id === 'potong'
          ? this.cutTotal
          : s.rate * this.count(s.id);
        lines.push(
          s.name + ': ' + this.count(s.id) + ' customer — ' +
          this.rupiah(amount)
        );
      });

      lines.push(
        '',
        'TOTAL CUSTOMER: ' + this.customers,
        'TOTAL KOMISI: ' + this.rupiah(this.total)
      );

      const txt = lines.join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt)
          .then(() => this.notice = 'Rekap berhasil disalin.')
          .catch(() => this.fallbackCopy(txt));
      } else {
        this.fallbackCopy(txt);
      }
    },

    fallbackCopy(txt) {
      const el = document.createElement('textarea');
      el.value = txt;
      document.body.appendChild(el);
      el.select();

      try {
        document.execCommand('copy');
        this.notice = 'Rekap disalin.';
      } catch (e) {
        this.notice = txt;
      }

      el.remove();
    },

    clearHistory() {
      if (confirm('Hapus semua riwayat rekap?')) {
        this.history = [];
        localStorage.removeItem('kox-komisi-history');
        this.notice = 'Riwayat dihapus.';
      }
    },

    reset() {
      this.counts = {
        potong: 0, hairspa: 0, premium: 0, clasiy: 0,
        royal: 0, perming: 0, smoothing: 0
      };
      this.notice = 'Input direset.';
    }
  };
}
