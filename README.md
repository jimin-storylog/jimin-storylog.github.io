# JIMIN IM — Still Photographer Portfolio (3차 · 작품별 갤러리 + 직접 관리자)

임지민 님의 스틸 포토그래퍼 포트폴리오입니다.
기존 크리에이터링크 사이트의 공개 사진과 전체 필모그래피를 담았고,
이제 **작품별 갤러리**와 **`/admin/` 직접 관리 페이지**로 운영할 수 있습니다.

- 공개 주소: https://jimin-storylog.github.io/
- 관리자: https://jimin-storylog.github.io/admin/  (검색엔진 noindex)

## 파일 구성

```
portfolio-site/
├── index.html              # 메인 페이지 (작품은 JS로 그림 · 내장 fallback 포함)
├── styles.css              # 디자인 · 반응형 · 작품 뷰어
├── script.js               # works.json → 갤러리/뷰어, filmography.json → 탭
├── admin/
│   ├── index.html          # /admin/ 관리자 화면 (noindex)
│   ├── admin.css
│   └── admin.js            # GitHub Contents API 로 사진·데이터 커밋
├── data/
│   ├── works.json          # 작품 데이터 (제목·연도·기여도·분류·사진들)
│   ├── filmography.json    # 필모그래피 (카테고리별 연도·내용)
│   └── image-sources.json  # 기존 사진 출처 기록
├── assets/
│   ├── work/               # 기존 공개 사진 14장
│   ├── uploads/            # /admin/ 에서 올린 사진이 저장되는 곳
│   ├── archive/            # 1차 시안 AI 샘플 (참고용, 배포 제외)
│   └── favicon.svg
├── sitemap.xml · robots.txt
├── tools/
│   ├── sync-fallback.py         # works.json → index.html 내장 목록 동기화
│   └── build-filmography.py     # 필모그래피 내장 목록 재생성
└── live-v3-*.png           # 배포 후 실제 화면 확인용 스크린샷
```

## 작품 데이터 (`data/works.json`)

```json
{
  "works": [
    {
      "id": "drama-still",
      "year": "2026",
      "title": "《멋진 신세계》",
      "contribution": "메인 스틸",
      "category": "still",
      "cover": "assets/uploads/drama-still-....jpg",
      "photos": [
        { "src": "assets/work/still-01.jpg", "caption": "따뜻한 빛 속에 앉은 배우", "w": 1600, "h": 1066 }
      ]
    }
  ]
}
```

- `category`: `still`(스틸) · `performance`(공연) · `behind`(비하인드) · `documentary`(다큐)
- `cover`: 카드에 보이는 대표 사진. `photos` 안의 경로와 같으면 그 사진부터 뷰어가 열립니다.
- `year`가 비어 있으면 카드에서 연도를 감출 뿐, 나머지는 그대로 나옵니다.
- 작품이 6개 미만이면 분류 필터가 자동으로 숨겨집니다(한 칸짜리 필터를 피하려고).

`index.html` 안에는 같은 목록이 `worksFallback` 스크립트로 한 벌 들어 있습니다.
`data/works.json`을 손으로 고쳤다면 아래를 실행해 둘을 맞춰 주세요.

```bash
python3 tools/sync-fallback.py
```

## `/admin/` 으로 직접 고치기

1. https://jimin-storylog.github.io/admin/ 접속
2. **GitHub 토큰 만들기** 링크 → Note는 그대로, Expiration은 90 days 이상, **repo** 칸만 체크 → Generate token → `ghp_…` 복사
3. 토큰을 붙여 넣고 **로그인** (토큰은 그 브라우저의 localStorage에만 저장됩니다)

할 수 있는 일:

- 작품 순서 바꾸기(↑↓), 새 작품 추가, 수정, 삭제
- 연도 · 제목 · 참여 기여도 · 분류 입력
- 대표 사진 1장 + 세부 사진 여러 장 업로드, 순서 변경, 대표 지정, 삭제
- 필모그래피 탭에서 연도·내용 고치기, 행 추가/삭제
- **저장하고 사이트에 반영** → 사진은 `assets/uploads/`에, 데이터는 `data/works.json`·`data/filmography.json`에 커밋되고 GitHub Pages가 1~2분 뒤 다시 배포

사진은 올릴 때 브라우저에서 **긴 변 1600px · JPEG 품질 0.85**로 자동 변환되므로,
폰으로 찍은 고용량 사진도 그대로 올리면 됩니다. (아이폰 HEIC는 JPEG로 변환 후 업로드)

토큰 없이도 **미리 보기**로 화면과 편집 동작을 확인할 수 있습니다(저장만 안 됨).

## 필모그래피

`data/filmography.json`이 원본입니다.

```json
{ "categories": [ { "id": "drama", "label": "드라마", "items": [ { "year": "2026", "text": "tvN '해오름달 열이레'" } ] } ] }
```

사이트는 이 파일을 읽어 탭을 그립니다. 파일을 못 읽으면 `index.html`에 들어 있는 목록을 그대로 보여 줍니다.
내장 목록을 다시 만들려면:

```bash
python3 tools/build-filmography.py > /tmp/filmography.html
```

출력물을 `<div id="filmographyBody">` 안에 붙여 넣으면 됩니다.

## 로컬에서 보기

```bash
cd portfolio-site
python3 -m http.server 8000
# http://localhost:8000        메인
# http://localhost:8000/admin/ 관리자 (미리 보기 모드)
```

`index.html`을 파일로 바로 열어도 내장 목록으로 동작합니다.
(`/admin/` 미리 보기는 서버로 열어야 합니다.)

## 배포

`deploy/jimin-storylog.github.io/` 가 실제 저장소(`main` 브랜치 루트)에 올라가는 폴더입니다.
`index.html`·`styles.css`·`script.js`·`data/`·`admin/`·`assets/work`·`assets/uploads`·`sitemap.xml`·`robots.txt`·`.nojekyll` 만 복사하고
`preview-*.png`, `live-*.png`, `assets/archive`, `tools` 는 올리지 않습니다.

```bash
cd deploy/jimin-storylog.github.io
git add -A && git commit -m "..." && git push
```

## 참고

- 폰트: Pretendard(한글) + Inter / IBM Plex Mono(영문) CDN. 오프라인에서는 시스템 폰트로 대체됩니다.
- 작품 뷰어: 좌우 버튼 · ←/→ 키 · 모바일 스와이프 · 썸네일로 사진 이동, ESC로 닫기.
- 사진은 기존 사이트에 공개된 이미지이며, 원본 URL은 `data/image-sources.json`에 있습니다.
