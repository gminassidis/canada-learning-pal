/* canada-pal-learn. Alles läuft lokal, kein Netz, kein Server. */
(function () {
'use strict';

var SPK = '<svg viewBox="0 0 24 24"><use href="#i-speak"/></svg>';

var C = window.CONTENT || {};
var UNITS = (C.units && C.units.chapters) || [];
var QUESTIONS = (C.questions && C.questions.questions) || [];
var VOCAB = (C.vocab && C.vocab.terms) || [];
var PDF_URL = (C.meta && C.meta.pdfUrl) || '';

/* ---------------- Speicher ---------------- */

var KEY = 'cfsc.v1';
var state = { srs: {}, seen: {}, wrong: {}, quiz: { runs: [] } };

function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (e) { /* privates Fenster, egal */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
load();

/* ---------------- Helfer ---------------- */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function el(id) { return document.getElementById(id); }
function shuffle(a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function termById(id) {
  for (var i = 0; i < VOCAB.length; i++) if (VOCAB[i].id === id) return VOCAB[i];
  return null;
}
/* Aussprache. Klingt einfach, ist es nicht:
   - iOS gibt Sprache erst frei, nachdem einmal innerhalb einer echten
     Nutzergeste gesprochen wurde.
   - cancel() unmittelbar vor speak() verschluckt dort die Ausgabe.
   - eine Sprache zu setzen reicht nicht, es braucht eine vorhandene Stimme.
   - Stimmen werden in manchen Browsern erst nachträglich geladen.
   Und wenn nichts geht, soll es das sagen statt stumm zu bleiben. */

var Speech = (function () {
  var list = [];

  function supported() {
    return typeof window.speechSynthesis !== 'undefined'
        && typeof window.SpeechSynthesisUtterance === 'function';
  }
  function load() {
    if (!supported()) return;
    try { list = window.speechSynthesis.getVoices() || []; } catch (e) { list = []; }
  }
  if (supported()) {
    load();
    try { window.speechSynthesis.onvoiceschanged = load; } catch (e) {}
  }
  function englishVoice() {
    var want = ['en-ca', 'en-us', 'en-gb', 'en-au', 'en'];
    for (var i = 0; i < want.length; i++) {
      for (var k = 0; k < list.length; k++) {
        var lang = String(list[k].lang || '').replace('_', '-').toLowerCase();
        if (lang.indexOf(want[i]) === 0) return list[k];
      }
    }
    return null;
  }

  /* Safari auf dem iPhone gibt Sprache nur frei, wenn speak() unmittelbar in
     der Nutzergeste steht. Jedes setTimeout dazwischen killt sie. Deshalb hier
     alles synchron, und kein stiller Aufwaerm-Aufruf mehr: der hinterliess ein
     laufendes pending, wodurch der erste echte Aufruf in den Zweig mit
     Verzoegerung geriet und genau deshalb stumm blieb. */
  function say(text, onStart, onDone, onFail) {
    if (!supported()) { onFail('Dieser Browser kann keinen Text vorlesen.'); return; }
    load();
    var s = window.speechSynthesis;
    var v = englishVoice();
    var u = new SpeechSynthesisUtterance(text);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
    u.rate = 0.85;

    var started = false;
    u.onstart = function () { started = true; onStart(); };
    u.onend   = function () { onDone(); };
    u.onerror = function (e) {
      onDone();
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      onFail(v ? 'Vorlesen hat nicht geklappt.'
               : 'Keine englische Stimme auf diesem Gerät gefunden.');
    };

    try {
      s.cancel();
      s.speak(u);
    } catch (err) { onDone(); onFail('Vorlesen hat nicht geklappt.'); return; }

    setTimeout(function () {
      if (!started && !s.speaking && !s.pending) {
        onDone();
        onFail('Es kommt kein Ton. Auf dem iPhone: Stummschalter am Rand prüfen '
             + 'und Lautstärke aufdrehen.');
      }
    }, 1800);
  }

  function report() {
    if (!supported()) return { ok: false, n: 0, voice: null };
    load();
    var v = englishVoice();
    return { ok: true, n: list.length,
             voice: v ? (v.name + ' (' + v.lang + ')') : null,
             langs: list.slice(0, 40).map(function (x) { return x.lang; }).join(', ') };
  }

  return { say: say, report: report };
})();

var toastTimer = null;
function toast(msg) {
  var t = el('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 5000);
}

/* Haengt an alle Vorleseknopfe unterhalb von root die Bedienung. */
function wireSpeak(root) {
  root.querySelectorAll('[data-say]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      Speech.say(b.dataset.say,
        function () { b.classList.add('on'); },
        function () { b.classList.remove('on'); },
        function (msg) { b.classList.remove('on'); toast(msg); });
    });
  });
}

/* ---------------- Tabs ---------------- */

var VIEWS = ['learn', 'quiz', 'vocab'];
function showTab(name) {
  VIEWS.forEach(function (v) {
    el('view-' + v).classList.toggle('active', v === name);
  });
  document.querySelectorAll('nav.tabs button').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.dataset.tab === name));
  });
  if (name === 'learn') renderLearnIndex();
  if (name === 'quiz') renderQuizStart();
  if (name === 'vocab') renderVocab();
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav.tabs button').forEach(function (b) {
  b.addEventListener('click', function () { showTab(b.dataset.tab); });
});

