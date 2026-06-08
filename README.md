# 🎬 video-player

순수 HTML/CSS/JavaScript(라이브러리 0개)로 만든 미니 비디오 플레이어.
[Plyr](https://github.com/sampotts/plyr) 같은 커스텀 플레이어가 내부에서 어떻게
동작하는지 **직접 배선해보며 배우는** 학습용 프로젝트입니다.

## 기능

- 📂 파일 열기 / 드래그 앤 드롭으로 영상 로드
- ▶️ 재생 / 일시정지 (버튼·영상 클릭·스페이스바)
- 🎯 클릭·드래그로 탐색(seek)되는 진행바 + 버퍼링 구간 표시
- 🔊 볼륨 슬라이더 / 음소거
- ⏩ 배속 조절 (0.25x ~ 2x)
- 🎞️ 프레임 단위 앞뒤 이동 (fps 자동 감지)
- 🖼️ PiP (화면 속 화면)
- ⛶ 전체화면
- ⌨️ 키보드 단축키

## 실행 방법

### 방법 1 — 로컬 서버 (권장)

```bash
npm install   # 최초 1회 (http-server 설치)
npm start     # http://localhost:8080 자동 열림
```

> 영상 **탐색(seek)**이 매끄러우려면 서버가 HTTP **Range 요청**을 지원해야 하는데
> `http-server`가 이를 지원합니다. 파일을 직접 열어도 대부분 동작하지만, 일부
> 환경에선 seek 등 일부 기능이 제한될 수 있어 로컬 서버를 권장해요.

### 방법 2 — 그냥 파일 열기 (설치 없음)

```bash
open index.html        # macOS
```

## 배운 핵심 개념

`<video>` 요소를 JS로 제어하는 법:

| 기능 | 핵심 API |
| --- | --- |
| 재생/정지 | `video.play()` · `video.pause()` · `video.paused` |
| 탐색 | `video.currentTime` |
| 길이 | `video.duration` |
| 볼륨/음소거 | `video.volume` · `video.muted` |
| 배속 | `video.playbackRate` |
| 프레임 이동 | `video.currentTime += 1 / fps` |
| fps 자동 감지 | `video.requestVideoFrameCallback` |
| UI 동기화 | `timeupdate` · `play` · `pause` · `volumechange` 이벤트 |

> 💡 브라우저는 **프레임 번호가 아니라 시간(초)** 으로만 영상을 다룹니다.
> 그래서 프레임 이동은 `1 / fps` 초를 더하는 **근사 방식**입니다.
>
> 그런데 브라우저엔 영상의 fps를 알려주는 속성이 없어서,
> `requestVideoFrameCallback`로 재생 중 "표시된 프레임 수 ÷ 흐른 시간"을
> 계산해 fps를 **자동 감지**합니다. (23.976·29.97 같은 소수점 fps도 잡힘)

## 파일 구조

```
video-player/
├── index.html       # 구조 (마크업)
├── style.css        # 모양 (레이아웃·색)
├── player.js        # 동작 (모든 로직, 주석 상세)
├── sample/
│   └── sample1.mp4  # 기본 데모 영상
└── README.md
```
