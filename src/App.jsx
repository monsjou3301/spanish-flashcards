import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCw, Flame, X, ChevronRight, BookOpen, Sparkles } from 'lucide-react';

// Intermediate Spanish word bank - mixed themes
const WORD_BANK = [
  { es: 'aprovechar', en: 'to take advantage of', ex: 'Voy a aprovechar el buen tiempo.' },
  { es: 'madrugar', en: 'to wake up early', ex: 'Tengo que madrugar mañana.' },
  { es: 'el atasco', en: 'traffic jam', ex: 'Había un atasco en la autopista.' },
  { es: 'cotilla', en: 'gossipy / a gossip', ex: 'Mi vecina es muy cotilla.' },
  { es: 'echar de menos', en: 'to miss (someone)', ex: 'Echo de menos a mi familia.' },
  { es: 'el lío', en: 'mess / complicated situation', ex: '¡Qué lío tengo en casa!' },
  { es: 'acogedor', en: 'cozy / welcoming', ex: 'Este café es muy acogedor.' },
  { es: 'soler', en: 'to usually do', ex: 'Suelo cenar a las nueve.' },
  { es: 'el chisme', en: 'gossip / gadget', ex: 'No me gustan los chismes.' },
  { es: 'estrenar', en: 'to use for the first time', ex: 'Voy a estrenar mis zapatos.' },
  { es: 'fulano', en: 'so-and-so', ex: 'Vino un fulano preguntando por ti.' },
  { es: 'rebuscado', en: 'far-fetched / convoluted', ex: 'Su explicación es rebuscada.' },
  { es: 'el trámite', en: 'paperwork / procedure', ex: 'Los trámites tardan mucho.' },
  { es: 'empeñarse', en: 'to insist / be determined', ex: 'Se empeña en tener razón.' },
  { es: 'la cuesta', en: 'slope / hill', ex: 'La cuesta de enero es dura.' },
  { es: 'apetecer', en: 'to feel like (doing)', ex: '¿Te apetece un café?' },
  { es: 'el quebradero de cabeza', en: 'headache (fig.) / worry', ex: 'Este proyecto es un quebradero de cabeza.' },
  { es: 'tirar la toalla', en: 'to throw in the towel', ex: 'No tires la toalla todavía.' },
  { es: 'el madrugón', en: 'early rise', ex: '¡Menudo madrugón!' },
  { es: 'chapucero', en: 'sloppy / shoddy', ex: 'Hizo un trabajo chapucero.' },
  { es: 'merendar', en: 'to have an afternoon snack', ex: 'Merendamos a las cinco.' },
  { es: 'el cacharro', en: 'pot / junk / thing', ex: 'Lava los cacharros, por favor.' },
  { es: 'entrañable', en: 'endearing / heartwarming', ex: 'Fue un momento entrañable.' },
  { es: 'el antojo', en: 'craving / whim', ex: 'Tengo antojo de chocolate.' },
  { es: 'aguantar', en: 'to put up with / endure', ex: 'No aguanto el ruido.' },
  { es: 'el bicho', en: 'bug / creature', ex: 'Hay un bicho en la pared.' },
  { es: 'de golpe', en: 'suddenly / all at once', ex: 'Se fue de golpe.' },
  { es: 'la faena', en: 'task / dirty trick', ex: '¡Vaya faena me has hecho!' },
  { es: 'empalagoso', en: 'overly sweet / cloying', ex: 'Este postre es empalagoso.' },
  { es: 'el recado', en: 'errand / message', ex: 'Tengo que hacer unos recados.' },
  { es: 'pillar', en: 'to catch / get', ex: 'No pillo el chiste.' },
  { es: 'el enchufe', en: 'plug / connections (fig.)', ex: 'Consiguió el trabajo por enchufe.' },
  { es: 'flojo', en: 'weak / lazy / loose', ex: 'Me siento flojo hoy.' },
  { es: 'el cotilleo', en: 'gossiping', ex: 'Me encanta el cotilleo.' },
  { es: 'el desahogo', en: 'relief / outlet', ex: 'Llorar fue un desahogo.' },
  { es: 'currar', en: 'to work (slang)', ex: 'Tengo que currar el sábado.' },
  { es: 'el marrón', en: 'hassle / drag', ex: '¡Vaya marrón me ha tocado!' },
  { es: 'guay', en: 'cool (slang)', ex: '¡Qué guay tu chaqueta!' },
  { es: 'el tío / la tía', en: 'dude / guy (slang)', ex: 'Ese tío es muy majo.' },
  { es: 'molar', en: 'to be cool (slang)', ex: 'Me mola tu idea.' },
  { es: 'la sobremesa', en: 'after-meal conversation', ex: 'La sobremesa duró dos horas.' },
  { es: 'tener ganas de', en: 'to feel like / want to', ex: 'Tengo ganas de viajar.' },
  { es: 'dar la lata', en: 'to bug / annoy', ex: 'Deja de dar la lata.' },
  { es: 'estar de mal humor', en: 'to be in a bad mood', ex: 'Hoy estoy de mal humor.' },
  { es: 'a lo mejor', en: 'maybe / perhaps', ex: 'A lo mejor llueve mañana.' },
  { es: 'menudo', en: 'what a... (ironic)', ex: '¡Menudo día!' },
  { es: 'vale la pena', en: 'to be worth it', ex: 'Vale la pena intentarlo.' },
  { es: 'darse cuenta', en: 'to realize', ex: 'Me di cuenta tarde.' },
  { es: 'hacer falta', en: 'to be necessary', ex: 'Hace falta más sal.' },
  { es: 'ponerse', en: 'to become / get', ex: 'Se puso muy nervioso.' },
];

