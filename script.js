// 기본 로컬스토리지 키
const KEY_ROUTINE = 'fv_myRoutine';
const KEY_POSTIT = 'fv_postit';

// 🚨 마스터 키 설정 (관리자만 아는 비밀번호 - 반드시 안전하게 변경하세요!)
const MASTER_KEY = 'master1234'; 

let routines = JSON.parse(localStorage.getItem(KEY_ROUTINE) || '[]');
let postits = JSON.parse(localStorage.getItem(KEY_POSTIT) || '[]');

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function uid(len = 6) { return Math.random().toString(36).slice(2, 2 + len); }

// 초기 로드
function boot() {
    // 초기 탭 설정: 나의 루틴 패널만 보이게
    $('#myRoutinePanel').style.display = 'block';
    $('#othersRoutinePanel').style.display = 'none';
    $('#communityPanel').style.display = 'none';

    renderOthersRoutine();
    renderPostits();
}
boot();

// 카테고리 탭
$$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        $$('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 해당 패널만 보이게 전환
        $('#myRoutinePanel').style.display = cat === 'myRoutine' ? 'block' : 'none';
        $('#othersRoutinePanel').style.display = cat === 'othersRoutine' ? 'block' : 'none';
        $('#communityPanel').style.display = cat === 'community' ? 'block' : 'none';
        
        // 다른 사람 루틴 탭 클릭 시 통계 다시 렌더링
        if (cat === 'othersRoutine') {
            renderRoutineStats();
        }
    });
});

// 나의 루틴 제출
$('#myRoutineForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = {
        q1: e.target.q1.value,
        q2: e.target.q2.value,
        q3: e.target.q3.value,
        q4: e.target.q4.value,
        q5: e.target.q5.value,
        id: uid(),
        created: new Date().toISOString()
    };
    routines.push(data);
    localStorage.setItem(KEY_ROUTINE, JSON.stringify(routines));
    alert('루틴 제출 완료!');
    e.target.reset();
    renderOthersRoutine(); // 루틴 제출 후 바로 다른 루틴 목록 업데이트
    renderRoutineStats(); // 통계도 업데이트
});

// 나의 루틴 초기화
$('#resetMyRoutine').addEventListener('click', () => $('#myRoutineForm').reset());

// 다른 사람들의 루틴 통계 렌더링 함수 추가
function renderRoutineStats() {
    const statsContent = $('#statsContent');
    if (!routines.length) {
        statsContent.innerHTML = '<p>루틴 데이터가 충분치 않습니다.</p>';
        return;
    }

    let totalFocusTime = 0;
    const q1Counts = {}; // Q1 답변별 카운트

    routines.forEach(r => {
        totalFocusTime += parseInt(r.q3) || 0; // q3은 숫자여야 함
        q1Counts[r.q1] = (q1Counts[r.q1] || 0) + 1;
    });

    const averageFocusTime = (totalFocusTime / routines.length).toFixed(1);

    // 가장 많은 Q1 답변 찾기
    let mostCommonQ1 = '';
    let maxCount = 0;
    for (const q in q1Counts) {
        if (q1Counts[q] > maxCount) {
            maxCount = q1Counts[q];
            mostCommonQ1 = q;
        }
    }

    statsContent.innerHTML = `
        <p>총 루틴 참여자 수: <strong>${routines.length}명</strong></p>
        <p>평균 최대 집중 시간: <strong>${averageFocusTime}분</strong></p>
        <p>가장 많은 집중 성향: <strong>${mostCommonQ1}</strong> (${maxCount}명)</p>
    `;
}

// 다른 사람들의 루틴 렌더링 (가독성 개선 및 클릭 이벤트 추가)
function renderOthersRoutine() {
    const board = $('#othersRoutineBoard');
    board.innerHTML = '';
    if (!routines.length) { board.innerHTML = '<div class="small">아직 다른 사람들의 루틴이 없습니다.</div>'; return; }
    
    // 루틴을 최신순으로 정렬
    const sortedRoutines = [...routines].sort((a, b) => new Date(b.created) - new Date(a.created));

    sortedRoutines.forEach(r => {
        const div = document.createElement('div');
        div.className = 'postit routine-item'; 
        
        // 간결한 미리 보기
        div.innerHTML = `
            <div class="routine-summary">
                <p><strong>집중 성향:</strong> ${r.q1}</p>
                <p><strong>최대 집중 시간:</strong> ${r.q3}분</p>
                <p><strong>나만의 팁 (미리 보기):</strong> ${r.q4.substring(0, 50)}${r.q4.length > 50 ? '...' : ''}</p>
            </div>
            <div class="meta small">${new Date(r.created).toLocaleDateString()} 작성</div>
        `;
        board.appendChild(div);

        // 클릭 시 상세 보기 모달(새 창) 띄우기
        div.addEventListener('click', () => {
            showRoutineDetail(r);
        });
    });
}

