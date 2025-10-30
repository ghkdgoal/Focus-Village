/*************************************************************
 * Focus Village - script.js (완전판)
 * - 최신순 정렬, 댓글/대댓글/삭제/신고/관리자 기능 완전 지원
 * - Apps Script (timestamp 기반) + Cloudflare Worker 연동 전제
 *************************************************************/

const API_URL = "https://withered-poetry-718c.ini123567.workers.dev"; // 네 Worker/AppsScript 프록시 URL

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let routines = [];
let postits = [];

// 관리용 키 (브라우저에서 한번만 물음)
const masterKey = prompt("환영합니다! 집중 루틴 커뮤니티에 오신 걸 환영합니다. (Enter 혹은 확인을 눌러주세요.)");

// 초기화
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Focus Village init...");
  await loadAllData();
  renderOthersRoutine();
  renderPostits();
  setupTabs();
  setupFormButtons();
});

/*************************************************************
 * loadAllData - GET
 *************************************************************/
async function loadAllData() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("loadAllData: 서버 응답이 배열이 아님", data);
      return;
    }

    // comments 문자열이면 파싱
    data.forEach((d) => {
      if (typeof d.comments === "string") {
        try {
          d.comments = JSON.parse(d.comments || "[]");
        } catch (e) {
          console.warn("comments JSON parse failed:", e);
          d.comments = [];
        }
      }
      // timestamp가 숫자/문자면 보장
      if (d.timestamp && typeof d.timestamp !== "string") d.timestamp = String(d.timestamp);
    });

    // 최신순 정렬 (timestamp 기준 내림차순)
    data.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

    routines = data.filter((d) => d.category === "routine");
    postits = data.filter((d) => d.category === "postit");

    console.log(`loadAllData: routines=${routines.length}, postits=${postits.length}`);
  } catch (err) {
    console.error("loadAllData error:", err);
  }
}

/*************************************************************
 * saveData - 새 글(루틴/포스트잇) 저장
 *************************************************************/
async function saveData(category, nickname, text, comments = [], report = 0) {
  try {
    const payload = { category, nickname, text, comments, report };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j && j.success) {
      console.log("saveData: 성공", j);
      return { ok: true, timestamp: j.timestamp || null };
    } else {
      console.warn("saveData: 응답 에러", j);
      return { ok: false, error: j && j.error };
    }
  } catch (err) {
    console.error("saveData network error:", err);
    return { ok: false, error: err.message };
  }
}

/*************************************************************
 * addCommentToPostit - 서버에 댓글 추가 (action: comment)
 *************************************************************/
async function addCommentToPostit(post, nick, text) {
  try {
    const payload = {
      action: "comment",
      timestamp: post.timestamp,
      commentNick: nick || "익명",
      commentText: text,
    };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j && j.success) {
      console.log("addCommentToPostit: OK", j);
      return { ok: true };
    } else {
      console.warn("addCommentToPostit: 실패", j);
      return { ok: false, error: j && j.error };
    }
  } catch (err) {
    console.error("addCommentToPostit error:", err);
    return { ok: false, error: err.message };
  }
}

/*************************************************************
 * updatePostitFull - 전체 댓글 덮어쓰기 or 신고 (action: report or comment with comments)
 * - 사용처: 댓글 삭제(전체 덮어쓰기), 신고 처리
 *************************************************************/
