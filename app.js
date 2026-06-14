// ── State ──────────────────────────────────────────────────────────────────
const state = {
  tasks: JSON.parse(localStorage.getItem('sb_tasks') || '[]'),
  projects: JSON.parse(localStorage.getItem('sb_projects') || '[]'),
  editingTaskId: null,
  editingProjectId: null,
};

// Seed demo data on first visit
if (!state.tasks.length && !state.projects.length) {
  state.projects = [
    { id: uid(), name: 'Refonte Site Web', desc: 'Nouveau design et stack technique', color: '#4f46e5', due: '2026-07-01' },
    { id: uid(), name: 'App Mobile', desc: 'Développement iOS & Android', color: '#10b981', due: '2026-08-15' },
    { id: uid(), name: 'API Backend', desc: 'RESTful API avec Node.js', color: '#f59e0b', due: '2026-09-30' },
  ];
  state.tasks = [
    { id: uid(), title: 'Définir les maquettes UI', desc: '', priority: 'high', status: 'done', project: state.projects[0].id, due: '2026-06-10' },
    { id: uid(), title: 'Configurer le serveur', desc: '', priority: 'high', status: 'inprogress', project: state.projects[2].id, due: '2026-06-20' },
    { id: uid(), title: 'Écrire les tests unitaires', desc: '', priority: 'medium', status: 'todo', project: state.projects[2].id, due: '2026-07-05' },
    { id: uid(), title: 'Intégration API', desc: '', priority: 'medium', status: 'inprogress', project: state.projects[0].id, due: '2026-06-25' },
    { id: uid(), title: 'Design onboarding mobile', desc: '', priority: 'low', status: 'todo', project: state.projects[1].id, due: '2026-07-15' },
    { id: uid(), title: 'Review des pull requests', desc: '', priority: 'low', status: 'done', project: state.projects[2].id, due: '2026-06-12' },
  ];
  save();
}

// ── Utils ───────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function save() {
  localStorage.setItem('sb_tasks', JSON.stringify(state.tasks));
  localStorage.setItem('sb_projects', JSON.stringify(state.projects));
}
function getProject(id) { return state.projects.find(p => p.id === id); }

const priorityLabel = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
const statusLabel   = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' };

