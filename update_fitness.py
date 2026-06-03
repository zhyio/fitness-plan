import re

with open('/Users/papillon/Code/fitness-plan/index.html', 'r') as f:
    content = f.read()

# 1. Replace CSS
css_old = r"/\* ========== HISTORY PANEL ==========\*/[\s\S]*?\.history-empty {[\s\S]*?}"
css_new = """/* ========== STATS & CALENDAR PANEL ========== */
.stats-overview {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 16px 12px;
  text-align: center;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.calendar-title {
  font-size: 16px;
  font-weight: 600;
}
.calendar-nav {
  display: flex;
  gap: 8px;
}
.calendar-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  text-align: center;
  margin-bottom: 20px;
}
.calendar-day-header {
  font-size: 11px;
  color: var(--text-dim);
  padding-bottom: 8px;
}
.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.calendar-cell.has-record {
  color: var(--text-primary);
  font-weight: 600;
}
.calendar-cell.has-record::after {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow);
}
.calendar-cell.selected {
  border-color: var(--accent);
  background: rgba(255,255,255,0.04);
}
.calendar-cell.empty {
  cursor: default;
}
.day-details {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 16px;
}
.day-details-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--accent);
}
.day-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}
.day-detail-name { font-weight: 500; }
.day-detail-stats { color: var(--text-secondary); }
.day-empty {
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
  padding: 20px 0;
}"""
content = re.sub(r'/\* ========== HISTORY PANEL ==========\*/[\s\S]*?\.history-empty \{\s*text-align: center;\s*padding: 50px 20px;\s*color: var\(--text-dim\);\s*font-size: 14px;\s*\}', css_new, content)

# 2. Header
header_old = """    <div class="header-actions">
      <span class="progress-text" id="progressText">0/0</span>
      <button class="settings-trigger" id="btnSettings" aria-label="动作设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z"/>
          <path d="M19 12a7.1 7.1 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.2 3h-4.1l-.4 2.7a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7.1 7.1 0 0 0 5.2 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.7h4.1l.4-2.7a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>
        </svg>
      </button>
    </div>"""
header_new = """    <div class="header-actions">
      <span class="progress-text" id="progressText">0/0</span>
      <button class="settings-trigger" id="btnStats" aria-label="统计数据">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      </button>
      <button class="settings-trigger" id="btnSettings" aria-label="动作设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z"/>
          <path d="M19 12a7.1 7.1 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.2 3h-4.1l-.4 2.7a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7.1 7.1 0 0 0 5.2 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.7h4.1l.4-2.7a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>
        </svg>
      </button>
    </div>"""
content = content.replace(header_old, header_new)

# 3. panel-history
content = content.replace('  <section class="tab-panel" data-part="history" id="panel-history"></section>\n', '')

# 4. tab-history
tab_history = """  <button class="tab-item" data-tab="history" id="tab-history">
    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <rect class="icon-accent" fill="currentColor" stroke="none" x="4.7" y="5.5" width="14.6" height="14" rx="3"/>
      <rect x="4.7" y="5.5" width="14.6" height="14" rx="3"/>
      <path d="M8.5 4v3M15.5 4v3M4.7 9.5h14.6"/>
      <path d="m9 14.1 2 2 4.2-4.1"/>
      <circle class="icon-cheek" stroke="none" cx="16.5" cy="17" r=".48"/>
    </svg>
    <span class="tab-label">历史</span>
  </button>\n"""
content = content.replace(tab_history, '')

# 5. Stats modal HTML
modal_html = """<!-- Stats Modal -->
<div class="modal-overlay" id="statsModal">
  <div class="modal-sheet settings-sheet">
    <div class="modal-handle"></div>
    <div class="settings-top">
      <h2 class="modal-title">数据统计</h2>
      <button class="sheet-close" id="btnCloseStats" aria-label="关闭统计">&times;</button>
    </div>
    
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value" id="statWeekDays">0</div>
        <div class="stat-label">本周训练天数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statMonthDays">0</div>
        <div class="stat-label">本月训练天数</div>
      </div>
    </div>
    
    <div class="calendar-header">
      <div class="calendar-title" id="calendarTitle">2026年5月</div>
      <div class="calendar-nav">
        <button class="calendar-btn" id="btnPrevMonth">&lt;</button>
        <button class="calendar-btn" id="btnNextMonth">&gt;</button>
      </div>
    </div>
    
    <div class="calendar-grid">
      <div class="calendar-day-header">一</div>
      <div class="calendar-day-header">二</div>
      <div class="calendar-day-header">三</div>
      <div class="calendar-day-header">四</div>
      <div class="calendar-day-header">五</div>
      <div class="calendar-day-header">六</div>
      <div class="calendar-day-header">日</div>
      <!-- dates will be injected here -->
    </div>
    <div id="calendarDates" class="calendar-grid" style="margin-top: -20px;"></div>
    
    <div id="dayDetailsContainer"></div>
  </div>
</div>

<!-- Toast -->"""
content = content.replace('<!-- Toast -->', modal_html)

