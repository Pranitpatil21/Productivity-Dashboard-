// --- Utilities & data keys ---
const K_TASKS = 'pd_tasks';
const K_NOTES = 'pd_notes';
const K_REMS = 'pd_rems';
const K_THEME = 'pd_theme'; 

// --- DOM refs ---
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskCategory = document.getElementById('taskCategory');
const taskList = document.getElementById('taskList');
const filters = document.querySelectorAll('.task-filter');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const addNoteBtn = document.getElementById('addNoteBtn');
const notesArea = document.getElementById('notesArea'); 

const reminderForm = document.getElementById('reminderForm');
const remTitle = document.getElementById('remTitle');
const remDate = document.getElementById('remDate');
const remList = document.getElementById('remList');

const statsCanvas = document.getElementById('statsCanvas');
const statTotal = document.getElementById('statTotal');
const statDone = document.getElementById('statDone');

const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

const themeToggle = document.getElementById('themeToggle');
const toast = document.getElementById('toast');
const clearDemo = document.getElementById('clearDemo');

let tasks = JSON.parse(localStorage.getItem(K_TASKS) || 'null');
let notes = JSON.parse(localStorage.getItem(K_NOTES) || 'null');
let rems = JSON.parse(localStorage.getItem(K_REMS) || 'null');

if (!tasks) {
  tasks = [
    { id: genId(), title: 'Finish portfolio readme', category: 'Work', done: false, created: Date.now() },
    { id: genId(), title: 'Practice data structures (30m)', category: 'Personal', done: false, created: Date.now() }
  ];
  localStorage.setItem(K_TASKS, JSON.stringify(tasks));
}
if (!notes) { notes = []; localStorage.setItem(K_NOTES, JSON.stringify(notes)); }
if (!rems) { rems = []; localStorage.setItem(K_REMS, JSON.stringify(rems)); }

// --- helpers ---
function genId() { return 'id' + Math.floor(Math.random() * 1e9) }
function saveTasks() { localStorage.setItem(K_TASKS, JSON.stringify(tasks)); renderTasks(); renderStats(); }
function saveNotes() { localStorage.setItem(K_NOTES, JSON.stringify(notes)); renderNotes(); }
function saveRems() { localStorage.setItem(K_REMS, JSON.stringify(rems)); renderRems(); }

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// --- THEME ---
const initTheme = () => {
  const t = localStorage.getItem(K_THEME) || 'light';
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem(K_THEME, next);
});
initTheme();

// --- NAV ---
navBtns.forEach(b => b.addEventListener('click', () => {
  navBtns.forEach(x => x.classList.remove('active')); b.classList.add('active');
  const view = b.dataset.view;
  views.forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');
}));

// --- TASKS ---
function renderTasks(filter = 'all') {
  taskList.innerHTML = '';
  const list = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !t.done;
    if (filter === 'done') return t.done;
  });
  list.forEach(t => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    li.innerHTML = `
      <div>
        <input type="checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''}/>
        <strong>${escapeHtml(t.title)}</strong>
        <small style="color:var(--muted);margin-left:8px">${t.category}</small>
      </div>
      <div>
        <button data-act="del" data-id="${t.id}">Delete</button>
      </div>`;
    taskList.appendChild(li);
  });

  // events: checkbox & delete via delegation
  taskList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const item = tasks.find(x => x.id === id);
      if (item) { item.done = e.target.checked; saveTasks(); }
    });
  });
  taskList.querySelectorAll('button[data-act="del"]').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      tasks = tasks.filter(x => x.id !== id); saveTasks();
    });
  });

  // progress
  const total = tasks.length;
  const done = tasks.filter(x => x.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = pct + '%';
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const t = taskTitle.value.trim();
  if (!t) return;
  tasks.unshift({ id: genId(), title: t, category: taskCategory.value, done: false, created: Date.now() });
  taskTitle.value = '';
  saveTasks();
});

// filter buttons
filters.forEach(f => f.addEventListener('click', () => {
  filters.forEach(x => x.classList.remove('active')); f.classList.add('active');
  renderTasks(f.dataset.filter);
}));

