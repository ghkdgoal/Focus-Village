// ✅ Focus Village 완성본 (Cloudflare Worker 프록시 + Google Sheets)
const API_URL = "https://withered-poetry-718c.ini123567.workers.dev"; // ⚡ Worker URL 적용

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let routines = [];
let postits = [];

const masterKey = prompt("환영합니다! 집중 루틴 커뮤니티에 오신 걸 환영합니다. (Enter 혹은 확인을 눌러주세요.)");

// 초기 실행
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

    // ✅ 댓글 문자열 → 배열(JSON) 자동 변환
    data.forEach(d => {
      if (typeof d.comments === "string") {
        try {
          d.comments = JSON.parse(d.comments || "[]");
        } catch {
          d.comments = [];
        }
      }
    });

    routines = data.filter(d => d.category === "routine");
    postits = data.filter(d => d.category === "postit");
  } catch (e) {
    console.error("데이터 불러오기 오류:", e);
  }
}

// === 새 글 저장 ===
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

// === 기존 글 댓글만 업데이트 ===
async function updatePostit(p, comments, newReport = null) {
  const payload = {
    action: newReport !== null ? "report" : "comment", // 신고/댓글 액션을 명확히 구분
    timestamp: p.timestamp, // ⭐️ 가장 중요한 수정: Apps Script가 찾을 게시글 ID
    masterKey: masterKey, // 혹시 모를 경우를 대비하여 마스터 키 포함
    
    // 댓글 업데이트 시 필요한 데이터
    comments: comments, 
    report: newReport !== null ? newReport : p.report || 0,
  };
    
  if (payload.action === "comment") {
      // 댓글 추가 로직에서는 이 함수를 쓰지 않고 아래 createPostitElement에서 직접 전송하도록 변경함
      // 이 함수는 신고용으로만 사용하거나, 기존 댓글 배열을 통째로 덮어쓸 때만 사용합니다.
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.error) {
        console.error("API 응답 오류:", result.error);
        alert(`처리 중 오류 발생: ${result.error}`);
    }
  } catch (e) {
    console.error("업데이트 오류:", e);
  }
}