/* ---------------- Lernen ---------------- */

function renderLearnIndex() {
  el('learn-unit').hidden = true;
  el('learn-about').hidden = false;
  var box = el('learn-index');
  box.hidden = false;

  if (!UNITS.length) {
    box.innerHTML = '<h2>Lernen</h2><p class="empty">Noch keine Inhalte. '
      + 'Sie werden aus dem Handbuch eingefüllt.</p>';
    return;
  }

  var h = '<h2>Lernen</h2>';
  UNITS.forEach(function (ch) {
    h += '<h3>' + esc(ch.titleDe) + '</h3>';
    if (ch.titleEn) h += '<p><span class="en-inline">' + esc(ch.titleEn) + '</span></p>';
    (ch.units || []).forEach(function (u) {
      if (u.kind === 'intro') return;          // steht als Kapitelkopf schon da
      var done = state.seen[u.id] ? ' ✓' : '';
      h += '<button data-unit="' + esc(u.id) + '">' + esc(u.titleDe) + done
         + '<br><span class="en-inline">' + esc(u.titleEn || '') + '</span></button>';
    });
  });
  box.innerHTML = h;
  box.querySelectorAll('button[data-unit]').forEach(function (b) {
    b.addEventListener('click', function () { renderUnit(b.dataset.unit); });
  });
}

/* Leiste über alle Lerneinheiten. Jede Gruppe ist ein Modul, die Lücke
   dazwischen zeigt, wo das nächste anfängt. Breite je Gruppe nach Anzahl. */
function unitMap(currentId) {
  var h = '<div class="unitmap">';
  UNITS.forEach(function (ch) {
    var us = ch.units || [];
    if (!us.length) return;
    h += '<span class="um-group" style="flex:' + us.length + '">';
    us.forEach(function (u) {
      var cls = u.id === currentId ? 'um now' : (state.seen[u.id] ? 'um done' : 'um');
      h += '<button class="' + cls + '" data-go="' + esc(u.id) + '" title="'
         + esc(ch.titleDe + ' — ' + u.titleDe) + '"></button>';
    });
    h += '</span>';
  });
  return h + '</div>';
}

function findUnit(id) {
  for (var i = 0; i < UNITS.length; i++) {
    var us = UNITS[i].units || [];
    for (var j = 0; j < us.length; j++) if (us[j].id === id) return { ch: UNITS[i], u: us[j], ci: i, ui: j };
  }
  return null;
}

