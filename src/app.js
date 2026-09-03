/* canada-pal-learn. Alles läuft lokal, kein Netz, kein Server. */
(function () {
'use strict';

var SPK = '<svg viewBox="0 0 24 24"><use href="#i-speak"/></svg>';

var C = window.CONTENT || {};
var UNITS = (C.units && C.units.chapters) || [];
var QUESTIONS = (C.questions && C.questions.questions) || [];
var VOCAB = (C.vocab && C.vocab.terms) || [];

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
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-CA'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch (e) {}
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
  var box = el('learn-unit');
  box.hidden = false;

  var h = '<button class="ghost small" id="back">‹ Übersicht</button>';
  h += '<h2>' + esc(u.titleDe) + '</h2>';
  if (u.titleEn) h += '<p><span class="en-inline">' + esc(u.titleEn) + '</span></p>';

  (u.blocks || []).forEach(function (b) {
    if (b.type === 'de') {
      h += '<p>' + esc(b.text) + '</p>';
    } else if (b.type === 'en') {
      h += '<p class="en">' + esc(b.text) + '</p>';
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
  h += nav.next ? '<button class="primary" data-go="' + esc(nav.next) + '">Weiter ›</button>' : '';
  h += '</div>';

  box.innerHTML = h;
  el('back').addEventListener('click', renderLearnIndex);
  box.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { renderUnit(b.dataset.go); window.scrollTo(0, 0); });
  });
  box.querySelectorAll('[data-say]').forEach(function (b) {
    b.addEventListener('click', function () { speak(b.dataset.say); });
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
     + '<button class="ghost small" id="say">' + SPK + ' Vorlesen</button></div>';
  h += '<div id="feedback"></div>';

  el('quiz-run').innerHTML = h;
  el('help').addEventListener('click', function () { s.help = !s.help; renderQuestion(); });
  el('say').addEventListener('click', function () { speak(it.stemEn); });
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

  box.querySelectorAll('[data-say]').forEach(function (b) {
    b.addEventListener('click', function () { speak(b.dataset.say); });
  });
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
  h += '<div class="btn-row"><button class="ghost small" id="c-say">' + SPK + ' Vorlesen</button></div>';

  if (!cardShown) {
    h += '<div class="btn-row"><button class="primary" id="c-show">Antwort zeigen</button></div>';
  } else {
    h += '<div class="grade">'
      + '<button data-g="0">Nochmal</button>'
      + '<button data-g="1">Gut</button>'
      + '<button data-g="2">Einfach</button></div>';
  }

  box.innerHTML = h;
  el('c-say').addEventListener('click', function () { speak(card.en); });
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

el('hdr-sub').textContent = QUESTIONS.length + ' Fragen · ' + VOCAB.length + ' Vokabeln · 80 % zum Bestehen';
showTab('learn');

})();
