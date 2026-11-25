# JIMIN IM — Still Photographer

임지민(JIMIN IM)의 스틸 포토그래퍼 포트폴리오 사이트입니다.
드라마·영화·공연 스틸, 비하인드 컷과 전체 필모그래피를 볼 수 있습니다.

- 사이트: https://jimin-storylog.github.io/
- 작업: 드라마 · 영화 스틸 / 공연 / 비하인드 / 다큐멘터리 (13점)
- 필모그래피: 드라마 26 · 공연 18 · 뮤직비디오 6 · 광고 3 · 행사 13 · 기타 10
- 문의: twotwothree@kakao.com · @hej.jjimin

## 구성

```
index.html    페이지 마크업 (Work · Filmography · Contact)
styles.css    디자인 · 반응형 스타일
script.js     카테고리 필터, 필모그래피 탭, 라이트박스
assets/
  work/       작업 사진 14장 (히어로 1 + 갤러리 13)
  favicon.svg
```

빌드 도구 없이 순수 HTML / CSS / JS로 동작합니다. `main` 브랜치 루트가 GitHub Pages로 배포됩니다.

## 수정 방법

- **사진 교체** — `assets/work/`에 새 파일을 넣고 `index.html`의 `src`를 바꿉니다. `width`/`height`는 실제 파일 크기로 맞춰 주세요.
- **사진 추가** — `<figure class="still ..." data-still data-cat="...">` 블록을 복사합니다. `data-cat`은 `still` / `performance` / `behind` / `documentary` 중 하나이고, 필터 버튼 옆 숫자(`filter__n`)도 함께 고칩니다.
- **필모그래피** — `index.html`의 `.fo-row` 한 줄을 고치거나 추가합니다. 탭별 건수(`tab__n`)도 함께 맞춥니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

폰트(Pretendard · Inter · IBM Plex Mono)는 CDN에서 불러오며, 오프라인에서는 시스템 폰트로 대체됩니다.

## 저작권

© 2026 JIMIN IM. 사진과 글의 무단 사용을 금합니다.