// SM-2 inspired spaced repetition
const calculateNextReview = (card, rating) => {
  let { interval = 0, ease = 2.5, reps = 0 } = card;

  if (rating === 'again') {
    reps = 0;
    interval = 0;
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

// localStorage helpers (replaces window.storage from artifact)
const storage = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

export default function App() {
  const [deck, setDeck] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState({ es: '', en: '', ex: '' });
  const [stats, setStats] = useState({ streak: 0, lastStudied: null, totalReviewed: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved data
  useEffect(() => {
    let loadedDeck = storage.get('deck') || [];
    let loadedStats = storage.get('stats') || { streak: 0, lastStudied: null, totalReviewed: 0 };
    const lastDaily = storage.get('lastDaily');

    // Add 5 new words if today hasn't had its batch yet
    if (lastDaily !== todayKey()) {
      const existingEs = new Set(loadedDeck.map(c => c.es));
      const available = WORD_BANK.filter(w => !existingEs.has(w.es));
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const newCards = shuffled.slice(0, 5).map(w => ({
        ...w,
        id: `${w.es}-${Date.now()}-${Math.random()}`,
        interval: 0,
        ease: 2.5,
        reps: 0,
        nextReview: Date.now(),
        added: todayKey(),
      }));
      loadedDeck = [...loadedDeck, ...newCards];
      storage.set('deck', loadedDeck);
      storage.set('lastDaily', todayKey());
    }

    setDeck(loadedDeck);
    setStats(loadedStats);
    buildQueue(loadedDeck);
    setLoading(false);
  }, []);

  const buildQueue = (d) => {
    const now = Date.now();
    const due = d.filter(c => c.nextReview <= now);
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setSessionDone(shuffled.length === 0);
  };

  const handleRate = (rating) => {
    const card = queue[currentIdx];
    const updated = calculateNextReview(card, rating);
    const newDeck = deck.map(c => c.id === card.id ? updated : c);
    setDeck(newDeck);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStats = {
      ...stats,
      totalReviewed: stats.totalReviewed + 1,
      lastStudied: todayKey(),
      streak: stats.lastStudied === todayKey()
        ? stats.streak
        : (stats.lastStudied === yesterday ? stats.streak + 1 : 1),
    };
    setStats(newStats);

    storage.set('deck', newDeck);
    storage.set('stats', newStats);

    setFlipped(false);
    setTimeout(() => {
      if (currentIdx + 1 >= queue.length) {
        setSessionDone(true);
      } else {
        setCurrentIdx(currentIdx + 1);
      }
    }, 200);
  };

  const handleAddWord = () => {
    if (!newWord.es.trim() || !newWord.en.trim()) return;
    const card = {
      ...newWord,
      id: `${newWord.es}-${Date.now()}`,
      interval: 0,
      ease: 2.5,
      reps: 0,
      nextReview: Date.now(),
      added: todayKey(),
      custom: true,
    };
    const newDeck = [...deck, card];
    setDeck(newDeck);
    storage.set('deck', newDeck);
    setNewWord({ es: '', en: '', ex: '' });
    setShowAdd(false);
    buildQueue(newDeck);
  };

  const card = queue[currentIdx];
  const newToday = deck.filter(c => c.added === todayKey()).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-amber-100 text-xl italic" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          cargando...
        </div>
      </div>
    );
  }

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
        <header className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-amber-600/80 mb-1">Día a día · Español</div>
              <h1 className="text-4xl tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}>
                Vocabulario
              </h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 p-2.5 rounded-full bg-amber-100 text-stone-950 hover:bg-amber-200 transition-colors"
              aria-label="Add word"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-6 mt-6 pb-6 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-amber-500" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{stats.streak}</span> día{stats.streak !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-rose-400" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{newToday}</span> nuevas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-stone-500" />
              <span className="text-sm text-stone-400">
                <span className="text-amber-100 font-semibold">{deck.length}</span> total
              </span>
            </div>
          </div>
        </header>

        {sessionDone ? (
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
              Nothing else due today. Come back tomorrow for 5 new words plus your reviews — or add your own words now.
            </p>
            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2.5 bg-amber-100 text-stone-950 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
              >
                Añadir palabra
              </button>
              <button
                onClick={() => buildQueue(deck)}
                className="px-5 py-2.5 border border-stone-700 rounded-full text-sm text-stone-300 hover:border-stone-500 transition-colors flex items-center gap-2"
              >
                <RotateCw size={14} /> Recargar
              </button>
            </div>
          </motion.div>
        ) : card ? (
          <>
            <div className="flex items-center gap-2 mb-6 text-xs text-stone-500">
              <span>{currentIdx + 1} / {queue.length}</span>
              <div className="flex-1 h-px bg-stone-800 relative">
                <div
                  className="absolute left-0 top-0 h-px bg-amber-400/60 transition-all duration-500"
                  style={{ width: `${((currentIdx) / queue.length) * 100}%` }}
                />
              </div>
              {card.reps === 0 && (
                <span className="text-rose-400 text-[10px] tracking-widest uppercase">nueva</span>
              )}
            </div>

            <div
              className="relative cursor-pointer select-none mb-8"
              onClick={() => setFlipped(!flipped)}
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
                        español
                      </div>
                      <div className="absolute top-6 right-6 text-xs text-stone-600 italic">
                        tap to flip
                      </div>
                      <div className="text-center">
                        <div
                          className="text-5xl md:text-6xl leading-tight"
                          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                        >
                          {card.es}
                        </div>
                      </div>
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-stone-700 text-xs">
                        ◆
                      </div>
                    </div>
                  ) : (
                    <div className="h-full rounded-3xl bg-gradient-to-br from-amber-50 to-stone-100 text-stone-900 p-10 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute top-6 left-6 text-[10px] tracking-[0.25em] uppercase text-stone-500">
                        english
                      </div>
                      <div className="text-center">
                        <div
                          className="text-4xl md:text-5xl leading-tight mb-6"
                          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                        >
                          {card.en}
                        </div>
                        {card.ex && (
                          <div className="pt-6 border-t border-stone-300/60 max-w-md mx-auto">
                            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-2">ejemplo</div>
                            <div className="italic text-stone-700 text-base leading-relaxed">
                              "{card.ex}"
                            </div>
                          </div>
                        )}
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
                  <RateButton label="Again" sub="<1d" color="rose" onClick={() => handleRate('again')} />
                  <RateButton label="Hard" sub="~1d" color="orange" onClick={() => handleRate('hard')} />
                  <RateButton label="Good" sub="3d+" color="emerald" onClick={() => handleRate('good')} />
                  <RateButton label="Easy" sub="4d+" color="sky" onClick={() => handleRate('easy')} />
                </motion.div>
              )}
            </AnimatePresence>

            {!flipped && (
              <div className="text-center text-stone-600 text-xs tracking-wide">
                Flip the card, then rate how well you knew it
              </div>
            )}
          </>
        ) : null}

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}>
                    Nueva palabra
                  </h3>
                  <button onClick={() => setShowAdd(false)} className="p-1 text-stone-500 hover:text-stone-300">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] tracking-[0.25em] uppercase text-stone-500">español</label>
                    <input
                      autoFocus
                      value={newWord.es}
                      onChange={(e) => setNewWord({ ...newWord, es: e.target.value })}
                      placeholder="aprovechar"
                      className="w-full mt-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:border-amber-600/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.25em] uppercase text-stone-500">english</label>
                    <input
                      value={newWord.en}
                      onChange={(e) => setNewWord({ ...newWord, en: e.target.value })}
                      placeholder="to take advantage of"
                      className="w-full mt-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:border-amber-600/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.25em] uppercase text-stone-500">ejemplo (optional)</label>
                    <input
                      value={newWord.ex}
                      onChange={(e) => setNewWord({ ...newWord, ex: e.target.value })}
                      placeholder="Voy a aprovechar el día."
                      className="w-full mt-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:border-amber-600/50 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddWord}
                  disabled={!newWord.es.trim() || !newWord.en.trim()}
                  className="w-full mt-5 py-3 bg-amber-100 text-stone-950 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Añadir <ChevronRight size={16} />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 pt-6 border-t border-stone-900 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700">
            5 nuevas cada día · repaso inteligente
          </p>
        </footer>
      </div>
    </div>
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
