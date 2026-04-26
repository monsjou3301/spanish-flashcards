import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Plus, RotateCw, Flame, X, ChevronRight, BookOpen, Sparkles, Upload, Trash2, ArrowRight, Settings, Languages, AlertCircle } from 'lucide-react';

// Language metadata: flag emoji + display name
const LANG_META = {
  EN: { flag: '🇬🇧', name: 'English' },
  ES: { flag: '🇪🇸', name: 'Español' },
  IT: { flag: '🇮🇹', name: 'Italiano' },
  DE: { flag: '🇩🇪', name: 'Deutsch' },
  NL: { flag: '🇳🇱', name: 'Nederlands' },
  RU: { flag: '🇷🇺', name: 'Русский' },
  FR: { flag: '🇫🇷', name: 'Français' },
  PT: { flag: '🇵🇹', name: 'Português' },
  JA: { flag: '🇯🇵', name: '日本語' },
  ZH: { flag: '🇨🇳', name: '中文' },
};

const getLangMeta = (code) => LANG_META[code] || { flag: '🌐', name: code };

const NEW_PER_DAY = 5;

// SM-2 inspired spaced repetition
const calculateNextReview = (card, rating) => {
  let { interval = 0, ease = 2.5, reps = 0 } = card;
  if (rating === 'again') {
    reps = 0; interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else if (rating === 'hard') {
    interval = reps === 0 ? 1 : Math.ceil(interval * 1.2);
    ease = Math.max(1.3, ease - 0.15);
    reps += 1;
  } else if (rating === 'good') {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.ceil(interval * ease);
    reps += 1;
  } else if (rating === 'easy') {
    if (reps === 0) interval = 3;
    else interval = Math.ceil(interval * ease * 1.3);
    ease = ease + 0.15;
    reps += 1;
  }
  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { ...card, interval, ease, reps, nextReview, lastRated: rating };
};

const todayKey = () => new Date().toISOString().split('T')[0];
const yesterdayKey = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

// localStorage helpers
const storage = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  remove: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// Detect bad cells from Excel formula errors / blanks
const isBadCell = (v) => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (!s) return true;
  if (s.startsWith('#') && s.endsWith('!')) return true; // #VALUE!, #N/A!, #REF!, etc.
  return false;
};

// Build a pair key from two language codes (order matters)
const pairKey = (a, b) => `${a}-${b}`;