function renderUnit(id) {
  var f = findUnit(id);
  if (!f) return;
  var u = f.u;
  state.seen[id] = Date.now(); save();

  el('learn-index').hidden = true;
  el('learn-about').hidden = true;
  var box = el('learn-unit');
  box.hidden = false;

  if (u.kind === 'intro') {
    renderIntro(f, box);
    return;
  }

  var h = '<button class="ghost small" id="back">‹ Übersicht</button>';
  h += unitMap(id);
  h += '<p class="eyebrow">' + esc(f.ch.titleDe) + ' · Einheit ' + (f.ui + 1)
     + ' von ' + (f.ch.units || []).length + '</p>';
  h += '<h2>' + esc(u.titleDe) + '</h2>';
  if (u.titleEn) h += '<p><span class="en-inline">' + esc(u.titleEn) + '</span></p>';

  (u.blocks || []).forEach(function (b) {
    if (b.type === 'de') {
      h += '<p>' + esc(b.text) + '</p>';
    } else if (b.type === 'en') {
      h += '<p class="en">' + esc(b.text);
      if (b.page && PDF_URL) {
        h += '<a class="en-src" href="' + esc(PDF_URL) + '#page=' + b.page + '"'
           + ' target="_blank" rel="noopener">Englisch · Handbuch S. ' + b.page + ' ↗</a>';
      } else {
        h += '<span class="en-src">Englisch</span>';
      }
      h += '</p>';
    } else if (b.type === 'img') {
      h += '<figure><img src="' + esc(b.src) + '" alt="' + esc(b.captionDe || '') + '">';
      if (b.captionDe) h += '<figcaption>' + esc(b.captionDe) + '</figcaption>';
      h += '</figure>';
      if (b.labels && b.labels.length) {
        h += '<ul class="vlist">';
        b.labels.forEach(function (l) {
          h += '<li><div><span class="v-en">' + esc(l.en) + '</span><br>'
             + '<span class="v-de">' + esc(l.de) + '</span></div></li>';
        });
        h += '</ul>';
      }
    } else if (b.type === 'terms') {
      h += '<div class="card"><h3>Begriffe</h3><ul class="vlist">';
      (b.ids || []).forEach(function (tid) {
        var t = termById(tid);
        if (!t) return;
        h += '<li><button class="speak small" data-say="' + esc(t.en) + '">' + SPK + '</button>'
           + '<div><span class="v-en">' + esc(t.en) + '</span><br>'
           + '<span class="v-de">' + esc(t.de) + '</span></div></li>';
      });
      h += '</ul></div>';
    }
  });

  if (u.source) h += '<p class="src">Handbuch ' + esc(u.source) + '</p>';

  var nav = nextPrev(f);
  h += '<div class="btn-row">';
  h += nav.prev ? '<button data-go="' + esc(nav.prev) + '">‹ Zurück</button>' : '';
  if (nav.next) {
    var nf = findUnit(nav.next);
    var neu = nf && nf.ch.id !== f.ch.id;
    h += '<button class="primary" data-go="' + esc(nav.next) + '">'
       + (neu ? 'Weiter zu ' + esc(nf.ch.titleDe.split(':')[0]) + ' ›' : 'Weiter ›') + '</button>';
  }
  h += '</div>';

  box.innerHTML = h;
  el('back').addEventListener('click', renderLearnIndex);
  box.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { renderUnit(b.dataset.go); window.scrollTo(0, 0); });
  });
  wireSpeak(box);
}

