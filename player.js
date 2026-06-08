/* ===========================================================
   video-player — 동작 로직 (vanilla JS, 라이브러리 0개)
   -----------------------------------------------------------
   핵심 아이디어:
   브라우저의 <video> 요소는 JS로 제어할 수 있는 "객체"입니다.
   우리는 그 객체의 속성(currentTime, volume, playbackRate ...)을
   읽고 쓰면서, 동시에 video가 보내주는 이벤트(timeupdate, play ...)를
   받아 화면(UI)을 갱신합니다.

        [버튼/슬라이더 조작]  ──쓰기──▶  video 속성
        [화면 UI 갱신]        ◀─읽기───  video 이벤트
   =========================================================== */

// ── 1) DOM 요소들을 한 번에 잡아둡니다 ──────────────────────
const $ = (id) => document.getElementById(id);

const player     = $("player");
const video      = $("video");
const dropOverlay= $("dropOverlay");
const bigPlay    = $("bigPlay");

const timeline   = $("timeline");
const bufferedEl = $("buffered");
const playedEl   = $("played");
const thumb      = $("thumb");
const preview    = $("preview");

const playPause  = $("playPause");
const prevFrame  = $("prevFrame");
const nextFrame  = $("nextFrame");
// 시간 표시는 현재/전체가 별도 <span> 이라 따로 갱신합니다
const timeCur    = document.querySelector(".time__cur");
const timeDur    = document.querySelector(".time__dur");

const muteBtn    = $("mute");
const volume     = $("volume");
const fullscreen = $("fullscreen");

const fileInput  = $("fileInput");

// ── 2) 영상 불러오기 ────────────────────────────────────────
// 파일(File 객체)을 받아 video가 재생할 수 있는 임시 URL로 바꿔줍니다.
// URL.createObjectURL: 메모리 안의 파일을 가리키는 "blob:" 주소를 만들어줘요.
// HTML에 src가 미리 지정돼 있으면(예: sample/sample1.mp4) 바로 재생 준비 상태로.
if (video.getAttribute("src")) player.dataset.state = "ready";

let objectUrl = null;               // 우리가 만든 blob URL을 따로 기억해 둠
function loadFile(file) {
  if (!file || !file.type.startsWith("video/")) return;

  // 직전에 만든 blob URL만 해제 (sample 같은 일반 경로 src는 건드리지 않음)
  if (objectUrl) URL.revokeObjectURL(objectUrl);

  objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  player.dataset.state = "ready";   // CSS가 오버레이 숨기고 컨트롤 보여줌
  video.play().catch(() => {});     // 자동재생이 막히면 조용히 무시
}

// 파일 선택 버튼
fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));

// 드래그 앤 드롭
// dragover에서 preventDefault를 안 하면 브라우저가 그냥 파일을 열어버립니다.
player.addEventListener("dragover", (e) => {
  e.preventDefault();
  player.classList.add("dragover");
});
player.addEventListener("dragleave", () => player.classList.remove("dragover"));
player.addEventListener("drop", (e) => {
  e.preventDefault();
  player.classList.remove("dragover");
  loadFile(e.dataTransfer.files[0]);
});

// ── 3) 재생 / 일시정지 ──────────────────────────────────────
// video.paused 를 보고 토글합니다. (play()/pause()는 video의 메서드)
function togglePlay() {
  if (!video.src) return;
  video.paused ? video.play() : video.pause();
}
playPause.addEventListener("click", togglePlay);
bigPlay.addEventListener("click", togglePlay);
video.addEventListener("click", togglePlay);

// video가 실제로 재생/정지될 때 발생하는 이벤트로 UI(아이콘 등)를 맞춥니다.
// 이렇게 "이벤트에 반응"해서 UI를 갱신하면, 단축키로 바꾸든 버튼으로 바꾸든
// 한 곳에서 일관되게 처리됩니다.
// 아이콘(▶/⏸)은 .is-playing 클래스를 보고 CSS가 자동으로 바꿔줍니다.
video.addEventListener("play",  () => player.classList.add("is-playing"));
video.addEventListener("pause", () => player.classList.remove("is-playing"));

