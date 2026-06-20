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

fileContent.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    saveBtn.click();
  }
});

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
    fileList.innerHTML = '<p class="text-center text-[#667781] text-sm mt-6">No files yet. Save one below 👇</p>';
    return;
  }
  // reverse so oldest is on top, newest at bottom (like a chat thread)
  [...files].reverse().forEach((file) => {
    const time = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubble = document.createElement('div');
    bubble.className = 'self-end max-w-[80%] bg-[#005c4b] text-white rounded-lg rounded-tr-sm px-3 py-2 shadow';
    bubble.innerHTML = `
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm">📄</span>
        <span class="font-medium text-sm truncate">${escapeHtml(file.name)}</span>
      </div>
      <div class="flex items-center justify-between gap-3 mt-1">
        <span class="text-[11px] text-[#8696a0]">${time}</span>
        <span class="flex gap-2">
          <button class="view-btn text-[11px] bg-[#0b141a]/30 hover:bg-[#0b141a]/50 px-2 py-1 rounded-md" data-id="${file._id}">View</button>
          <button class="delete-btn text-[11px] bg-red-900/40 hover:bg-red-900/60 px-2 py-1 rounded-md" data-id="${file._id}">Delete</button>
        </span>
      </div>
    `;
    fileList.appendChild(bubble);
  });
  fileList.parentElement.scrollTop = fileList.parentElement.scrollHeight;
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