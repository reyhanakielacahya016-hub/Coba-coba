import { ArrowRight, Lock, Plus, Sparkles, Target, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { EmojiPicker } from '../../components/ui/EmojiPicker.jsx';
import { Chip, TextInput } from '../../components/ui/Form.jsx';
import { Logo } from '../../components/layout/Logo.jsx';
import { uid } from '../../lib/id.js';
import { useData } from '../../state/AppProvider.jsx';
import { buildSeedData } from '../../state/seed.js';
import { emptyData, normalizeData } from '../../state/storage.js';
import { ALL_SUGGESTIONS, categoryFromSuggestion } from '../../state/suggestions.js';
import './Onboarding.css';

const STEPS = 3;

export function Onboarding() {
  const { dispatch } = useData();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(() => new Set(ALL_SUGGESTIONS.filter((s) => s.preselect).map((s) => s.key)));
  const [custom, setCustom] = useState([]);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const toggle = (key) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const finish = (withSeed) => {
    if (withSeed) {
      dispatch({ type: 'REPLACE_ALL', data: buildSeedData() });
      return;
    }
    const data = emptyData();
    const chosen = ALL_SUGGESTIONS.filter((s) => picked.has(s.key)).map(categoryFromSuggestion);
    data.categories = [...chosen, ...custom, ...data.categories];
    data.settings.onboarded = true;
    dispatch({ type: 'REPLACE_ALL', data });
  };

  return (
    <div className="onb">
      <div className="onb__top">
        <Logo size={30} />
        {step < STEPS - 1 && (
          <button type="button" className="link-btn" onClick={() => setStep(STEPS - 1)}>
            Lewati
          </button>
        )}
      </div>

      <div className="onb__body" key={step}>
        {step === 0 && <Welcome headingRef={headingRef} />}
        {step === 1 && (
          <PickCategories
            headingRef={headingRef}
            picked={picked}
            toggle={toggle}
            custom={custom}
            setCustom={setCustom}
          />
        )}
        {step === 2 && (
          <Start
            headingRef={headingRef}
            onFinish={finish}
            onRestore={(restored) => dispatch({ type: 'REPLACE_ALL', data: { ...restored, settings: { ...restored.settings, onboarded: true } } })}
          />
        )}
      </div>

      <div className="onb__foot">
        <div className="onb__dots" aria-label={`Langkah ${step + 1} dari ${STEPS}`} role="img">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`onb__dot ${i === step ? 'is-active' : ''}`} />
          ))}
        </div>
        <div className="onb__nav">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Kembali
            </Button>
          )}
          {step < STEPS - 1 && (
            <Button onClick={() => setStep(step + 1)}>
              Lanjut <ArrowRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome({ headingRef }) {
  return (
    <div className="onb__step">
      <div className="onb__hero" aria-hidden="true">
        <span className="onb__coin onb__coin--1">🪙</span>
        <span className="onb__coin onb__coin--2">🌱</span>
        <span className="onb__coin onb__coin--3">🍚</span>
        <Logo size={88} withName={false} />
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="onb__title">
        Halo! Saku bantu kamu tahu uangmu ke mana.
      </h1>
      <p className="onb__lead">Catat sebentar setiap hari, sisanya biar Saku yang hitung.</p>
      <ul className="onb__features">
        <li>
          <span className="onb__ficon"><Plus size={20} /></span>
          <span><strong>Catat dalam 3 ketukan.</strong> Tombol ＋ selalu ada di bawah.</span>
        </li>
        <li>
          <span className="onb__ficon"><Target size={20} /></span>
          <span><strong>Rencana.</strong> Atur anggaran per kategori dan kumpulkan tabungan untuk target.</span>
        </li>
        <li>
          <span className="onb__ficon"><Lock size={20} /></span>
          <span><strong>Data milikmu.</strong> Semua tersimpan di perangkat ini, tanpa akun.</span>
        </li>
      </ul>
    </div>
  );
}

function PickCategories({ headingRef, picked, toggle, custom, setCustom }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  const addCustom = () => {
    const n = name.trim();
    if (!n) return;
    setCustom((c) => [...c, { id: uid(), name: n, emoji, type: 'expense', budget: null, locked: false }]);
    setName('');
    inputRef.current?.focus();
  };

  const group = (type, title) => (
    <div className="onb__group">
      <h2 className="onb__subtitle">{title}</h2>
      <div className="chip-row">
        {ALL_SUGGESTIONS.filter((s) => s.type === type).map((s) => (
          <Chip key={s.key} selected={picked.has(s.key)} onClick={() => toggle(s.key)}>
            <span className="chip__emoji">{s.emoji}</span>
            {s.name}
          </Chip>
        ))}
        {type === 'expense' &&
          custom.map((c) => (
            <Chip key={c.id} selected onClick={() => setCustom((list) => list.filter((x) => x.id !== c.id))} aria-label={`Hapus ${c.name}`}>
              <span className="chip__emoji">{c.emoji}</span>
              {c.name}
            </Chip>
          ))}
        {type === 'expense' && !adding && (
          <Chip className="chip--dashed" onClick={() => setAdding(true)}>
            <Plus size={16} /> Buat sendiri
          </Chip>
        )}
      </div>
      {type === 'expense' && adding && (
        <div className="inline-form">
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <TextInput
            ref={inputRef}
            autoFocus
            placeholder="Nama kategori, mis. Kopi"
            aria-label="Nama kategori baru"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          />
          <Button onClick={addCustom} disabled={!name.trim()}>
            Tambah
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="onb__step">
      <h1 ref={headingRef} tabIndex={-1} className="onb__title">
        Pilih kategorimu
      </h1>
      <p className="onb__lead">
        Ini cuma rekomendasi. Centang yang kamu pakai, atau buat sendiri. Semuanya bisa diubah nanti, dan
        kategori <em>Lainnya</em> selalu tersedia.
      </p>
      {group('expense', 'Pengeluaran')}
      {group('income', 'Pemasukan')}
    </div>
  );
}

function Start({ headingRef, onFinish, onRestore }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onRestore(normalizeData(JSON.parse(await file.text())));
    } catch {
      setError('File ini tidak bisa dibaca. Pastikan memilih file cadangan JSON dari Saku.');
    }
  };
  return (
    <div className="onb__step">
      <h1 ref={headingRef} tabIndex={-1} className="onb__title">
        Siap mulai?
      </h1>
      <p className="onb__lead">Mau lihat dulu seperti apa kalau sudah terisi, atau langsung pakai?</p>
      <div className="onb__choices">
        <button type="button" className="onb__choice onb__choice--primary" onClick={() => onFinish(false)}>
          <span className="onb__choice-icon">🚀</span>
          <span>
            <strong>Mulai dari nol</strong>
            <span>Pakai kategori pilihanmu, catatan masih kosong.</span>
          </span>
          <ArrowRight size={20} />
        </button>
        <button type="button" className="onb__choice" onClick={() => onFinish(true)}>
          <span className="onb__choice-icon"><Sparkles size={22} /></span>
          <span>
            <strong>Lihat dengan data contoh</strong>
            <span>Dua bulan catatan anak kos. Bisa dihapus kapan saja di Pengaturan.</span>
          </span>
          <ArrowRight size={20} />
        </button>
      </div>
      <button type="button" className="link-btn onb__restore" onClick={() => fileRef.current?.click()}>
        <Upload size={16} /> Punya file cadangan? Pulihkan di sini
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={restore} />
      {error && (
        <p className="qa__hint" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
