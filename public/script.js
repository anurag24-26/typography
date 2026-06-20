const API = '/api';
let token = localStorage.getItem('token') || null;

const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const fileName = document.getElementById('fileName');
const fileContent = document.getElementById('fileContent');
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');
const fileList = document.getElementById('fileList');

const viewModal = document.getElementById('viewModal');
const viewName = document.getElementById('viewName');
const viewContent = document.getElementById('viewContent');
const closeModal = document.getElementById('closeModal');
const downloadBtn = document.getElementById('downloadBtn');

function showApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  loadFiles();
}

function showLogin() {
  appScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
}

if (token) showApp(); else showLogin();

loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const password = passwordInput.value;
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || 'Login failed';
      return;
    }
    token = data.token;
    localStorage.setItem('token', token);
    passwordInput.value = '';
    showApp();
  } catch (e) {
    loginError.textContent = 'Could not reach server';
  }
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  showLogin();
});

async function authFetch(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, options);
  if (res.status === 401) {
    token = null;
    localStorage.removeItem('token');
    showLogin();
    throw new Error('Unauthorized');
  }
  return res;
}

saveBtn.addEventListener('click', async () => {
  saveMsg.textContent = '';
  const name = fileName.value.trim();
  const content = fileContent.value;
  if (!name || !content) {
    saveMsg.textContent = 'Please enter a name and some text.';
    saveMsg.style.color = '#f87171';
    return;
  }
  try {
    const res = await authFetch(`${API}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    });
    if (!res.ok) throw new Error('Save failed');
    fileName.value = '';
    fileContent.value = '';
    saveMsg.style.color = '#4ade80';
    saveMsg.textContent = 'Saved!';
    loadFiles();
  } catch (e) {
    saveMsg.style.color = '#f87171';
    saveMsg.textContent = 'Error saving file.';
  }
});

async function loadFiles() {
  try {
    const res = await authFetch(`${API}/files`);
    const files = await res.json();
    renderFiles(files);
  } catch (e) {
    // ignore, handled by authFetch redirect
  }
}

function renderFiles(files) {
  fileList.innerHTML = '';
  if (files.length === 0) {
    fileList.innerHTML = '<p class="text-center text-slate-500 text-sm py-6">No files yet. Save one above.</p>';
    return;
  }
  files.forEach((file) => {
    const date = new Date(file.createdAt).toLocaleString([], {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-800 rounded-xl px-4 py-3 hover:bg-slate-800 transition';
    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-sm shrink-0">📄</div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-white truncate">${escapeHtml(file.name)}</p>
          <p class="text-xs text-slate-500">${date}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="view-btn text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 transition" data-id="${file._id}">View</button>
        <button class="delete-btn text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 transition" data-id="${file._id}">Delete</button>
      </div>
    `;
    fileList.appendChild(card);
  });
}

fileList.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('view-btn')) {
    const res = await authFetch(`${API}/files/${id}`);
    const file = await res.json();
    viewName.textContent = file.name;
    viewContent.textContent = file.content;
    downloadBtn.dataset.name = file.name;
    downloadBtn.dataset.content = file.content;
    viewModal.classList.remove('hidden');
  }

  if (e.target.classList.contains('delete-btn')) {
    if (!confirm('Delete this file?')) return;
    await authFetch(`${API}/files/${id}`, { method: 'DELETE' });
    loadFiles();
  }
});

closeModal.addEventListener('click', () => viewModal.classList.add('hidden'));

downloadBtn.addEventListener('click', () => {
  const name = downloadBtn.dataset.name || 'file.txt';
  const content = downloadBtn.dataset.content || '';
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
