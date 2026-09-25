# You_To_NotebookLM

YouTube 재생목록을 Gemini NotebookLM으로 붙여넣기.

NotebookLM은 **재생목록 URL을 소스로 받지 않고**, 캡션이 있는 **공개 동영상 URL만 하나씩** 받습니다.
이 저장소는 재생목록을 개별 동영상 URL로 풀어서 NotebookLM에 바로 붙여넣을 수 있게 해 주는 두 가지 도구를 제공합니다.

| | 1. 아이폰 단축어 | 2. 웹앱 |
|---|---|---|
| 사용 위치 | YouTube 앱 공유 시트 | 아이폰/PC 브라우저 (홈 화면 추가 가능) |
| 준비물 | 없음 | YouTube Data API 키 (무료) |
| 재생목록 최대 | 100개 | 제한 없음 (자동 페이지 넘김) |
| 비공개/삭제 영상 제외 | – | ✅ 자동 제외 |
| 묶음 나눠 복사 | – | ✅ 1/10/20/50개씩 |

## 1. 아이폰 단축어

만드는 방법: **[shortcut/README.md](shortcut/README.md)**

공유 → **NotebookLM에 보내기** → (재생목록이면) 영상 URL 전체가 클립보드에 복사되고 NotebookLM이 열립니다.
NotebookLM에서 **+ 소스 추가 → 웹사이트/YouTube → 붙여넣기 → 삽입**.

## 2. 웹앱

`app/` 폴더의 정적 웹페이지입니다. 서버·빌드가 필요 없습니다.

### 배포 (GitHub Pages)

1. 이 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions** 선택
2. `main` 브랜치에 병합하면 `.github/workflows/pages.yml` 이 테스트 후 자동 배포
3. 주소: `https://<GitHub 아이디>.github.io/You_To_NotebookLM/`
4. 아이폰 사파리에서 열고 **공유 → 홈 화면에 추가** 하면 앱처럼 사용

### YouTube API 키 발급 (1회)

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성
2. **API 및 서비스 → 라이브러리 → YouTube Data API v3 → 사용**
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
4. (권장) 키 제한: **애플리케이션 제한 → 웹사이트** 에 `https://<GitHub 아이디>.github.io/*` 추가, **API 제한 → YouTube Data API v3**
5. 웹앱 **설정**에 키 입력 (이 기기 브라우저에만 저장됨)

재생목록 50개당 API 할당량 약 1단위를 쓰며, 무료 일일 할당량(10,000)이면 충분합니다.

### 사용법

1. 재생목록 URL 붙여넣기 → **영상 목록 가져오기**
2. 묶음별 **복사** → NotebookLM **+ 소스 추가 → 웹사이트/YouTube** 에 붙여넣기 → **삽입**
3. 다음 묶음 반복 (복사한 묶음에는 ✓ 표시)

`?url=<재생목록 URL>` 을 붙여 열면 자동 실행됩니다(단축어 연동용).
동영상 URL만 여러 개 넣을 때는 API 키가 없어도 됩니다.

## 개발

```bash
npm test          # URL 파싱·API 로직 단위 테스트 (Node 20+)
npm run serve     # http://localhost:8080 에서 웹앱 실행
```

- `app/lib.js` — URL 파싱, 재생목록 조회(YouTube Data API v3), 묶음 나누기
- `app/index.html` — UI
- `shortcut/README.md` — 아이폰 단축어 제작 가이드
