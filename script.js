// ✅ Focus Village 완성본 (Cloudflare Worker 프록시 + Google Sheets)
const API_URL = "https://withered-poetry-718c.ini123567.workers.dev"; // ⚡ Worker URL 적용

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let routines = [];
let postits = [];

const masterKey = prompt("환영합니다! 집중 루틴 커뮤니티에 오신 걸 환영합니다. (Enter 혹은 확인을 눌러주세요.)");

// DOMContentLoaded 이후 실행
window.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();
  renderOthersRoutine();
  renderPostits();
  setupTabs();
  setupFormButtons();
});

// === 데이터 불러오기 ===
async function loadAllData() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    routines = data.filter(d => d.category === "routine");
    postits = data.filter(d => d.category === "postit");
  } catch (e) {
    console.error("데이터 불러오기 오류:", e);
  }
}

// === 데이터 저장 ===
async function saveData(category, nickname, text, comments = [], report = 0) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, nickname, text, comments, report }),
    });
  } catch (e) {
    console.error("데이터 저장 오류:", e);
  }
}

// === 탭 전환 ===
function setupTabs() {
  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const myPanel = $('#myRoutinePanel');
      const othersPanel = $('#othersRoutinePanel');
      const communityPanel = $('#communityPanel');

      if (myPanel) myPanel.style.display = cat === 'myRoutine' ? 'block' : 'none';
      if (othersPanel) othersPanel.style.display = cat === 'othersRoutine' ? 'block' : 'none';
      if (communityPanel) communityPanel.style.display = cat === 'community' ? 'block' : 'none';
    });
  });
}

// === 폼 버튼 이벤트 ===
function setupFormButtons() {
  const myForm = $('#myRoutineForm');
  if (myForm) {
    myForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        q1: e.target.q1.value,
        q2: e.target.q2.value,
        q3: e.target.q3.value,
        q4: e.target.q4.value,
        q5: e.target.q5.value,
      };
      await saveData("routine", "익명", JSON.stringify(data, null, 2));
      alert('루틴이 제출되었습니다!');
      e.target.reset();
      await loadAllData();
      renderOthersRoutine();
    });
  }

  const resetBtn = $('#resetMyRoutine');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (myForm) myForm.reset();
  });

  const postBtn = $('#postAddBtn');
  if (postBtn) {
    postBtn.addEventListener('click', async () => {
      const text = $('#postText').value.trim();
      if (!text) return alert('내용을 입력해주세요.');
      const nick = $('#postAnonymous').checked ? '익명' : ($('#postNick').value.trim() || '익명');
      await saveData("postit", nick, text, []);
      $('#postText').value = '';
      await loadAllData();
      renderPostits();
    });
  }
}

// === 다른 사람들의 루틴 렌더링 ===
function renderOthersRoutine() {
  const board = $('#othersRoutineBoard');
  if (!board) return;
  board.innerHTML = '';
  if (!routines.length) {
    board.innerHTML = '<div class="small">아직 다른 사람들의 루틴이 없습니다.</div>';
    return;
  }
  routines.forEach(r => {
    let parsed = {};
    try { parsed = JSON.parse(r.text); } catch { parsed = {}; }
    const div = document.createElement('div');
    div.className = 'postit fade-in';
    div.innerHTML = `
      <div>Q1: ${parsed.q1 || ''}</div>
      <div>Q2: ${parsed.q2 || ''}</div>
      <div>Q3: ${parsed.q3 || ''}</div>
      <div>Q4: ${parsed.q4 || ''}</div>
      <div>Q5: ${parsed.q5 || ''}</div>
      <div class="meta small">${r.timestamp || ''}</div>
    `;
    board.appendChild(div);
  });
}

// === 커뮤니티 렌더링 ===
function renderPostits() {
  const board = $('#postBoard');
  if (!board) return;
  board.replaceChildren();

  if (!postits.length) {
    board.innerHTML = '<div class="small">아직 글이 없습니다.</div>';
    return;
  }

  postits.forEach((p, idx) => {
    const div = createPostitElement(p);
    board.appendChild(div);
    requestAnimationFrame(() => div.classList.add('fade-in'));
  });
}

// === 게시글 생성 ===
function createPostitElement(p) {
  const div = document.createElement('div');
  div.className = 'postit';
  div.innerHTML = `
    <div>${p.text}</div>
    <div class="meta">
      <span>${p.nickname}</span>
      <span><button class="report">🚨${p.report || 0}</button></span>
    </div>
    <div class="comment-list"></div>
    <input type="text" class="comment-input" placeholder="댓글 작성 (익명 가능)">
    <label><input type="checkbox" class="comment-anonymous"> 익명</label>
    <button class="comment-add">작성</button>
  `;

  const commentList = div.querySelector('.comment-list');
  const comments = JSON.parse(p.comments || "[]");
  renderComments(commentList, comments, p);

  // 댓글 작성
  div.querySelector('.comment-add').addEventListener('click', async () => {
    const val = div.querySelector('.comment-input').value.trim();
    if (!val) return;
    const anon = div.querySelector('.comment-anonymous').checked;
    const nick = anon ? '익명' : ($('#postNick').value.trim() || '익명');
    comments.push({ nick, text: val });
    await saveData("postit", p.nickname, p.text, comments, p.report || 0);
    renderComments(commentList, comments, p, true);
    div.querySelector('.comment-input').value = '';
  });

  // 신고
  div.querySelector('.report').addEventListener('click', async () => {
    const newReport = (parseInt(p.report || 0) + 1);
    await saveData("postit", p.nickname, p.text, comments, newReport);
    p.report = newReport;
    div.querySelector('.report').textContent = `🚨${newReport}`;
  });

  // 관리자 삭제
  addAdminControls(div, p);

  return div;
}

// === 댓글 렌더링 ===
function renderComments(list, comments, p, smooth = false) {
  list.replaceChildren();
  comments.forEach((c, i) => {
    const cdiv = document.createElement('div');
    cdiv.className = 'comment';
    cdiv.innerHTML = `
      <span>${c.nick}: ${c.text}</span>
      <div>
        <button class="reply-btn">↩</button>
        <button class="c-del">❌</button>
      </div>
    `;
    if (smooth) requestAnimationFrame(() => cdiv.classList.add('fade-in'));
    list.appendChild(cdiv);

    cdiv.querySelector('.c-del').addEventListener('click', async () => {
      comments.splice(i, 1);
      await saveData("postit", p.nickname, p.text, comments, p.report || 0);
      renderComments(list, comments, p, true);
    });

    cdiv.querySelector('.reply-btn').addEventListener('click', async () => {
      const replyText = prompt('답글을 입력하세요:');
      if (!replyText) return;
      const nick = $('#postNick').value.trim() || '익명';
      comments.splice(i + 1, 0, { nick, text: `↳ ${replyText}` });
      await saveData("postit", p.nickname, p.text, comments, p.report || 0);
      renderComments(list, comments, p, true);
    });
  });
}

// === 관리자 삭제 ===
function addAdminControls(div, p) {
  if (masterKey && masterKey.length > 0) {
    const adminPanel = document.createElement('div');
    adminPanel.innerHTML = `<button class="admin-del