// 루틴 상세 보기 기능 (새 창을 모달처럼 활용)
function showRoutineDetail(routine) {
    const detailHTML = `
        <h2>루틴 상세 보기</h2>
        <p><strong>1) 집중 성향:</strong> ${routine.q1}</p>
        <p><strong>2) 루틴:</strong> ${routine.q2.replace(/\n/g, '<br>')}</p>
        <p><strong>3) 최대 집중 시간:</strong> ${routine.q3}분</p>
        <p><strong>4) 나만의 방법/팁:</strong> ${routine.q4.replace(/\n/g, '<br>')}</p>
        <p><strong>5) 집중이 안되는 이유:</strong> ${routine.q5.replace(/\n/g, '<br>')}</p>
        <hr>
        <p class="small">작성일: ${new Date(routine.created).toLocaleDateString()}</p>
    `;
    
    const detailWindow = window.open("", "_blank", "width=450,height=600,scrollbars=yes");
    detailWindow.document.write(
        `<!DOCTYPE html>
        <html lang="ko">
        <head>
            <title>루틴 상세</title>
            <style>
                body { padding: 20px; font-family: sans-serif; line-height: 1.6; }
                h2 { border-bottom: 2px solid #eee; padding-bottom: 5px; }
                strong { display: inline-block; width: 150px; }
            </style>
        </head>
        <body>${detailHTML}</body>
        </html>`
    );
    detailWindow.document.close();
}

// 커뮤니티 글 작성 (비밀번호 기능 추가)
$('#postAddBtn').addEventListener('click', () => {
    const text = $('#postText').value.trim();
    
    if (!text) return alert('내용을 입력해주세요');
    
    // 📢 글 삭제/수정용 비밀번호 입력 요청
    const password = prompt('글을 삭제하거나 수정할 때 사용할 비밀번호를 입력해주세요.'); 
    if (!password) return alert('비밀번호를 입력해야 합니다.'); 

    const nick = $('#postAnonymous').checked ? '익명' : ($('#postNick').value.trim() || '익명');
    
    // postits 객체에 password 필드 추가
    postits.push({ id: uid(), nick, text, password, comments: [], report: 0, created: new Date().toISOString() }); 
    
    localStorage.setItem(KEY_POSTIT, JSON.stringify(postits));
    $('#postText').value = '';
    // 닉네임 필드는 유지하여 다음 댓글/글 작성 시 재활용
    // $('#postNick').value = ''; 
    $('#postAnonymous').checked = false; // 익명 체크 해제
    renderPostits();
});