// ── 4) 시간 표시 & 진행바 갱신 ──────────────────────────────
// 초(123.4) → "2:03" 같은 문자열로 변환
function formatTime(sec) {
  if (!isFinite(sec)) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// timeupdate: 재생되는 동안 초당 여러 번 발생 → 진행바/시간 갱신에 사용
video.addEventListener("timeupdate", () => {
  const pct = (video.currentTime / video.duration) * 100 || 0;
  playedEl.style.width = pct + "%";
  thumb.style.left = pct + "%";
  timeCur.textContent = formatTime(video.currentTime);
});

// loadedmetadata: 영상 길이/해상도 등 메타데이터가 준비된 순간
video.addEventListener("loadedmetadata", () => {
  timeCur.textContent = "0:00";
  timeDur.textContent = formatTime(video.duration);
});

// progress: 버퍼링이 진행될 때 → 미리 받아둔 구간 표시
video.addEventListener("progress", () => {
  if (video.buffered.length) {
    const end = video.buffered.end(video.buffered.length - 1);
    bufferedEl.style.width = (end / video.duration) * 100 + "%";
  }
});

// ── 5) 진행바 클릭/드래그로 탐색(seek) ──────────────────────
// 클릭 위치가 타임라인의 몇 % 지점인지 계산해서 그 비율만큼 currentTime을 설정.
// getBoundingClientRect(): 요소의 화면상 위치/크기를 알려줍니다.
function seekTo(clientX) {
  const rect = timeline.getBoundingClientRect();
  let ratio = (clientX - rect.left) / rect.width;
  ratio = Math.min(1, Math.max(0, ratio));   // 0~1 범위로 가두기
  video.currentTime = ratio * video.duration;
}

let scrubbing = false;
timeline.addEventListener("mousedown", (e) => {
  if (!video.src) return;
  scrubbing = true;
  seekTo(e.clientX);
});
// 드래그는 타임라인 밖으로 나가도 따라오도록 document에 건다
document.addEventListener("mousemove", (e) => { if (scrubbing) seekTo(e.clientX); });
document.addEventListener("mouseup", () => { scrubbing = false; });

// 타임라인 위에 마우스를 올리면 그 지점의 시간을 툴팁으로 미리 보여줍니다.
// (보이기/숨기기는 CSS의 .timeline:hover 가 처리하고, 여기선 위치/문구만 갱신)
timeline.addEventListener("mousemove", (e) => {
  const rect = timeline.getBoundingClientRect();
  let ratio = (e.clientX - rect.left) / rect.width;
  ratio = Math.min(1, Math.max(0, ratio));
  preview.style.left = ratio * 100 + "%";
  preview.textContent = formatTime(ratio * (video.duration || 0));
});

// ── 6) 볼륨 / 음소거 ────────────────────────────────────────
// 슬라이더(0~1) → video.volume 에 그대로 반영.
volume.addEventListener("input", () => {
  video.volume = volume.value;              // 문자열이지만 video.volume이 숫자로 변환해줌
  video.muted = Number(volume.value) === 0; // 0까지 내리면 음소거, 올리면 자동 해제
});
muteBtn.addEventListener("click", () => { video.muted = !video.muted; });

// volumechange: 볼륨/음소거가 (어떤 경로로든) 바뀌면 아이콘과 슬라이더를 맞춤
video.addEventListener("volumechange", () => {
  const v = video.muted ? 0 : video.volume;
  volume.value = v;
  // 아이콘은 data-level(high/low/mute)을 보고 CSS가 전환
  muteBtn.dataset.level = v === 0 ? "mute" : v < 0.5 ? "low" : "high";
});

// ── 7) 배속 드롭다운 (커스텀) ───────────────────────────────
// 네이티브 <select>의 "펼친 목록"은 브라우저(OS) 기본 UI라 디자인을 못 바꿉니다.
// 그래서 다크 톤에 맞춘 메뉴를 직접 만들고, 열기/닫기/선택/바깥클릭 처리를
// 재사용 함수로 묶었습니다.
function setupMenu(menu, onChange) {
  const button  = menu.querySelector(".pill");
  const valueEl = menu.querySelector(".pill__value");
  const items   = [...menu.querySelectorAll(".menu__item")];
  const close   = () => { menu.classList.remove("open"); button.setAttribute("aria-expanded", "false"); };

  // 버튼: 열기/닫기 토글 (stopPropagation으로 '바깥 클릭=닫기'에 즉시 안 잡히게)
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !menu.classList.contains("open");
    // 다른 메뉴는 모두 닫고(한 번에 하나만 열림), 닫혀 있던 경우에만 이걸 연다
    document.querySelectorAll(".menu.open").forEach((other) => {
      other.classList.remove("open");
      other.querySelector(".pill").setAttribute("aria-expanded", "false");
    });
    if (opening) {
      menu.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });

  // 항목 선택: 체크 표시 이동 + 표시값 갱신 + 콜백 + 닫기
  items.forEach((item) => item.addEventListener("click", () => {
    items.forEach((el) => el.classList.toggle("is-selected", el === item));
    valueEl.textContent = item.textContent;
    onChange(item.dataset.value);
    close();
  }));

  // 목록 안쪽(여백 등) 클릭은 닫힘을 막고, 바깥 클릭이면 닫음
  menu.querySelector(".menu__list").addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", close);
}

