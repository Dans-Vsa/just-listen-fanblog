/* Just Listen to the Song · fan blog interactions */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const Song = window.Song;

  let lang = localStorage.getItem('jl-lang') === 'en' ? 'en' : 'id';
  const t = (id, en) => (lang === 'en' ? en : id);
  let soundOn = false;

  /* ================= language ================= */
  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-en]').forEach(el => {
      if (el.dataset.id === undefined) el.dataset.id = el.innerHTML;
      el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.id;
    });
    $$('[data-en-alt]').forEach(el => {
      if (el.dataset.idAlt === undefined) el.dataset.idAlt = el.alt;
      el.alt = lang === 'en' ? el.dataset.enAlt : el.dataset.idAlt;
    });
    $('#lang').textContent = lang === 'en' ? 'EN / ID' : 'ID / EN';
    renderViews();
    ledShow(true);
    buildLinemap();
  }
  $('#lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'id' : 'en';
    localStorage.setItem('jl-lang', lang);
    applyLang();
  });

  /* ================= scenery (generated skyline) ================= */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function skyline(kind) {
    const W = 1600, H = 400;
    let s = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>`;
    let x = 0;
    if (kind === 'far') {
      s += `<g fill='#211a33' fill-opacity='.85'>`;
      while (x < W) {
        const w = rnd(40, 120), h = rnd(80, 300);
        s += `<rect x='${x.toFixed(0)}' y='${(H - h).toFixed(0)}' width='${w.toFixed(0)}' height='${h.toFixed(0)}'/>`;
        if (Math.random() < .2) s += `<rect x='${(x + w / 2 - 2).toFixed(0)}' y='${(H - h - 30).toFixed(0)}' width='3' height='30'/>`;
        x += w + rnd(-10, 6);
      }
      s += `</g><path d='M0 ${H - 40} Q400 ${H - 120} 800 ${H - 60} T1600 ${H - 40} V${H} H0Z' fill='#1a1529'/>`;
    } else {
      let lights = '';
      s += `<g fill='#0e0c13'>`;
      while (x < W) {
        const house = Math.random() < .55;
        const w = house ? rnd(70, 130) : rnd(60, 140);
        const h = house ? rnd(70, 120) : rnd(140, 300);
        const y = H - h;
        if (house) {
          s += `<rect x='${x.toFixed(0)}' y='${y.toFixed(0)}' width='${w.toFixed(0)}' height='${h.toFixed(0)}'/>`;
          s += `<path d='M${(x - 8).toFixed(0)} ${y.toFixed(0)} L${(x + w / 2).toFixed(0)} ${(y - rnd(24, 40)).toFixed(0)} L${(x + w + 8).toFixed(0)} ${y.toFixed(0)}Z'/>`;
          if (Math.random() < .7) lights += `<rect x='${(x + rnd(10, w - 34)).toFixed(0)}' y='${(y + rnd(14, 40)).toFixed(0)}' width='22' height='16' fill-opacity='${rnd(.5, 1).toFixed(2)}'/>`;
        } else {
          s += `<rect x='${x.toFixed(0)}' y='${y.toFixed(0)}' width='${w.toFixed(0)}' height='${h.toFixed(0)}'/>`;
          for (let wy = y + 16; wy < H - 20; wy += 22) {
            for (let wx = x + 10; wx < x + w - 14; wx += 18) {
              if (Math.random() < .32) lights += `<rect x='${wx.toFixed(0)}' y='${wy.toFixed(0)}' width='9' height='11' fill-opacity='${rnd(.35, 1).toFixed(2)}'/>`;
            }
          }
        }
        if (Math.random() < .25) { // utility pole
          const px = x + w + 6;
          s += `<rect x='${px.toFixed(0)}' y='${H - 330}' width='5' height='330'/><rect x='${(px - 16).toFixed(0)}' y='${H - 310}' width='37' height='4'/>`;
        }
        x += w + rnd(8, 40);
      }
      s += `</g><g fill='#ffcf86'>${lights}</g>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(s + '</svg>')}")`;
  }
  // generated after first paint so it never delays the hero
  (window.requestIdleCallback || (fn => setTimeout(fn, 200)))(() => {
    $('.scenery .far i').style.backgroundImage = skyline('far');
    $('.scenery .near i').style.backgroundImage = skyline('near');
  });

  /* ================= hand straps ================= */
  (function straps() {
    const box = $('#straps');
    const n = Math.max(5, Math.round(innerWidth / 120));
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'strap';
      s.style.left = `${((i + .5) / n) * 100}%`;
      s.style.setProperty('--d', `${rnd(2.2, 3.4).toFixed(2)}s`);
      s.style.setProperty('--a', `${rnd(2, 4.5).toFixed(1)}deg`);
      s.style.animationDelay = `${-rnd(0, 3).toFixed(2)}s`;
      box.appendChild(s);
    }
  })();

  /* ================= doors ================= */
  const doors = $('#doors');
  function board(withSound) {
    Song.ensure();
    soundOn = withSound;
    if (withSound) { Song.trainOn(); Song.chime('door'); setTrainBtn(true); }
    doors.classList.add('is-open');
    document.body.classList.remove('is-boarding');
    setTimeout(() => doors.classList.add('is-gone'), reduce ? 0 : 1100);
    $('.hero [data-play]')?.focus({ preventScroll: true });
  }
  $('#boardSound').addEventListener('click', () => board(true));
  $('#boardQuiet').addEventListener('click', () => board(false));
  addEventListener('keydown', e => {
    if (!doors.classList.contains('is-open') && e.key === 'Escape') board(false);
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash && location.hash !== '#naik') {
    doors.classList.add('is-open', 'is-gone');
    document.body.classList.remove('is-boarding');
  }

  /* ================= train sound toggle ================= */
  const trainBtn = $('#trainSnd');
  function setTrainBtn(on) { trainBtn.setAttribute('aria-pressed', String(on)); }
  trainBtn.addEventListener('click', () => {
    const on = trainBtn.getAttribute('aria-pressed') !== 'true';
    setTrainBtn(on); soundOn = on;
    on ? Song.trainOn() : Song.trainOff();
  });

  /* ================= stations: LED + line map ================= */
  const stations = $$('[data-station]');
  let current = 0;
  const label = sec => (lang === 'en' ? sec.dataset.enLabel : sec.dataset.label);
  const gateOpen = () => !$('#akhir').classList.contains('is-locked');

  function buildLinemap() {
    const ol = $('#lmStops');
    ol.innerHTML = '';
    stations.forEach((sec, i) => {
      const li = document.createElement('li');
      li.style.left = `${(i / (stations.length - 1)) * 100}%`;
      li.innerHTML = `<button type="button" aria-label="${sec.dataset.jp} ${label(sec)}"><span class="dotx"></span><span class="lbl">${sec.dataset.jp} · ${label(sec)}</span></button>`;
      li.querySelector('button').addEventListener('click', () => {
        const target = sec.id === 'akhir' && !gateOpen() ? $('#gate') : sec;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      });
      ol.appendChild(li);
    });
    markStops();
  }
  function markStops() {
    $$('#lmStops li').forEach((li, i) => {
      li.classList.toggle('passed', i < current);
      li.classList.toggle('here', i === current);
    });
  }

  let ledPhase = 0;
  function ledShow(force) {
    const sec = stations[current], next = stations[current + 1];
    const phases = [
      ['ただいま', `${sec.dataset.jp} · ${label(sec)}`],
      [t('SEKARANG', 'NOW'), `${String(current).padStart(2, '0')} ${label(sec)}`],
      next ? ['次は', `${next.dataset.jp} · ${label(next)}`] : ['終点', t('Terima kasih sudah naik', 'Thank you for riding')]
    ];
    if (!force) ledPhase = (ledPhase + 1) % phases.length;
    const [tag, text] = phases[ledPhase];
    $('#ledTag').textContent = tag;
    const el = $('#ledText');
    el.textContent = text;
    el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  }
  setInterval(() => ledShow(false), 3600);

  const stationIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const i = stations.indexOf(en.target);
      if (i === current) return;
      current = i; ledPhase = 0; ledShow(true); markStops();
      if (soundOn && trainBtn.getAttribute('aria-pressed') === 'true') Song.chime('station');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  stations.forEach(s => stationIO.observe(s));

  /* ================= scroll-driven sky + dim + train marker ================= */
  // Vars live on .cabin (not <html>) so a scroll frame only restyles the backdrop.
  const root = document.documentElement;
  const cabin = $('.cabin'), dimEl = $('#cabinDim'), lmFill = $('#lmFill'), lmTrain = $('#lmTrain'), lmRail = $('.lm-rail');
  let maxScroll = 1, railW = 0, ticking = false, lastT = -1, lastDim = -1;
  function measure() {
    maxScroll = Math.max(1, root.scrollHeight - innerHeight);
    railW = lmRail.offsetWidth;
    onScroll();
  }
  let scrollPos = 0;
  function onScroll() {
    scrollPos = scrollY; // read here, outside the frame, so the rAF below only writes
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollPos, p = clamp(y / maxScroll);
      const tv = Math.round(clamp(p * 1.25) * 200) / 200;
      if (tv !== lastT) { lastT = tv; cabin.style.setProperty('--t', tv); }
      const dv = Math.round(clamp(y / (innerHeight * .8)) * .82 * 100) / 100;
      if (dv !== lastDim) { lastDim = dv; dimEl.style.opacity = dv; }
      lmFill.style.transform = `scaleX(${p.toFixed(4)})`;
      lmTrain.style.transform = `translateX(${(p * railW).toFixed(1)}px)`;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  measure();

  /* ================= playback UI ================= */
  const DUR = 192; // fake video length 3:12
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let views = 50000, viewEls = null;
  function renderViews() {
    (viewEls = viewEls || $$('[data-views]')).forEach(el => { el.textContent = views.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID'); });
  }
  $$('[data-play]').forEach(b => b.addEventListener('click', () => { Song.toggle(); }));
  Song.on('state', playing => {
    document.body.classList.toggle('is-playing', playing);
    $('#npSub').textContent = Song.reverse ? 'lennahC uoY roF noisseffnoC' : 'Confession for You Channel';
    if (playing) loop();
  });

  const viz = $('#viz'), vctx = viz.getContext('2d');
  let fbuf = null;
  function drawViz() {
    const an = Song.analyser;
    vctx.clearRect(0, 0, viz.width, viz.height);
    if (!an) return;
    if (!fbuf) fbuf = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(fbuf);
    const bars = 24, bw = viz.width / bars;
    vctx.fillStyle = '#1ed760';
    for (let i = 0; i < bars; i++) {
      const v = fbuf[Math.floor(i * fbuf.length / bars / 1.6)] / 255;
      const h = Math.max(2, v * viz.height);
      vctx.fillRect(i * bw + 1, viz.height - h, bw - 3, h);
    }
  }
  let lastViewBump = 0, lastTxt = '';
  const curEls = $$('[data-cur]'), progEls = $$('[data-progress]');
  function loop(now = performance.now()) {
    const el = Song.elapsed() % DUR;
    const cur = Song.reverse ? DUR - el : el;
    const txt = fmt(cur), w = `scaleX(${(cur / DUR).toFixed(4)})`;
    if (txt !== lastTxt) { lastTxt = txt; curEls.forEach(n => { n.textContent = txt; }); }
    progEls.forEach(n => { n.style.transform = w; });
    drawViz();
    if (now - lastViewBump > 120) {
      lastViewBump = now;
      views += Math.floor(rnd(3, 40) * (1 + views / 200000));
      renderViews();
    }
    if (Song.playing) requestAnimationFrame(loop);
    else drawViz();
  }

  /* hero comments feed */
  const HERO_CMTS = [
    ['@mendoza88', 'jeda di 2:48 ...', 'pause at 2:48 ...'],
    ['@kousatsu_bu', 'liriknya pasti kode', 'the lyrics are definitely a code'],
    ['@reverse_it', 'putar terbalik, dengar baik baik', 'play it backwards, listen closely'],
    ['@nekonoko', 'kucingnya ITU matahari', 'the cat IS the sun'],
    ['@classmate_k', 'wkwkwk ini temen sekelasku', 'lmao this is my classmate'],
    ['@sky_fish_hunter', 'ada sky fish di jendela!!', 'sky fish in the window!!'],
    ['@moneyfast', 'MAU CARA MUDAH MENABUNG?? KLIK DI BAWAH', 'WANT AN EASY WAY TO SAVE MONEY?? CLICK BELOW'],
    ['@just_a_girl', 'lagunya bagus kok. biasa aja.', 'it is a nice song. just normal.']
  ];
  let cmtI = 0, cmtN = 9;
  function pushHeroComment() {
    const feed = $('#heroFeed');
    const [u, id, en] = HERO_CMTS[cmtI++ % HERO_CMTS.length];
    const li = document.createElement('li');
    li.innerHTML = `<i style="background:hsl(${Math.floor(rnd(0, 360))} 12% 38%)"></i><span><b>${u}</b>${t(id, en)}</span>`;
    feed.prepend(li);
    while (feed.children.length > 3) feed.lastElementChild.remove();
    $('#cmtN').textContent = ++cmtN;
  }
  pushHeroComment(); pushHeroComment();
  setInterval(() => { if (current === 0 && !document.hidden) pushHeroComment(); }, Song.playing ? 2400 : 4200);

  $('#likeBtn').addEventListener('click', e => {
    const b = e.currentTarget, on = b.classList.toggle('liked');
    $('#likeN').textContent = on ? 38 : 37;
  });
  $('#subBtn').addEventListener('click', e => {
    const on = e.currentTarget.classList.toggle('on');
    e.currentTarget.textContent = on ? t('Disubscribe', 'Subscribed') : 'Subscribe';
  });

  /* hero hand tilt */
  const hero = $('#naik'), tilt = $('#heldTilt');
  if (!reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      tilt.style.setProperty('--ry', `${(-8 + x * 16).toFixed(2)}deg`);
      tilt.style.setProperty('--rx', `${(4 - y * 10).toFixed(2)}deg`);
    });
    hero.addEventListener('pointerleave', () => { tilt.style.removeProperty('--ry'); tilt.style.removeProperty('--rx'); });
  }

  /* ================= story scrollytelling ================= */
  const phone = $('#storyPhone'), steps = $$('.step');
  let upTimer = null, countRaf = null, lastStep = -1;
  function setState(i) {
    const st = steps[i].dataset.state;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    if (i === lastStep) return;
    lastStep = i;
    phone.dataset.state = st;
    $('#stageCap').textContent = `${String(i + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    if (st === 'upload') {
      clearInterval(upTimer);
      let p = 0;
      upTimer = setInterval(() => {
        p = Math.min(100, p + rnd(3, 11));
        phone.style.setProperty('--up', `${p}%`);
        $('#upPct').textContent = Math.floor(p);
        if (p >= 100) clearInterval(upTimer);
      }, 140);
    }
    if (st === 'viral') {
      cancelAnimationFrame(countRaf);
      const t0 = performance.now(), from = 320000, to = 99999999;
      const tick = now => {
        const k = clamp((now - t0) / 2600);
        const v = Math.floor(from * Math.pow(to / from, k * k));
        $('#bigCount').textContent = v.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID') + (k >= 1 ? '+' : '');
        if (k < 1) countRaf = requestAnimationFrame(tick);
      };
      countRaf = requestAnimationFrame(tick);
    }
  }
  const stepIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) setState(steps.indexOf(en.target)); });
  }, { rootMargin: '-40% 0px -45% 0px' });
  steps.forEach(s => stepIO.observe(s));
  steps[0].classList.add('is-active');

  /* ================= anomaly hunt ================= */
  const SPOTS = [
    { id: 'ghost', x: 75, y: 64, canon: true, l: ['Hantu', 'Ghost'], u: '@shinrei_ch',
      c: ['Ada sosok berdiri di belakangnya. Jangan hapus videonya, nanti dikutuk.', 'Someone is standing behind him. Do not delete it or you will be cursed.'] },
    { id: 'fish', x: 56, y: 17, canon: true, l: ['Ikan langit', 'Sky fish'], u: '@umi_no_sora',
      c: ['Itu sky fish. Terlalu cepat untuk mata, tidak untuk kamera.', 'That is a sky fish. Too fast for eyes, not for cameras.'] },
    { id: 'cat', x: 31, y: 59, canon: true, l: ['Kucing = matahari', 'Cat = the sun'], u: '@nekonoko',
      c: ['Kucing putih itu adalah matahari. Lagu ini tentang kiamat.', 'The white cat is the sun. This song is about the apocalypse.'] },
    { id: 'hands', x: 16, y: 15, l: ['Cap tangan', 'Handprints'], u: '@five_fingers',
      c: ['Lima cap tangan di dinding. Lima anggota band rahasia. Tunggu album kedua.', 'Handprints on the wall. A secret band. Wait for the second album.'] },
    { id: 'moth', x: 24.5, y: 29, l: ['Ngengat', 'Moth'], u: '@mothman_jp',
      c: ['Ngengat tertarik pada cahaya. Ia adalah cahaya. Sekarang semuanya masuk akal.', 'Moths go to the light. She is the light. It all makes sense now.'] },
    { id: 'blood', x: 92, y: 20, l: ['Tetesan merah', 'Red drip'], u: '@ura_yomi',
      c: ['Ada yang menetes di pojok kanan atas. Kenapa tidak ada yang membahas ini?', 'Something is dripping top right. Why is nobody talking about this?'] },
    { id: 'pink', x: 9, y: 66, l: ['Tangan merah muda', 'Pink hand'], u: '@detective_k',
      c: ['Tangan transparan di kiri. Itu tangan cewek itu. Bukti!!', 'Transparent hand on the left. That is her hand. Proof!!'] }
  ];
  const theater = $('#theater'), feed = $('#theoryFeed');
  let found = 0;
  function addTheory(user, text, canon) {
    $('.th-empty', feed)?.remove();
    const li = document.createElement('li');
    if (canon) li.className = 'canon';
    li.innerHTML = `<i>${user.slice(1, 2).toUpperCase()}</i><span><b>${user}</b>${text}</span>`;
    feed.prepend(li);
  }
  function findSpot(spot, btn) {
    if (btn.classList.contains('found')) return;
    btn.classList.add('found');
    btn.setAttribute('aria-pressed', 'true');
    addTheory(spot.u, t(...spot.c), spot.canon);
    found++;
    $('#foundN').textContent = found;
    views += 25000; renderViews();
    if (Song.playing || soundOn) Song.strum(Math.floor(rnd(2, 6)), .4);
    if (found === SPOTS.length) $('#thDone').hidden = false;
  }
  SPOTS.forEach(spot => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hotspot'; b.dataset.id = spot.id;
    b.style.left = `${spot.x}%`; b.style.top = `${spot.y}%`;
    b.setAttribute('aria-label', t('Periksa sesuatu yang mencurigakan', 'Inspect something suspicious'));
    b.innerHTML = `<span data-en="${spot.l[1]}">${spot.l[0]}</span>`;
    b.addEventListener('click', () => findSpot(spot, b));
    $('#hotspots').appendChild(b);
  });

  let pauseT = null;
  $('#btnPause').addEventListener('click', () => {
    theater.classList.add('paused');
    $('#thTime').textContent = '2:48';
    if (Song.playing) { Song.seek(168); }
    clearTimeout(pauseT);
    pauseT = setTimeout(() => theater.classList.remove('paused'), 2200);
    const g = $('.hotspot[data-id="ghost"]');
    findSpot(SPOTS[0], g);
  });
  let revShown = false;
  function setRev(on) {
    Song.setReverse(on);
    theater.classList.toggle('reversed', on);
    $('#btnRev2').setAttribute('aria-pressed', String(on));
    $('#btnReverse').setAttribute('aria-pressed', String(on));
    if (on && !revShown) {
      revShown = true;
      addTheory('@gun_culture_watch', t('Diputar terbalik, liriknya jelas mengkritik budaya senjata Amerika.', 'Played backwards, the lyrics clearly criticize American gun culture.'), true);
    }
  }
  $('#btnReverse').addEventListener('click', () => { setRev(!Song.reverse); if (!Song.playing) Song.play(); });
  $('#btnRev2').addEventListener('click', () => setRev(!Song.reverse));

  const TRANS = [
    ['es', 'Solo escucha la canción', true, ['Terjemahan Spanyol: lagu ini menyangkal keberadaan Tuhan.', 'Spanish translation: this song denies the existence of God.']],
    ['fr', 'Écoute juste la chanson', false, ['Versi Prancis: ini jelas puisi tentang revolusi.', 'French version: obviously a poem about revolution.']],
    ['de', 'Hör einfach das Lied', false, ['Versi Jerman: liriknya ramalan cuaca. Akurat.', 'German version: the lyrics are a weather forecast. Accurate.']],
    ['ja', 'フツーに聞いてくれ', false, ['Versi asli: "dengarkan saja dengan biasa." Tidak, pasti ada maksud lain.', 'Original: "just listen normally." No, there must be more to it.']]
  ];
  let trI = 0;
  const hud = $('.theater-hud');
  const trSpan = document.createElement('span');
  trSpan.className = 'tr'; hud.appendChild(trSpan);
  $('#btnTranslate').addEventListener('click', () => {
    const [code, title, canon, c] = TRANS[trI++ % TRANS.length];
    trSpan.innerHTML = `<span class="sep">|</span> ${code.toUpperCase()} · ${title}`;
    addTheory(`@translate_${code}`, t(...c), canon);
  });
  $('#justListen').addEventListener('click', () => {
    setRev(false);
    theater.classList.remove('paused', 'reversed');
    $$('.hotspot').forEach(h => { h.style.display = 'none'; });
    hud.style.display = 'none';
    if (!Song.playing) Song.play();
    addTheory('@just_a_girl', t('...lagunya bagus kok.', '...it is a nice song.'), false);
  });

  /* ================= guitar ================= */
  const fb = $('#fretboard');
  const WIDTH = [3.6, 3.1, 2.6, 2.1, 1.6, 1.2];
  const strEls = WIDTH.map((w, i) => {
    const s = document.createElement('i');
    s.className = 'gstring' + (i < 4 ? ' wound' : '');
    s.style.top = `${14 + i * 14.4}%`;
    s.style.setProperty('--w', `${w}px`);
    fb.appendChild(s);
    return s;
  });
  function hit(i, xPct) {
    const s = strEls[i]; if (!s) return;
    if (xPct != null) s.style.setProperty('--hx', `${xPct}%`);
    s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit');
  }
  Song.on('note', i => hit(i));
  const chordRow = $('#chordRow');
  chordRow.innerHTML = Song.PROG.map((c, i) => `<span data-i="${i}">${c}</span>`).join('');
  Song.on('chord', ({ name, bar }) => {
    $('#chordNow').textContent = name;
    $$('span', chordRow).forEach(s => s.classList.toggle('on', +s.dataset.i === bar));
  });

  let lastY = null;
  function strY(i) { const r = fb.getBoundingClientRect(); return r.top + r.height * (0.14 + i * 0.144); }
  function sweep(e) {
    const y = e.clientY, r = fb.getBoundingClientRect();
    const xPct = ((e.clientX - r.left) / r.width) * 100;
    if (lastY != null && lastY !== y) {
      const lo = Math.min(lastY, y), hi = Math.max(lastY, y);
      const speed = clamp(Math.abs(y - lastY) / 40, .25, .8);
      const order = y > lastY ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
      order.forEach(i => {
        const sy = strY(i);
        if (sy > lo && sy <= hi) { Song.strum(i, speed); hit(i, xPct); }
      });
    }
    lastY = y;
  }
  fb.addEventListener('pointerdown', e => { Song.ensure(); lastY = e.clientY; fb.setPointerCapture?.(e.pointerId); });
  fb.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) sweep(e); else lastY = e.clientY; });
  fb.addEventListener('pointerleave', () => { lastY = null; });
  fb.addEventListener('pointerup', () => { lastY = null; });
  addEventListener('keydown', e => {
    if (current !== 5 || e.target.closest('input, textarea')) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 6) { Song.strum(n - 1); hit(n - 1); }
  });
  $('#tempo').addEventListener('input', e => { Song.setTempo(+e.target.value); $('#tempoV').textContent = e.target.value; });

  /* ================= ticket punch ================= */
  let holes = 0;
  $('#punch').addEventListener('click', () => {
    if (holes >= 3) return;
    const h = document.createElement('i');
    h.className = 'hole';
    h.style.left = `${41 + holes * 6}%`; h.style.top = '14px';
    $('.ticket').appendChild(h);
    holes++;
    if (soundOn) Song.strum(5, .3);
  });

  /* ================= spoiler gate + ending ================= */
  const ending = $('#akhir'), gate = $('#gate');
  const lockables = [...ending.children].filter(c => !c.classList.contains('sign'));
  function openGate(scroll) {
    ending.classList.remove('is-locked');
    lockables.forEach(c => c.removeAttribute('inert'));
    gate.classList.add('is-open');
    localStorage.setItem('jl-gate', '1');
    if (scroll) {
      if (soundOn) Song.chime('door');
      ending.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  lockables.forEach(c => c.setAttribute('inert', ''));
  $('#openGate').addEventListener('click', () => openGate(true));
  if (localStorage.getItem('jl-gate') === '1') openGate(false);

  const ebL = $('#ebLeft'), ebR = $('#ebRight');
  function earbuds() {
    const l = ebL.getAttribute('aria-pressed') === 'true', r = ebR.getAttribute('aria-pressed') === 'true';
    Song.setPan(l && !r ? -1 : r && !l ? 1 : 0);
    const note = $('#ebNote');
    if (r && !l) note.textContent = t('Telinga kanan saja. Ia memakai yang kiri. Lagu yang sama, berdua.', 'Right ear only. She has the left. Same song, together.');
    else if (l && !r) note.textContent = t('Itu earbud miliknya. Kembalikan dulu.', 'That one is hers. Give it back.');
    else if (l && r) note.textContent = t('Dua duanya kamu ambil? Dia jadi tidak bisa dengar.', 'Taking both? Now she cannot hear it.');
    else note.textContent = t('Pakai earphone: lagunya hanya terdengar di telinga kananmu. Seperti dia.', 'With earphones on, you will hear the song only in your right ear. Like him.');
  }
  [ebL, ebR].forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    Song.ensure();
    if (!Song.playing) Song.play();
    earbuds();
  }));

  /* ================= facts likes ================= */
  $$('.f-like').forEach(b => b.addEventListener('click', () => {
    const on = b.classList.toggle('on');
    const n = $('b', b); n.textContent = +n.textContent + (on ? 1 : -1);
  }));

  /* ================= lightbox ================= */
  const lb = $('#lightbox');
  let lastFocus = null;
  $$('[data-zoom]').forEach(img => img.addEventListener('click', () => {
    lastFocus = document.activeElement;
    $('#lbImg').src = img.src;
    $('#lbImg').alt = img.alt;
    $('#lbCap').textContent = lang === 'en' ? img.dataset.enCap : img.dataset.cap;
    lb.hidden = false;
    $('#lbClose').focus();
  }));
  const closeLb = () => { lb.hidden = true; lastFocus?.focus?.(); };
  $('#lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ================= reveal ================= */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ================= visibility ================= */
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('is-hidden', document.hidden);
  });

  applyLang();
})();