/* Auftaktseite eines Moduls. Reine Trennseite, wie im Handbuch selbst. */
function renderIntro(f, box) {
  var u = f.u, ch = f.ch;
  var parts = ch.titleDe.split(':');
  var kicker = parts.length > 1 ? parts[0] : '';
  var name = parts.length > 1 ? parts.slice(1).join(':').trim() : ch.titleDe;
  var n = (ch.units || []).filter(function (x) { return x.kind !== 'intro'; }).length;

  var h = '<button class="ghost small" id="back">‹ Übersicht</button>';
  h += unitMap(u.id);
  h += '<div class="modstart">';
  if (u.img) h += '<img src="' + esc(u.img) + '" alt="">';
  if (kicker) h += '<p class="eyebrow">' + esc(kicker) + '</p>';
  h += '<h2>' + esc(name) + '</h2>';
  if (ch.titleEn) h += '<p><span class="en-inline">' + esc(ch.titleEn) + '</span></p>';
  if (u.lead) h += '<p class="lead">' + esc(u.lead) + '</p>';
  h += '<p class="src">' + n + ' Lerneinheiten'
     + (u.source ? ' · Handbuch ' + esc(u.source) : '') + '</p>';
  h += '</div>';

  var nav = nextPrev(f);
  h += '<div class="btn-row">';
  h += nav.prev ? '<button data-go="' + esc(nav.prev) + '">‹ Zurück</button>' : '';
  h += nav.next ? '<button class="primary" data-go="' + esc(nav.next) + '">Los geht es ›</button>' : '';
  h += '</div>';

  box.innerHTML = h;
  el('back').addEventListener('click', renderLearnIndex);
  box.querySelectorAll('[data-go]').forEach(function (bt) {
    bt.addEventListener('click', function () { renderUnit(bt.dataset.go); window.scrollTo(0, 0); });
  });
}

function nextPrev(f) {
  var flat = [];
  UNITS.forEach(function (ch) { (ch.units || []).forEach(function (u) { flat.push(u.id); }); });
  var i = flat.indexOf(f.u.id);
  return { prev: i > 0 ? flat[i - 1] : null, next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null };
}

/* ---------------- Fragen ---------------- */

var ROUND = 20;
var quizScope = 'all';
var session = null;

function scopedQuestions() {
  if (quizScope === 'wrong') {
    return QUESTIONS.filter(function (q) { return state.wrong[q.id]; });
  }
  if (quizScope.indexOf('ch:') === 0) {
    var cid = quizScope.slice(3);
    var ids = {};
    UNITS.forEach(function (ch) {
      if (ch.id !== cid) return;
      (ch.units || []).forEach(function (u) { ids[u.id] = 1; });
    });
    return QUESTIONS.filter(function (q) { return ids[q.unit]; });
  }
  return QUESTIONS.slice();
}

function renderQuizStart() {
  el('quiz-run').hidden = true;
  el('quiz-done').hidden = true;
  el('quiz-start').hidden = false;

  var wrongN = QUESTIONS.filter(function (q) { return state.wrong[q.id]; }).length;
  var chips = [{ k: 'all', l: 'Alles', n: QUESTIONS.length }];
  UNITS.forEach(function (ch) {
    var ids = {}, n = 0;
    (ch.units || []).forEach(function (u) { ids[u.id] = 1; });
    QUESTIONS.forEach(function (q) { if (ids[q.unit]) n++; });
    if (n) chips.push({ k: 'ch:' + ch.id, l: ch.titleDe, n: n });
  });
  if (wrongN) chips.push({ k: 'wrong', l: 'Fehler', n: wrongN });

  el('quiz-scope').innerHTML = chips.map(function (c) {
    return '<button data-k="' + esc(c.k) + '" aria-pressed="' + (quizScope === c.k) + '">'
      + esc(c.l) + '<span class="n">' + c.n + '</span></button>';
  }).join('');
  el('quiz-scope').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { quizScope = b.dataset.k; renderQuizStart(); });
  });

  var runs = (state.quiz.runs || []).slice(-6).reverse();
  el('quiz-stats').innerHTML = runs.length
    ? '<h3>Letzte Runden</h3><div class="runs">' + runs.map(function (r) {
        var pct = Math.round(r.correct / r.total * 100);
        return '<div class="run"><span class="pct ' + (pct >= 80 ? 'pass' : 'fail') + '">'
          + pct + '%</span><span class="mono">' + r.correct + ' von ' + r.total + ' richtig</span></div>';
      }).join('') + '</div>'
    : '';

  el('quiz-go').disabled = scopedQuestions().length === 0;
}
el('quiz-go').addEventListener('click', startQuiz);