export default function App() {
  // pairs: { "EN-ES": { from, to, vocab: [{a, b}], ...stats } }
  const [pairs, setPairs] = useState({});
  const [activePairKey, setActivePairKey] = useState(null);
  // decks: { "EN-ES": [card, card, ...] }  — each card is a single direction
  const [decks, setDecks] = useState({});
  // pairStats: { "EN-ES": { streak, lastStudied, totalReviewed, lastDaily } }
  const [pairStats, setPairStats] = useState({});

  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPairPicker, setShowPairPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firstRun, setFirstRun] = useState(false);

  // ==============================
  // LOAD on startup
  // ==============================
  useEffect(() => {
    const savedPairs = storage.get('pairs') || {};
    const savedDecks = storage.get('decks') || {};
    const savedStats = storage.get('pairStats') || {};
    const savedActive = storage.get('activePairKey');

    const pairKeys = Object.keys(savedPairs);
    if (pairKeys.length === 0) {
      setFirstRun(true);
      setLoading(false);
      return;
    }

    // Top up daily new cards for each pair
    const newDecks = { ...savedDecks };
    const newStats = { ...savedStats };
    pairKeys.forEach(pk => {
      const stat = newStats[pk] || { streak: 0, lastStudied: null, totalReviewed: 0, lastDaily: null };
      if (stat.lastDaily !== todayKey()) {
        newDecks[pk] = topUpDeck(savedPairs[pk], newDecks[pk] || []);
        stat.lastDaily = todayKey();
      }
      newStats[pk] = stat;
    });

    setPairs(savedPairs);
    setDecks(newDecks);
    setPairStats(newStats);
    storage.set('decks', newDecks);
    storage.set('pairStats', newStats);

    const active = savedActive && savedPairs[savedActive] ? savedActive : pairKeys[0];
    setActivePairKey(active);
    storage.set('activePairKey', active);
    buildQueue(newDecks[active] || []);
    setLoading(false);
  }, []);

  // ==============================
  // Top up a deck with new cards
  // ==============================
  const topUpDeck = (pair, existingDeck) => {
    const seen = new Set(existingDeck.map(c => c.vocabId + '|' + c.dir));
    const candidates = [];
    pair.vocab.forEach((v, idx) => {
      const vid = `v${idx}`;
      // forward direction: a -> b
      if (!seen.has(vid + '|fwd')) {
        candidates.push({
          id: `${vid}-fwd-${Date.now()}-${Math.random()}`,
          vocabId: vid,
          dir: 'fwd',
          front: v.a, back: v.b,
          fromLang: pair.from, toLang: pair.to,
          interval: 0, ease: 2.5, reps: 0,
          nextReview: Date.now(),
          added: todayKey(),
        });
      }
      // backward direction: b -> a
      if (!seen.has(vid + '|bwd')) {
        candidates.push({
          id: `${vid}-bwd-${Date.now()}-${Math.random()}`,
          vocabId: vid,
          dir: 'bwd',
          front: v.b, back: v.a,
          fromLang: pair.to, toLang: pair.from,
          interval: 0, ease: 2.5, reps: 0,
          nextReview: Date.now(),
          added: todayKey(),
        });
      }
    });
    // Shuffle and take NEW_PER_DAY new cards (counting both directions)
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return [...existingDeck, ...shuffled.slice(0, NEW_PER_DAY)];
  };

  // ==============================
  // Build review queue for active pair
  // ==============================
  const buildQueue = (d) => {
    const now = Date.now();
    const due = d.filter(c => c.nextReview <= now);
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setSessionDone(shuffled.length === 0);
  };

  const switchPair = (pk) => {
    setActivePairKey(pk);
    storage.set('activePairKey', pk);
    setShowPairPicker(false);

    // Top up if needed
    const stat = pairStats[pk] || { streak: 0, lastStudied: null, totalReviewed: 0, lastDaily: null };
    let deck = decks[pk] || [];
    if (stat.lastDaily !== todayKey()) {
      deck = topUpDeck(pairs[pk], deck);
      const newDecks = { ...decks, [pk]: deck };
      const newStats = { ...pairStats, [pk]: { ...stat, lastDaily: todayKey() } };
      setDecks(newDecks);
      setPairStats(newStats);
      storage.set('decks', newDecks);
      storage.set('pairStats', newStats);
    }
    buildQueue(deck);
  };

  // ==============================
  // Rate current card
  // ==============================
  const handleRate = (rating) => {
    const card = queue[currentIdx];
    const updated = calculateNextReview(card, rating);
    const pk = activePairKey;
    const newDeck = decks[pk].map(c => c.id === card.id ? updated : c);
    const newDecks = { ...decks, [pk]: newDeck };
    setDecks(newDecks);

    const stat = pairStats[pk] || { streak: 0, lastStudied: null, totalReviewed: 0, lastDaily: todayKey() };
    const newStat = {
      ...stat,
      totalReviewed: (stat.totalReviewed || 0) + 1,
      lastStudied: todayKey(),
      streak: stat.lastStudied === todayKey()
        ? stat.streak
        : (stat.lastStudied === yesterdayKey() ? (stat.streak || 0) + 1 : 1),
    };
    const newStats = { ...pairStats, [pk]: newStat };
    setPairStats(newStats);

    storage.set('decks', newDecks);
    storage.set('pairStats', newStats);

    setFlipped(false);
    setTimeout(() => {
      if (currentIdx + 1 >= queue.length) setSessionDone(true);
      else setCurrentIdx(currentIdx + 1);
    }, 200);
  };

  // ==============================
  // Trash current card
  // ==============================
  const handleTrash = () => {
    const card = queue[currentIdx];
    const pk = activePairKey;
    const newDeck = decks[pk].filter(c => c.id !== card.id);
    const newDecks = { ...decks, [pk]: newDeck };
    setDecks(newDecks);
    storage.set('decks', newDecks);

    // Also remove the OPPOSITE direction card for the same vocab item
    // (so we don't keep showing the other direction of a word user wanted gone)
    // Actually — let user decide per-direction. We only remove this single card.

    const newQueue = queue.filter(c => c.id !== card.id);
    setQueue(newQueue);
    if (currentIdx >= newQueue.length) {
      if (newQueue.length === 0) setSessionDone(true);
      else setCurrentIdx(newQueue.length - 1);
    }
    setFlipped(false);
  };

  // ==============================
  // Add a single word to active pair
  // ==============================
  const handleAddWord = (a, b) => {
    if (!a.trim() || !b.trim() || !activePairKey) return;
    const pk = activePairKey;
    const pair = pairs[pk];
    const newVocab = [...pair.vocab, { a: a.trim(), b: b.trim() }];
    const newPair = { ...pair, vocab: newVocab };
    const newPairs = { ...pairs, [pk]: newPair };
    setPairs(newPairs);
    storage.set('pairs', newPairs);

    // Add both direction cards immediately
    const vid = `v${newVocab.length - 1}`;
    const fwdCard = {
      id: `${vid}-fwd-${Date.now()}-${Math.random()}`,
      vocabId: vid, dir: 'fwd',
      front: a.trim(), back: b.trim(),
      fromLang: pair.from, toLang: pair.to,
      interval: 0, ease: 2.5, reps: 0, nextReview: Date.now(),
      added: todayKey(),
    };
    const bwdCard = {
      id: `${vid}-bwd-${Date.now()}-${Math.random()}`,
      vocabId: vid, dir: 'bwd',
      front: b.trim(), back: a.trim(),
      fromLang: pair.to, toLang: pair.from,
      interval: 0, ease: 2.5, reps: 0, nextReview: Date.now(),
      added: todayKey(),
    };
    const newDeck = [...(decks[pk] || []), fwdCard, bwdCard];
    const newDecks = { ...decks, [pk]: newDeck };
    setDecks(newDecks);
    storage.set('decks', newDecks);
    setShowAdd(false);
    buildQueue(newDeck);
  };

  // ==============================
  // Import Excel — wipes everything
  // ==============================
  const handleImport = (importedPairs) => {
    // importedPairs is { "EN-ES": { from, to, vocab: [...] }, ... }
    const newDecks = {};
    const newStats = {};
    Object.entries(importedPairs).forEach(([pk, pair]) => {
      newDecks[pk] = topUpDeck(pair, []);
      newStats[pk] = { streak: 0, lastStudied: null, totalReviewed: 0, lastDaily: todayKey() };
    });
    setPairs(importedPairs);
    setDecks(newDecks);
    setPairStats(newStats);
    storage.set('pairs', importedPairs);
    storage.set('decks', newDecks);
    storage.set('pairStats', newStats);

    const firstKey = Object.keys(importedPairs)[0];
    setActivePairKey(firstKey);
    storage.set('activePairKey', firstKey);
    buildQueue(newDecks[firstKey]);
    setShowImport(false);
    setFirstRun(false);
  };

  const handleResetAll = () => {
    storage.remove('pairs');
    storage.remove('decks');
    storage.remove('pairStats');
    storage.remove('activePairKey');
    setPairs({});
    setDecks({});
    setPairStats({});
    setActivePairKey(null);
    setQueue([]);
    setShowSettings(false);
    setFirstRun(true);
  };

  // ==============================
  // Render
  // ==============================
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-amber-100 text-xl italic" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          cargando...
        </div>
      </div>
    );
  }

  if (firstRun) {
    return <FirstRun onImport={() => setShowImport(true)} importModal={
      showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
    } />;
  }

  const activePair = pairs[activePairKey];
  const activeDeck = decks[activePairKey] || [];
  const activeStat = pairStats[activePairKey] || { streak: 0, totalReviewed: 0 };
  const card = queue[currentIdx];
  const newToday = activeDeck.filter(c => c.added === todayKey()).length;
  const fromMeta = getLangMeta(activePair?.from);
  const toMeta = getLangMeta(activePair?.to);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: 'Georgia, serif' }}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-amber-950/30 to-transparent pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-rose-950/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] uppercase text-amber-600/80 mb-1">
                Día a día · Vocabulario
              </div>
              <button
                onClick={() => setShowPairPicker(true)}
                className="flex items-center gap-2 group"
              >
                <h1 className="text-3xl md:text-4xl tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}>
                  <span className="mr-2">{fromMeta.flag}</span>
                  <span className="text-stone-500 mx-1">↔</span>
                  <span className="ml-2">{toMeta.flag}</span>
                </h1>
                <ChevronRight size={18} className="text-stone-600 group-hover:text-amber-500 transition-colors rotate-90" />
              </button>
              <div className="text-xs text-stone-500 mt-1">
                {fromMeta.name} ↔ {toMeta.name}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowAdd(true)}
                className="p-2.5 rounded-full bg-amber-100 text-stone-950 hover:bg-amber-200 transition-colors"
                aria-label="Add word"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-full border border-stone-700 text-stone-400 hover:text-stone-100 hover:border-stone-500 transition-colors"
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-6 pb-6 border-b border-stone-800 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-amber-500" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{activeStat.streak || 0}</span> day{(activeStat.streak || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-rose-400" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{newToday}</span> new today
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-stone-500" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{activeDeck.length}</span> cards
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        {sessionDone ? (
          <SessionDone
            onAddWord={() => setShowAdd(true)}
            onReload={() => buildQueue(activeDeck)}
            onSwitchPair={() => setShowPairPicker(true)}
            hasOtherPairs={Object.keys(pairs).length > 1}
          />
        ) : card ? (
          <CardView
            card={card}
            currentIdx={currentIdx}
            queueLength={queue.length}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
            onRate={handleRate}
            onTrash={handleTrash}
          />
        ) : null}

        <footer className="mt-16 pt-6 border-t border-stone-900 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700">
            {NEW_PER_DAY} new each day · spaced repetition · bidirectional
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddWordModal
            pair={activePair}
            onClose={() => setShowAdd(false)}
            onAdd={handleAddWord}
          />
        )}
        {showPairPicker && (
          <PairPickerModal
            pairs={pairs}
            stats={pairStats}
            decks={decks}
            activePairKey={activePairKey}
            onPick={switchPair}
            onClose={() => setShowPairPicker(false)}
          />
        )}
        {showImport && (
          <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
        )}
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onImport={() => { setShowSettings(false); setShowImport(true); }}
            onReset={handleResetAll}
            pairCount={Object.keys(pairs).length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ===================================================================
// FIRST RUN
// ===================================================================
function FirstRun({ onImport, importModal }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 relative" style={{ fontFamily: 'Georgia, serif' }}>
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-amber-950/30 to-transparent pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-rose-950/20 blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-7xl mb-6">📖</div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-amber-600/80 mb-2">Día a día · Vocabulario</div>
        <h1 className="text-5xl mb-6" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}>
          Welcome
        </h1>
        <p className="text-stone-400 leading-relaxed mb-10 max-w-md mx-auto">
          Import an Excel file to get started. Each column is a language; each row is a word.
          You'll choose which language pairs to study — each pair becomes its own bidirectional deck.
        </p>
        <button
          onClick={onImport}
          className="px-8 py-4 bg-amber-100 text-stone-950 rounded-full font-medium hover:bg-amber-200 transition-colors inline-flex items-center gap-2"
        >
          <Upload size={18} /> Import Excel
        </button>
      </div>
      <AnimatePresence>{importModal}</AnimatePresence>
    </div>
  );
}