// 커뮤니티 렌더링 (삭제 기능 비밀번호 인증 및 마스터 키 로직 추가, 댓글 닉네임/작성자 구별 개선)
function renderPostits() {
    const board = $('#postBoard');
    board.innerHTML = '';
    if (!postits.length) { board.innerHTML = '<div class="small">아직 글이 없습니다.</div>'; return; }
    
    const reversedPostits = [...postits].reverse();

    reversedPostits.forEach(p => {
        const div = document.createElement('div');
        div.className = 'postit';
        div.dataset.id = p.id;
        div.innerHTML = `
            <div>${p.text}</div>
            <div class="meta">
                <span>${p.nick}</span>
                <span>
                    <button class="del">삭제</button>
                    <button class="report">🚨${p.report}</button>
                </span>
            </div>
            <div class="comment-list"></div>
            <div class="comment-form">
                <input type="text" class="comment-input" placeholder="댓글 작성 (닉네임 자동 입력)">
                <input type="password" class="comment-password" placeholder="비밀번호">
                <label><input type="checkbox" class="comment-anonymous"> 익명</label>
                <button class="comment-add">작성</button>
            </div>
        `;
        board.appendChild(div);

        // 글 작성 시 입력했던 닉네임으로 댓글 닉네임 필드 미리 채우기
        if ($('#postNick').value.trim()) {
             div.querySelector('.comment-input').value = $('#postNick').value.trim();
        } else if(p.nick !== '익명') { // 글쓴이 닉네임이 익명이 아니면
            $('#postNick').value = p.nick; // 글쓴이 닉네임을 전역 닉네임 필드에 세팅
            div.querySelector('.comment-input').value = p.nick; // 댓글 닉네임 필드에도 세팅
        }


        // 🚨 글 삭제 (비밀번호 확인 및 마스터 키 로직 추가)
        div.querySelector('.del').addEventListener('click', () => {
            const inputPassword = prompt('글을 삭제하려면 비밀번호를 입력해주세요.');
            if (!inputPassword) return; // 취소

            // **마스터 키 또는 작성자 비밀번호 확인**
            if (inputPassword === MASTER_KEY || inputPassword === p.password) { 
                if (confirm('삭제하시겠습니까?')) {
                    postits = postits.filter(pt => pt.id !== p.id);
                    localStorage.setItem(KEY_POSTIT, JSON.stringify(postits));
                    renderPostits();
                }
            } else {
                alert('비밀번호가 일치하지 않습니다.');
            }
        });

        // 신고 (기존 로직 유지)
        div.querySelector('.report').addEventListener('click', () => {
            p.report++;
            localStorage.setItem(KEY_POSTIT, JSON.stringify(postits));
            renderPostits();
        });

        // 댓글 작성 (비밀번호 필드 추가 반영, 닉네임 개선)
        div.querySelector('.comment-add').addEventListener('click', () => {
            const val = div.querySelector('.comment-input').value.trim();
            const pass = div.querySelector('.comment-password').value.trim(); // 비밀번호 값
            
            if (!val) return;
            if (!pass) return alert('댓글 삭제를 위한 비밀번호를 입력해주세요.');
            
            const anon = div.querySelector('.comment-anonymous').checked;
            
            // 전역 닉네임 필드에서 닉네임을 가져오고, 익명 여부에 따라 처리
            const commentNick = anon ? '익명' : ($('#postNick').value.trim() || '익명');
            
            // 댓글 객체에 password 필드 추가
            p.comments.push({ id: uid(), nick: commentNick, text: val, password: pass, created: new Date().toISOString() }); 
            
            localStorage.setItem(KEY_POSTIT, JSON.stringify(postits));
            
            // 댓글 폼 초기화
            div.querySelector('.comment-input').value = '';
            div.querySelector('.comment-password').value = '';
            div.querySelector('.comment-anonymous').checked = false;
            
            renderPostits(); // 댓글 작성 후 다시 렌더링하여 새 댓글 반영
        });

        // 댓글 렌더링 (댓글 삭제 비밀번호 인증 및 마스터 키 로직 추가, 작성자 댓글 구별)
        const commentList = div.querySelector('.comment-list');
        p.comments.forEach(c => {
            const cdiv = document.createElement('div');
            cdiv.className = 'comment';
            
            // 글 작성자와 댓글 작성자의 닉네임이 같으면 'author-comment' 클래스 추가
            if (c.nick === p.nick && p.nick !== '익명') { // 익명은 구별하지 않음
                cdiv.classList.add('author-comment');
            }

            cdiv.innerHTML = `<span>${c.nick}: ${c.text}</span> <button class="c-del" data-comment-id="${c.id}">삭제</button>`; 
            commentList.appendChild(cdiv);
            
            // 댓글 삭제
            cdiv.querySelector('.c-del').addEventListener('click', () => {
                const inputPassword = prompt('댓글을 삭제하려면 비밀번호를 입력해주세요.');
                if (!inputPassword) return; // 취소

                // **마스터 키 또는 작성자 비밀번호 확인**
                if (inputPassword === MASTER_KEY || inputPassword === c.password) {
                    p.comments = p.comments.filter(cc => cc.id !== c.id);
                    localStorage.setItem(KEY_POSTIT, JSON.stringify(postits));
                    renderPostits();
                } else {
                    alert('비밀번호가 일치하지 않습니다.');
                }
            });
        });
    });
}
// 👈 여기에 불필요한 닫는 괄호가 없습니다.