async function updatePostitFull(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j && j.success) {
      return { ok: true };
    } else {
      return { ok: false, error: j && j.error };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/*************************************************************
 * UI: 탭 설정
 *************************************************************/
function setupTabs() {
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
}

/*************************************************************
 * UI: 폼 버튼 이벤트 바인딩
 *************************************************************/
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
      const result = await saveData("routine", "익명", JSON.stringify(data, null, 2));
      if (result.ok) {
        alert('루틴이 제출되었습니다!');
        e.target.reset();
        await loadAllData();
        renderOthersRoutine();
      } else {
        alert(`제출 실패: ${result.error || '알 수 없음'}`);
      }
    });
  }

  const resetBtn = $('#resetMyRoutine');
  if (resetBtn && myForm) {
    resetBtn.addEventListener('click', () => myForm.reset());
  }

  const postBtn = $('#postAddBtn');
  if (postBtn) {
    postBtn.addEventListener('click', async () => {
      const textEl = $('#postText');
      const nickEl = $('#postNick');
      const anonEl = $('#postAnonymous');

      const text = textEl.value.trim();
      if (!text) return alert('내용을 입력해주세요.');
      const nick = anonEl.checked ? '익명' : (nickEl.value.trim() || '익명');

      const res = await saveData("postit", nick, text, []);
      if (res.ok) {
        textEl.value = '';
        nickEl.value = '';
        await loadAllData();
        renderPostits();
      } else {
        alert(`게시 실패: ${res.error || '알 수 없음'}`);
      }
    });
  }
}

