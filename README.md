# JIMIN IM — Still Photographer Portfolio (4차 · Travel 섹션 + 작품별 갤러리 + 직접 관리자)

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
│   ├── travel.json         # 여행 6개 여정 (지역·연도·설명·사진들)
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
│   ├── build-works-from-filmography.py  # filmography.json → works.json 작품 미리 생성
│   └── build-filmography.py     # 필모그래피 내장 목록 재생성
└── live-v4-*.png           # 배포 후 실제 화면 확인용 스크린샷(데스크톱·모바일·전체)
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

- `category`: `still`(스틸) · `performance`(공연) · `behind`(비하인드) · `documentary`(다큐멘터리) · `event`(행사) · `product`(제품)
- `cover`: 카드에 보이는 대표 사진. `photos` 안의 경로와 같으면 그 사진부터 뷰어가 열립니다.
- `year`가 비어 있으면 카드에서 연도를 감출 뿐, 나머지는 그대로 나옵니다.
- **사진이 없는 작품(`cover`도 `photos`도 비어 있음)은 공개 사이트에 나오지 않습니다.**
  `data/works.json`에는 필모그래피 전체 작품이 미리 들어 있어 `/admin/` 목록에는 다 보이지만,
  Selected Works 그리드와 분류별 개수(`전체`·`스틸`·`공연`·`비하인드`·`다큐멘터리`·`행사`·`제품`)는
  사진이 1장 이상 있는 작품만 셉니다. 사진을 올려 저장하면 그때부터 공개 사이트에 나타납니다.
- 분류 필터는 `전체` + 대표 카테고리 6개(`스틸`·`공연`·`비하인드`·`다큐멘터리`·`행사`·`제품`)가 항상 이 순서로 표시됩니다.
  작품이 아직 없는 분류도 개수 `0`으로 남아 있고, 누르면 빈 상태 안내가 나옵니다.
- 대표 썸네일은 4/3/2열 메이슨리(`column-count`)로 배치되고, 사진은 잘리지 않고 원래 비율대로 나옵니다.

`index.html` 안에는 같은 목록이 `worksFallback` 스크립트로 한 벌 들어 있습니다.
`data/works.json`을 손으로 고쳤다면 아래를 실행해 둘을 맞춰 주세요.

```bash
python3 tools/sync-fallback.py
```

`data/filmography.json`에 이력이 있는데 `data/works.json`에 아직 작품으로 없는 것들을
한꺼번에 만들어 두려면(사진은 비어 있는 채로):

```bash
python3 tools/build-works-from-filmography.py
```

이미 작품으로 있는 것(제목+연도)은 건너뛰고, 사진이 있는 작품을 먼저 · 그 뒤 사진 미등록 작품을
연도 최신순으로 정리합니다. 여러 번 실행해도 중복이 생기지 않습니다.

## Travel

사이트의 두 번째 섹션(`02 Travel`)입니다. 작품(`works.json`)과 섞이지 않도록 `data/travel.json`에 따로 둡니다.

```json
{
  "journeys": [
    {
      "id": "tokyo-japan",
      "label": "도쿄-일본",
      "title": "도쿄",
      "region": "일본",
      "year": "2024",
      "desc": "한 줄 설명 (선택)",
      "cover": "assets/uploads/travel-tokyo-japan-....jpg",
      "photos": [ { "src": "assets/uploads/travel-tokyo-japan-....jpg", "caption": "", "w": 1600, "h": 1067 } ]
    }
  ]
}
```

- 여정 6개가 미리 들어 있습니다: `도쿄-일본` · `뉴욕-미국` · `부에노스아이레스-아르헨티나` ·
  `피엘라벤 클래식-스웨덴•튀르키예` · `산티아고 순례길-스페인•포르투갈•네덜란드•그리스` ·
  `안나푸르나 트레킹-네팔•인도•스리랑카•인도네시아`.
- `label`은 사이트 필터 칩에 그대로, `title`·`region`은 카드와 뷰어에 쓰입니다. 비워 두면 `제목-지역`으로 자동으로 만듭니다.
- 사진이 없는 여정은 필터 칩에 개수 `0`으로 남고, 누르면 `이 여정에는 아직 등록된 사진이 없습니다.` 안내가 나옵니다.
  사진을 올려 저장하면 그 여정부터 4/3/2열 메이슨리 카드로 나타나고, 카드를 누르면 작품과 같은 뷰어로 크게 볼 수 있습니다.


## `/admin/` 으로 직접 고치기

1. https://jimin-storylog.github.io/admin/ 접속
2. **GitHub 토큰 만들기** 링크 → Note는 그대로, Expiration은 90 days 이상, **repo** 칸만 체크 → Generate token → `ghp_…` 복사
3. 토큰을 붙여 넣고 **로그인** (토큰은 그 브라우저의 localStorage에만 저장됩니다)

할 수 있는 일:

- 작품 순서 바꾸기(↑↓), 새 작품 추가, 수정, 삭제
- 연도 · 제목 · 참여 기여도 · 분류 입력
- 대표 사진 1장 + 세부 사진 여러 장 업로드, 순서 변경, 대표 지정, 삭제
- **여행 탭**에서 여정 6개의 대표 사진·사진 여러 장 업로드, 연도·국가·한 줄 설명 입력, 순서 바꾸기, 새 여정 추가·삭제
- 필모그래피 탭에서 연도·내용 고치기, 행 추가/삭제
- **저장하고 사이트에 반영** → 사진은 `assets/uploads/`에, 데이터는 `data/works.json`·`data/travel.json`·`data/filmography.json`에 커밋되고 GitHub Pages가 1~2분 뒤 다시 배포

작품 목록 쓰는 법:

- 위쪽 탭 **전체 / 사진 있음 / 사진 미등록** 으로 사진을 올릴 차례인 작품만 골라 볼 수 있습니다(괄호 안은 개수).
- 오른쪽 **작품 제목 검색**에 제목(연도·방송사도 됨)을 치면 바로 걸러집니다. 띄어쓰기가 달라도 찾습니다.
- 사진이 없는 작품은 썸네일 자리에 **사진 대기**, 목록에 **사진 미등록** 배지가 붙습니다.
  목록의 글자를 누르면 바로 그 작품의 편집 화면이 열려 사진을 올릴 수 있습니다.
- 사진 없이도 작품 정보를 저장할 수 있습니다(그동안은 공개 사이트에 나오지 않음).
  필터나 검색으로 목록을 걸러 놓은 동안에는 ↑↓ 순서 바꾸기가 잠깁니다 — 전체 보기에서 바꿔 주세요.

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
- 섹션 순서: `01 Selected Works` → `02 Travel` → `03 Filmography` → `Contact`. 상단 메뉴도 Work · Travel · Filmography · Contact 순서입니다.
- 작품 뷰어: 좌우 버튼 · ←/→ 키 · 모바일 스와이프 · 썸네일로 사진 이동, ESC로 닫기. 작품과 여행 사진이 같은 뷰어를 씁니다.
- 사진 크기 규칙(v9): 사진은 언제나 스테이지(캔버스) 전체를 상자로 쓰고 `object-fit: contain`으로 비율을 지킨 채 최대 크기로 그려집니다. 파일 해상도(픽셀 수)가 작아도 화면에 맞게 확대되며, 폰에서는 좌우 여백 없이 기기 폭을 그대로 씁니다. 가로로 눕힌 폰처럼 세로가 560px 이하인 화면에서는 제목·썸네일을 줄여 사진 자리를 넓힙니다.
- 사진은 기존 사이트에 공개된 이미지이며, 원본 URL은 `data/image-sources.json`에 있습니다.