// ── Navigation ──────────────────────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Tableau de bord',
  tasks: 'Tâches',
  projects: 'Projets',
  analytics: 'Analytiques',
  monitoring: 'Monitoring',
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${id}`).classList.add('active');
  document.querySelector(`[data-page="${id}"]`).classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[id];

  if (id === 'dashboard') renderDashboard();
  if (id === 'tasks')     renderTasks();
  if (id === 'projects')  renderProjects();
  if (id === 'analytics') renderAnalytics();
  if (id === 'monitoring') initMonitoring();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── Dashboard ───────────────────────────────────────────────────────────────
let taskProgressChart;

function renderDashboard() {
  const total   = state.tasks.length;
  const done    = state.tasks.filter(t => t.status === 'done').length;
  const pending = total - done;
  const projs   = state.projects.length;

  document.getElementById('stat-total-tasks').textContent = total;
  document.getElementById('stat-done-tasks').textContent  = done;
  document.getElementById('stat-pending-tasks').textContent = pending;
  document.getElementById('stat-projects').textContent    = projs;

  // Recent tasks
  const recent = [...state.tasks].slice(-5).reverse();
  const ul = document.getElementById('recent-tasks-list');
  if (!recent.length) {
    ul.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:8px">Aucune tâche</p>';
  } else {
    ul.innerHTML = recent.map(t => {
      const dotColor = t.status === 'done' ? '#10b981' : t.priority === 'high' ? '#ef4444' : '#4f46e5';
      return `<li>
        <span class="task-dot" style="background:${dotColor}"></span>
        <span style="flex:1">${t.title}</span>
        <span class="badge badge-${t.status}">${statusLabel[t.status]}</span>
      </li>`;
    }).join('');
  }

  // Progress donut
  const ctx = document.getElementById('taskProgressChart').getContext('2d');
  if (taskProgressChart) taskProgressChart.destroy();
  taskProgressChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Terminées', 'En cours', 'À faire'],
      datasets: [{
        data: [
          done,
          state.tasks.filter(t => t.status === 'inprogress').length,
          state.tasks.filter(t => t.status === 'todo').length,
        ],
        backgroundColor: ['#10b981', '#4f46e5', '#8892b0'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { labels: { color: '#e2e8f0', font: { size: 12 } } } },
    },
  });
}

// ── Tasks ───────────────────────────────────────────────────────────────────
function renderTasks() {
  const statusF   = document.getElementById('filter-status').value;
  const priorityF = document.getElementById('filter-priority').value;

  let list = state.tasks.filter(t => {
    if (statusF   !== 'all' && t.status   !== statusF)   return false;
    if (priorityF !== 'all' && t.priority !== priorityF) return false;
    return true;
  });

  const el = document.getElementById('task-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Aucune tâche trouvée.</p></div>`;
    return;
  }

  el.innerHTML = list.map(t => {
    const proj = getProject(t.project);
    return `<div class="task-item">
      <div class="task-check ${t.status === 'done' ? 'done' : ''}" onclick="toggleTask('${t.id}')"></div>
      <div class="task-info">
        <div class="task-name ${t.status === 'done' ? 'done' : ''}">${t.title}</div>
        <div class="task-meta">
          ${proj ? `<span style="color:${proj.color}">${proj.name}</span> · ` : ''}
          ${t.due ? `Échéance : ${t.due} · ` : ''}
          <span class="badge badge-${t.status}">${statusLabel[t.status]}</span>
        </div>
      </div>
      <span class="badge badge-${t.priority}">${priorityLabel[t.priority]}</span>
      <div class="task-actions">
        <button class="btn btn-sm btn-secondary" onclick="editTask('${t.id}')">✏️</button>
        <button class="btn btn-sm btn-danger"    onclick="deleteTask('${t.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function toggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'todo' : 'done';
  save(); renderTasks();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  save(); renderTasks();
}

function editTask(id) {
  state.editingTaskId = id;
  const t = state.tasks.find(t => t.id === id);
  document.getElementById('task-title').value    = t.title;
  document.getElementById('task-desc').value     = t.desc || '';
  document.getElementById('task-priority').value = t.priority;
  document.getElementById('task-status').value   = t.status;
  document.getElementById('task-project').value  = t.project || '';
  document.getElementById('task-due').value      = t.due || '';
  openTaskModal();
}

// ── Projects ─────────────────────────────────────────────────────────────────
function renderProjects() {
  const el = document.getElementById('project-grid');
  if (!state.projects.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><p>Aucun projet.</p></div>`;
    return;
  }
  el.innerHTML = state.projects.map(p => {
    const total    = state.tasks.filter(t => t.project === p.id).length;
    const done     = state.tasks.filter(t => t.project === p.id && t.status === 'done').length;
    const pct      = total ? Math.round(done / total * 100) : 0;
    return `<div class="project-card" style="border-top-color:${p.color}">
      <h3>${p.name}</h3>
      <p>${p.desc || ''}</p>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%;background:${p.color}"></div>
      </div>
      <div class="project-footer">
        <span>${done}/${total} tâches</span>
        <span>${pct}%</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-secondary" onclick="editProject('${p.id}')">✏️</button>
          <button class="btn btn-sm btn-danger"    onclick="deleteProject('${p.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function deleteProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  state.tasks.forEach(t => { if (t.project === id) t.project = ''; });
  save(); renderProjects();
}

function editProject(id) {
  state.editingProjectId = id;
  const p = state.projects.find(p => p.id === id);
  document.getElementById('project-name').value  = p.name;
  document.getElementById('project-desc').value  = p.desc || '';
  document.getElementById('project-color').value = p.color;
  document.getElementById('project-due').value   = p.due || '';
  openProjectModal();
}

// ── Analytics ────────────────────────────────────────────────────────────────
let priorityChart, weeklyChart;

function renderAnalytics() {
  // Priority chart
  const high   = state.tasks.filter(t => t.priority === 'high').length;
  const medium = state.tasks.filter(t => t.priority === 'medium').length;
  const low    = state.tasks.filter(t => t.priority === 'low').length;

  const ctx1 = document.getElementById('priorityChart').getContext('2d');
  if (priorityChart) priorityChart.destroy();
  priorityChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Haute', 'Moyenne', 'Basse'],
      datasets: [{
        data: [high, medium, low],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderRadius: 8,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8892b0' }, grid: { color: '#2d3148' } },
        y: { ticks: { color: '#8892b0' }, grid: { color: '#2d3148' } },
      },
    },
  });

  // Weekly activity (synthetic)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const ctx2 = document.getElementById('weeklyChart').getContext('2d');
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Tâches complétées',
        data: days.map(() => Math.floor(Math.random() * 5)),
        borderColor: '#4f46e5',
        backgroundColor: '#4f46e522',
        fill: true,
        tension: .4,
        pointBackgroundColor: '#4f46e5',
      }],
    },
    options: {
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
      scales: {
        x: { ticks: { color: '#8892b0' }, grid: { color: '#2d3148' } },
        y: { ticks: { color: '#8892b0' }, grid: { color: '#2d3148' }, min: 0 },
      },
    },
  });

  // Project progress bars
  const el = document.getElementById('project-progress-list');
  el.innerHTML = state.projects.map(p => {
    const total = state.tasks.filter(t => t.project === p.id).length;
    const done  = state.tasks.filter(t => t.project === p.id && t.status === 'done').length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    return `<div class="project-progress-item">
      <span class="proj-name">${p.name}</span>
      <div class="bar-wrap"><div class="bar" style="width:${pct}%;background:${p.color}"></div></div>
      <span class="pct">${pct}%</span>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted);font-size:.88rem">Aucun projet</p>';
}

// ── Monitoring ───────────────────────────────────────────────────────────────
const metrics = { cpu: [], mem: [], net: [], disk: [] };
let monInterval;
const gaugeCharts = {};
const histCharts  = {};
let monInited = false;

function initMonitoring() {
  if (monInited) return;
  monInited = true;

  ['cpu', 'mem', 'net', 'disk'].forEach(key => {
    const g = document.getElementById(`${key}Gauge`).getContext('2d');
    gaugeCharts[key] = new Chart(g, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [0, 100],
          backgroundColor: ['#4f46e5', '#22263a'],
          borderWidth: 0,
        }],
      },
      options: {
        cutout: '75%',
        rotation: -90,
        circumference: 180,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 400 },
      },
    });

    const h = document.getElementById(`${key}History`).getContext('2d');
    histCharts[key] = new Chart(h, {
      type: 'line',
      data: {
        labels: Array(20).fill(''),
        datasets: [{
          data: Array(20).fill(null),
          borderColor: key === 'cpu'  ? '#4f46e5'
                     : key === 'mem'  ? '#8b5cf6'
                     : key === 'net'  ? '#f59e0b'
                     : '#10b981',
          borderWidth: 2,
          fill: false,
          tension: .3,
          pointRadius: 0,
        }],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 0, max: 100 },
        },
      },
    });
  });

  tickMonitoring();
  monInterval = setInterval(tickMonitoring, 1500);
}