// 배속: 고르면 video.playbackRate 에 반영 (1=기본, 2=2배속, 0.5=절반)
setupMenu($("rateMenu"), (v) => { video.playbackRate = parseFloat(v); });

// ── 8) fps 자동 감지 (requestVideoFrameCallback) ────────────
// 브라우저엔 "이 영상 몇 fps?"를 알려주는 속성이 없습니다. 대신 rVFC는
// 프레임이 화면에 표시될 때마다 그 프레임의 정확한 정보(metadata)를 줍니다.
// 재생 중 "표시된 프레임 수(presentedFrames) ÷ 흐른 영상 시간(mediaTime)"
// 으로 fps를 계산해요. (23.976·29.97 같은 소수점 fps도 그대로 잡힘)
let currentFps = 30;                  // 감지 전/미지원 시 폴백값
const fpsValue = $("fpsValue");

function detectFps() {
  // rVFC 미지원 브라우저(구형 등)는 기본값으로 폴백
  if (!video.requestVideoFrameCallback) { fpsValue.textContent = "~30"; return; }

  let base = null;                    // 측정 시작 기준점
  const onFrame = (now, meta) => {
    if (base === null) {
      base = { frames: meta.presentedFrames, time: meta.mediaTime };
    } else {
      const df = meta.presentedFrames - base.frames;   // 그동안 표시된 프레임 수
      const dt = meta.mediaTime - base.time;            // 그동안 흐른 영상 시간(초)
      if (df >= 20 && dt >= 0.5) {                      // 표본이 충분하면 확정
        currentFps = df / dt;
        fpsValue.textContent = String(Math.round(currentFps));
        return;                                          // 콜백 재등록 중단 = 감지 완료
      }
    }
    video.requestVideoFrameCallback(onFrame);            // 다음 프레임 계속 관찰
  };
  video.requestVideoFrameCallback(onFrame);
}

// 새 영상이 준비될 때마다 다시 감지 (재생을 시작하면 값이 채워집니다)
video.addEventListener("loadedmetadata", () => {
  currentFps = 30;
  fpsValue.textContent = "⋯";
  detectFps();
});

// ── 9) 프레임 단위 이동 ─────────────────────────────────────
// 중요: 브라우저는 "프레임 번호"를 직접 다루지 못하고 "시간(초)"만 압니다.
// 그래서 1프레임 = (1 / fps) 초 라고 보고 그만큼 currentTime을 움직입니다.
// fps는 위 8번에서 자동 감지한 값(currentFps)을 씁니다.
// → 시간 기반 근사라 정밀 편집용은 아니지만, 학습/대략적인 용도엔 충분합니다.
function stepFrame(direction) {
  if (!video.src) return;
  video.pause();                       // 프레임 이동은 멈춘 상태에서 하는 게 자연스러움
  video.currentTime += direction * (1 / currentFps);
}
prevFrame.addEventListener("click", () => stepFrame(-1));
nextFrame.addEventListener("click", () => stepFrame(1));

// ── 10) 전체화면 ────────────────────────────────────────────
// requestFullscreen / exitFullscreen 는 표준 API.
fullscreen.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    player.requestFullscreen();
  }
});

// ── 11) PiP (화면 속 화면) ──────────────────────────────────
// 영상을 작은 떠 있는 창으로 빼서, 다른 작업을 하면서도 계속 볼 수 있게 합니다.
// 표준 API: video.requestPictureInPicture() / document.exitPictureInPicture()
const pipBtn = $("pip");
if (document.pictureInPictureEnabled) {
  pipBtn.addEventListener("click", async () => {
    try {
      // 이미 PiP면 닫고, 아니면 연다 (document.pictureInPictureElement 로 현재 상태 확인)
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) { /* 사용자가 취소했거나 일시적으로 불가능한 상황 — 무시 */ }
  });
} else {
  pipBtn.hidden = true;   // 미지원 브라우저에선 버튼 자체를 숨김
}

// ── 12) 키보드 단축키 ───────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // 입력 요소(볼륨 슬라이더 등)에 포커스가 있을 땐 단축키 무시
  if (e.target.matches("input, select")) return;

  switch (e.key) {
    case " ":
    case "k":
      e.preventDefault();              // Space가 페이지 스크롤하는 것 방지
      togglePlay();
      break;
    case "ArrowRight": video.currentTime += 5; break;
    case "ArrowLeft":  video.currentTime -= 5; break;
    case ".": stepFrame(1);  break;    // 한 프레임 앞으로
    case ",": stepFrame(-1); break;    // 한 프레임 뒤로
    case "ArrowUp":
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      break;
    case "ArrowDown":
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      break;
    case "m": video.muted = !video.muted; break;
    case "f": fullscreen.click(); break;
    case "p": pipBtn.click(); break;   // 화면 속 화면
  }
});