// --- NOTES (simple draggable sticky notes) ---
function renderNotes() {
  notesArea.innerHTML = '';
  notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'note';
    el.style.left = (n.x || 20) + 'px';
    el.style.top = (n.y || 20) + 'px';
    el.dataset.id = n.id;
    el.innerHTML = `
      <div class="note-controls" style="display:flex;justify-content:space-between;margin-bottom:6px">
        <small>${new Date(n.created).toLocaleString()}</small>
        <div>
          <button class="edit" data-id="${n.id}">Edit</button>
          <button class="del" data-id="${n.id}">Del</button>
        </div>
      </div>
      <textarea>${escapeHtml(n.text)}</textarea>
    `;
    notesArea.appendChild(el);

    // drag
    makeDraggable(el);
    // edit & delete
    el.querySelector('.del').addEventListener('click', () => {
      notes = notes.filter(x => x.id !== n.id); saveNotes();
    });
    const ta = el.querySelector('textarea');
    ta.addEventListener('input', () => {
      const idx = notes.findIndex(x => x.id === n.id);
      if (idx > -1) { notes[idx].text = ta.value; saveNotes(); }
    });
  });
}

addNoteBtn.addEventListener('click', () => {
  notes.push({ id: genId(), text: 'New note', x: 20 + notes.length * 10, y: 20 + notes.length * 10, created: Date.now() });
  saveNotes();
});

function makeDraggable(el) {
  let offsetX = 0, offsetY = 0, dragging = false;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    el.style.cursor = 'grabbing';
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    el.style.left = (e.clientX - offsetX) + 'px';
    el.style.top = (e.clientY - offsetY) + 'px';
  });
  el.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    const id = el.dataset.id;
    const idx = notes.findIndex(x => x.id === id);
    if (idx > -1) {
      notes[idx].x = el.offsetLeft; notes[idx].y = el.offsetTop; saveNotes();
    }
  });
}

// --- REMINDERS ---
function renderRems() {
  remList.innerHTML = '';
  rems.sort((a, b) => a.when - b.when).forEach(r => {
    const li = document.createElement('li');
    const when = new Date(r.when).toLocaleString();
    li.innerHTML = `<div><strong>${escapeHtml(r.title)}</strong><div style="color:var(--muted)">${when}</div></div>
      <div><button data-id="${r.id}" class="delRem">Delete</button></div>`;
    remList.appendChild(li);
  });
  remList.querySelectorAll('.delRem').forEach(b => b.addEventListener('click', e => {
    rems = rems.filter(x => x.id !== e.target.dataset.id); saveRems();
  }));
}

reminderForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = remTitle.value.trim();
  const when = new Date(remDate.value).getTime();
  if (!title || !when || isNaN(when)) return;
  rems.push({ id: genId(), title, when, created: Date.now(), seen: false });
  remTitle.value = ''; remDate.value = '';
  saveRems();
});

// check reminders every 30 seconds
setInterval(() => {
  const now = Date.now();
  rems.forEach(r => {
    if (!r.seen && r.when <= now) {
      // mark seen and show toast
      r.seen = true;
      showToast('Reminder: ' + r.title);
      saveRems();
    }
  });
}, 30 * 1000);

// --- STATS (simple canvas bar) ---
function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(x => x.done).length;
  statTotal.textContent = total;
  statDone.textContent = done;

  // distribution by category
  const cats = {};
  tasks.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
  const labels = Object.keys(cats);
  const values = labels.map(l => cats[l]);

  // draw simple bar chart
  const ctx = statsCanvas.getContext('2d');
  ctx.clearRect(0, 0, statsCanvas.width, statsCanvas.height);
  const w = statsCanvas.width, h = statsCanvas.height;
  ctx.font = '13px Arial';
  const barW = Math.floor((w - 40) / Math.max(1, labels.length));
  values.forEach((v, i) => {
    const bh = (v / Math.max(1, Math.max(...values))) * 120;
    const x = 20 + i * (barW + 10), y = h - bh - 40;
    ctx.fillStyle = '#2b6ef6';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = 'var(--muted)';
    ctx.fillText(labels[i], x, h - 18);
    ctx.fillText(v, x, y - 6);
  });

  // update progress bar as well
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = pct + '%';
}

// --- misc ---
function escapeHtml(s) { return (s + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// --- init render ---
function renderAll() {
  renderTasks();
  renderNotes();
  renderRems();
  renderStats();
}
renderAll();

// quick keyboard: Enter on task input adds
taskTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter') taskForm.requestSubmit(); });

// demo reset
clearDemo.addEventListener('click', () => {
  if (!confirm('Reset all data to default demo?')) return;
  localStorage.removeItem(K_TASKS); localStorage.removeItem(K_NOTES); localStorage.removeItem(K_REMS);
  location.reload();
});

// show greeting
(function setGreeting() {
  const gEl = document.getElementById('greeting');
  const hour = new Date().getHours();
  let g = 'Good day';
  if (hour < 12) g = 'Good morning';
  else if (hour < 17) g = 'Good afternoon';
  else g = 'Good evening';
  gEl.textContent = g;
})();

// render filtered tasks by default
document.querySelectorAll('.task-filter')[0].click();