function normalize(q) {
  if (q.type === 'tf') {
    return {
      q: q,
      stemEn: q.stemEn, stemDe: q.stemDe, source: q.source,
      options: [
        { en: 'True',  de: 'Wahr',   correct: q.answer === true,  whyDe: q.whyDe },
        { en: 'False', de: 'Falsch', correct: q.answer === false, whyDe: q.whyDe }
      ]
    };
  }
  return {
    q: q, stemEn: q.stemEn, stemDe: q.stemDe, source: q.source,
    options: shuffle(q.options || [])
  };
}

function startQuiz() {
  var pool = shuffle(scopedQuestions()).slice(0, ROUND);
  if (!pool.length) return;
  session = { items: pool.map(normalize), i: 0, correct: 0, help: false };
  el('quiz-start').hidden = true;
  el('quiz-done').hidden = true;
  el('quiz-run').hidden = false;
  renderQuestion();
}

function renderQuestion() {
  var s = session, it = s.items[s.i];
  var pct = Math.round(s.i / s.items.length * 100);

  var h = '<div class="progress"><i style="width:' + pct + '%"></i></div>';
  h += '<p class="mono" style="margin:11px 0 15px">Frage ' + (s.i + 1) + ' / ' + s.items.length + '</p>';
  h += '<div class="card"><p class="en">' + esc(it.stemEn) + '</p>';
  if (s.help && it.stemDe) h += '<p class="v-de">' + esc(it.stemDe) + '</p>';
  h += '</div>';

  h += '<div id="opts">';
  it.options.forEach(function (o, i) {
    h += '<button class="opt" data-i="' + i + '">'
       + '<span class="opt-en">' + esc(o.en) + '</span>'
       + (s.help && o.de ? '<span class="opt-de">' + esc(o.de) + '</span>' : '')
       + '</button>';
  });
  h += '</div>';
  h += '<div class="btn-row"><button class="ghost small" id="help">'
     + (s.help ? 'Deutsch ausblenden' : 'Deutsch einblenden') + '</button>'
     + '<button class="ghost small" id="say" data-say="' + esc(it.stemEn) + '">' + SPK + ' Vorlesen</button></div>';
  h += '<div id="feedback"></div>';

  el('quiz-run').innerHTML = h;
  el('help').addEventListener('click', function () { s.help = !s.help; renderQuestion(); });
  wireSpeak(el('quiz-run'));
  el('quiz-run').querySelectorAll('.opt').forEach(function (b) {
    b.addEventListener('click', function () { answer(parseInt(b.dataset.i, 10)); });
  });
}

function answer(idx) {
  var s = session, it = s.items[s.i];
  var picked = it.options[idx];
  var right = !!picked.correct;
  if (right) s.correct++; 
  if (right) delete state.wrong[it.q.id]; else state.wrong[it.q.id] = Date.now();
  save();

  el('quiz-run').querySelectorAll('.opt').forEach(function (b, i) {
    b.disabled = true;
    if (it.options[i].correct) b.classList.add('correct');
    else if (i === idx) b.classList.add('wrong');
  });

  var why = picked.whyDe || (it.options.filter(function (o) { return o.correct; })[0] || {}).whyDe || '';
  var h = '<div class="why ' + (right ? 'ok' : 'no') + '">'
        + '<b>' + (right ? 'Richtig' : 'Falsch') + '.</b> ' + esc(why);
  if (it.source) h += '<div class="src">Handbuch ' + esc(it.source) + '</div>';
  h += '</div>';
  h += '<div class="btn-row"><button class="primary" id="next">'
     + (s.i + 1 < s.items.length ? 'Weiter ›' : 'Auswertung ›') + '</button></div>';
  el('feedback').innerHTML = h;
  el('next').addEventListener('click', function () {
    s.i++;
    if (s.i < s.items.length) { renderQuestion(); window.scrollTo(0, 0); }
    else finishQuiz();
  });
}

