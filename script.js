/*************************************************************
 * Focus Village - script.js (소유권 확인 완전판)
 * - ⭐️ "다른 사람" 탭에 통계 보드 기능 추가
 * - localStorage 기반 익명 authorId 사용
 * - 자기가 쓴 글/댓글만 삭제 버튼 노출
 *************************************************************/

const API_URL = "https://withered-poetry-718c.ini123567.workers.dev"; // 네 Worker/AppsScript 프록시 URL

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let routines = [];
let postits = [];
let currentUserId = ''; // ⭐️ 현재 사용자 ID 변수

// 관리용 키 (브라우저에서 한번만 물음)
const masterKey = prompt("환영합니다! 집중 루틴 커뮤니티에 오신 걸 환영합니다. (Enter 혹은 확인을 눌러주세요.)");

// ⭐️ 사용자 ID 가져오기 (없으면 생성)
function getOrCreateUserId() {
  let userId = localStorage.getItem('focusVillageUserID');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('focusVillageUserID', userId);
  }
  return userId;
}

// 초기화
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Focus Village init...");
  currentUserId = getOrCreateUserId(); // ⭐️ ID 로드
  console.log("Current User ID:", currentUserId);

  await loadAllData();
  renderOthersRoutine(); // ⭐️ 통계 기능이 추가된 함수 호출
  renderPostits();
  setupTabs();
  setupFormButtons();
});

/*************************************************************
 * loadAllData - GET (변경 없음)
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
 * ⭐️ authorId 인자 추가 (변경 없음)
 *************************************************************/
