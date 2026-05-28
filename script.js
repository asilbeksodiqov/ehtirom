'use strict';

const STORAGE_KEY = 'diss_v3';

// ─── State ───
let notes = [];
let activeFilter = 'all';
let viewingId    = null;
let editMode     = false;
let hasChanges   = false;

// ─── DOM ───
const bbName          = document.getElementById('bbName');
const bbText          = document.getElementById('bbText');
const bbCursor        = document.getElementById('bbCursor');
const bbStatus        = document.getElementById('bbStatus');

const notesList       = document.getElementById('notesList');
const emptyState      = document.getElementById('emptyState');
const listCount       = document.getElementById('listCount');
const statusFilter    = document.getElementById('statusFilter');
const fabList         = document.getElementById('fabList');

const addOverlay      = document.getElementById('addOverlay');
const addSheet        = document.getElementById('addSheet');
const addSheetClose   = document.getElementById('addSheetClose');
const titleInput      = document.getElementById('titleInput');
const noteInput       = document.getElementById('noteInput');
const statusSelect    = document.getElementById('statusSelect');
const addSaveBtn      = document.getElementById('addSaveBtn');

const detailOverlay   = document.getElementById('detailOverlay');
const detailModal     = document.getElementById('detailModal');
const detailDate      = document.getElementById('detailDate');
const detailTitle     = document.getElementById('detailTitle');
const detailTitleEdit = document.getElementById('detailTitleEdit');
const detailBody      = document.getElementById('detailBody');
const detailEditArea  = document.getElementById('detailEditArea');
const detailStatusSel = document.getElementById('detailStatusSel');
const editToggleBtn   = document.getElementById('editToggleBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');
const detailClose     = document.getElementById('detailClose');

const confirmOverlay  = document.getElementById('confirmOverlay');
const confirmBox      = document.getElementById('confirmBox');
const confirmCancel   = document.getElementById('confirmCancel');
const confirmOk       = document.getElementById('confirmOk');

