/* ===============================================================
   CONFIG
   =============================================================== */
const SUPABASE_URL = 'https://owqhouyafggdzgcqwlji.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QgsSE7ZoIfcaPsJLlkfS5w_tGvRz_I6';
const SUPABASE_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.6/dist/umd/supabase.min.js';
const SUPABASE_SDK_TIMEOUT_MS = 2500;
const SUPABASE_QUERY_TIMEOUT_MS = 3500;
const USER_ID = '87553652@qq.com';
const UI_STATE_KEY = 'fitness-plan-ui-state';
const MAX_TARGET_SETS = 50;
const MAX_REPS = 300;
const MAX_WEIGHT = 999;
let supabaseClient = null;
let supabaseClientPromise = null;
let realtimeChannel = null;
let realtimeBroadcastReady = false;
let localSyncChannel = null;
let isApplyingSyncedState = false;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function loadScriptOnce(src, timeoutMs) {
  const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return withTimeout(new Promise((resolve, reject) => {
    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.dynamicSrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    if (!existing) document.head.appendChild(script);
  }), timeoutMs, 'Supabase SDK load timed out');
}

async function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!navigator.onLine) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      try {
        if (!window.supabase?.createClient) {
          await loadScriptOnce(SUPABASE_SDK_URL, SUPABASE_SDK_TIMEOUT_MS);
        }
        if (!window.supabase?.createClient) throw new Error('Supabase SDK unavailable');
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          realtime: { params: { eventsPerSecond: 2 } }
        });
        return supabaseClient;
      } catch (error) {
        supabaseClientPromise = null;
        console.warn('Supabase SDK unavailable; using local mode:', error);
        return null;
      }
    })();
  }
  return supabaseClientPromise;
}

const PARTS = ['chest', 'shoulder', 'legs', 'back', 'abs'];
const ALL_TABS = ['chest', 'shoulder', 'legs', 'back', 'abs'];
const LABELS = { chest:'胸', shoulder:'肩', legs:'腿', back:'背', abs:'腹' };
const COLOR_FALLBACKS = { chest:'#16a34a', shoulder:'#65a30d', legs:'#10b981', back:'#059669', abs:'#0d9488', stats:'#22c55e' };
const COLOR_VARS = {
  chest:'--accent-chest',
  shoulder:'--accent-shoulder',
  legs:'--accent-legs',
  back:'--accent-back',
  abs:'--accent-abs',
  stats:'--accent-history'
};

function emptyWorkoutPlan() {
  return { chest:[], shoulder:[], legs:[], back:[], abs:[] };
}

const DEFAULT_TEMPLATES = {
  chest: [
    { name: '杠铃卧推', sets: 4, reps: 10, weight: 60 },
    { name: '上斜哑铃卧推', sets: 4, reps: 10, weight: 20 },
    { name: '下斜杠铃卧推', sets: 4, reps: 10, weight: 50 },
    { name: '蝴蝶机夹胸', sets: 4, reps: 12, weight: 30 },
    { name: '绳索夹胸', sets: 4, reps: 15, weight: 15 },
    { name: '哑铃飞鸟', sets: 4, reps: 12, weight: 15 },
    { name: '俯卧撑', sets: 4, reps: 15, weight: 0 },
    { name: '双杠臂屈伸', sets: 4, reps: 10, weight: 0 }
  ],
  shoulder: [
    { name: '杠铃推举', sets: 4, reps: 10, weight: 40 },
    { name: '坐姿哑铃推举', sets: 4, reps: 10, weight: 15 },
    { name: '哑铃侧平举', sets: 4, reps: 15, weight: 10 },
    { name: '单臂绳索侧平举', sets: 4, reps: 15, weight: 10 },
    { name: '哑铃前平举', sets: 4, reps: 12, weight: 10 },
    { name: '蝴蝶机反向飞鸟', sets: 4, reps: 12, weight: 20 },
    { name: '哑铃俯身飞鸟', sets: 4, reps: 12, weight: 10 },
    { name: '面拉 (Face Pull)', sets: 4, reps: 15, weight: 20 }
  ],
  legs: [
    { name: '杠铃深蹲', sets: 5, reps: 8, weight: 80 },
    { name: '倒蹬 (Leg Press)', sets: 4, reps: 10, weight: 120 },
    { name: '哑铃箭步蹲', sets: 4, reps: 12, weight: 15 },
    { name: '保加利亚分腿蹲', sets: 4, reps: 10, weight: 15 },
    { name: '罗马尼亚硬拉', sets: 4, reps: 10, weight: 60 },
    { name: '哈克深蹲', sets: 4, reps: 10, weight: 80 },
    { name: '坐姿腿屈伸', sets: 4, reps: 15, weight: 40 },
    { name: '俯卧腿弯举', sets: 4, reps: 15, weight: 35 },
    { name: '站姿提踵', sets: 4, reps: 20, weight: 40 }
  ],
  back: [
    { name: '引体向上', sets: 4, reps: 10, weight: 0 },
    { name: '高位下拉', sets: 4, reps: 12, weight: 40 },
    { name: '杠铃划船', sets: 4, reps: 10, weight: 50 },
    { name: '单臂哑铃划船', sets: 4, reps: 10, weight: 25 },
    { name: '坐姿绳索划船', sets: 4, reps: 12, weight: 45 },
    { name: '直臂下拉', sets: 4, reps: 15, weight: 20 },
    { name: 'T杠划船', sets: 4, reps: 10, weight: 40 },
    { name: '传统硬拉', sets: 5, reps: 5, weight: 100 },
    { name: '山羊挺身', sets: 4, reps: 15, weight: 10 }
  ],
  abs: [
    { name: '卷腹', sets: 4, reps: 20, weight: 0 },
    { name: '悬垂举腿', sets: 4, reps: 15, weight: 0 },
    { name: '俄罗斯转体', sets: 4, reps: 20, weight: 10 },
    { name: '平板支撑', sets: 4, reps: 60, weight: 0 },
    { name: '仰卧交替抬腿', sets: 4, reps: 20, weight: 0 },
    { name: '器械卷腹', sets: 4, reps: 15, weight: 30 },
    { name: '健腹轮', sets: 4, reps: 10, weight: 0 }
  ]
};

function normalizeTemplates(source = {}) {
  const normalized = {};
  for (const part of PARTS) {
    const templates = Array.isArray(source[part]) ? source[part] : [];
    normalized[part] = [];
    for (const item of templates) {
      const raw = typeof item === 'string' ? { name: item } : (item || {});
      const name = String(raw.name || '').trim();
      if (!name) continue;
      const template = {
        name,
        sets: clampNumber(parseInt(raw.sets), 1, MAX_TARGET_SETS, 4),
        reps: clampNumber(parseInt(raw.reps), 1, MAX_REPS, 12),
        weight: clampNumber(parseFloat(raw.weight), 0, MAX_WEIGHT, 0),
        technique: String(raw.technique || '').trim()
      };
      const existing = normalized[part].findIndex(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) normalized[part][existing] = template;
      else normalized[part].push(template);
    }
  }
  return normalized;
}

function mergeTemplates(custom = {}) {
  const merged = normalizeTemplates(DEFAULT_TEMPLATES);
  const normalizedCustom = normalizeTemplates(custom);
  for (const part of PARTS) {
    if (normalizedCustom[part]) {
      for (const item of normalizedCustom[part]) {
        const existingIdx = merged[part].findIndex(t => t.name.toLowerCase() === item.name.toLowerCase());
        if (existingIdx >= 0) merged[part][existingIdx] = item;
        else merged[part].unshift(item);
      }
    }
  }
  return merged;
}