// ===================================================================
// CARD VIEW
// ===================================================================
function CardView({ card, currentIdx, queueLength, flipped, onFlip, onRate, onTrash }) {
  const fromMeta = getLangMeta(card.fromLang);
  const toMeta = getLangMeta(card.toLang);

  return (
    <>
      <div className="flex items-center gap-2 mb-6 text-xs text-stone-500">
        <span>{currentIdx + 1} / {queueLength}</span>
        <div className="flex-1 h-px bg-stone-800 relative">
          <div
            className="absolute left-0 top-0 h-px bg-amber-400/60 transition-all duration-500"
            style={{ width: `${((currentIdx) / queueLength) * 100}%` }}
          />
        </div>
        {card.reps === 0 && (
          <span className="text-rose-400 text-[10px] tracking-widest uppercase">new</span>
        )}
      </div>

      {/* Direction indicator + trash */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>{fromMeta.flag} {card.fromLang}</span>
          <ArrowRight size={12} />
          <span>{toMeta.flag} {card.toLang}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Remove this card?')) onTrash();
          }}
          className="p-2 rounded-full text-stone-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          aria-label="Remove card"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div
        className="relative cursor-pointer select-none mb-8"
        onClick={onFlip}
        style={{ perspective: '1200px', height: '380px' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${card.id}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {!flipped ? (
              <div className="h-full rounded-3xl bg-gradient-to-br from-stone-900 to-stone-900/50 border border-stone-800 p-10 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-6 left-6 text-[10px] tracking-[0.25em] uppercase text-stone-600">
                  {fromMeta.name}
                </div>
                <div className="absolute top-6 right-6 text-xs text-stone-600 italic">
                  tap to flip
                </div>
                <div className="text-center px-4">
                  <div
                    className="text-4xl md:text-5xl leading-tight break-words"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                  >
                    {card.front}
                  </div>
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-stone-700 text-xs">◆</div>
              </div>
            ) : (
              <div className="h-full rounded-3xl bg-gradient-to-br from-amber-50 to-stone-100 text-stone-900 p-10 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-6 left-6 text-[10px] tracking-[0.25em] uppercase text-stone-500">
                  {toMeta.name}
                </div>
                <div className="text-center px-4">
                  <div
                    className="text-4xl md:text-5xl leading-tight break-words"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                  >
                    {card.back}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-4 gap-2"
          >
            <RateButton label="Again" sub="<1d" color="rose" onClick={() => onRate('again')} />
            <RateButton label="Hard" sub="~1d" color="orange" onClick={() => onRate('hard')} />
            <RateButton label="Good" sub="3d+" color="emerald" onClick={() => onRate('good')} />
            <RateButton label="Easy" sub="4d+" color="sky" onClick={() => onRate('easy')} />
          </motion.div>
        )}
      </AnimatePresence>

      {!flipped && (
        <div className="text-center text-stone-600 text-xs tracking-wide">
          Flip the card, then rate how well you knew it
        </div>
      )}
    </>
  );
}

function RateButton({ label, sub, color, onClick }) {
  const colors = {
    rose: 'border-rose-900/50 hover:border-rose-600 hover:bg-rose-950/40 text-rose-300',
    orange: 'border-orange-900/50 hover:border-orange-600 hover:bg-orange-950/40 text-orange-300',
    emerald: 'border-emerald-900/50 hover:border-emerald-600 hover:bg-emerald-950/40 text-emerald-300',
    sky: 'border-sky-900/50 hover:border-sky-600 hover:bg-sky-950/40 text-sky-300',
  };
  return (
    <button
      onClick={onClick}
      className={`py-4 px-2 rounded-2xl border bg-stone-900/40 transition-all ${colors[color]} flex flex-col items-center gap-0.5`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[10px] opacity-60">{sub}</span>
    </button>
  );
}

// ===================================================================
// SESSION DONE
// ===================================================================
function SessionDone({ onAddWord, onReload, onSwitchPair, hasOtherPairs }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="text-6xl mb-6">🌿</div>
      <h2 className="text-3xl mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}>
        ¡Hasta mañana!
      </h2>
      <p className="text-stone-400 text-sm max-w-sm mx-auto leading-relaxed">
        Nothing else due in this deck today. Come back tomorrow for {NEW_PER_DAY} new words plus your reviews.
      </p>
      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <button onClick={onAddWord} className="px-5 py-2.5 bg-amber-100 text-stone-950 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors">
          Add word
        </button>
        {hasOtherPairs && (
          <button onClick={onSwitchPair} className="px-5 py-2.5 border border-stone-700 rounded-full text-sm text-stone-300 hover:border-stone-500 transition-colors flex items-center gap-2">
            <Languages size={14} /> Switch deck
          </button>
        )}
        <button onClick={onReload} className="px-5 py-2.5 border border-stone-700 rounded-full text-sm text-stone-300 hover:border-stone-500 transition-colors flex items-center gap-2">
          <RotateCw size={14} /> Reload
        </button>
      </div>
    </motion.div>
  );
}

// ===================================================================
// PAIR PICKER
// ===================================================================
function PairPickerModal({ pairs, stats, decks, activePairKey, onPick, onClose }) {
  return (
    <ModalShell onClose={onClose} title="Switch deck">
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {Object.entries(pairs).map(([pk, pair]) => {
          const fromMeta = getLangMeta(pair.from);
          const toMeta = getLangMeta(pair.to);
          const stat = stats[pk] || {};
          const deck = decks[pk] || [];
          const due = deck.filter(c => c.nextReview <= Date.now()).length;
          const isActive = pk === activePairKey;
          return (
            <button
              key={pk}
              onClick={() => onPick(pk)}
              className={`w-full p-4 rounded-2xl border transition-colors text-left ${
                isActive
                  ? 'border-amber-500/50 bg-amber-950/30'
                  : 'border-stone-800 bg-stone-900/40 hover:border-stone-700 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl mb-1">
                    {fromMeta.flag} <span className="text-stone-600 mx-1">↔</span> {toMeta.flag}
                  </div>
                  <div className="text-xs text-stone-500">
                    {fromMeta.name} ↔ {toMeta.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {due > 0 && (
                      <span className="text-amber-300 font-medium">{due} due</span>
                    )}
                    {due === 0 && <span className="text-stone-600">all done</span>}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    {deck.length} cards · 🔥 {stat.streak || 0}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

// ===================================================================
// ADD WORD
// ===================================================================
function AddWordModal({ pair, onClose, onAdd }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const fromMeta = getLangMeta(pair.from);
  const toMeta = getLangMeta(pair.to);

  return (
    <ModalShell onClose={onClose} title="New word">
      <div className="space-y-3">
        <div>
          <label className="text-[10px] tracking-[0.25em] uppercase text-stone-500">
            {fromMeta.flag} {fromMeta.name}
          </label>
          <input
            autoFocus
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:border-amber-600/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.25em] uppercase text-stone-500">
            {toMeta.flag} {toMeta.name}
          </label>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:border-amber-600/50 focus:outline-none"
          />
        </div>
      </div>
      <button
        onClick={() => onAdd(a, b)}
        disabled={!a.trim() || !b.trim()}
        className="w-full mt-5 py-3 bg-amber-100 text-stone-950 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Add <ChevronRight size={16} />
      </button>
      <p className="text-xs text-stone-600 mt-3 text-center">
        Adds two cards: forward + reverse direction
      </p>
    </ModalShell>
  );
}

// ===================================================================
// IMPORT EXCEL
// ===================================================================
function ImportModal({ onClose, onImport }) {
  const [step, setStep] = useState('upload'); // upload -> pairs
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [selectedPairs, setSelectedPairs] = useState({}); // { "EN-ES": true, ... }
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFile = (file) => {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const arr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!arr.length) { setError('Empty file'); return; }
        const headers = arr[0].map(h => String(h || '').trim()).filter(Boolean);
        if (headers.length < 2) {
          setError('Need at least 2 columns with language codes in row 1');
          return;
        }
        const rows = arr.slice(1).filter(r => r.some(c => !isBadCell(c)));
        setParsed({ headers, rows });
        setStep('pairs');
      } catch (err) {
        setError('Could not parse file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const allPossiblePairs = useMemo(() => {
    if (!parsed) return [];
    const pairs = [];
    for (let i = 0; i < parsed.headers.length; i++) {
      for (let j = i + 1; j < parsed.headers.length; j++) {
        pairs.push({ from: parsed.headers[i], to: parsed.headers[j], fromIdx: i, toIdx: j });
      }
    }
    return pairs;
  }, [parsed]);

  const togglePair = (pk) => {
    setSelectedPairs(s => ({ ...s, [pk]: !s[pk] }));
  };

  const buildAndImport = () => {
    const result = {};
    allPossiblePairs.forEach(p => {
      const pk = pairKey(p.from, p.to);
      if (!selectedPairs[pk]) return;
      const vocab = [];
      parsed.rows.forEach(row => {
        const a = row[p.fromIdx];
        const b = row[p.toIdx];
        if (isBadCell(a) || isBadCell(b)) return;
        vocab.push({ a: String(a).trim(), b: String(b).trim() });
      });
      if (vocab.length > 0) {
        result[pk] = { from: p.from, to: p.to, vocab };
      }
    });
    if (Object.keys(result).length === 0) {
      setError('Select at least one language pair');
      return;
    }
    onImport(result);
  };

  return (
    <ModalShell onClose={onClose} title={step === 'upload' ? 'Import Excel' : 'Pick language pairs'} wide>
      {step === 'upload' && (
        <div>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="border-2 border-dashed border-stone-700 hover:border-amber-600/50 rounded-2xl p-12 text-center cursor-pointer transition-colors">
              <Upload size={32} className="mx-auto mb-3 text-stone-600" />
              <div className="text-sm text-stone-300 mb-1">Click to choose file</div>
              <div className="text-xs text-stone-600">.xlsx, .xls, or .csv</div>
            </div>
          </label>
          <p className="text-xs text-stone-500 mt-4 leading-relaxed">
            <strong className="text-stone-400">Format:</strong> First row is language codes (EN, ES, IT, DE, NL, RU, FR, PT, JA, ZH).
            Each subsequent row is one word in each language. Empty cells and formula errors (#VALUE!) are skipped automatically.
          </p>
          <p className="text-xs text-rose-400/80 mt-3 leading-relaxed flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            Importing replaces all existing decks and progress.
          </p>
          {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
        </div>
      )}

      {step === 'pairs' && parsed && (
        <div>
          <div className="text-xs text-stone-500 mb-4">
            <span className="text-stone-300">{fileName}</span> · {parsed.rows.length} rows · detected: {parsed.headers.join(', ')}
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-400">Pick which pairs to study:</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const all = {};
                  allPossiblePairs.forEach(p => { all[pairKey(p.from, p.to)] = true; });
                  setSelectedPairs(all);
                }}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedPairs({})}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {allPossiblePairs.map(p => {
              const pk = pairKey(p.from, p.to);
              const fromMeta = getLangMeta(p.from);
              const toMeta = getLangMeta(p.to);
              const checked = !!selectedPairs[pk];
              return (
                <button
                  key={pk}
                  onClick={() => togglePair(pk)}
                  className={`w-full p-3 rounded-xl border transition-colors text-left flex items-center gap-3 ${
                    checked
                      ? 'border-amber-500/50 bg-amber-950/30'
                      : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-amber-100 border-amber-100' : 'border-stone-600'
                  }`}>
                    {checked && <span className="text-stone-950 text-xs leading-none">✓</span>}
                  </div>
                  <div className="text-xl">
                    {fromMeta.flag} <span className="text-stone-600 mx-1 text-sm">↔</span> {toMeta.flag}
                  </div>
                  <div className="text-xs text-stone-500 ml-auto">
                    {fromMeta.name} ↔ {toMeta.name}
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-3 border border-stone-700 rounded-xl text-stone-300 text-sm hover:border-stone-500"
            >
              Back
            </button>
            <button
              onClick={buildAndImport}
              className="flex-1 py-3 bg-amber-100 text-stone-950 rounded-xl font-medium hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
            >
              Create decks <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ===================================================================
// SETTINGS
// ===================================================================
function SettingsModal({ onClose, onImport, onReset, pairCount }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <ModalShell onClose={onClose} title="Settings">
      <div className="space-y-3">
        <button
          onClick={onImport}
          className="w-full p-4 rounded-xl border border-stone-800 bg-stone-900/40 hover:border-stone-700 transition-colors text-left flex items-center gap-3"
        >
          <Upload size={18} className="text-amber-400" />
          <div>
            <div className="text-sm">Import new Excel</div>
            <div className="text-xs text-stone-500">Replaces all decks</div>
          </div>
        </button>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full p-4 rounded-xl border border-stone-800 bg-stone-900/40 hover:border-rose-900/50 transition-colors text-left flex items-center gap-3"
          >
            <Trash2 size={18} className="text-rose-400" />
            <div>
              <div className="text-sm">Reset everything</div>
              <div className="text-xs text-stone-500">{pairCount} deck{pairCount !== 1 ? 's' : ''} · all progress wiped</div>
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/30">
            <div className="text-sm text-rose-200 mb-3">
              Wipe all decks and progress? This cannot be undone.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 border border-stone-700 rounded-lg text-sm text-stone-300"
              >
                Cancel
              </button>
              <button
                onClick={onReset}
                className="flex-1 py-2 bg-rose-500 text-stone-950 rounded-lg text-sm font-medium"
              >
                Yes, wipe
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ===================================================================
// MODAL SHELL
// ===================================================================
function ModalShell({ children, onClose, title, wide }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} bg-stone-900 border border-stone-800 rounded-3xl p-6`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}>
            {title}
          </h3>
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-300">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