// ─── Storage ───
function load() {
  try { notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { notes = []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

// ─── Helpers ───
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmtDate(ts) {
  const d = new Date(ts), now = new Date();
  const diffM = Math.floor((now - d) / 60000);
  if (diffM < 1)  return 'Hozir';
  if (diffM < 60) return diffM + ' daqiqa oldin';
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return diffH + ' soat oldin';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  if (d.getFullYear() === now.getFullYear()) return dd+'.'+mm+'  '+hh+':'+mi;
  return dd+'.'+mm+'.'+d.getFullYear();
}

const STATUS_LABELS = {
  kutilmoqda:     'Kutilmoqda',
  muvaffaqiyatli: 'Muvaffaqiyatli',
  bekor:          'Bekor qilindi',
};

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Billboard — name rotation ───
const BB_NAMES = [
  'Sodiqov Asilbek Azizjon o‘g‘li',
  'Davlat xizmatlarini ko‘rsatish jarayonida inson huquqlarini taʼminlashning huquqiy asoslari',
];
let bbNameIdx = 0;
let bbNameTyping = null;
let bbNameCharIdx = 0;
let bbNameErasing = false;
let bbNamePause   = false;

function bbNameTick() {
  const text = BB_NAMES[bbNameIdx % BB_NAMES.length];
  if (!bbNameErasing && !bbNamePause) {
    if (bbNameCharIdx <= text.length) {
      bbName.textContent = text.slice(0, bbNameCharIdx);
      bbNameCharIdx++;
      bbNameTyping = setTimeout(bbNameTick, 45 + Math.random()*25);
    } else {
      bbNamePause = true;
      bbNameTyping = setTimeout(() => {
        bbNamePause = false; bbNameErasing = true; bbNameTick();
      }, 2800);
    }
  } else if (bbNameErasing) {
    if (bbNameCharIdx > 0) {
      bbNameCharIdx--;
      bbName.textContent = text.slice(0, bbNameCharIdx);
      bbNameTyping = setTimeout(bbNameTick, 22);
    } else {
      bbNameErasing = false;
      bbNameIdx = (bbNameIdx + 1) % BB_NAMES.length;
      bbNameTyping = setTimeout(bbNameTick, 350);
    }
  }
}

// ─── Billboard — notes rotation ───
let bbQueue   = [];
let bbQIdx    = 0;
let bbTimer   = null;
let bbCIdx    = 0;
let bbErase   = false;
let bbPause   = false;

function calcFontSize(text) {
  const l = text.length;
  if (l <= 18)  return 30;
  if (l <= 35)  return 25;
  if (l <= 60)  return 20;
  if (l <= 100) return 17;
  return 14;
}

function bbTick() {
  if (bbQueue.length === 0) {
    bbText.textContent = '';
    bbText.appendChild(bbCursor);
    bbStatus.textContent = '';
    return;
  }
  const note = bbQueue[bbQIdx % bbQueue.length];

  if (!bbErase && !bbPause) {
    if (bbCIdx <= note.text.length) {
      const slice = note.text.slice(0, bbCIdx);
      bbText.textContent = slice;
      bbText.style.fontSize = calcFontSize(note.text) + 'px';
      bbText.appendChild(bbCursor);
      bbCIdx++;
      bbTimer = setTimeout(bbTick, bbCIdx === 1 ? 60 : 28 + Math.random()*22);
    } else {
      bbStatus.innerHTML = '<span class="status-badge s-' + note.status + '">' + STATUS_LABELS[note.status] + '</span>';
      bbPause = true;
      bbTimer = setTimeout(() => { bbPause = false; bbErase = true; bbTick(); }, 3200);
    }
  } else if (bbErase) {
    if (bbCIdx > 0) {
      bbCIdx--;
      bbText.textContent = note.text.slice(0, bbCIdx);
      bbText.appendChild(bbCursor);
      bbTimer = setTimeout(bbTick, 14);
    } else {
      bbStatus.textContent = '';
      bbErase = false;
      bbQIdx = (bbQIdx + 1) % bbQueue.length;
      bbTimer = setTimeout(bbTick, 400);
    }
  }
}

function startBillboard() {
  clearTimeout(bbTimer);
  bbQueue = [...notes].sort((a,b) => b.createdAt - a.createdAt);
  bbQIdx = 0; bbCIdx = 0; bbErase = false; bbPause = false;
  bbTick();
}

// ─── Render ───
function render() {
  const filtered = activeFilter === 'all'
    ? notes
    : notes.filter(n => n.status === activeFilter);

  listCount.textContent = filtered.length;

  const cards = notesList.querySelectorAll('.note-card');
  cards.forEach(c => c.remove());

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';

  const sorted = [...filtered].sort((a,b) => b.createdAt - a.createdAt);
  sorted.forEach((note, i) => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;
    card.innerHTML =
      '<div class="card-left">' +
        '<span class="card-num">' + String(i+1).padStart(2,'0') + '</span>' +
        '<span class="status-dot dot-' + note.status + '"></span>' +
      '</div>' +
      '<div class="card-body">' +
        '<p class="card-text">' + escHtml(note.title || note.text) + '</p>' +
        '<div class="card-foot">' +
          '<span class="status-badge s-' + note.status + '">' + STATUS_LABELS[note.status] + '</span>' +
          '<span class="card-date">' + fmtDate(note.createdAt) + '</span>' +
        '</div>' +
      '</div>';
    card.addEventListener('click', () => openDetail(note.id));
    notesList.appendChild(card);
  });
}

// ─── Add sheet ───
function openAdd() {
  titleInput.value = '';
  noteInput.value = '';
  statusSelect.value = 'kutilmoqda';
  addOverlay.classList.add('show');
  addSheet.classList.add('open');
  setTimeout(() => titleInput.focus(), 320);
}
function closeAdd() {
  addOverlay.classList.remove('show');
  addSheet.classList.remove('open');
}

addSaveBtn.addEventListener('click', () => {
  const title = titleInput.value.trim();
  const text  = noteInput.value.trim();
  if (!title) { shake(titleInput); return; }
  if (!text)  { shake(noteInput);  return; }
  notes.push({ id: genId(), title, text, status: statusSelect.value, createdAt: Date.now() });
  save(); render(); startBillboard(); closeAdd();
});

fabList.addEventListener('click', openAdd);
addSheetClose.addEventListener('click', closeAdd);
addOverlay.addEventListener('click', closeAdd);

// ─── Detail modal ───
function openDetail(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  viewingId = id;
  editMode  = false;
  hasChanges = false;

  detailDate.textContent = fmtDate(note.createdAt);
  detailTitle.textContent = note.title || '';
  detailTitle.style.display = note.title ? 'block' : 'none';
  detailTitleEdit.value = note.title || '';
  detailTitleEdit.style.display = 'none';
  detailBody.textContent = note.text;
  detailBody.style.display = 'block';
  detailEditArea.style.display = 'none';
  detailEditArea.value = note.text;
  detailStatusSel.value = note.status;
  detailStatusSel.classList.remove('changed');
  editToggleBtn.classList.remove('active-edit');
  detailClose.textContent = 'Yopish';

  detailOverlay.classList.add('show');
  detailModal.classList.add('open');
}

function closeDetail() {
  detailOverlay.classList.remove('show');
  detailModal.classList.remove('open');
  viewingId = null; editMode = false; hasChanges = false;
}

detailClose.addEventListener('click', () => {
  if (hasChanges) {
    const idx = notes.findIndex(n => n.id === viewingId);
    if (idx !== -1) {
      if (editMode) {
        const newTitle = detailTitleEdit.value.trim();
        const newText  = detailEditArea.value.trim();
        if (newTitle) notes[idx].title = newTitle;
        if (newText)  notes[idx].text  = newText;
      }
      notes[idx].status = detailStatusSel.value;
      save(); render(); startBillboard();
    }
  }
  closeDetail();
});

detailOverlay.addEventListener('click', () => {
  if (hasChanges) {
    const idx = notes.findIndex(n => n.id === viewingId);
    if (idx !== -1) {
      if (editMode) {
        const newTitle = detailTitleEdit.value.trim();
        const newText  = detailEditArea.value.trim();
        if (newTitle) notes[idx].title = newTitle;
        if (newText)  notes[idx].text  = newText;
      }
      notes[idx].status = detailStatusSel.value;
      save(); render(); startBillboard();
    }
  }
  closeDetail();
});

// Track status change
detailStatusSel.addEventListener('change', () => {
  hasChanges = true;
  detailStatusSel.classList.add('changed');
  detailClose.textContent = 'Saqlash';
});

// Toggle edit mode
editToggleBtn.addEventListener('click', () => {
  editMode = !editMode;
  if (editMode) {
    detailTitle.style.display = 'none';
    detailTitleEdit.style.display = 'block';
    detailBody.style.display = 'none';
    detailEditArea.style.display = 'block';
    detailEditArea.value = detailBody.textContent;
    editToggleBtn.classList.add('active-edit');
    setTimeout(() => {
      detailTitleEdit.focus();
    }, 50);
  } else {
    detailTitle.textContent = detailTitleEdit.value || detailTitle.textContent;
    detailTitle.style.display = detailTitle.textContent ? 'block' : 'none';
    detailTitleEdit.style.display = 'none';
    detailBody.style.display = 'block';
    detailEditArea.style.display = 'none';
    detailBody.textContent = detailEditArea.value;
    editToggleBtn.classList.remove('active-edit');
  }
});

detailEditArea.addEventListener('input', () => {
  hasChanges = true;
  detailClose.textContent = 'Saqlash';
});

detailTitleEdit.addEventListener('input', () => {
  hasChanges = true;
  detailClose.textContent = 'Saqlash';
});

// Delete
detailDeleteBtn.addEventListener('click', () => {
  confirmOverlay.classList.add('show');
  confirmBox.classList.add('show');
});

confirmCancel.addEventListener('click', () => {
  confirmOverlay.classList.remove('show');
  confirmBox.classList.remove('show');
});

confirmOk.addEventListener('click', () => {
  confirmOverlay.classList.remove('show');
  confirmBox.classList.remove('show');
  notes = notes.filter(n => n.id !== viewingId);
  save(); render(); startBillboard();
  closeDetail();
});

// ─── Filter ───
statusFilter.addEventListener('change', () => {
  activeFilter = statusFilter.value;
  render();
});

// ─── Utils ───
function shake(el) {
  el.style.borderColor = '#E24B4A';
  el.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:200});
  setTimeout(() => el.style.borderColor = '', 700);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (confirmBox.classList.contains('show')) {
      confirmOverlay.classList.remove('show');
      confirmBox.classList.remove('show');
    } else if (detailModal.classList.contains('open')) {
      detailClose.click();
    } else if (addSheet.classList.contains('open')) {
      closeAdd();
    }
  }
});

// ─── Init ───
load();
render();
startBillboard();
bbNameTick();