/*************************************************************
 * renderOthersRoutine - 다른 사람 루틴 표시 (최신 위)
 *************************************************************/
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
      <div class="meta small">${r.timestamp ? new Date(Number(r.timestamp)).toLocaleString("ko-KR") : ''}</div>
    `;
    board.appendChild(div);
  });
}

/*************************************************************
 * renderPostits - 커뮤니티 게시판 렌더링
 *************************************************************/
function renderPostits() {
  const board = $('#postBoard');
  if (!board) return;
  board.replaceChildren();

  if (!postits.length) {
    board.innerHTML = '<div class="small">아직 글이 없습니다.</div>';
    return;
  }

  postits.forEach(p => {
    const card = createPostitElement(p);
    board.appendChild(card);
    requestAnimationFrame(() => card.classList.add('fade-in'));
  });
}

/*************************************************************
 * createPostitElement - 단일 포스트 카드 생성
 *************************************************************/
function createPostitElement(p) {
  const div = document.createElement('div');
  div.className = 'postit';

  // 안전하게 텍스트 처리 (간단히)
  const safeText = (t) => (t === null || t === undefined) ? '' : String(t);

  div.innerHTML = `
    <div class="post-text">${escapeHtml(safeText(p.text))}</div>
    <div class="meta">
      <span class="nick">${escapeHtml(safeText(p.nickname))}</span>
      <span><button class="report">🚨${p.report || 0}</button></span>
    </div>
    <div class="comment-list"></div>

    <div class="comment-input-group">
      <input type="text" class="comment-input" placeholder="댓글 작성 (필수)">
      <input type="text" class="comment-nick-input" placeholder="닉네임 (선택)">
      <label><input type="checkbox" class="comment-anonymous"> 익명</label>
      <div style="margin-top:8px;">
        <button class="btn comment-add">작성</button>
        <button class="btn ghost comment-refresh">새로고침</button>
      </div>
    </div>
  `;

  const commentList = div.querySelector('.comment-list');
  renderComments(commentList, p.comments || [], p);

  // 댓글 작성
  div.querySelector('.comment-add').addEventListener('click', async () => {
    const input = div.querySelector('.comment-input');
    const nickInput = div.querySelector('.comment-nick-input');
    const anon = div.querySelector('.comment-anonymous').checked;
    const text = input.value.trim();
    if (!text) return alert('댓글 내용을 입력하세요.');
    const nick = anon ? '익명' : (nickInput.value.trim() || '익명');

    // 서버에 댓글 추가
    const added = await addCommentToPostit(p, nick, text);
    if (added.ok) {
      // 새로 불러와서 렌더 동기화
      await loadAllData();
      renderPostits();
    } else {
      alert(`댓글 추가 실패: ${added.error || '서버 오류'}`);
    }
  });

  // 댓글 영역 새로고침 (로컬 업데이트 대신 전체 재로딩)
  div.querySelector('.comment-refresh').addEventListener('click', async () => {
    await loadAllData();
    renderPostits();
  });

  // 신고
  div.querySelector('.report').addEventListener('click', async () => {
    const confirmReport = confirm("이 게시글을 신고하시겠습니까?");
    if (!confirmReport) return;
    const payload = { action: "report", timestamp: p.timestamp };
    const result = await updatePostitFull(payload);
    if (result.ok) {
      alert("신고 접수되었습니다.");
      await loadAllData();
      renderPostits();
    } else {
      alert(`신고 실패: ${result.error || '서버 오류'}`);
    }
  });

  // 관리자 삭제 버튼 (로컬에 masterKey가 있으면 노출)
  if (masterKey && masterKey.length > 0) {
    const adminPanel = document.createElement('div');
    adminPanel.style.marginTop = '8px';
    adminPanel.innerHTML = `<button class="btn ghost admin-del">관리자 삭제</button>`;
    div.appendChild(adminPanel);
    adminPanel.querySelector('.admin-del').addEventListener('click', async () => {
      const ok = confirm('관리자 권한으로 이 게시글을 삭제하시겠습니까?');
      if (!ok) return;
      const payload = { action: "delete", masterKey, timestamp: p.timestamp };
      const res = await updatePostitFull(payload);
      if (res.ok) {
        alert('삭제 완료');
        await loadAllData();
        renderPostits();
      } else {
        alert(`삭제 실패: ${res.error || '서버 오류'}`);
      }
    });
  }

  return div;
}

/*************************************************************
 * renderComments - 댓글/대댓글 렌더링 & 로컬 삭제/대댓글 UI 연결
 *************************************************************/
function renderComments(container, comments = [], post) {
  container.replaceChildren();
  if (!Array.isArray(comments) || comments.length === 0) return;

  comments.forEach((c, idx) => {
    const cdiv = document.createElement('div');
    cdiv.className = 'comment';
    cdiv.innerHTML = `
      <div style="flex:1">
        <strong>${escapeHtml(c.nick || '익명')}</strong>
        <span style="margin-left:8px">${escapeHtml(c.text || '')}</span>
        <div class="small" style="margin-top:6px;color:var(--muted)">${escapeHtml(c.date || '')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-left:8px">
        <button class="reply-btn">↩</button>
        <button class="c-del">❌</button>
      </div>
    `;

    // 삭제 (로컬 배열 수정 후 서버에 전체 덮어쓰기)
    cdiv.querySelector('.c-del').addEventListener('click', async () => {
      const conf = confirm('이 댓글을 삭제할까요?');
      if (!conf) return;
      // remove from local array
      comments.splice(idx, 1);
      // send full comments array to server to overwrite
      const payload = { action: "comment", timestamp: post.timestamp, comments: comments };
      const res = await updatePostitFull(payload);
      if (res.ok) {
        // update UI
        await loadAllData();
        renderPostits();
      } else {
        alert(`삭제 실패: ${res.error || '서버 오류'}`);
      }
    });

    // 대댓글 (insert after current index)
    cdiv.querySelector('.reply-btn').addEventListener('click', async () => {
      const replyText = prompt('답글을 입력하세요:');
      if (!replyText) return;
      const replyNick = prompt('닉네임을 입력하세요 (미입력 시 익명):') || '익명';
      // Use server comment add endpoint for atomicity
      const added = await addCommentToPostit(post, replyNick, `↳ ${replyText}`);
      if (added.ok) {
        await loadAllData();
        renderPostits();
      } else {
        alert(`답글 실패: ${added.error || '서버 오류'}`);
      }
    });

    container.appendChild(cdiv);
  });
}

/*************************************************************
 * 유틸: 안전한 HTML 이스케이프 (간단)
 *************************************************************/
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*************************************************************
 * 개발용: expose 간단한 상태 확인 함수 (콘솔에서 호출 가능)
 *************************************************************/
window._fv = {
  reload: async () => { await loadAllData(); renderOthersRoutine(); renderPostits(); console.log('reloaded'); },
  data: () => ({ routines, postits }),
  api: API_URL
};