function finishQuiz() {
  var s = session;
  var pct = Math.round(s.correct / s.items.length * 100);
  var pass = pct >= 80;
  state.quiz.runs = (state.quiz.runs || []).concat([
    { t: Date.now(), correct: s.correct, total: s.items.length, scope: quizScope }
  ]).slice(-30);
  save();

  el('quiz-run').hidden = true;
  var box = el('quiz-done');
  box.hidden = false;
  box.innerHTML = '<p class="eyebrow">Ergebnis</p>'
    + '<div class="score">'
    +   '<div class="score-num ' + (pass ? 'pass' : 'fail') + '">' + pct + '<span>%</span></div>'
    +   '<div class="meter-wrap">'
    +     '<div class="meter' + (pass ? ' pass' : '') + '"><i></i></div>'
    +     '<span class="thr-label">80 % Bestehensgrenze</span>'
    +   '</div>'
    + '</div>'
    + '<p>' + s.correct + ' von ' + s.items.length + ' richtig. '
    + (pass ? 'Das reicht.' : 'Zum Bestehen fehlen dir '
        + (Math.ceil(s.items.length * 0.8) - s.correct) + '.') + '</p>'
    + '<div class="btn-row">'
    +   '<button class="primary" id="again">Neue Runde</button>'
    +   '<button class="ghost" id="back2">Übersicht</button></div>';

  var m = box.querySelector('.meter');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { m.style.setProperty('--v', pct); });
  });

  el('again').addEventListener('click', startQuiz);
  el('back2').addEventListener('click', renderQuizStart);
}

/* ---------------- Vokabeln ---------------- */

/* Leitner, auf wenige Tage getrimmt. Normale SRS-Intervalle sind hier sinnlos. */
var BOXES = [10 * 60e3, 60 * 60e3, 4 * 3600e3, 24 * 3600e3, 48 * 3600e3];
var CATS = [
  { k: 'all',      l: 'Alle' },
  { k: 'fach',     l: 'Fachbegriffe' },
  { k: 'pruefung', l: 'Prüfungssprache' },
  { k: 'praxis',   l: 'Praxiskommandos' }
];
var vocabCat = 'all';
var vocabMode = 'list';
var card = null, cardShown = false;

function scopedVocab() {
  return vocabCat === 'all' ? VOCAB.slice()
    : VOCAB.filter(function (t) { return t.cat === vocabCat; });
}

function dueCards() {
  var now = Date.now();
  var pool = scopedVocab();
  var due = pool.filter(function (t) {
    var s = state.srs[t.id];
    return s && s.due <= now;
  }).sort(function (a, b) { return state.srs[a.id].due - state.srs[b.id].due; });
  var fresh = pool.filter(function (t) { return !state.srs[t.id]; });
  return { due: due, fresh: fresh };
}

function renderVocab() {
  el('vocab-cats').innerHTML = CATS.map(function (c) {
    var n = c.k === 'all' ? VOCAB.length
      : VOCAB.filter(function (t) { return t.cat === c.k; }).length;
    return '<button data-c="' + c.k + '" aria-pressed="' + (vocabCat === c.k) + '">'
      + esc(c.l) + '<span class="n">' + n + '</span></button>';
  }).join('');
  el('vocab-cats').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { vocabCat = b.dataset.c; card = null; renderVocab(); });
  });

  el('vocab-modes').innerHTML =
      '<button data-m="list"  aria-pressed="' + (vocabMode === 'list')  + '">Liste</button>'
    + '<button data-m="cards" aria-pressed="' + (vocabMode === 'cards') + '">Karten</button>';
  el('vocab-modes').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { vocabMode = b.dataset.m; renderVocab(); });
  });

  if (vocabMode === 'list') { el('vocab-cards').hidden = true; renderVocabList(); }
  else { el('vocab-list').hidden = true; renderCard(); }
}

function renderVocabList() {
  var box = el('vocab-list');
  box.hidden = false;
  var list = scopedVocab();
  if (!list.length) { box.innerHTML = '<p class="empty">Noch keine Vokabeln.</p>'; return; }

  /* nach Untergruppe bündeln, Reihenfolge wie in der Datei */
  var order = [], groups = {};
  list.forEach(function (t) {
    var g = t.sub || '';
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(t);
  });

  box.innerHTML = order.map(function (g) {
    return (g ? '<h3>' + esc(g) + '</h3>' : '')
      + '<ul class="vlist">' + groups[g].map(function (t) {
          return '<li><button class="speak small" data-say="' + esc(t.en) + '">' + SPK + '</button>'
            + '<div><span class="v-en">' + esc(t.en) + '</span><br>'
            + '<span class="v-de">' + esc(t.de) + '</span>'
            + (t.explDe ? '<span class="v-x">' + esc(t.explDe) + '</span>' : '')
            + '</div></li>';
        }).join('') + '</ul>';
  }).join('');

  wireSpeak(box);
}

