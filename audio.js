/* Just Listen to the Song · audio engine
   Everything is synthesized: Karplus-Strong guitar, a wordless hum for the melody,
   train ambience (rumble + rail joints) and the door chime. No recordings, no lyrics. */
(() => {
  'use strict';

  const STRINGS = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
  const CHORDS = {
    'G':    [3, 2, 0, 0, 0, 3],
    'D/F#': [2, -1, 0, 2, 3, 2],
    'Em':   [0, 2, 2, 0, 0, 0],
    'C':    [-1, 3, 2, 0, 1, 0],
    'D':    [-1, -1, 0, 2, 3, 2],
    'Am':   [-1, 0, 2, 2, 1, 0]
  };
  const PROG = ['G', 'D/F#', 'Em', 'C', 'G', 'D/F#', 'C', 'D', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'];
  // melody per bar: [eighth, midi, length in eighths]
  const MEL = [
    [[0, 71, 2], [2, 74, 2], [4, 74, 3], [7, 72, 1]],
    [[0, 71, 2], [2, 69, 2], [4, 66, 4]],
    [[0, 67, 2], [2, 71, 2], [4, 74, 2], [6, 76, 2]],
    [[0, 76, 3], [3, 74, 1], [4, 72, 4]],
    [[0, 71, 2], [2, 74, 2], [4, 79, 3], [7, 78, 1]],
    [[0, 76, 2], [2, 74, 2], [4, 74, 4]],
    [[0, 72, 2], [2, 71, 2], [4, 69, 2], [6, 67, 2]],
    [[0, 69, 6]],
    [[0, 76, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2]],
    [[0, 74, 3], [3, 72, 1], [4, 71, 4]],
    [[0, 71, 2], [2, 74, 2], [4, 79, 4]],
    [[0, 78, 2], [2, 76, 2], [4, 71, 4]],
    [[0, 72, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2]],
    [[0, 71, 2], [2, 69, 2], [4, 66, 2], [6, 69, 2]],
    [[0, 67, 8]],
    []
  ];
  // fingerpicking: which string plays on each eighth ('B' = bass, 'A' = alternate bass)
  const PICK = ['B', 3, 4, 5, 'A', 3, 4, 2];

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, master, musicBus, panner, analyser, trainBus;
  const ksCache = new Map();
  const listeners = { note: [], chord: [], state: [], tick: [] };
  const emit = (type, v) => listeners[type].forEach(fn => fn(v));

  const S = {
    playing: false, reverse: false, bpm: 78,
    bar: 0, eighth: 0, nextTime: 0, timer: null,
    startedAt: 0, acc: 0, chord: 'G'
  };

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);

    musicBus = ctx.createGain(); musicBus.gain.value = 0.85;
    panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    // a small "room": short feedback delay for body
    const room = ctx.createDelay(); room.delayTime.value = 0.045;
    const fb = ctx.createGain(); fb.gain.value = 0.22;
    const roomLp = ctx.createBiquadFilter(); roomLp.type = 'lowpass'; roomLp.frequency.value = 2600;
    musicBus.connect(room); room.connect(roomLp); roomLp.connect(fb); fb.connect(room);
    const out = panner || master;
    musicBus.connect(out); roomLp.connect(out);
    if (panner) panner.connect(master);

    trainBus = ctx.createGain(); trainBus.gain.value = 0; trainBus.connect(master);
    return ctx;
  }

  /* ---------- Karplus-Strong ---------- */
  function ksBuffer(midi, reverse) {
    const key = midi + (reverse ? 'r' : '');
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, f = mtof(midi);
    const len = Math.floor(sr * (reverse ? 1.1 : 2.6));
    const N = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; prev = prev * 0.45 + r * 0.55; ring[i] = prev; }
    const decay = midi < 50 ? 0.9965 : 0.995;
    const data = new Float32Array(len);
    let idx = 0;
    for (let n = 0; n < len; n++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      data[n] = a;
      ring[idx] = decay * 0.5 * (a + b);
      idx = (idx + 1) % N;
    }
    if (reverse) data.reverse();
    const buf = ctx.createBuffer(1, len, sr);
    buf.copyToChannel ? buf.copyToChannel(data, 0) : buf.getChannelData(0).set(data);
    ksCache.set(key, buf);
    return buf;
  }

  function pluck(midi, when, vel = 0.5, reverse = false) {
    const src = ctx.createBufferSource();
    src.buffer = ksBuffer(midi, reverse);
    const g = ctx.createGain(); g.gain.value = vel;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 220; body.gain.value = 5; body.Q.value = 0.9;
    src.connect(body); body.connect(g); g.connect(musicBus);
    src.start(when);
  }

  function hum(midi, when, dur, reverse = false) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = mtof(midi); o2.frequency.value = mtof(midi) * 2;
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.2; vg.gain.value = mtof(midi) * 0.006;
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.6;
    const g = ctx.createGain(), g2 = ctx.createGain(); g2.gain.value = 0.18;
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(musicBus);
    const peak = 0.11, end = when + dur;
    g.gain.setValueAtTime(0.0001, when);
    if (reverse) {
      g.gain.exponentialRampToValueAtTime(peak, end - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    } else {
      g.gain.exponentialRampToValueAtTime(peak, when + 0.09);
      g.gain.setTargetAtTime(peak * 0.7, when + 0.1, 0.3);
      g.gain.setTargetAtTime(0.0001, end - 0.06, 0.06);
    }
    [o, o2, vib].forEach(x => { x.start(when); x.stop(end + 0.4); });
  }

  /* ---------- sequencer ---------- */
  const eighthDur = () => 60 / S.bpm / 2;

  function chordNotes(name) {
    return CHORDS[name].map((fret, s) => (fret < 0 ? null : STRINGS[s] + fret));
  }

  function scheduleEighth(barIdx, e, t) {
    const name = PROG[barIdx];
    const notes = chordNotes(name);
    const rev = S.reverse;
    const ee = rev ? 7 - e : e;
    let s = PICK[ee];
    if (s === 'B') s = notes.findIndex(n => n !== null);
    else if (s === 'A') { s = notes.findIndex(n => n !== null) + 1; if (notes[s] == null) s = 3; }
    if (notes[s] != null) {
      const vel = (ee === 0 ? 0.62 : ee === 4 ? 0.52 : 0.36) * (0.9 + Math.random() * 0.2);
      pluck(notes[s], t + (Math.random() * 0.012), vel, rev);
      later(t, () => emit('note', s));
    }
    MEL[barIdx].forEach(([at, midi, len]) => {
      const pos = rev ? 8 - (at + len) : at;
      if (pos === e) hum(midi, t, len * eighthDur() * 0.98, rev);
    });
    if (e === 0) later(t, () => { S.chord = name; emit('chord', { name, bar: barIdx }); });
  }

  function later(t, fn) {
    const ms = Math.max(0, (t - ctx.currentTime) * 1000);
    setTimeout(fn, ms);
  }

  function scheduler() {
    const ahead = S.reverse ? 0.35 : 0.15;
    while (S.nextTime < ctx.currentTime + ahead) {
      scheduleEighth(S.bar, S.eighth, S.nextTime);
      S.nextTime += eighthDur();
      S.eighth++;
      if (S.eighth >= 8) {
        S.eighth = 0;
        S.bar = S.reverse ? (S.bar - 1 + PROG.length) % PROG.length : (S.bar + 1) % PROG.length;
      }
    }
  }

  function play() {
    if (!ensure()) return;
    if (S.playing) return;
    S.playing = true;
    S.nextTime = ctx.currentTime + 0.06;
    S.startedAt = ctx.currentTime;
    S.timer = setInterval(scheduler, 25);
    scheduler();
    emit('state', true);
  }
  function pause() {
    if (!S.playing) return;
    S.playing = false;
    clearInterval(S.timer);
    S.acc += ctx.currentTime - S.startedAt;
    emit('state', false);
  }
  function toggle() { S.playing ? pause() : play(); }

  function elapsed() {
    if (!ctx) return S.acc;
    return S.acc + (S.playing ? ctx.currentTime - S.startedAt : 0);
  }

  function seek(seconds) {
    // move the fake video clock; musically jump to the matching bar
    const was = S.playing;
    if (was) pause();
    S.acc = seconds;
    const barDur = eighthDur() * 8;
    S.bar = Math.floor(seconds / barDur) % PROG.length; S.eighth = 0;
    if (was) play();
  }

  function setReverse(on) {
    S.reverse = !!on;
    emit('state', S.playing);
  }
  function setTempo(bpm) { S.bpm = Math.max(50, Math.min(130, bpm)); }

  function strum(s, vel = 0.55) {
    if (!ensure()) return;
    const notes = chordNotes(S.chord);
    const n = notes[s] != null ? notes[s] : STRINGS[s];
    pluck(n, ctx.currentTime + 0.005, vel, S.reverse);
    emit('note', s);
  }

  function setPan(v) {
    if (!ensure() || !panner) return;
    panner.pan.setTargetAtTime(v, ctx.currentTime, 0.15);
  }

  /* ---------- train ---------- */
  let trainNodes = null, railTimer = null;
  function brown(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    return buf;
  }
  function railClick(t, v) {
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = v;
    src.connect(bp); bp.connect(g); g.connect(trainBus);
    src.start(t);
  }
  function trainOn() {
    if (!ensure()) return;
    if (!trainNodes) {
      const src = ctx.createBufferSource(); src.buffer = brown(5); src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.23; lg.gain.value = 0.12; lfo.connect(lg); lg.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(trainBus);
      src.start(); lfo.start();
      trainNodes = { src, lfo };
    }
    trainBus.gain.setTargetAtTime(0.32, ctx.currentTime, 0.6);
    clearInterval(railTimer);
    const joints = () => { const t = ctx.currentTime + 0.05; railClick(t, 0.5); railClick(t + 0.16, 0.38); };
    joints();
    railTimer = setInterval(joints, 1850);
  }
  function trainOff() {
    if (!ctx) return;
    trainBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    clearInterval(railTimer);
  }

  /* ---------- chime (door / station) ---------- */
  function chime(kind = 'door') {
    if (!ensure()) return;
    const t = ctx.currentTime + 0.02;
    const seq = kind === 'door' ? [[88, 0], [84, 0.42], [88, 0.84], [84, 1.26]] : [[83, 0], [79, 0.32]];
    seq.forEach(([m, dt]) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o2.type = 'sine';
      o.frequency.value = mtof(m); o2.frequency.value = mtof(m) * 2.76;
      const g2 = ctx.createGain(); g2.gain.value = 0.08;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
      const v = kind === 'door' ? 0.14 : 0.07;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(v, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 1.1);
      [o, o2].forEach(x => { x.start(t + dt); x.stop(t + dt + 1.2); });
    });
  }

  window.Song = {
    ensure, play, pause, toggle, seek, setReverse, setTempo, strum, setPan, elapsed, chime,
    trainOn, trainOff,
    on: (type, fn) => listeners[type].push(fn),
    get playing() { return S.playing; },
    get reverse() { return S.reverse; },
    get chord() { return S.chord; },
    get bpm() { return S.bpm; },
    get analyser() { return analyser; },
    PROG
  };
})();
