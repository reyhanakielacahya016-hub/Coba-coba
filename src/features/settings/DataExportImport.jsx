import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { csvToTransactions, transactionsToCSV } from '../../lib/csv.js';
import { diffDays, todayISO } from '../../lib/dates.js';
import { formatDateShort } from '../../lib/format.js';
import { useData } from '../../state/AppProvider.jsx';
import { normalizeData } from '../../state/storage.js';

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupLabel(last) {
  if (!last) return 'Belum pernah membuat cadangan. Yuk buat satu, supaya data aman kalau HP ganti atau browser dibersihkan.';
  const d = diffDays(last, todayISO());
  if (d === 0) return 'Cadangan terakhir dibuat hari ini. Mantap!';
  if (d > 30) return `Cadangan terakhir ${formatDateShort(last)}, sudah lebih dari sebulan. Saatnya buat yang baru.`;
  return `Cadangan terakhir ${formatDateShort(last)} (${d} hari lalu).`;
}

export function DataExportImport() {
  const { data, dispatch } = useData();
  const toast = useToast();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // { kind: 'json' | 'csv', ... }
  const [error, setError] = useState('');

  const exportJSON = () => {
    const today = todayISO();
    const payload = { ...data, settings: { ...data.settings, lastBackup: today } };
    download(`saku-cadangan-${today}.json`, JSON.stringify({ app: 'saku', exportedAt: new Date().toISOString(), ...payload }, null, 2), 'application/json');
    dispatch({ type: 'SET_SETTINGS', patch: { lastBackup: today } });
    toast('Cadangan JSON diunduh.');
  };

  const exportCSV = () => {
    // BOM supaya Excel membaca huruf & emoji dengan benar
    download(`saku-transaksi-${todayISO()}.csv`, '﻿' + transactionsToCSV(data), 'text/csv;charset=utf-8');
    toast('Transaksi CSV diunduh.');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.csv')) {
        const res = csvToTransactions(text, data.categories);
        if (!res.transactions.length) throw new Error('Tidak ada baris transaksi yang bisa dibaca.');
        setPending({ kind: 'csv', name: file.name, ...res });
      } else {
        const parsed = normalizeData(JSON.parse(text));
        setPending({ kind: 'json', name: file.name, data: parsed });
      }
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? 'File ini bukan JSON yang valid. Pastikan memilih file cadangan dari Saku.'
          : err.message || 'File tidak bisa dibaca.',
      );
    }
  };

  const apply = (mode) => {
    const snapshot = data;
    if (pending.kind === 'csv') {
      dispatch({ type: 'ADD_CATEGORIES', categories: pending.categories });
      dispatch({ type: 'MERGE_ALL', data: { ...normalizeData({}), transactions: pending.transactions, categories: [] } });
      toast({
        message: `${pending.transactions.length} transaksi diimpor.`,
        action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) },
        duration: 8000,
      });
    } else if (mode === 'replace') {
      dispatch({ type: 'REPLACE_ALL', data: { ...pending.data, settings: { ...pending.data.settings, onboarded: true } } });
      toast({ message: 'Data diganti dari cadangan.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) }, duration: 8000 });
    } else {
      dispatch({ type: 'MERGE_ALL', data: pending.data });
      toast({ message: 'Cadangan digabungkan.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) }, duration: 8000 });
    }
    dispatch({ type: 'RUN_RECURRING', today: todayISO() });
    setPending(null);
  };

  return (
    <section className="card section" aria-labelledby="data-title">
      <h2 id="data-title" className="section__title">
        Cadangan &amp; data
      </h2>
      <p className="muted data-note">
        Semua data tersimpan di browser ini saja. {backupLabel(data.settings.lastBackup)}
      </p>
      <div className="settings-actions">
        <Button onClick={exportJSON}>
          <Download size={18} /> Unduh cadangan (JSON)
        </Button>
        <Button variant="ghost" onClick={exportCSV} disabled={!data.transactions.length}>
          <FileSpreadsheet size={18} /> Ekspor CSV
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> Impor file
        </Button>
        <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={onFile} />
      </div>
      <p className="muted data-hint">
        Impor menerima file cadangan JSON dari Saku, atau CSV berkolom <code>tanggal, jenis, kategori, nominal, catatan</code>.
      </p>
      {error && (
        <p className="qa__hint" role="alert">
          {error}
        </p>
      )}

      <Sheet
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Impor data"
        description={pending?.name}
        size="sm"
        footer={
          pending?.kind === 'json' ? (
            <>
              <Button variant="ghost" onClick={() => apply('replace')}>
                Ganti semua
              </Button>
              <Button onClick={() => apply('merge')}>Gabungkan</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Batal
              </Button>
              <Button onClick={() => apply('merge')}>Impor</Button>
            </>
          )
        }
      >
        {pending?.kind === 'json' && (
          <div className="stack">
            <p>
              Cadangan berisi <strong>{pending.data.transactions.length} transaksi</strong>, {pending.data.categories.length} kategori, dan{' '}
              {pending.data.goals.length} target tabungan.
            </p>
            <ul className="muted import-opts">
              <li>
                <strong>Gabungkan</strong>: tambahkan ke data sekarang. Data yang sama (ID sama) akan diperbarui.
              </li>
              <li>
                <strong>Ganti semua</strong>: data sekarang diganti isi cadangan.
              </li>
            </ul>
            <p className="muted">Tenang, setelah impor kamu masih bisa menekan “Urungkan”.</p>
          </div>
        )}
        {pending?.kind === 'csv' && (
          <div className="stack">
            <p>
              <strong>{pending.transactions.length} transaksi</strong> akan ditambahkan
              {pending.categories.length > 0 && <> beserta {pending.categories.length} kategori baru ({pending.categories.map((c) => c.name).join(', ')})</>}.
            </p>
            {pending.skipped > 0 && <p className="muted">{pending.skipped} baris dilewati karena tanggal atau nominalnya tidak terbaca.</p>}
          </div>
        )}
      </Sheet>
    </section>
  );
}