function pickCard() {
  var d = dueCards();
  if (d.due.length) return d.due[0];
  if (d.fresh.length) return d.fresh[0];
  return null;
}

function renderCard() {
  var box = el('vocab-cards');
  box.hidden = false;
  if (!card) { card = pickCard(); cardShown = false; }

  if (!card) {
    var next = Object.keys(state.srs)
      .map(function (k) { return state.srs[k].due; })
      .filter(function (d) { return d > Date.now(); })
      .sort(function (a, b) { return a - b; })[0];
    box.innerHTML = '<div class="card empty">Alles wiederholt.'
      + (next ? '<br>Nächste Karte ' + new Date(next).toLocaleString('de-DE') : '')
      + '</div>';
    return;
  }

  var d = dueCards();
  var h = '<p class="eyebrow">fällig ' + d.due.length + ' · neu ' + d.fresh.length + '</p>';
  h += '<div class="card flash">';
  h += '<div class="term">' + esc(card.en) + '</div>';
  if (cardShown) {
    h += '<div class="de">' + esc(card.de) + '</div>';
    if (card.explDe) h += '<div class="expl">' + esc(card.explDe) + '</div>';
    if (card.source) h += '<div class="src">Handbuch ' + esc(card.source) + '</div>';
  }
  h += '</div>';
  h += '<div class="btn-row"><button class="ghost small" id="c-say" data-say="' + esc(card.en) + '">' + SPK + ' Vorlesen</button></div>';

  if (!cardShown) {
    h += '<div class="btn-row"><button class="primary" id="c-show">Antwort zeigen</button></div>';
  } else {
    h += '<div class="grade">'
      + '<button data-g="0">Nochmal</button>'
      + '<button data-g="1">Gut</button>'
      + '<button data-g="2">Einfach</button></div>';
  }

  box.innerHTML = h;
  if (el('c-show')) el('c-show').addEventListener('click', function () { cardShown = true; renderCard(); });
  box.querySelectorAll('[data-g]').forEach(function (b) {
    b.addEventListener('click', function () { grade(parseInt(b.dataset.g, 10)); });
  });
}

function grade(g) {
  var s = state.srs[card.id] || { box: 0 };
  if (g === 0) s.box = 0;
  else if (g === 1) s.box = Math.min(s.box + 1, BOXES.length - 1);
  else s.box = Math.min(s.box + 2, BOXES.length - 1);
  s.due = Date.now() + BOXES[s.box];
  s.n = (s.n || 0) + 1;
  state.srs[card.id] = s;
  save();
  card = null; cardShown = false;
  renderCard();
}

/* ---------------- Start ---------------- */

el('sound-test').addEventListener('click', function () {
  var r = Speech.report(), box = el('sound-report');
  box.hidden = false;
  if (!r.ok) {
    box.innerHTML = '<p class="note">Dieser Browser unterstützt kein Vorlesen.</p>';
    return;
  }
  box.innerHTML = '<p class="note">Stimmen gefunden: <b>' + r.n + '</b><br>'
    + 'Englische Stimme: <b>' + (r.voice || 'keine') + '</b>'
    + (r.n && !r.voice ? '<br>Vorhanden sind: ' + esc(r.langs) : '')
    + '<br>Gleich sollte <b>bolt action</b> zu hören sein.</p>';
  Speech.say('bolt action',
    function () {},
    function () {},
    function (m) { toast(m); });
});

el('hdr-sub').textContent = QUESTIONS.length + ' Fragen · ' + VOCAB.length + ' Vokabeln · 80 % zum Bestehen';
showTab('learn');

})();
