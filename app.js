const BASE_DURATION = 10 * 24 * 60 * 60 * 1000; // 10 days in ms
const GRACE_PERIOD = 12 * 60 * 60 * 1000;      // 12 hours in ms

let children = [
    { name: "첫째", startTime: null, settings: { daysBefore: 1 } },
    { name: "둘째", startTime: null, settings: { daysBefore: 1 } }
];

let activeModalChildIndex = null;

// 초기화
function init() {
    loadData();
    updateUI();
    setInterval(updateUI, 1000); // 1초마다 갱신

    // 서비스 워커 등록
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js');
    }

    // 알림 권한 요청
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

// 데이터 로드
function loadData() {
    const saved = localStorage.getItem('dexcom_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        // 저장된 데이터가 있으면 덮어씌움 (startTime만 Date 객체로 변환 필요할 수 있음)
        children = parsed;
    }
}

// 데이터 저장
function saveData() {
    localStorage.setItem('dexcom_data', JSON.stringify(children));
}

// 센서 시작/재설정 액션
function handleSensorAction(index) {
    if (children[index].startTime) {
        if (confirm(`${children[index].name}의 센서를 재설정하시겠습니까?`)) {
            children[index].startTime = null;
        }
    } else {
        children[index].startTime = Date.now();
    }
    saveData();
    updateUI();
}

// UI 업데이트 루프
function updateUI() {
    children.forEach((child, index) => {
        const card = document.getElementById(`child-${index + 1}`);
        const statusBadge = card.querySelector('.status-badge');
        const remainingText = card.querySelector('.remaining');
        const startTimeVal = card.querySelector('.startTime');
        const officialEndVal = card.querySelector('.officialEnd');
        const finalEndVal = card.querySelector('.finalEnd');
        const startBtn = card.querySelector('.start-btn');

        if (child.startTime) {
            const start = child.startTime;
            const officialEnd = start + BASE_DURATION;
            const finalEnd = officialEnd + GRACE_PERIOD;
            const now = Date.now();
            const remaining = finalEnd - now;

            statusBadge.textContent = "진행 중";
            statusBadge.setAttribute('data-status', 'active');
            startBtn.textContent = "센서 교체/재설정";
            startBtn.setAttribute('data-active', 'true');

            remainingText.textContent = formatRemaining(remaining);
            startTimeVal.textContent = formatDate(start);
            officialEndVal.textContent = formatDate(officialEnd);
            finalEndVal.textContent = formatDate(finalEnd);

            // 종료 임박 색상 변경
            if (remaining < 24 * 60 * 60 * 1000) {
                remainingText.style.color = 'var(--accent-orange)';
            } else {
                remainingText.style.color = 'var(--text-primary)';
            }

            // 만료 시
            if (remaining <= 0) {
                remainingText.textContent = "만료됨";
                remainingText.style.color = 'var(--accent-red)';
            }
        } else {
            statusBadge.textContent = "대기 중";
            statusBadge.setAttribute('data-status', 'idle');
            startBtn.textContent = "센서 시작";
            startBtn.setAttribute('data-active', 'false');
            remainingText.textContent = "--일 --시간 --분";
            remainingText.style.color = 'var(--text-secondary)';
            startTimeVal.textContent = "-";
            officialEndVal.textContent = "-";
            finalEndVal.textContent = "-";
        }
    });
}

// 시간 포맷팅 (D일 H시간 M분)
function formatRemaining(ms) {
    if (ms <= 0) return "0분";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let parts = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0 || days > 0) parts.push(`${hours}시간`);
    parts.push(`${minutes}분`);
    return parts.join(' ');
}

// 날짜 포맷팅
function formatDate(ms) {
    const d = new Date(ms);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) ${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 모달 제어
function openNotificationSettings(index) {
    activeModalChildIndex = index;
    const modal = document.getElementById('settings-modal');
    document.getElementById('notif-days').value = children[index].settings.daysBefore;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
    const days = parseInt(document.getElementById('notif-days').value);
    children[activeModalChildIndex].settings.daysBefore = days;
    saveData();
    closeModal();
    alert('알림 설정이 저장되었습니다.');
}

// 페이지 로드 시 실행
window.onload = init;
