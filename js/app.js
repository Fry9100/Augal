(() => {
  'use strict';

  const STORAGE_KEY = 'augentropfen-log-v1';
  const TARGETS = {
    left: { Dex: 4 },
    right: { Dex: 4 },
  };

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
    addManual: document.getElementById('addManual'),
    manualDialog: document.getElementById('manualDialog'),
    manualForm: document.getElementById('manualForm'),
    manualEye: document.getElementById('manualEye'),
    manualDrug: document.getElementById('manualDrug'),
    manualTime: document.getElementById('manualTime'),
    manualCancel: document.getElementById('manualCancel'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    exportDialog: document.getElementById('exportDialog'),
    exportText: document.getElementById('exportText'),
    exportClose: document.getElementById('exportClose'),
    exportDownload: document.getElementById('exportDownload'),
    exportCopy: document.getElementById('exportCopy'),
    importDialog: document.getElementById('importDialog'),
    importText: document.getElementById('importText'),
    importCancel: document.getElementById('importCancel'),
    importConfirm: document.getElementById('importConfirm'),
  };

  const counts = {
    'left-Dex': document.getElementById('count-left-dex'),
    'right-Dex': document.getElementById('count-right-dex'),
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

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  function triggerDownload(filename, text) {
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isValidEntry(e) {
    return e && typeof e.id === 'string' && (e.eye === 'left' || e.eye === 'right')
      && (e.drug === 'Dex' || e.drug === 'Flox') && typeof e.ts === 'string' && !isNaN(Date.parse(e.ts));
  }

  function importData(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Unerwartetes Format');
    }
    let added = 0;
    for (const [dateKey, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      if (!store[dateKey]) store[dateKey] = [];
      const existingIds = new Set(store[dateKey].map(e => e.id));
      for (const entry of entries) {
        if (!isValidEntry(entry) || existingIds.has(entry.id)) continue;
        store[dateKey].push(entry);
        existingIds.add(entry.id);
        added++;
      }
    }
    saveStore();
    return added;
  }

  function render() {
    el.dateLabel.textContent = formatDateLabel(viewDate);
    el.nextDay.disabled = viewDate >= todayKey();

    const list = entriesFor(viewDate);

    // counts
    const leftDex = list.filter(e => e.eye === 'left' && e.drug === 'Dex').length;
    const rightDex = list.filter(e => e.eye === 'right' && e.drug === 'Dex').length;

    counts['left-Dex'].textContent = `${leftDex} / ${TARGETS.left.Dex}`;
    counts['right-Dex'].textContent = `${rightDex} / ${TARGETS.right.Dex}`;

    document.querySelector('.dose-btn[data-eye="left"][data-drug="Dex"]')
      .classList.toggle('complete', leftDex >= TARGETS.left.Dex);
    document.querySelector('.dose-btn[data-eye="right"][data-drug="Dex"]')
      .classList.toggle('complete', rightDex >= TARGETS.right.Dex);

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

  el.exportBtn.addEventListener('click', () => {
    el.exportText.value = JSON.stringify(store, null, 2);
    el.exportDialog.showModal();
    el.exportText.focus();
    el.exportText.select();
  });

  el.exportClose.addEventListener('click', () => el.exportDialog.close());

  el.exportCopy.addEventListener('click', async () => {
    el.exportText.select();
    const ok = await copyText(el.exportText.value);
    showToast(ok ? 'In Zwischenablage kopiert' : 'Kopieren nicht möglich – Text ist markiert, bitte manuell kopieren');
  });

  el.exportDownload.addEventListener('click', () => {
    const ok = triggerDownload(`augentropfen-backup-${todayKey()}.json`, el.exportText.value);
    if (!ok) showToast('Download nicht möglich – bitte Text manuell kopieren');
  });

  el.importBtn.addEventListener('click', () => {
    el.importText.value = '';
    el.importDialog.showModal();
  });

  el.importCancel.addEventListener('click', () => el.importDialog.close());

  el.importConfirm.addEventListener('click', () => {
    try {
      const added = importData(el.importText.value);
      render();
      el.importDialog.close();
      showToast(added > 0 ? `${added} Einträge importiert` : 'Keine neuen Einträge gefunden');
    } catch (e) {
      showToast('Ungültiges JSON – Import fehlgeschlagen');
    }
  });

  render();

  // register service worker for offline use (best effort)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