function tickMonitoring() {
  const vals = {
    cpu:  rand(10, 85),
    mem:  rand(40, 75),
    net:  rand(5, 60),
    disk: rand(55, 65),
  };

  ['cpu', 'mem', 'net', 'disk'].forEach(key => {
    const v = vals[key];
    metrics[key].push(v);
    if (metrics[key].length > 20) metrics[key].shift();

    // gauge
    const gc = gaugeCharts[key];
    gc.data.datasets[0].data = [v, 100 - v];
    const color = v > 80 ? '#ef4444' : v > 60 ? '#f59e0b' : '#4f46e5';
    gc.data.datasets[0].backgroundColor[0] = color;
    gc.update('none');

    // label
    document.getElementById(`${key}-val`).textContent = `${v}%`;

    // history
    const hc = histCharts[key];
    hc.data.datasets[0].data = [...metrics[key]];
    hc.update('none');
  });
}

function rand(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

// ── Modals ────────────────────────────────────────────────────────────────────
function populateProjectSelect() {
  const sel = document.getElementById('task-project');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Aucun projet</option>' +
    state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  sel.value = cur;
}

function openTaskModal() {
  populateProjectSelect();
  document.getElementById('task-modal').classList.add('open');
}

function closeTaskModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('task-modal').classList.remove('open');
  document.getElementById('task-form').reset();
  state.editingTaskId = null;
}

function saveTask(e) {
  e.preventDefault();
  const task = {
    id:       state.editingTaskId || uid(),
    title:    document.getElementById('task-title').value.trim(),
    desc:     document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    status:   document.getElementById('task-status').value,
    project:  document.getElementById('task-project').value,
    due:      document.getElementById('task-due').value,
  };
  if (state.editingTaskId) {
    const idx = state.tasks.findIndex(t => t.id === state.editingTaskId);
    state.tasks[idx] = task;
  } else {
    state.tasks.push(task);
  }
  save();
  closeTaskModal();
  renderTasks();
}

function openProjectModal() {
  document.getElementById('project-modal').classList.add('open');
}

function closeProjectModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('project-modal').classList.remove('open');
  document.getElementById('project-form').reset();
  state.editingProjectId = null;
}

function saveProject(e) {
  e.preventDefault();
  const proj = {
    id:    state.editingProjectId || uid(),
    name:  document.getElementById('project-name').value.trim(),
    desc:  document.getElementById('project-desc').value.trim(),
    color: document.getElementById('project-color').value,
    due:   document.getElementById('project-due').value,
  };
  if (state.editingProjectId) {
    const idx = state.projects.findIndex(p => p.id === state.editingProjectId);
    state.projects[idx] = proj;
  } else {
    state.projects.push(proj);
  }
  save();
  closeProjectModal();
  renderProjects();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('date-display').textContent = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

showPage('dashboard');
