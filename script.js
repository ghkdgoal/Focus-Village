// ✅ Focus Village 완성본 (Cloudflare Worker 프록시 + Google Sheets)
const API_URL = "https://withered-poetry-718c.ini123567.workers.dev"; // ⚡ Worker URL 적용

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let routines = [];
let postits = [];

// ✅ 관리자 키 (선택 입력)
const masterKey = prompt("환영합니다! 이 공간은 집중 루틴을 기록하기 위한 공간입니다. (Enter 혹은 확인을 눌러주세요.)");

// ✅ 초기 실행
window.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();
  renderOthersRoutine();
  renderPostits();
});

// ✅ 데이터 불러오기
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

// ✅ 데이터 저장
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

// ✅ 카테고리 탭
$$('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;
    $$('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('#myRoutinePanel').style.display = cat === 'myRoutine' ? 'block' : 'none';
    $('#othersRoutinePanel').style.display = cat === 'othersRoutine' ? 'block' : 'none';
    $('#communityPanel').style.display = cat === 'community' ? 'block' : 'none';
  });
});

// ✅ 나의 루틴 제출
$('#myRoutineForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    q1: e.target.q1.value,
    q2: e.target.q2.value,
    q3: e.target.q3.value,
    q4: e.target.q4.value,
    q5: e.target.q5.value,
  };
  const text = JSON.stringify(data, null, 2);
  await saveData("routine", "익명", text);
  alert('루틴이 제출되었습니다!');
  e.target.reset();
  await loadAllData();
  renderOthersRoutine();
});

// ✅ 루틴 초기화
$('#resetMyRoutine').addEventListener('click', () => $('#myRoutineForm').reset());

// ✅ 다른 사람들의 루틴 렌더링
function renderOthersRoutine() {
  const board = $('#othersRoutineBoard');
  board.innerHTML = '';
  if (!routines.length) {
    board.innerHTML = '<div class="small">아직 다른 사람들의 루틴이 없습니다.</div>';
    return;
  }
  routines.forEach(r => {
    let parsed = {};
    try { parsed = JSON.parse(r.text); } catch { parsed = {}; }
    const div = document.createElement('div');
    div.className = 'postit';
    div.innerHTML = `
      <div>Q1: ${parsed.q1 || ''}</div>
      <div>Q2: ${parsed.q2 || ''}</div>
      <div>Q3: ${parsed.q3 || ''}</div>
      <div>Q4: ${parsed.q4 || ''}</div>
      <div>Q5: ${parsed.q5 || ''}</div>
      <div class="meta small">${r.timestamp}</div>
    `;
    board.appendChild(div);
  });
}

// ✅ 커뮤니티 글 추가
$('#postAddBtn').addEventListener('click', async () => {
  const text = $('#postText').value.trim();
  if (!text) return alert('내용을 입력해주세요.');
  const nick = $('#postAnonymous').checked ? '익명' : ($('#postNick').value.trim() || '익명');
  await saveData("postit", nick, text, []);
  $('#postText').value = '';
  await loadAllData();
  renderPostits();
});

// ✅ 커뮤니티 렌더링 (중복 렌더 방지 + 이벤트 중복 방지)
function renderPostits() {
  const oldBoard = $('#postBoard');
  const newBoard = oldBoard.cloneNode(false);
  oldBoard.parentNode.replaceChild(newBoard, oldBoard);
  const board = $('#postBoard');

  if (!postits.length) {
    board.innerHTML = '<div class="small">아직 글이 없습니다.</div>';
    return;
  }

  postits.forEach(p => {
    const div = document.createElement('div');
    div.className = 'postit';
    div.innerHTML = `
      <div>${p.text}</div>
      <div class="meta">
        <span>${p.nickname}</span>
        <span>
          <button class="report">🚨${p.report || 0}</button>
        </span>
      </div>
      <div class="comment-list"></div>
      <input type="text" class="comment-input" placeholder="댓글 작성 (익명 가능)">
      <label><input type="checkbox" class="comment-anonymous"> 익명</label>
      <button class="comment-add">작성</button>
    `;
    board.appendChild(div);

    // 댓글 렌더링
    const commentList = div.querySelector('.comment-list');
    const comments = JSON.parse(p.comments || "[]");
    comments.forEach(c => {
      const cdiv = document.createElement('div');
      cdiv.className = 'comment';
      cdiv.innerHTML = `<span>${c.nick}: ${c.text}</span>`;
      commentList.appendChild(cdiv);
    });

    // 댓글 작성 (중복 방지 수정됨)
    div.querySelector('.comment-add').addEventListener('click', async () => {
      const val = div.querySelector('.comment-input').value.trim();
      if (!val) return;
      const anon = div.querySelector('.comment-anonymous').checked;
      const nick = anon ? '익명' : ($('#postNick').value.trim() || '익명');
      comments.push({ nick, text: val });
      await saveData("postit", p.nickname, p.text, comments, p.report || 0);
      setTimeout(async () => {
        await loadAllData();
        renderPostits();
      }, 100);
    });

    // 신고 버튼
    div.querySelector('.report').addEventListener('click', async () => {
      const newReport = (parseInt(p.report || 0) + 1);
      await saveData("postit", p.nickname, p.text, comments, newReport);
      setTimeout(async () => {
        await loadAllData();
        renderPostits();
      }, 100);
    });

    // 관리자 삭제 버튼
    addAdminControls(div, p);
  });
}

// ✅ 관리자 삭제 기능
function addAdminControls(div, p) {
  if (masterKey && masterKey.length > 0) {
    const adminPanel = document.createElement('div');
    adminPanel.innerHTML = `<button class="admin-del">관리자 삭제</button>`;
    adminPanel.style.marginTop = "6px";
    div.appendChild(adminPanel);

    adminPanel.querySelector(".admin-del").addEventListener("click", async () => {
      const confirmDel = confirm(`"${p.text}" 글을 정말 삭제할까요?`);
      if (!confirmDel) return;
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          masterKey: masterKey,
          nickname: p.nickname,
          text: p.text
        })
      });
      alert("삭제 완료!");
      await loadAllData();
      renderPostits();
    });
  }
}