function getSavedUIState() {
  try {
    return JSON.parse(localStorage.getItem(UI_STATE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function setSavedUIState(state) {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('UI state save error:', e);
  }
}

function normalizeTimestamp(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? new Date(ts).toISOString() : '';
}

function timestampMs(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function formatSyncTime(value) {
  const ts = timestampMs(value);
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function updateSyncIndicator(state, text) {
  const el = document.getElementById('syncStatus');
  const label = document.getElementById('syncStatusText');
  if (!el || !label) return;
  el.dataset.state = state;
  label.textContent = text;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeExercise(raw = {}) {
  const name = String(raw.name || '').trim();
  if (!name) return null;
  const sets = clampNumber(parseInt(raw.sets), 1, MAX_TARGET_SETS, 4);
  const totalSets = sets + 2;
  const oldCompleted = Array.isArray(raw.completedSets) ? raw.completedSets : [];
  const completedSets = Array(totalSets).fill(false);
  for (let i = 0; i < Math.min(totalSets, oldCompleted.length); i++) {
    completedSets[i] = Boolean(oldCompleted[i]);
  }
  return {
    name,
    sets,
    reps: clampNumber(parseInt(raw.reps), 1, MAX_REPS, 12),
    weight: clampNumber(parseFloat(raw.weight), 0, MAX_WEIGHT, 0),
    technique: String(raw.technique || '').trim(),
    completedSets
  };
}

function normalizeWorkoutPlan(source = {}) {
  const normalized = emptyWorkoutPlan();
  for (const part of PARTS) {
    const exercises = Array.isArray(source[part]) ? source[part] : [];
    normalized[part] = exercises.map(normalizeExercise).filter(Boolean);
  }
  return normalized;
}

function normalizeHistory(source = []) {
  if (!Array.isArray(source)) return [];
  return source.map(record => {
    const date = String(record?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parts = {};
    for (const part of PARTS) {
      const items = Array.isArray(record?.parts?.[part]) ? record.parts[part] : [];
      parts[part] = items.map(item => {
        const name = String(item?.name || '').trim();
        if (!name) return null;
        const sets = clampNumber(parseInt(item.sets), 1, MAX_TARGET_SETS, 1);
        return {
          name,
          sets,
          reps: clampNumber(parseInt(item.reps), 1, MAX_REPS, 1),
          weight: clampNumber(parseFloat(item.weight), 0, MAX_WEIGHT, 0),
          done: clampNumber(parseInt(item.done), 0, sets + 2, 0)
        };
      }).filter(Boolean);
    }
    return { date, parts };
  }).filter(Boolean).slice(-90);
}

function getPartColor(part) {
  const varName = COLOR_VARS[part];
  if (!varName) return COLOR_FALLBACKS[part] || COLOR_FALLBACKS.chest;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || COLOR_FALLBACKS[part] || COLOR_FALLBACKS.chest;
}

function getPartGlow(part) {
  return `color-mix(in srgb, ${getPartColor(part)} 28%, transparent)`;
}

function packCustomExercises() {
  return {
    ...Store._custom,
    __history: Store._history.slice(-90),
    ...(Store._authMeta ? { __auth: Store._authMeta } : {})
  };
}

/* ===============================================================
   IndexedDB CACHE LAYER
   =============================================================== */
const IDBCache = {
  DB_NAME: 'fitness-plan-cache',
  DB_VERSION: 2,

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv'))
          db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('workout_history'))
          db.createObjectStore('workout_history', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(key) {
    try {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly');
        const r = tx.objectStore('kv').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch { return undefined; }
  },

  async set(key, val) {
    try {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('IDB set error:', e); }
  },

  async addHistory(record) {
    try {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('workout_history', 'readwrite');
        tx.objectStore('workout_history').add(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('IDB addHistory error:', e); }
  },

  async clearAll() {
    try {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['kv', 'workout_history'], 'readwrite');
        tx.objectStore('kv').clear();
        tx.objectStore('workout_history').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('IDB clearAll error:', e); }
  },

  async getAllHistory() {
    try {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('workout_history', 'readonly');
        const r = tx.objectStore('workout_history').getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    } catch { return []; }
  }
};

/* ===============================================================
   DATA STORE (IndexedDB + Supabase hybrid)
   =============================================================== */
const Store = {
  _d: emptyWorkoutPlan(),
  _custom: mergeTemplates(),
  _lastReset: '',
  _history: [],
  _authMeta: null,
  _remoteId: null,
  _remoteTimer: null,
  _remoteRetryTimer: null,
  _remoteLoadPromise: null,
  _remoteUnavailable: false,
  _localChangedAt: 0,
  _updatedAt: '',
  _lastSyncedAt: '',
  _pendingSync: false,
  _syncError: '',

  async init() {
    // IndexedDB is the startup source of truth; Supabase is an enhancement.
    try {
      const cached = await IDBCache.get('fitness_data');
      if (cached) {
        this._d = normalizeWorkoutPlan(cached.exercises || {});

        this._authMeta = cached.auth_meta || cached.custom_exercises?.__auth || null;
        let custom = cached.custom_exercises || {};
        let count = PARTS.reduce((sum, part) => sum + (Array.isArray(custom[part]) ? custom[part].length : 0), 0);
        if (count < 15) {
          this._custom = mergeTemplates(custom);
        } else {
          this._custom = normalizeTemplates(custom);
        }

        this._lastReset = cached.last_reset || '';
        this._updatedAt = normalizeTimestamp(cached.updated_at || cached.updatedAt);
        this._lastSyncedAt = normalizeTimestamp(cached.last_synced_at || cached.lastSyncedAt);
        this._pendingSync = Boolean(cached.pending_sync || cached.pendingSync);
        this._syncError = String(cached.sync_error || cached.syncError || '');
      }
      this._history = normalizeHistory(Array.isArray(cached?.history)
        ? cached.history
        : await IDBCache.getAllHistory());
    } catch (e) {
      console.warn('IDB read error:', e);
    }

    this.updateSyncStatus();

    this._remoteLoadPromise = this._loadRemote().then(loaded => {
      if (!loaded) return;
      refreshVisibleUI();
      setupRealtimeSync();
    });
  },

  _markLocalChange() {
    this._localChangedAt = Date.now();
    this._updatedAt = nowIso();
    this._pendingSync = true;
    this._syncError = '';
    this.updateSyncStatus();
  },

  _localWins(remoteUpdatedAt) {
    if (this._pendingSync) return true;
    const localTs = timestampMs(this._updatedAt);
    const remoteTs = timestampMs(remoteUpdatedAt);
    return Boolean(localTs && (!remoteTs || localTs > remoteTs));
  },

  async _applyRemoteData(data) {
    this._remoteUnavailable = false;
    this._remoteId = data.id || this._remoteId;
    this._d = normalizeWorkoutPlan(data.exercises || {});
    this._lastReset = data.last_reset || this._lastReset;
    this._history = normalizeHistory(Array.isArray(data.history)
      ? data.history
      : (Array.isArray(data.custom_exercises?.__history) ? data.custom_exercises.__history : this._history));

    this._authMeta = data.custom_exercises?.__auth || null;
    const remoteCustom = data.custom_exercises || {};
    const count = PARTS.reduce((sum, part) => sum + (Array.isArray(remoteCustom[part]) ? remoteCustom[part].length : 0), 0);
    this._custom = count < 15 ? mergeTemplates(remoteCustom) : normalizeTemplates(remoteCustom);
    this._updatedAt = normalizeTimestamp(data.updated_at) || this._updatedAt;
    this._lastSyncedAt = nowIso();
    this._pendingSync = false;
    this._syncError = '';
    await this._saveToIDB();
    this.updateSyncStatus();
  },

  updateSyncStatus() {
    if (this._pendingSync) {
      if (!navigator.onLine) {
        updateSyncIndicator('offline', '离线，本地已保存');
      } else if (this._syncError) {
        updateSyncIndicator('error', '待同步');
      } else {
        updateSyncIndicator('pending', '待同步');
      }
      return;
    }

    if (this._lastSyncedAt) {
      updateSyncIndicator('synced', `已同步 ${formatSyncTime(this._lastSyncedAt)}`);
    } else if (!navigator.onLine || this._remoteUnavailable) {
      updateSyncIndicator('offline', '本地模式');
    } else {
      updateSyncIndicator('local', '本地已保存');
    }
  },

  async _loadRemote() {
    const startedAt = Date.now();
    try {
      if (!navigator.onLine) throw new Error('Browser offline');
      updateSyncIndicator('syncing', '同步中');
      const client = await ensureSupabaseClient();
      if (!client) throw new Error('No supabase client');
      const { data, error } = await withTimeout(client
        .from('fitness_data')
        .select('*')
        .eq('user_id', USER_ID)
        .limit(1)
        .maybeSingle(), SUPABASE_QUERY_TIMEOUT_MS, 'Supabase load timed out');

      if (error) throw error;

      if (data) {
        this._remoteUnavailable = false;
        this._remoteId = data.id || null;
        const remoteUpdatedAt = normalizeTimestamp(data.updated_at);
        if (this._localChangedAt > startedAt || this._localWins(remoteUpdatedAt)) {
          this.scheduleRemoteSync();
          this.updateSyncStatus();
          return true;
        }
        await this._applyRemoteData(data);
        return true;
      } else {
        this._remoteUnavailable = false;
        this._remoteId = null;
        if (!this._updatedAt) this._updatedAt = nowIso();
        this._pendingSync = true;
        this.scheduleRemoteSync();
        return true;
      }
    } catch (e) {
      this._remoteUnavailable = true;
      teardownRealtimeSync();
      if (e.message !== 'Browser offline') {
        console.warn('Supabase load error (offline mode):', e);
      }
      this.updateSyncStatus();
      return false;
    }
  },

  async reconnectRemote() {
    if (!navigator.onLine) return;
    this._remoteUnavailable = false;
    this.updateSyncStatus();
    await this._loadRemote();
    refreshVisibleUI();
    this.scheduleRemoteSync();
    setupRealtimeSync();
  },

  load() { return this._d; },

  async _saveToIDB() {
    await IDBCache.set('fitness_data', {
      exercises: normalizeWorkoutPlan(this._d),
      custom_exercises: this._custom,
      auth_meta: this._authMeta,
      last_reset: this._lastReset,
      history: normalizeHistory(this._history),
      updated_at: this._updatedAt,
      last_synced_at: this._lastSyncedAt,
      pending_sync: this._pendingSync,
      sync_error: this._syncError
    });
  },

  save() {
    this._markLocalChange();
    // 写入 IndexedDB（同步保障）
    this._saveToIDB();

    // 异步写入 Supabase（Optimistic UI）
    this.scheduleRemoteSync();
    broadcastState();
  },

  scheduleRemoteSync(delay = 350) {
    if (!navigator.onLine) {
      this.updateSyncStatus();
      return;
    }
    clearTimeout(this._remoteTimer);
    this._remoteTimer = setTimeout(() => this._syncRemoteNow(), delay);
  },

  async _syncRemoteNow() {
    if (!navigator.onLine) {
      this.updateSyncStatus();
      return;
    }
    const client = supabaseClient || await ensureSupabaseClient();
    if (!client) {
      this._remoteUnavailable = true;
      this._pendingSync = true;
      this._syncError = 'Supabase client unavailable';
      this._saveToIDB();
      this.updateSyncStatus();
      clearTimeout(this._remoteRetryTimer);
      this._remoteRetryTimer = setTimeout(() => {
        this._remoteUnavailable = false;
        this._syncRemoteNow();
      }, 10000);
      return;
    }
    updateSyncIndicator('syncing', '同步中');
    const payload = {
      user_id: USER_ID,
      exercises: normalizeWorkoutPlan(this._d),
      custom_exercises: packCustomExercises(),
      history: normalizeHistory(this._history),
      last_reset: this._lastReset,
      updated_at: this._updatedAt || nowIso()
    };

    try {
      const { data, error } = await withTimeout(client
        .from('fitness_data')
        .upsert(payload, { onConflict: 'user_id' })
        .select('id,updated_at')
        .maybeSingle(), SUPABASE_QUERY_TIMEOUT_MS, 'Supabase sync timed out');
      if (error) throw error;
      this._remoteUnavailable = false;
      this._remoteId = data?.id || this._remoteId;
      this._updatedAt = normalizeTimestamp(data?.updated_at) || payload.updated_at;
      this._lastSyncedAt = nowIso();
      this._pendingSync = false;
      this._syncError = '';
      await this._saveToIDB();
      this.updateSyncStatus();
      setupRealtimeSync();
    } catch (error) {
      this._remoteUnavailable = true;
      this._pendingSync = true;
      this._syncError = error?.message || 'sync failed';
      teardownRealtimeSync();
      this._saveToIDB();
      this.updateSyncStatus();
      clearTimeout(this._remoteRetryTimer);
      this._remoteRetryTimer = setTimeout(() => {
        this._remoteUnavailable = false;
        this._syncRemoteNow();
      }, 10000);
      console.warn('Supabase sync error:', error);
    }
  },

  getTemplates(part) { return this._custom[part] || []; },

  upsertTemplate(part, exercise) {
    if (!this._custom[part]) this._custom[part] = [];
    const template = {
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      technique: exercise.technique || ''
    };
    const idx = this._custom[part].findIndex(t => t.name.toLowerCase() === exercise.name.toLowerCase());
    if (idx >= 0) this._custom[part][idx] = template;
    else this._custom[part].unshift(template);
  },

  removeTemplate(part, name) {
    this._custom[part] = this.getTemplates(part).filter(t => t.name !== name);
    this.save();
  },

  getLastReset() { return this._lastReset; },

  setLastReset(v) {
    this._lastReset = v;
    this.save();
  },

  getHistory() { return this._history; },

  async addHistoryEntry(entry) {
    this._markLocalChange();
    this._history = normalizeHistory([...this._history, entry]);
    await this._saveToIDB();
    await IDBCache.addHistory(entry);
    this.scheduleRemoteSync();
    broadcastState();
  }
};

/* ===============================================================
   DAILY RESET (with history snapshot)
   =============================================================== */
function checkReset() {
  const now = new Date();
  const boundary = new Date(now);
  boundary.setHours(2, 0, 0, 0);
  if (now < boundary) boundary.setDate(boundary.getDate() - 1);

  const last = Store.getLastReset();
  const lastDate = last ? new Date(last) : new Date(0);

  if (lastDate < boundary) {
    const data = Store.load();

    // === 保存历史快照 ===
    let anyData = false;
    const snapshotDate = new Date(boundary);
    snapshotDate.setDate(snapshotDate.getDate() - 1);
    const snapshot = { date: snapshotDate.toISOString().slice(0, 10), parts: {} };
    for (const p of PARTS) {
      if (data[p] && data[p].length) {
        const completed = data[p].filter(ex =>
          ex.completedSets && ex.completedSets.some(Boolean)
        );
        if (completed.length) {
          anyData = true;
          snapshot.parts[p] = completed.map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            done: ex.completedSets ? ex.completedSets.filter(Boolean).length : 0
          }));
        }
      }
    }
    if (anyData) {
      Store.addHistoryEntry(snapshot);
    }

    // === 重置所有组 ===
    for (const p of PARTS) {
      if (data[p]) for (const ex of data[p]) {
        if (ex.completedSets) {
          ex.completedSets = ex.completedSets.map(() => false);
        }
      }
    }
    Store.setLastReset(now.toISOString());
  }
}

/* ===============================================================
   UI: MODE & NAVIGATION
   =============================================================== */
let currentMode = 'split'; // 'overview' or 'split'
let activeTab = 'chest';   // active part in split mode
let settingsPart = 'chest';
let editingTechnique = null;
let overviewSelectedParts = [];

function setAccent(part) {
  const s = document.documentElement.style;
  s.setProperty('--accent', getPartColor(part));
  s.setProperty('--accent-glow', getPartGlow(part));
}

function saveUIState() {
  const state = {
    mode: currentMode,
    activeTab: activeTab,
    overviewParts: overviewSelectedParts
  };
  setSavedUIState(state);
  if (!Store._custom) Store._custom = {};
  Store._custom.__ui_state = state;
  Store.save();
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('modeOverview').classList.toggle('active', mode === 'overview');
  document.getElementById('modeSplit').classList.toggle('active', mode === 'split');
  renderChips();
  renderPartRail();

  if (mode === 'overview') {
    setAccent('chest');
    showOverviewPanel();
  } else {
    showSplitPanel(activeTab);
  }
  saveUIState();
}

function renderChips() {
  const container = document.getElementById('chipRow');
  if (currentMode === 'split') {
    container.innerHTML = PARTS.map(part => {
      const active = part === activeTab;
      return `<button class="chip-item${active ? ' active' : ''}" data-chip-part="${part}" style="--chip-color: ${getPartColor(part)}">${LABELS[part]}</button>`;
    }).join('');
  } else {
    container.innerHTML = PARTS.map(part => {
      const active = overviewSelectedParts.includes(part);
      return `<button class="chip-item${active ? ' active' : ''}" data-chip-part="${part}" style="--chip-color: ${getPartColor(part)}">${LABELS[part]}</button>`;
    }).join('');
  }
}

function renderPartRail() {
  const rail = document.getElementById('partRail');
  rail.classList.toggle('hidden', currentMode !== 'split');
  rail.innerHTML = PARTS.map(part => `
    <button
      class="part-shortcut${part === activeTab ? ' active' : ''}"
      data-rail-part="${part}"
      style="--part-color: ${getPartColor(part)}"
      aria-label="切换到${LABELS[part]}部训练"
    >${LABELS[part]}</button>
  `).join('');
}

function onChipClick(part) {
  if (currentMode === 'split') {
    activeTab = part;
    showSplitPanel(part);
    renderChips();
    renderPartRail();
  } else {
    const idx = overviewSelectedParts.indexOf(part);
    if (idx >= 0) overviewSelectedParts.splice(idx, 1);
    else overviewSelectedParts.push(part);
    renderChips();
    renderOverviewPanel();
    updateOverviewProgress();
  }
  saveUIState();
}

function showSplitPanel(part) {
  activeTab = part;
  setAccent(part);

  document.querySelectorAll('.tab-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.part === part);
  });
  document.getElementById('panel-overview').classList.remove('active');
  document.querySelector('.tab-panels').classList.add('split-mode');

  document.getElementById('headerTitle').textContent = LABELS[part];
  document.getElementById('fabAdd').classList.remove('hidden');
  renderPartRail();
  updateProgress(part);
}

function showOverviewPanel() {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.getElementById('panel-overview').classList.add('active');
  document.querySelector('.tab-panels').classList.remove('split-mode');
  document.getElementById('headerTitle').textContent = '今日总览';
  document.getElementById('fabAdd').classList.add('hidden');
  renderPartRail();
  renderOverviewPanel();
  updateOverviewProgress();
}

function updateOverviewProgress() {
  const data = Store.load();
  let total = 0, done = 0, bonusDone = 0;
  for (const part of overviewSelectedParts) {
    const exs = data[part];
    if (!exs) continue;
    for (const ex of exs) {
      total += ex.sets;
      if (ex.completedSets) {
        const counts = getSetCounts(ex);
        done += counts.targetDone;
        bonusDone += counts.bonusDone;
      }
    }
  }
  const pct = total ? Math.round(done / total * 100) : 0;
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  fill.style.width = pct + '%';
  const newText = total ? `${done}/${total} 组${bonusDone ? ` · +${bonusDone}` : ''} · ${pct}%` : '选择部位开始训练';
  if (text.textContent !== newText) text.textContent = newText;
}

// Keep old switchTab for initialization compatibility
function switchTab(part) {
  currentMode = 'split';
  activeTab = part;
  document.getElementById('modeOverview').classList.remove('active');
  document.getElementById('modeSplit').classList.add('active');
  renderChips();
  renderPartRail();
  showSplitPanel(part);
  saveUIState();
}

/* ===============================================================
   UI: RENDER EXERCISES
   =============================================================== */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getSetCounts(ex) {
  const completed = ex.completedSets || [];
  const actualDone = completed.filter(Boolean).length;
  const targetDone = Math.min(actualDone, ex.sets || 0);
  const bonusDone = Math.max(0, actualDone - (ex.sets || 0));
  const pct = ex.sets ? Math.round(targetDone / ex.sets * 100) : 0;
  return { actualDone, targetDone, bonusDone, pct };
}

function formatSetProgress(ex) {
  const counts = getSetCounts(ex);
  return `${counts.targetDone}/${ex.sets} 目标组${counts.bonusDone ? ` · +${counts.bonusDone} 过量` : ''}`;
}

function renderExercises(part) {
  const panel = document.getElementById('panel-' + part);
  const exercises = Store.load()[part];

  if (!exercises || !exercises.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <img class="empty-illustration" src="assets/illustrations/empty-workout-calendar.png" width="560" height="560" alt="" draggable="false">
        <p>还没有训练动作<br>点击 <strong>+</strong> 添加</p>
      </div>`;
    return;
  }

  panel.innerHTML = exercises.map((ex, i) => {
    const totalSets = (ex.sets || 0) + 2;
    let completedSets = ex.completedSets;
    if (!completedSets || completedSets.length !== totalSets) {
      const old = completedSets || [];
      completedSets = Array(totalSets).fill(false);
      for(let j=0; j<Math.min(totalSets, old.length); j++) completedSets[j] = old[j];
      ex.completedSets = completedSets;
    }
    const counts = getSetCounts(ex);
    const allDone = counts.targetDone === ex.sets;
    const hasTechnique = Boolean((ex.technique || '').trim());
    return `<div class="exercise-card${allDone ? ' all-done' : ''}" data-idx="${i}" style="animation-delay:${i * 0.07}s">
      <div class="card-header">
        <span class="card-name">${esc(ex.name)}</span>
        <span class="card-weight">${ex.weight}kg</span>
        <button class="technique-btn${hasTechnique ? ' has-note' : ''}" data-action="technique" data-idx="${i}">动作要领</button>
        <button class="btn-delete" data-action="delete" data-idx="${i}" aria-label="删除">&times;</button>
      </div>
      <div class="card-info">${ex.reps} 次 × ${ex.sets} 组 (+2 过量组)</div>
      <div class="set-row">
        ${completedSets.map((s, si) => {
          const isBonus = si >= ex.sets;
          const bonusClass = isBonus ? ' bonus' : '';
          return `<div class="set-circle${s ? ' done' : ''}${bonusClass}" data-action="toggle" data-ex="${i}" data-set="${si}">${s ? '✓' : (si + 1)}</div>`;
        }).join('')}
      </div>
      <div class="card-footer">
        <span class="card-progress">${formatSetProgress(ex)}</span>
        <span class="card-pct">${counts.pct}%</span>
      </div>
    </div>`;
  }).join('');
}

/* ===============================================================
   UI: TOGGLE SET (with effects)
   =============================================================== */
function toggleSet(exIdx, setIdx) {
  const data = Store.load();
  const ex = data[activeTab][exIdx];
  const totalSets = (ex.sets || 0) + 2;
  if (!ex.completedSets || ex.completedSets.length !== totalSets) {
    const old = ex.completedSets || [];
    ex.completedSets = Array(totalSets).fill(false);
    for (let j = 0; j < Math.min(totalSets, old.length); j++) ex.completedSets[j] = old[j];
  }

  const wasComplete = ex.completedSets.filter(Boolean).length >= ex.sets;
  const isCurrentlyDone = ex.completedSets[setIdx];
  let targetIdx = setIdx;

  if (!isCurrentlyDone) {
    // 点击未点亮的组，总是点亮第一个未点亮的组
    targetIdx = ex.completedSets.indexOf(false);
  } else {
    // 点击已点亮的组，总是熄灭最后一个已点亮的组
    targetIdx = ex.completedSets.lastIndexOf(true);
  }

  if (targetIdx === -1) return;

  ex.completedSets[targetIdx] = !ex.completedSets[targetIdx];
  Store.save();

  const card = document.querySelectorAll('.tab-panel.active .exercise-card')[exIdx];
  if (!card) return;

  const circle = card.querySelectorAll('.set-circle')[targetIdx];
  const justDone = ex.completedSets[targetIdx];
  circle.classList.toggle('done', justDone);
  circle.textContent = justDone ? '✓' : (targetIdx + 1);

  // Pop animation
  circle.style.animation = 'none';
  void circle.offsetHeight;
  circle.style.animation = 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)';

  // Ripple inside circle
  if (justDone) {
    createRipple(circle);
    particleBurst(circle);
  }

  // Update footer
  const counts = getSetCounts(ex);
  card.querySelector('.card-progress').textContent = formatSetProgress(ex);
  card.querySelector('.card-pct').textContent = `${counts.pct}%`;

  const allDone = counts.targetDone === ex.sets;
  card.classList.toggle('all-done', allDone);

  // Celebrate if just completed all sets!
  if (allDone && !wasComplete) {
    card.classList.remove('celebrate');
    void card.offsetHeight;
    card.classList.add('celebrate');
    const rect = card.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    showToast('🎉 全部完成！太强了！');
  }

  updateProgress(activeTab);
}

function deleteExercise(idx) {
  const data = Store.load();
  const ex = data[activeTab][idx];
  if (!confirm(`删除「${ex.name}」？`)) return;
  data[activeTab].splice(idx, 1);
  Store.save();
  renderExercises(activeTab);
  updateProgress(activeTab);
}

function openTechniqueEditor(idx) {
  const data = Store.load();
  const ex = data[activeTab]?.[idx];
  if (!ex) return;
  editingTechnique = { part: activeTab, idx };
  document.getElementById('techniqueTitle').textContent = `${ex.name} · 动作要领`;
  document.getElementById('techniqueInput').value = ex.technique || '';
  document.getElementById('techniqueModal').classList.add('open');
  setTimeout(() => document.getElementById('techniqueInput').focus(), 360);
}

function closeTechniqueEditor() {
  document.getElementById('techniqueModal').classList.remove('open');
  editingTechnique = null;
}

function saveTechnique() {
  if (!editingTechnique) return;
  const data = Store.load();
  const ex = data[editingTechnique.part]?.[editingTechnique.idx];
  if (!ex) {
    closeTechniqueEditor();
    return;
  }
  ex.technique = document.getElementById('techniqueInput').value.trim();
  Store.upsertTemplate(editingTechnique.part, ex);
  Store.save();
  const part = editingTechnique.part;
  closeTechniqueEditor();
  renderExercises(part);
  updateProgress(part);
  // Also refresh overview if active
  if (currentMode === 'overview') renderOverviewPanel();
  showToast(ex.technique ? '已保存动作要领' : '已清空动作要领');
}

/* ===============================================================
   UI: PROGRESS
   =============================================================== */
function updateProgress(part) {
  const exercises = Store.load()[part];
  let totalSets = 0, doneForPct = 0, bonusDone = 0;
  if (exercises) {
    for (const ex of exercises) {
      totalSets += ex.sets;
      if (ex.completedSets) {
        const counts = getSetCounts(ex);
        doneForPct += counts.targetDone;
        bonusDone += counts.bonusDone;
      }
    }
  }
  const pct = totalSets ? Math.round(doneForPct / totalSets * 100) : 0;
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  fill.style.width = pct + '%';

  const newText = totalSets
    ? `${doneForPct}/${totalSets} 组${bonusDone ? ` · +${bonusDone}` : ''} · ${pct}%`
    : '暂无动作';
  if (text.textContent !== newText) {
    text.textContent = newText;
    text.classList.remove('pop');
    void text.offsetHeight;
    text.classList.add('pop');
  }
}

/* ===============================================================
   UI: STATS & CALENDAR
   =============================================================== */
let currentCalDate = new Date();
let selectedDateStr = null;

function calculateStats() {
  const history = Store.getHistory();
  const now = new Date();

  // Natural Week (Monday as start)
  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0,0,0,0);

  // Natural Month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekDays = new Set();
  let monthDays = new Set();

  history.forEach(h => {
    const hDate = new Date(h.date + 'T00:00:00');
    if (hDate >= weekStart) weekDays.add(h.date);
    if (hDate >= monthStart) monthDays.add(h.date);
  });

  document.getElementById('statWeekDays').textContent = weekDays.size;
  document.getElementById('statMonthDays').textContent = monthDays.size;
}

function renderCalendar() {
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  document.getElementById('calendarTitle').textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let firstDayOfWeek = firstDay.getDay() || 7; // Monday = 1

  const history = Store.getHistory();
  const historyDates = new Set(history.map(h => h.date));
  const historyLoad = new Map(history.map(h => {
    let total = 0;
    for (const part of PARTS) {
      for (const ex of (h.parts?.[part] || [])) total += Number(ex.done) || 0;
    }
    return [h.date, total];
  }));

  let html = '';
  // Empty cells before start of month
  for (let i = 1; i < firstDayOfWeek; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasRecord = historyDates.has(dStr);
    const isSelected = selectedDateStr === dStr;
    const classes = ['calendar-cell'];
    if (hasRecord) classes.push('has-record');
    if (isSelected) classes.push('selected');
    const load = historyLoad.get(dStr) || 0;
    const heat = hasRecord ? Math.min(72, 18 + load * 6) : 0;

    html += `<button class="${classes.join(' ')}" style="${hasRecord ? `--heat:${heat}%` : ''}" data-date="${dStr}" type="button">${d}</button>`;
  }

  document.getElementById('calendarDates').innerHTML = html;
  renderDayDetails();
}

function selectDate(dateStr) {
  selectedDateStr = dateStr;
  renderCalendar(); // re-render to update selected styling
}

function renderDayDetails() {
  const container = document.getElementById('dayDetailsContainer');
  if (!selectedDateStr) {
    container.innerHTML = '';
    return;
  }

  const history = Store.getHistory();
  const record = history.find(h => h.date === selectedDateStr);

  if (!record) {
    container.innerHTML = `<div class="day-empty">这天没有训练记录</div>`;
    return;
  }

  let html = `<div class="day-details"><div class="day-details-title">${selectedDateStr} 训练记录</div>`;

  for (const part of PARTS) {
    if (record.parts[part] && record.parts[part].length > 0) {
      html += `<div style="font-size: 12px; margin-top: 10px; color: var(--text-dim);">${LABELS[part]}</div>`;
      for (const ex of record.parts[part]) {
        html += `
          <div class="day-detail-item">
            <div class="day-detail-name">${esc(ex.name)}</div>
            <div class="day-detail-stats">${ex.weight}kg · ${ex.done}/${ex.sets} 组</div>
          </div>
        `;
      }
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}

function openStats() {
  calculateStats();
  currentCalDate = new Date();
  selectedDateStr = currentCalDate.toISOString().slice(0,10);
  renderCalendar();
  document.getElementById('statsModal').classList.add('open');
}

function closeStats() {
  document.getElementById('statsModal').classList.remove('open');
}

/* ===============================================================
   ANIMATIONS: PARTICLE BURST
   =============================================================== */
function particleBurst(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const count = 10;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle-burst';
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 25 + Math.random() * 25;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    p.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${accent};
      --tx:${tx}px; --ty:${ty}px;
      width:${3 + Math.random() * 4}px;
      height:${3 + Math.random() * 4}px;
    `;
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

/* ===============================================================
   ANIMATIONS: RIPPLE
   =============================================================== */
function createRipple(el) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(el.offsetWidth, el.offsetHeight);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = '0px';
  ripple.style.top = '0px';
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

/* ===============================================================
   ANIMATIONS: CONFETTI (Canvas)
   =============================================================== */
function launchConfetti(x, y) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const colors = ['#16a34a','#22c55e','#10b981','#86efac','#bbf7d0','#ffffff'];
  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: x || canvas.width / 2,
      y: y || canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14 - 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 3,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.18,
      opacity: 1,
      decay: 0.012 + Math.random() * 0.018
    });
  }

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.opacity -= p.decay;
      if (p.opacity <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      // Mix rectangles and circles
      if (p.size > 6) {
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive) frame = requestAnimationFrame(animate);
    else canvas.remove();
  }
  frame = requestAnimationFrame(animate);
}

/* ===============================================================
   TOAST
   =============================================================== */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function refreshVisibleUI() {
  PARTS.forEach(p => renderExercises(p));
  if (currentMode === 'overview') {
    renderOverviewPanel();
    updateOverviewProgress();
  } else {
    showSplitPanel(activeTab);
    renderChips();
  }
}

function applySyncedPayload(payload) {
  if (!payload || payload.user_id !== USER_ID) return;
  const incomingUpdatedAt = normalizeTimestamp(payload.updated_at);
  if (Store._pendingSync && timestampMs(Store._updatedAt) > timestampMs(incomingUpdatedAt)) return;
  isApplyingSyncedState = true;
  Store._d = normalizeWorkoutPlan(payload.exercises || {});
  Store._custom = mergeTemplates(payload.custom_exercises || {});
  Store._lastReset = payload.last_reset || Store._lastReset;
  Store._history = normalizeHistory(Array.isArray(payload.history)
    ? payload.history
    : (Array.isArray(payload.custom_exercises?.__history) ? payload.custom_exercises.__history : Store._history));
  Store._updatedAt = incomingUpdatedAt || Store._updatedAt;
  Store._pendingSync = Boolean(payload.pending_sync);
  Store._lastSyncedAt = Store._pendingSync ? Store._lastSyncedAt : nowIso();
  Store._syncError = '';
  Store._saveToIDB();
  Store.updateSyncStatus();
  if (Store._pendingSync) Store.scheduleRemoteSync();
  refreshVisibleUI();
  isApplyingSyncedState = false;
}

function buildSyncPayload() {
  return {
    user_id: USER_ID,
    exercises: normalizeWorkoutPlan(Store._d),
    custom_exercises: packCustomExercises(),
    last_reset: Store._lastReset,
    history: normalizeHistory(Store._history),
    updated_at: Store._updatedAt,
    pending_sync: Store._pendingSync
  };
}

function broadcastState() {
  if (isApplyingSyncedState) return;
  const payload = buildSyncPayload();
  try {
    localStorage.setItem('fitness-plan-sync-pulse', JSON.stringify({ ts: Date.now(), payload }));
  } catch {}
  try {
    localSyncChannel?.postMessage(payload);
  } catch {}
  try {
    if (realtimeBroadcastReady) {
      realtimeChannel?.send({ type: 'broadcast', event: 'state', payload });
    }
  } catch (e) {
    console.warn('Supabase broadcast sync error:', e);
  }
}

function setupLocalSync() {
  if ('BroadcastChannel' in window) {
    localSyncChannel = new BroadcastChannel('fitness-plan-sync');
    localSyncChannel.onmessage = event => applySyncedPayload(event.data);
  }
  window.addEventListener('storage', event => {
    if (event.key !== 'fitness-plan-sync-pulse' || !event.newValue) return;
    try {
      applySyncedPayload(JSON.parse(event.newValue).payload);
    } catch {}
  });
}

function teardownRealtimeSync() {
  realtimeBroadcastReady = false;
  if (!realtimeChannel) return;
  const channel = realtimeChannel;
  realtimeChannel = null;
  try {
    supabaseClient?.removeChannel?.(channel);
  } catch (error) {
    console.warn('Supabase realtime cleanup error:', error);
  }
}

async function setupRealtimeSync() {
  if (!navigator.onLine || Store._remoteUnavailable || realtimeChannel) return;
  const client = await ensureSupabaseClient();
  if (!client || Store._remoteUnavailable || realtimeChannel) return;

  realtimeChannel = client.channel('fitness-plan-sync-87553652', {
    config: { broadcast: { self: false } }
  });

  realtimeChannel.on('broadcast', { event: 'state' }, event => {
    applySyncedPayload(event.payload);
  });
  realtimeChannel.on('broadcast', { event: 'state-request' }, () => {
    if (!realtimeBroadcastReady) return;
    realtimeChannel.send({ type: 'broadcast', event: 'state', payload: buildSyncPayload() });
  });

  if (!Store._remoteUnavailable) {
    realtimeChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fitness_data',
      filter: `user_id=eq.${USER_ID}`
    }, payload => applySyncedPayload(payload.new));
  }

  realtimeChannel.subscribe(status => {
      realtimeBroadcastReady = status === 'SUBSCRIBED';
      if (realtimeBroadcastReady) {
        realtimeChannel?.send({ type: 'broadcast', event: 'state-request', payload: { user_id: USER_ID, ts: Date.now() } });
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        Store._remoteUnavailable = true;
        console.warn('Supabase realtime channel unavailable.');
        teardownRealtimeSync();
      }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* ===============================================================
   MODAL
   =============================================================== */
function populateTemplateChoices(part) {
  const templates = Store.getTemplates(part);
  const select = document.getElementById('templateSelect');
  const list = document.getElementById('exerciseList');
  select.innerHTML = `<option value="">选择已添加过的动作</option>${templates.map(t =>
    `<option value="${escAttr(t.name)}">${esc(t.name)} · ${t.reps}次 × ${t.sets}组 · ${t.weight}kg</option>`
  ).join('')}`;
  list.innerHTML = templates.map(t => `<option value="${escAttr(t.name)}">`).join('');
  select.value = '';
}

function applyTemplate(name) {
  const template = Store.getTemplates(activeTab).find(t => t.name === name);
  if (!template) return;
  document.getElementById('inputName').value = template.name;
  document.getElementById('inputSets').value = template.sets;
  document.getElementById('inputReps').value = template.reps;
  document.getElementById('inputWeight').value = template.weight;
}

function openModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  populateTemplateChoices(activeTab);
  setTimeout(() => document.getElementById('inputName').focus(), 420);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function saveExercise() {
  const name = document.getElementById('inputName').value.trim();
  const rawSets = parseInt(document.getElementById('inputSets').value);
  const rawReps = parseInt(document.getElementById('inputReps').value);
  const rawWeight = parseFloat(document.getElementById('inputWeight').value);
  const sets = clampNumber(rawSets, 1, MAX_TARGET_SETS, 4);
  const reps = clampNumber(rawReps, 1, MAX_REPS, 12);
  const weight = clampNumber(rawWeight, 0, MAX_WEIGHT, 0);
  if (!name) {
    document.getElementById('inputName').focus();
    return;
  }
  if (sets !== rawSets || reps !== rawReps || weight !== rawWeight) {
    document.getElementById('inputSets').value = sets;
    document.getElementById('inputReps').value = reps;
    document.getElementById('inputWeight').value = weight;
    showToast(`已限制为最多 ${MAX_TARGET_SETS} 组`);
  }

  const data = Store.load();
  const template = Store.getTemplates(activeTab).find(t => t.name === name);
  const exercise = {
    id: Date.now().toString(36),
    name, sets, reps, weight,
    technique: template?.technique || '',
    completedSets: Array(sets).fill(false)
  };
  data[activeTab].push(exercise);
  Store.upsertTemplate(activeTab, exercise);
  Store.save();

  document.getElementById('inputName').value = '';
  document.getElementById('templateSelect').value = '';
  closeModal();
  renderExercises(activeTab);
  updateProgress(activeTab);
  showToast('已添加动作');
}

/* ===============================================================
   SETTINGS: EXERCISE LIBRARY
   =============================================================== */
function renderSettings() {
  const parts = document.getElementById('settingsParts');
  const list = document.getElementById('libraryList');
  parts.innerHTML = PARTS.map(part =>
    `<button class="settings-part-btn${part === settingsPart ? ' active' : ''}" data-settings-part="${part}">${LABELS[part]}</button>`
  ).join('');

  const templates = Store.getTemplates(settingsPart);
  if (!templates.length) {
    list.innerHTML = `<div class="library-empty">暂无${LABELS[settingsPart]}动作记录<br>添加动作后会自动保存在这里</div>`;
    return;
  }
  list.innerHTML = templates.map(template => `
    <div class="library-item">
      <div class="library-item-main">
        <span class="library-item-name">${esc(template.name)}</span>
        <span class="library-item-detail">${template.reps} 次 × ${template.sets} 组 · ${template.weight}kg</span>
      </div>
      <div class="library-actions">
        <button class="library-use" data-template-use="${encodeURIComponent(template.name)}">套用</button>
        <button class="library-remove" data-template-remove="${encodeURIComponent(template.name)}">删除</button>
      </div>
    </div>
  `).join('');
}

function openSettings() {
  settingsPart = PARTS.includes(activeTab) ? activeTab : 'chest';
  setAccent(settingsPart);
  renderSettings();
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
  setAccent(activeTab);
}

function useTemplateFromSettings(name) {
  closeSettings();
  if (activeTab !== settingsPart) switchTab(settingsPart);
  openModal();
  document.getElementById('templateSelect').value = name;
  applyTemplate(name);
}

function addTemplateFromSettings() {
  const nameInput = document.getElementById('libraryInputName');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  const rawSets = parseInt(document.getElementById('libraryInputSets').value);
  const rawReps = parseInt(document.getElementById('libraryInputReps').value);
  const rawWeight = parseFloat(document.getElementById('libraryInputWeight').value);
  const template = {
    name,
    sets: clampNumber(rawSets, 1, MAX_TARGET_SETS, 4),
    reps: clampNumber(rawReps, 1, MAX_REPS, 12),
    weight: clampNumber(rawWeight, 0, MAX_WEIGHT, 0),
    technique: ''
  };
  Store.upsertTemplate(settingsPart, template);
  Store.save();
  renderSettings();
  if (settingsPart === activeTab) populateTemplateChoices(activeTab);
  nameInput.value = '';
  document.getElementById('libraryInputSets').value = template.sets;
  document.getElementById('libraryInputReps').value = template.reps;
  document.getElementById('libraryInputWeight').value = template.weight;
  showToast('已保存动作模板');
}

/* ===============================================================
   UI: OVERVIEW (inline panel)
   =============================================================== */
function renderOverviewPanel() {
  const container = document.getElementById('panel-overview');
  if (!overviewSelectedParts.length) {
    container.innerHTML = '<div class="overview-empty">👆 在下方选择今天要练的部位<br>训练计划会在这里显示</div>';
    return;
  }

  const data = Store.load();
  let html = '<div class="overview-content">';

  for (const part of overviewSelectedParts) {
    const exercises = data[part];
    if (!exercises || !exercises.length) {
      html += `<div class="overview-group" style="--group-color: ${getPartColor(part)}">
        <div class="overview-group-header">
          <div class="overview-group-title">${LABELS[part]}</div>
        </div>
        <div class="overview-empty" style="padding: 24px 0;">还没有训练动作，切到「分化」模式添加</div>
      </div>`;
      continue;
    }

    let groupTotal = 0, groupDone = 0, groupBonus = 0;
    for (const ex of exercises) {
      groupTotal += ex.sets;
      if (ex.completedSets) {
        const counts = getSetCounts(ex);
        groupDone += counts.targetDone;
        groupBonus += counts.bonusDone;
      }
    }
    const groupPct = groupTotal ? Math.round(groupDone / groupTotal * 100) : 0;

    html += `<div class="overview-group" style="--group-color: ${getPartColor(part)}">`;
    html += `<div class="overview-group-header">
      <div class="overview-group-title">${LABELS[part]}</div>
      <span class="overview-group-progress">${groupDone}/${groupTotal} 组${groupBonus ? ` · +${groupBonus}` : ''} · ${groupPct}%</span>
    </div>`;

    html += exercises.map((ex, i) => {
      const totalSets = (ex.sets || 0) + 2;
      let completedSets = ex.completedSets;
      if (!completedSets || completedSets.length !== totalSets) {
        const old = completedSets || [];
        completedSets = Array(totalSets).fill(false);
        for (let j = 0; j < Math.min(totalSets, old.length); j++) completedSets[j] = old[j];
        ex.completedSets = completedSets;
      }
      const counts = getSetCounts(ex);
      const allDone = counts.targetDone === ex.sets;
      const hasTechnique = Boolean((ex.technique || '').trim());
      return `<div class="exercise-card${allDone ? ' all-done' : ''}" data-ov-part="${part}" data-ov-idx="${i}" style="animation-delay:${i * 0.05}s">
        <div class="card-header">
          <span class="card-name">${esc(ex.name)}</span>
          <span class="card-weight">${ex.weight}kg</span>
          <button class="technique-btn${hasTechnique ? ' has-note' : ''}" data-action="ov-technique" data-ov-part="${part}" data-ov-idx="${i}">动作要领</button>
        </div>
        <div class="card-info">${ex.reps} 次 × ${ex.sets} 组 (+2 过量组)</div>
        <div class="set-row">
          ${completedSets.map((s, si) => {
            const isBonus = si >= ex.sets;
            const bonusClass = isBonus ? ' bonus' : '';
            return `<div class="set-circle${s ? ' done' : ''}${bonusClass}" data-action="ov-toggle" data-ov-part="${part}" data-ov-ex="${i}" data-ov-set="${si}">${s ? '✓' : (si + 1)}</div>`;
          }).join('')}
        </div>
        <div class="card-footer">
          <span class="card-progress">${formatSetProgress(ex)}</span>
          <span class="card-pct">${counts.pct}%</span>
        </div>
      </div>`;
    }).join('');

    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function overviewToggleSet(part, exIdx, setIdx) {
  const data = Store.load();
  const ex = data[part]?.[exIdx];
  if (!ex) return;
  const totalSets = (ex.sets || 0) + 2;
  if (!ex.completedSets || ex.completedSets.length !== totalSets) {
    const old = ex.completedSets || [];
    ex.completedSets = Array(totalSets).fill(false);
    for (let j = 0; j < Math.min(totalSets, old.length); j++) ex.completedSets[j] = old[j];
  }

  const wasComplete = ex.completedSets.filter(Boolean).length >= ex.sets;
  const isCurrentlyDone = ex.completedSets[setIdx];
  let targetIdx = setIdx;

  if (!isCurrentlyDone) {
    targetIdx = ex.completedSets.indexOf(false);
  } else {
    targetIdx = ex.completedSets.lastIndexOf(true);
  }
  if (targetIdx === -1) return;

  ex.completedSets[targetIdx] = !ex.completedSets[targetIdx];
  Store.save();

  const card = document.querySelector(`#panel-overview .exercise-card[data-ov-part="${part}"][data-ov-idx="${exIdx}"]`);
  if (!card) { renderOverviewPanel(); return; }

  const circle = card.querySelectorAll('.set-circle')[targetIdx];
  const justDone = ex.completedSets[targetIdx];
  circle.classList.toggle('done', justDone);
  circle.textContent = justDone ? '✓' : (targetIdx + 1);

  circle.style.animation = 'none';
  void circle.offsetHeight;
  circle.style.animation = 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)';

  if (justDone) {
    createRipple(circle);
    particleBurst(circle);
  }

  const counts = getSetCounts(ex);
  card.querySelector('.card-progress').textContent = formatSetProgress(ex);
  card.querySelector('.card-pct').textContent = `${counts.pct}%`;

  const allDone = counts.targetDone === ex.sets;
  card.classList.toggle('all-done', allDone);

  if (allDone && !wasComplete) {
    card.classList.remove('celebrate');
    void card.offsetHeight;
    card.classList.add('celebrate');
    const rect = card.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    showToast('🎉 全部完成！太强了！');
  }

  // Update group progress
  const group = card.closest('.overview-group');
  if (group) {
    const exercises = data[part];
    let gTotal = 0, gDone = 0, gBonus = 0;
    for (const e of exercises) {
      gTotal += e.sets;
      if (e.completedSets) {
        const c = getSetCounts(e);
        gDone += c.targetDone;
        gBonus += c.bonusDone;
      }
    }
    const gPct = gTotal ? Math.round(gDone / gTotal * 100) : 0;
    const progEl = group.querySelector('.overview-group-progress');
    if (progEl) progEl.textContent = `${gDone}/${gTotal} 组${gBonus ? ` · +${gBonus}` : ''} · ${gPct}%`;
  }

  renderExercises(part);
  updateOverviewProgress();
}

function overviewOpenTechnique(part, idx) {
  const data = Store.load();
  const ex = data[part]?.[idx];
  if (!ex) return;
  editingTechnique = { part, idx };
  document.getElementById('techniqueTitle').textContent = `${ex.name} · 动作要领`;
  document.getElementById('techniqueInput').value = ex.technique || '';
  document.getElementById('techniqueModal').classList.add('open');
  setTimeout(() => document.getElementById('techniqueInput').focus(), 360);
}

/* ===============================================================
   INIT
   =============================================================== */

let isAppInitialized = false;

function resetLocalState() {
  Store._d = emptyWorkoutPlan();
  Store._custom = mergeTemplates();
  Store._lastReset = '';
  Store._history = [];
  Store._authMeta = null;
  Store._updatedAt = '';
  Store._lastSyncedAt = '';
  Store._pendingSync = false;
  Store._syncError = '';
}

async function initializeApp() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  try {
    await Store.init();
  } catch (err) {
    console.error('Init error:', err);
  } finally {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 400);
    }
  }

  try { checkReset(); } catch (e) { console.error('Reset error:', e); }
  try { PARTS.forEach(p => renderExercises(p)); } catch (e) { console.error('Render error:', e); }

  // Restore UI state
  const state = { ...(Store._custom?.__ui_state || {}), ...getSavedUIState() };
  if (state.overviewParts) overviewSelectedParts = state.overviewParts;
  if (state.activeTab && PARTS.includes(state.activeTab)) activeTab = state.activeTab;

  if (state.mode === 'overview') {
    switchMode('overview');
  } else {
    switchMode('split');
    switchTab(activeTab || 'chest');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('app').style.display = 'block';
  setupLocalSync();
  registerServiceWorker();
  window.addEventListener('online', () => {
    Store.reconnectRemote();
  });
  window.addEventListener('offline', () => {
    Store.updateSyncStatus();
  });
  await initializeApp();

  // Bottom nav: mode bar events
  document.querySelector('.mode-bar').addEventListener('click', e => {
    const tab = e.target.closest('.mode-tab');
    if (tab && tab.dataset.mode) switchMode(tab.dataset.mode);
  });

  // Bottom nav: chip row events
  document.getElementById('chipRow').addEventListener('click', e => {
    const chip = e.target.closest('.chip-item');
    if (chip && chip.dataset.chipPart) onChipClick(chip.dataset.chipPart);
  });

  document.getElementById('partRail').addEventListener('click', e => {
    const shortcut = e.target.closest('.part-shortcut');
    if (shortcut && shortcut.dataset.railPart) onChipClick(shortcut.dataset.railPart);
  });

  // Exercise panel events (delegation) — handles both split and overview
  document.querySelector('.tab-panels').addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'toggle') toggleSet(+t.dataset.ex, +t.dataset.set);
    else if (t.dataset.action === 'delete') deleteExercise(+t.dataset.idx);
    else if (t.dataset.action === 'technique') openTechniqueEditor(+t.dataset.idx);
    else if (t.dataset.action === 'ov-toggle') overviewToggleSet(t.dataset.ovPart, +t.dataset.ovEx, +t.dataset.ovSet);
    else if (t.dataset.action === 'ov-technique') overviewOpenTechnique(t.dataset.ovPart, +t.dataset.ovIdx);
  });

  // FAB
  document.getElementById('fabAdd').addEventListener('click', openModal);
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnStats').addEventListener('click', openStats);

  // Stats Modal
  document.getElementById('btnCloseStats').addEventListener('click', closeStats);
  document.getElementById('statsModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeStats();
  });
  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('calendarDates').addEventListener('click', e => {
    const cell = e.target.closest('[data-date]');
    if (cell) selectDate(cell.dataset.date);
  });

  // Modal
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('btnSave').addEventListener('click', saveExercise);
  document.getElementById('templateSelect').addEventListener('change', e => {
    if (e.target.value) applyTemplate(e.target.value);
  });

  // Technique modal
  document.getElementById('btnCloseTechnique').addEventListener('click', closeTechniqueEditor);
  document.getElementById('btnSaveTechnique').addEventListener('click', saveTechnique);
  document.getElementById('techniqueModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTechniqueEditor();
  });

  // Settings / remembered exercise templates
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSettings();
  });
  document.getElementById('settingsParts').addEventListener('click', e => {
    const btn = e.target.closest('[data-settings-part]');
    if (!btn) return;
    settingsPart = btn.dataset.settingsPart;
    setAccent(settingsPart);
    renderSettings();
  });
  document.getElementById('libraryList').addEventListener('click', e => {
    const use = e.target.closest('[data-template-use]');
    if (use) {
      useTemplateFromSettings(decodeURIComponent(use.dataset.templateUse));
      return;
    }
    const remove = e.target.closest('[data-template-remove]');
    if (!remove) return;
    const name = decodeURIComponent(remove.dataset.templateRemove);
    if (!confirm(`删除动作记录「${name}」？`)) return;
    Store.removeTemplate(settingsPart, name);
    renderSettings();
    if (settingsPart === activeTab) populateTemplateChoices(activeTab);
    showToast('已删除动作记录');
  });
  document.getElementById('btnAddTemplate').addEventListener('click', addTemplateFromSettings);

  // Keyboard nav in form
  document.getElementById('inputName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('inputSets').focus();
  });
  document.getElementById('inputWeight').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveExercise();
  });
});
