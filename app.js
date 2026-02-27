const { useState, useEffect } = React;
const e = React.createElement;

let audioCtx = null;
let musicInt = null;

const synth = (f, t, d, v) => {
    try {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = t; o.frequency.value = f;
        g.gain.setValueAtTime(v, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + d);
    } catch(err) {}
}

const runMusic = () => {
    if(musicInt) return;
    musicInt = setInterval(() => {
        const n = [164, 196, 220, 261, 329];
        synth(n[Math.floor(Math.random()*n.length)], 'triangle', 0.5, 0.01);
    }, 600);
}

function App() {
  const [view, setView] = useState('menu');
  const [mode, setMode] = useState(null);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [hp, setHp] = useState(100);
  const [pHP, setPHP] = useState(100);
  const [res, setRes] = useState(0);
  const [msg, setMsg] = useState("");
  const [anim, setAnim] = useState(false);
  const [moves, setMoves] = useState([]);
  const [caseOptions, setCaseOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [details, setDetails] = useState(null);

  const start = (selectedMode) => {
    runMusic();
    setMode(selectedMode);
    const sDeck = [...PATHOGENS].sort(() => Math.random() - 0.5);
    setDeck(sDeck);
    setIdx(0);
    setPHP(100);
    setRes(0);
    setupPathogen(sDeck[0], selectedMode);
  };

  const setupPathogen = (bug, currentMode) => {
    // CRITICAL: Reset the animation lock and HP for the new encounter
    setAnim(false); 
    setHp(100);
    setMoves([...bug.moves].sort(() => Math.random() - 0.5));
    
    if (currentMode === 'clerkship') {
        const wrongs = PATHOGENS.filter(p => p.name !== bug.name).sort(() => Math.random() - 0.5).slice(0, 3);
        setCaseOptions([...wrongs, bug].sort(() => Math.random() - 0.5));
        setView('case');
    } else {
        setView('game');
        setMsg(`Wild ${bug.name.toUpperCase()} appeared!`);
    }
  }

  const handleCaseIdent = (name) => {
    if (name === deck[idx].name) {
        synth(600, 'square', 0.2, 0.05);
        setView('game');
        setMsg(`CORRECT. Treat ${name}!`);
    } else {
        synth(100, 'sawtooth', 0.3, 0.05);
        setPHP(p => Math.max(0, p - 20));
        setMsg("MISDIAGNOSIS! Vitals dropping!");
        if (pHP <= 20) setView('lost_clin');
    }
  }

  const play = (m) => {
    if (anim) return;
    setAnim(true); // Lock buttons during animation
    
    const hit = m.damage > 0;
    const nHp = Math.max(0, hp - m.damage);
    const nRes = Math.min(100, res + m.res);
    
    setHp(nHp); 
    setRes(nRes); 
    setMsg(m.text);
    synth(hit ? 500 : 100, 'square', 0.1, 0.04);

    if (nRes >= 100) { setView('lost_res'); return; }

    setTimeout(() => {
      if (nHp > 0) {
        // Pathogen turn
        setPHP(p => Math.max(0, p - 15));
        setMsg(`${deck[idx].name} used virulence!`);
        synth(150, 'sawtooth', 0.2, 0.04);
        setAnim(false); // Unlock buttons after enemy attack
        if (pHP <= 15) setView('lost_clin');
      } else {
        // Pathogen defeated
        if (idx < deck.length - 1) {
          const nextIdx = idx + 1;
          setIdx(nextIdx);
          setupPathogen(deck[nextIdx], mode);
        } else {
          setView('won');
        }
      }
    }, 1000);
  };

  if (view === 'menu') return e('div', {className: 'flex flex-col items-center justify-center min-h-screen bg-slate-900 p-10 font-mono'},
    e('h1', {className: 'text-yellow-400 text-2xl mb-12 text-center'}, "CULTURE SHOCK"),
    e('button', {onClick: () => start('gauntlet'), className: 'w-full py-5 bg-blue-600 text-white border-4 border-black mb-4 font-bold shadow-[4px_4px_0px_#000] text-xs uppercase'}, "Gauntlet Mode"),
    e('button', {onClick: () => start('clerkship'), className: 'w-full py-5 bg-emerald-600 text-white border-4 border-black mb-4 font-bold shadow-[4px_4px_0px_#000] text-xs uppercase'}, "Clerkship Mode"),
    e('button', {onClick: () => setView('archive'), className: 'w-full py-5 bg-white border-4 border-black font-bold shadow-[4px_4px_0px_#000] text-xs text-black uppercase'}, "Archive")
  );

  if (view === 'archive') {
    const filtered = PATHOGENS.filter(p => (tab === "All" || p.type === tab) && p.name.toLowerCase().includes(search.toLowerCase()));
    return e('div', {className: 'flex flex-col h-screen bg-slate-200 font-mono text-[9px]'},
        e('div', {className:'p-4 bg-slate-900 text-white flex justify-between'}, e('button', {onClick:()=>setView('menu')},"< EXIT"), "PATHOGEN DB"),
        e('div', {className:'p-2 space-y-2'}, 
            e('input', {className:'w-full p-3 border-4 border-black', placeholder:'SEARCH...', value:search, onChange:v=>setSearch(v.target.value)}),
            e('div', {className:'flex gap-1 overflow-x-auto pb-2'}, ["All", "Bacteria", "Fungi", "Virus", "Parasite"].map(t=>e('button', {key:t, onClick:()=>setTab(t), className:`px-3 py-1 border-2 border-black ${tab===t?'bg-blue-600 text-white':'bg-white'}`}, t)))
        ),
        e('div', {className:'flex-grow overflow-y-auto p-4'}, filtered.map(p=>e('div', {key:p.name, onClick:()=>setDetails(p), className:'poke-card p-4 mb-2 cursor-pointer hover:bg-yellow-50'}, p.sprite + " " + p.name))),
        details && e('div', {className:'fixed bottom-0 left-0 right-0 h-3/4 bg-white border-t-8 border-black p-6 overflow-y-auto bounce-in shadow-2xl z-50'},
            e('div', {className:'flex justify-between mb-4'}, e('h2', {className:'text-blue-700 font-bold'}, details.name), e('button', {onClick:()=>setDetails(null), className:'text-red-500 font-bold font-mono'}, "[X]")),
            e('div', {className:'mb-4 bg-emerald-50 p-2 border-2 border-black'}, e('b',null,"PEARLS:"), e('p',{className:'leading-relaxed'},details.pearls)),
            details.moves.map(m=>e('div', {key:m.name, className:'p-2 border-2 border-slate-300 my-1 bg-slate-50'}, e('b',null,m.name), e('p',{className:'opacity-60'},m.text)))
        )
    );
  }

  if (view === 'case') return e('div', {className:'max-w-md mx-auto min-h-screen bg-slate-900 p-6 flex flex-col font-mono'},
    e('div', {className:'poke-card p-6 flex-grow mb-4 flex flex-col justify-center'}, 
        e('h2', {className:'text-emerald-700 font-bold mb-4 text-[10px] uppercase underline'}, "Case Presentation:"),
        e('p', {className:'text-black text-[9px] leading-loose'}, deck[idx].case)
    ),
    e('div', {className:'grid grid-cols-1 gap-2 pb-6'}, caseOptions.map(o=>e('button', {key:o.name, onClick:()=>handleCaseIdent(o.name), className:'bg-white border-4 border-black p-4 text-[8px] font-bold active:bg-yellow-400 shadow-[4px_4px_0px_#000]'}, o.name)))
  );

  if (view.startsWith('lost')) return e('div', {className: 'flex flex-col items-center justify-center min-h-screen bg-rose-950 text-white p-10 font-mono text-center'},
    e('h1', {className:'mb-6 text-xl'}, "HOSPITAL DISCHARGE"), e('p', {className:'text-[8px] mb-10'}, view === 'lost_res' ? "RESISTANCE OVERLOAD." : "CLINICAL MISMANAGEMENT."),
    e('button', {onClick: () => setView('menu'), className: 'bg-white text-black p-4 text-[10px] font-bold border-4 border-black shadow-[4px_4px_0px_#000]'}, "RETRY")
  );

  if (view === 'won') return e('div', {className: 'flex flex-col items-center justify-center min-h-screen bg-emerald-900 text-white p-10 font-mono text-center'},
    e('h1', {className:'mb-10 text-xl'}, "STEP COMPLETE!"),
    e('button', {onClick: () => setView('menu'), className: 'bg-white text-black p-4 text-[10px] font-bold border-4 border-black shadow-[4px_4px_0px_#000]'}, "MAIN MENU")
  );

  return e('div', {className: 'max-w-md mx-auto min-h-screen flex flex-col bg-slate-200 p-4 font-mono'},
    e('div', {className: 'poke-card p-4 mb-4 bg-white'},
      e('div', {className:'flex justify-between text-[7px] mb-2 font-bold'}, "VITAL STABILITY", `${pHP}%`),
      e('div', {className: 'hp-bar-bg mb-2'}, e('div', {style: {width: `${pHP}%`, background: '#22c55e'}, className: 'h-full transition-all duration-300'})),
      e('div', {className:'flex justify-between text-[7px] mb-2 font-bold text-rose-600'}, "DRUG RESISTANCE", `${res}%`),
      e('div', {className: 'hp-bar-bg'}, e('div', {style: {width: `${res}%`, background: '#ef4444'}, className: 'h-full transition-all duration-300'}))
    ),
    e('div', {className: 'flex-grow flex flex-col items-center justify-center py-10'},
      e('div', {className: `text-8xl mb-6 ${anim ? 'shake' : ''}`}, deck[idx].sprite),
      e('div', {className: 'poke-card p-3 w-full text-center bg-white border-4 border-black'}, 
        e('div', {className: 'text-[9px] font-bold uppercase'}, deck[idx].name),
        e('div', {className: 'hp-bar-bg mt-2'}, e('div', {style: {width: `${(hp/100)*100}%`, background: '#ef4444'}, className: 'h-full transition-all duration-300'}))
      )
    ),
    e('div', {className: 'poke-card p-4 h-24 text-[8px] mb-4 bg-white leading-relaxed border-4 border-black overflow-y-auto'}, msg || "CHOOSE THERAPY:"),
    e('div', {className: 'grid grid-cols-2 gap-2 pb-6'}, moves.map((m, i) => e('button', {
        key: i, onClick: () => play(m), disabled: anim,
        className: 'bg-white border-4 border-black p-4 text-[7px] font-bold active:bg-blue-200 shadow-[2px_2px_0px_#000] uppercase'
      }, m.name))
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));