# 6. JS Constants
content = re.sub(r"const ALL_TABS = \[.*?\];", "const ALL_TABS = ['chest', 'shoulder', 'legs', 'back', 'abs'];", content)
content = re.sub(r"const LABELS = \{.*?\};", "const LABELS = { chest:'胸部', shoulder:'肩部', legs:'腿部', back:'背部', abs:'腹部' };", content)
content = re.sub(r"const COLORS = \{.*?\};", "const COLORS = { chest:'#ff3366', shoulder:'#ff9933', legs:'#00e676', back:'#6366f1', abs:'#00d7c7', stats:'#e040fb' };", content)

glows_old = """const GLOWS  = {
  chest:'rgba(255,51,102,0.2)', shoulder:'rgba(255,153,51,0.2)',
  legs:'rgba(0,230,118,0.2)', back:'rgba(99,102,241,0.2)',
  abs:'rgba(0,215,199,0.2)', history:'rgba(224,64,251,0.2)'
};"""
glows_new = """const GLOWS  = {
  chest:'rgba(255,51,102,0.2)', shoulder:'rgba(255,153,51,0.2)',
  legs:'rgba(0,230,118,0.2)', back:'rgba(99,102,241,0.2)',
  abs:'rgba(0,215,199,0.2)', stats:'rgba(224,64,251,0.2)'
};"""
content = content.replace(glows_old, glows_new)

# 7. switchTab
switchTab_old = """function switchTab(part) {
  activeTab = part;
  setAccent(part);

  document.querySelectorAll('.tab-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === part)
  );
  document.querySelectorAll('.tab-panel').forEach(el =>
    el.classList.toggle('active', el.dataset.part === part)
  );

  document.getElementById('headerTitle').textContent = LABELS[part];
  moveTabIndicator(part);

  // FAB visibility
  const fab = document.getElementById('fabAdd');
  fab.classList.toggle('hidden', part === 'history');

  if (part === 'history') {
    renderHistory();
    // Hide progress for history
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '训练记录';
  } else {
    updateProgress(part);
  }
}"""
switchTab_new = """function switchTab(part) {
  activeTab = part;
  setAccent(part);

  document.querySelectorAll('.tab-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === part)
  );
  document.querySelectorAll('.tab-panel').forEach(el =>
    el.classList.toggle('active', el.dataset.part === part)
  );

  document.getElementById('headerTitle').textContent = LABELS[part];
  moveTabIndicator(part);

  // FAB visibility
  const fab = document.getElementById('fabAdd');
  fab.classList.remove('hidden');

  updateProgress(part);
}"""
content = content.replace(switchTab_old, switchTab_new)

# 8. renderHistory -> UI: STATS & CALENDAR
renderHistory_re = r"function renderHistory.*?function formatDate\(dateStr\) \{.*?return `${month}月${day}日`;\n\}"
stats_js = """let currentCalDate = new Date();
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
    
    html += `<div class="${classes.join(' ')}" onclick="selectDate('${dStr}')">${d}</div>`;
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
}"""
content = re.sub(renderHistory_re, stats_js, content, flags=re.DOTALL)

# 9. Add event listeners
listeners_old = """  document.getElementById('btnSettings').addEventListener('click', openSettings);"""
listeners_new = """  document.getElementById('btnSettings').addEventListener('click', openSettings);
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
  });"""
content = content.replace(listeners_old, listeners_new)

with open('/Users/papillon/Code/fitness-plan/index.html', 'w') as f:
    f.write(content)

print("Done")
