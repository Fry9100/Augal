(() => {
  'use strict';

  const STORAGE_KEY = 'augentropfen-log-v1';
  const TARGETS = {
    left: { Dex: 5 },
    right: { Dex: 5, Flox: 5 },
  };
  const RIGHT_INTERVAL_MIN = 60;

  const EYE_LABEL = { left: 'Links', right: 'Rechts' };

  /** @type {Record<string, {id:string, eye:'left'|'right', drug:'Dex'|'Flox', ts:string}[]>} */
  let store = loadStore();
  let viewDate = todayKey();

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Konnte Speicher nicht laden', e);
      return {};
    }
  }

  function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftDate(key, deltaDays) {
    const d = keyToDate(key);
    d.setDate(d.getDate() + deltaDays);
    return todayKey(d);
  }

  function entriesFor(dateKey) {
    return store[dateKey] || [];
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateLabel(dateKey) {
    if (dateKey === todayKey()) return 'Heute';
    if (dateKey === shiftDate(todayKey(), -1)) return 'Gestern';
    const d = keyToDate(dateKey);
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // --- DOM refs ---
  const el = {
    dateLabel: document.getElementById('currentDateLabel'),
    prevDay: document.getElementById('prevDay'),
    nextDay: document.getElementById('nextDay'),
    logList: document.getElementById('logList'),
    emptyState: document.getElementById('emptyState'),
    toast: document.getElementById('toast'),
    rightSuggestion: document.getElementById('rightSuggestion'),
    rightSuggestionText: document.getElementById('rightSuggestionText'),
    addManual: document.getElementById('addManual'),
    manualDialog: document.getElementById('manualDialog'),
    manualForm: document.getElementById('manualForm'),
    manualEye: document.getElementById('manualEye'),
    manualDrug: document.getElementById('manualDrug'),
    manualTime: document.getElementById('manualTime'),
    manualCancel: document.getElementById('manualCancel'),
  };

  const counts = {
    'left-Dex': document.getElementById('count-left-dex'),
    'right-Dex': document.getElementById('count-right-dex'),
    'right-Flox': document.getElementById('count-right-flox'),
  };

  let toastTimer = null;

  function showToast(message, undoFn) {
    clearTimeout(toastTimer);
    el.toast.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = message;
    el.toast.appendChild(span);
    if (undoFn) {
      const btn = document.createElement('button');
      btn.textContent = 'Rückgängig';
      btn.addEventListener('click', () => {
        undoFn();
        el.toast.classList.remove('show');
      });
      el.toast.appendChild(btn);
    }
    el.toast.classList.add('show');
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 4000);
  }

  function addEntry(eye, drug, isoTs) {
    const entry = { id: uid(), eye, drug, ts: isoTs };
    const dateKey = todayKey(new Date(isoTs));
    if (!store[dateKey]) store[dateKey] = [];
    store[dateKey].push(entry);
    saveStore();
    if (dateKey === viewDate) render();
    return { entry, dateKey };
  }

  function removeEntry(dateKey, id) {
    if (!store[dateKey]) return;
    store[dateKey] = store[dateKey].filter(e => e.id !== id);
    saveStore();
    if (dateKey === viewDate) render();
  }

  function logDose(eye, drug) {
    const now = new Date();
    const { entry, dateKey } = addEntry(eye, drug, now.toISOString());
    showToast(`${EYE_LABEL[eye]} · ${drug} um ${formatTime(entry.ts)} protokolliert`, () => removeEntry(dateKey, entry.id));
  }

  function computeRightSuggestion(list) {
    const rightEntries = list
      .filter(e => e.eye === 'right')
      .slice()
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));

    const dexCount = rightEntries.filter(e => e.drug === 'Dex').length;
    const floxCount = rightEntries.filter(e => e.drug === 'Flox').length;

    if (dexCount >= TARGETS.right.Dex && floxCount >= TARGETS.right.Flox) {
      return { cls: 'done', text: 'Tagesdosis rechts erreicht (5/5 Dex, 5/5 Flox) ✓' };
    }

    if (rightEntries.length === 0) {
      return { cls: 'ready', text: 'Bereit für die erste Dosis (Dex oder Flox)' };
    }

    const last = rightEntries[rightEntries.length - 1];
    let nextDrug = last.drug === 'Dex' ? 'Flox' : 'Dex';
    // If the alternating drug already reached its target, stay on the other one
    if (nextDrug === 'Dex' && dexCount >= TARGETS.right.Dex) nextDrug = 'Flox';
    if (nextDrug === 'Flox' && floxCount >= TARGETS.right.Flox) nextDrug = 'Dex';

    const elapsedMin = (Date.now() - new Date(last.ts).getTime()) / 60000;
    const remaining = Math.max(0, Math.ceil(RIGHT_INTERVAL_MIN - elapsedMin));

    if (elapsedMin >= RIGHT_INTERVAL_MIN) {
      return { cls: 'ready', text: `Jetzt empfohlen: ${nextDrug} (letzte Dosis vor ${Math.floor(elapsedMin)} Min.)` };
    }
    return { cls: 'wait', text: `Nächste Dosis: ${nextDrug} in ca. ${remaining} Min.` };
  }

  function render() {
    el.dateLabel.textContent = formatDateLabel(viewDate);
    el.nextDay.disabled = viewDate >= todayKey();

    const list = entriesFor(viewDate);

    // counts
    const leftDex = list.filter(e => e.eye === 'left' && e.drug === 'Dex').length;
    const rightDex = list.filter(e => e.eye === 'right' && e.drug === 'Dex').length;
    const rightFlox = list.filter(e => e.eye === 'right' && e.drug === 'Flox').length;

    counts['left-Dex'].textContent = `${leftDex} / ${TARGETS.left.Dex}`;
    counts['right-Dex'].textContent = `${rightDex} / ${TARGETS.right.Dex}`;
    counts['right-Flox'].textContent = `${rightFlox} / ${TARGETS.right.Flox}`;

    document.querySelector('.dose-btn[data-eye="left"][data-drug="Dex"]')
      .classList.toggle('complete', leftDex >= TARGETS.left.Dex);
    document.querySelector('.dose-btn[data-eye="right"][data-drug="Dex"]')
      .classList.toggle('complete', rightDex >= TARGETS.right.Dex);
    document.querySelector('.dose-btn[data-eye="right"][data-drug="Flox"]')
      .classList.toggle('complete', rightFlox >= TARGETS.right.Flox);

    // suggestion (only meaningful for today/current data, but shown for any viewed day)
    const suggestion = computeRightSuggestion(list);
    el.rightSuggestion.classList.remove('ready', 'wait', 'done');
    el.rightSuggestion.classList.add(suggestion.cls);
    el.rightSuggestionText.textContent = suggestion.text;

    // log list
    el.logList.innerHTML = '';
    const sorted = list.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    el.emptyState.style.display = sorted.length ? 'none' : 'block';

    for (const entry of sorted) {
      const li = document.createElement('li');
      li.className = 'log-item';

      const badge = document.createElement('div');
      badge.className = `log-badge ${entry.drug.toLowerCase()}`;
      badge.textContent = entry.drug;

      const info = document.createElement('div');
      info.className = 'log-info';
      const eyeLabel = document.createElement('span');
      eyeLabel.className = 'eye-label';
      eyeLabel.textContent = `${EYE_LABEL[entry.eye]} Auge`;
      const timeLabel = document.createElement('span');
      timeLabel.className = 'time-label';
      timeLabel.textContent = formatTime(entry.ts);
      info.append(eyeLabel, timeLabel);

      const del = document.createElement('button');
      del.className = 'log-delete';
      del.setAttribute('aria-label', 'Eintrag löschen');
      del.textContent = '✕';
      del.addEventListener('click', () => removeEntry(viewDate, entry.id));

      li.append(badge, info, del);
      el.logList.appendChild(li);
    }
  }

  // --- events ---
  document.querySelectorAll('.dose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (viewDate !== todayKey()) {
        // logging only makes sense for "now"; jump back to today first
        viewDate = todayKey();
      }
      logDose(btn.dataset.eye, btn.dataset.drug);
    });
  });

  el.prevDay.addEventListener('click', () => {
    viewDate = shiftDate(viewDate, -1);
    render();
  });

  el.nextDay.addEventListener('click', () => {
    if (viewDate >= todayKey()) return;
    viewDate = shiftDate(viewDate, 1);
    render();
  });

  el.addManual.addEventListener('click', () => {
    const now = new Date();
    el.manualTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    el.manualDialog.showModal();
  });

  el.manualCancel.addEventListener('click', () => el.manualDialog.close());

  el.manualForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const [h, m] = el.manualTime.value.split(':').map(Number);
    const d = keyToDate(viewDate);
    d.setHours(h, m, 0, 0);
    addEntry(el.manualEye.value, el.manualDrug.value, d.toISOString());
    el.manualDialog.close();
  });

  // periodic refresh so the "next dose in X min" countdown stays live
  setInterval(() => { if (viewDate === todayKey()) render(); }, 30000);

  render();

  // register service worker for offline use (best effort)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