// ⭐️⭐️ 새로운 댓글 추가 함수 (수정됨) ⭐️⭐️
async function addCommentToPostit(p, nick, text) {
    // Apps Script의 'comment' action 로직에 맞춰 payload를 구성합니다.
    const payload = {
        action: "comment",
        timestamp: p.timestamp, // 게시글을 찾기 위한 필수 키
        commentNick: nick,      // 댓글 작성자 이름 키
        commentText: text,      // 댓글 내용 키
    };
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        
        if (result.error) {
            console.error("댓글 추가 API 오류:", result.error);
            alert(`댓글 추가 실패: ${result.error}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error("댓글 추가 오류:", e);
        alert("네트워크 오류로 댓글 추가에 실패했습니다.");
        return false;
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
      $('#postNick').value = '';
      await loadAllData();
      renderPostits();
    });
  }
}

// === 루틴 렌더링 ===
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

  postits.forEach((p) => {
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
    <input type="text" class="comment-input" placeholder="댓글 작성 내용을 입력하세요">
    <input type="text" class="comment-nick-input" placeholder="닉네임 (선택)"> 
    <label><input type="checkbox" class="comment-anonymous"> 익명</label>
    <button class="comment-add">작성</button>
  `;

  const commentList = div.querySelector('.comment-list');
  renderComments(commentList, p.comments || [], p);

  // 댓글 작성
  div.querySelector('.comment-add').addEventListener('click', async () => {
    const val = div.querySelector('.comment-input').value.trim();
    if (!val) return;
    
    // ⭐️ 수정된 닉네임 로직
    const anon = div.querySelector('.comment-anonymous').checked;
    const nickInput = div.querySelector('.comment-nick-input').value.trim();
    const nick = anon ? '익명' : (nickInput || '익명');
    
    // ⭐️ 기존에 로컬 배열에 추가 후 updatePostit을 호출하던 방식을 
    //    Apps Script API를 직접 호출하도록 변경하여 정확도를 높였습니다.
    const success = await addCommentToPostit(p, nick, val);

    if (success) {
      // 성공 시에만 데이터를 다시 불러와서 렌더링
      div.querySelector('.comment-input').value = '';
      div.querySelector('.comment-nick-input').value = ''; // 닉네임 필드 초기화
      await loadAllData();
      renderPostits();
    }
  });

  // 신고
  div.querySelector('.report').addEventListener('click', async () => {
    const newReport = (parseInt(p.report || 0) + 1);
    
    // ⭐️ updatePostit을 신고용으로 명확하게 사용
    const payload = {
        action: "report",
        timestamp: p.timestamp, // 필수 키
        report: newReport,
    };
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        
        if (result.success) {
            p.report = newReport;
            div.querySelector('.report').textContent = `🚨${newReport}`;
            alert("신고가 접수되었습니다.");
        } else {
            alert(`신고 처리 실패: ${result.error}`);
        }
    } catch (e) {
        alert("네트워크 오류로 신고 처리 실패했습니다.");
    }

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

    // 댓글 삭제
    cdiv.querySelector('.c-del').addEventListener('click', async () => {
      const confirmDel = confirm("이 댓글을 삭제할까요?");
      if (!confirmDel) return;
        
      // 로컬 댓글 배열에서 삭제
      p.comments.splice(i, 1); 
      
      // ⭐️ 서버에 전체 댓글 배열을 덮어쓰도록 전송 (댓글 배열만 업데이트하는 전용 함수가 없으므로 임시로 updatePostit 사용)
      const payload = {
          action: "comment", // Apps Script에서 댓글 추가 로직이 작동하도록 임시로 comment 액션 사용
          timestamp: p.timestamp, // 필수 키
          comments: p.comments, // 전체 댓글 배열을 보냄
      };

      try {
          const res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });
          const result = await res.json();
          
          if (result.success) {
              // 성공 시 로컬 렌더링 업데이트
              renderComments(list, p.comments, p, true);
          } else {
              alert(`댓글 삭제 처리 실패: ${result.error}`);
              // 실패 시 데이터 롤백 (선택 사항)
          }
      } catch (e) {
          alert("네트워크 오류로 댓글 삭제 실패했습니다.");
      }
    });

    // 대댓글
    cdiv.querySelector('.reply-btn').addEventListener('click', async () => {
      const replyText = prompt('답글 내용을 입력하세요:');
      if (!replyText) return;
      
      const replyNick = prompt('답글 닉네임을 입력하세요 (미입력 시 익명):');
      const nick = replyNick && replyNick.trim() ? replyNick.trim() : '익명';
      
      const replyIndex = i + 1;
      
      const success = await addCommentToPostit(p, nick, `↳ ${replyText}`);

      if (success) {
          // 성공 시 전체 데이터 다시 불러와서 렌더링
          await loadAllData();
          renderPostits();
      }
    });
  });
}

// === 관리자 삭제 ===
function addAdminControls(div, p) {
  if (masterKey && masterKey.length > 0) {
    const adminPanel = document.createElement('div');
    adminPanel.innerHTML = `<button class="admin-del">관리자 삭제</button>`;
    adminPanel.style.marginTop = "6px";
    div.appendChild(adminPanel);

    adminPanel.querySelector(".admin-del").addEventListener("click", async () => {
      const confirmDel = confirm(`"${p.text}" 글을 정말 삭제할까요?`);
      if (!confirmDel) return;
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          masterKey: masterKey,
          timestamp: p.timestamp // ⭐️ Timestamp 추가
        })
      });
      const result = await res.json();
      if (result.success) {
          alert("삭제 완료!");
          await loadAllData();
          renderPostits();
      } else {
          alert(`삭제 실패: ${result.error}`);
      }
    });
  }
}