async function saveData(category, nickname, text, comments = [], report = 0, authorId) {
  try {
    // ⭐️ authorId 페이로드에 포함
    const payload = { category, nickname, text, comments, report, authorId };
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
 * ⭐️ authorId 인자 추가 (변경 없음)
 *************************************************************/
async function addCommentToPostit(post, nick, text, authorId) {
  try {
    const payload = {
      action: "comment",
      timestamp: post.timestamp,
      commentNick: nick || "익명",
      commentText: text,
      authorId: authorId // ⭐️ authorId 페이로드에 포함
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
 * updatePostitFull - API 호출 범용 (삭제/신고 등)
 * (변경 없음 - 범용 fetch 래퍼로 사용)
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
 * UI: 탭 설정 (변경 없음)
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
 * ⭐️ saveData 호출 시 currentUserId 전달 (변경 없음)
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
      // ⭐️ currentUserId 전달
      const result = await saveData("routine", "익명", JSON.stringify(data, null, 2), [], 0, currentUserId);
      if (result.ok) {
        alert('루틴이 제출되었습니다!');
        e.target.reset();
        await loadAllData();
        renderOthersRoutine(); // ⭐️ 통계가 포함된 함수 재호출
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

      // ⭐️ currentUserId 전달
      const res = await saveData("postit", nick, text, [], 0, currentUserId);
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
 * ⭐️ (대폭 수정) renderOthersRoutine - 통계 보드 + 루틴 목록 표시
 *************************************************************/
function renderOthersRoutine() {
  const board = $('#othersRoutineBoard');
  const statsBoard = $('#routineStatsBoard'); // ⭐️ 1. 통계 보드 DOM 선택
  if (!board || !statsBoard) return;

  board.innerHTML = '';
  statsBoard.innerHTML = ''; // ⭐️ 2. 통계 보드 비우기

  if (!routines.length) {
    board.innerHTML = '<div class="small">아직 다른 사람들의 루틴이 없습니다.</div>';
    statsBoard.innerHTML = '<div class="small">통계 데이터가 없습니다.</div>';
    return;
  }

  // --- ⭐️ 3. 통계 계산 로직 시작 ---
  const q1Counts = {};
  let q3Total = 0;
  let q3ValidCount = 0;
  const totalRoutines = routines.length;

  routines.forEach(r => {
    let parsed = {};
    try {
      parsed = JSON.parse(r.text);
    } catch (e) {
      return; // 파싱 실패 시 이 루틴은 건너뜀
    }

    // Q1: 집중도
    const q1Answer = parsed.q1;
    if (q1Answer) {
      q1Counts[q1Answer] = (q1Counts[q1Answer] || 0) + 1;
    }

    // Q3: 최대 집중 시간
    const q3Answer = parseInt(parsed.q3, 10);
    if (!isNaN(q3Answer) && q3Answer > 0) {
      q3Total += q3Answer;
      q3ValidCount++;
    }
  });

  // Q3: 평균 계산
  const q3Average = q3ValidCount > 0 ? (q3Total / q3ValidCount).toFixed(1) : '데이터 없음';

  // Q1: 백분율 계산 및 정렬 (답변 순서대로 정렬)
  const q1Order = ["매우 그렇다", "그렇다", "보통", "그렇지 않다", "전혀 아니다"];
  const q1Sorted = [];
  for (const answer of q1Order) {
      if (q1Counts[answer]) {
          q1Sorted.push({
              answer,
              count: q1Counts[answer],
              percentage: ((q1Counts[answer] / totalRoutines) * 100).toFixed(1)
          });
      }
  }

  // --- 4. 통계 HTML 생성 ---
  let statsHtml = `
    <h3>📊 집중 통계 (총 ${totalRoutines}개)</h3>
    <div class="stats-item">
      <span>평균 최대 집중 시간 (Q3):</span>
      <strong>${q3Average} 분</strong>
    </div>
    <div class="stats-item">
      <span>집중도 (Q1):</span>
      <span></span>
    </div>
  `;

  if (q1Sorted.length > 0) {
    q1Sorted.forEach(item => {
      statsHtml += `
        <div class="stats-q1-item">
          - ${item.answer}: <strong>${item.count}명</strong> (${item.percentage}%)
        </div>
      `;
    });
  } else {
    statsHtml += `<div class="stats-q1-item">- 데이터 없음</div>`;
  }

  statsBoard.innerHTML = statsHtml; // ⭐️ 5. 통계 보드에 HTML 삽입
  // --- 통계 로직 종료 ---


  // --- 6. 개별 루틴 렌더링 (기존 로직) ---
  routines.forEach(r => {
    let parsed = {};
    try { parsed = JSON.parse(r.text); } catch { parsed = {}; }
    const div = document.createElement('div');
    div.className = 'postit fade-in';
    // ⭐️ 개별 항목 가독성 개선
    div.innerHTML = `
      <div class="small" style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
        <strong>Q1 (집중도):</strong> ${parsed.q1 || 'N/A'}<br>
        <strong>Q3 (최대 시간):</strong> ${parsed.q3 ? parsed.q3 + '분' : 'N/A'}
      </div>
      <div><strong>Q2 (루틴):</strong> ${escapeHtml(parsed.q2) || ''}</div>
      <div><strong>Q4 (나만의 방법):</strong> ${escapeHtml(parsed.q4) || ''}</div>
      <div><strong>Q5 (안되는 이유):</strong> ${escapeHtml(parsed.q5) || ''}</div>
      <div class="meta small" style="margin-top: 10px;">${r.timestamp ? new Date(Number(r.timestamp)).toLocaleString("ko-KR") : ''}</div>
    `;
    board.appendChild(div);
  });
}


/*************************************************************
 * renderPostits - 커뮤니티 게시판 렌더링 (변경 없음)
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
 * ⭐️ '내 글 삭제' 버튼 추가 및 로직 변경 (변경 없음)
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
      <span>
        <!-- ⭐️ '내 글 삭제' 버튼 (평소엔 숨김) -->
        <button class="user-del" title="내 글 삭제" style="display:none; margin-right: 8px;">❌</button>
        <button class="report" title="신고">🚨${p.report || 0}</button>
      </span>
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

    // ⭐️ 서버에 댓글 추가시 currentUserId 전달
    const added = await addCommentToPostit(p, nick, text, currentUserId);
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

  // ⭐️ '내 글 삭제' 버튼 노출 및 이벤트
  if (p.authorId === currentUserId) {
    const userDeleteBtn = div.querySelector('.user-del');
    userDeleteBtn.style.display = 'inline-block'; // 버튼 보이기
    userDeleteBtn.addEventListener('click', async () => {
      const ok = confirm('이 게시글을 삭제하시겠습니까?');
      if (!ok) return;
      const payload = { 
        action: "deleteByUser", // ⭐️ 사용자 삭제 액션
        timestamp: p.timestamp, 
        authorId: currentUserId // ⭐️ 서버에서 2차 검증
      };
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

  // ⭐️ 관리자 삭제 버튼 (masterKey 소유자만)
  if (masterKey && masterKey.length > 0) {
    const adminPanel = document.createElement('div');
    adminPanel.style.marginTop = '8px';
    adminPanel.innerHTML = `<button class="btn ghost admin-del">관리자 삭제 (Admin)</button>`;
    div.appendChild(adminPanel);
    adminPanel.querySelector('.admin-del').addEventListener('click', async () => {
      const ok = confirm('관리자 권한으로 이 게시글을 삭제하시겠습니까?');
      if (!ok) return;
      // ⭐️ action: "delete" (관리자 전용)
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
 * ⭐️ '내 댓글 삭제' 로직 변경 (변경 없음)
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
        <button class="reply-btn" title="답글">↩</button>
        <!-- ⭐️ '내 댓글 삭제' 버튼 (평소엔 숨김) -->
        <button class="c-del" title="내 댓글 삭제" style="display:none;">❌</button>
      </div>
    `;

    const deleteBtn = cdiv.querySelector('.c-del');

    // ⭐️ '내 댓글 삭제' 버튼 노출 및 이벤트
    if (c.authorId === currentUserId) {
      deleteBtn.style.display = 'block'; // 버튼 보이기
      deleteBtn.addEventListener('click', async () => {
        const conf = confirm('이 댓글을 삭제할까요?');
        if (!conf) return;
        
        // ⭐️ 'action: "deleteComment"' API 호출 (서버에서 소유권 확인)
        const payload = { 
          action: "deleteComment", 
          timestamp: post.timestamp, 
          commentIndex: idx, // ⭐️ 몇 번째 댓글인지
          authorId: currentUserId // ⭐️ 내가 누구인지
        };
        const res = await updatePostitFull(payload);
        if (res.ok) {
          // UI 업데이트
          await loadAllData();
          renderPostits();
        } else {
          alert(`삭제 실패: ${res.error || '서버 오류'}`);
        }
      });
    }

    // 대댓글 (insert after current index)
    cdiv.querySelector('.reply-btn').addEventListener('click', async () => {
      const replyText = prompt('답글을 입력하세요:');
      if (!replyText) return;
      const replyNick = prompt('닉네임을 입력하세요 (미입력 시 익명):') || '익명';
      
      // ⭐️ 대댓글도 authorId 전달
      const added = await addCommentToPostit(post, replyNick, `↳ ${replyText}`, currentUserId);
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
  data: () => ({ routines, postits, currentUserId }), // ⭐️ currentUserId 확인용 추가
  api: API_URL
};

