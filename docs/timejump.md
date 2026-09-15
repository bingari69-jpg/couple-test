# 타임 점프 (`t/timejump/`)

병아리가 편지를 들고 다섯 시대(원시시대 → 고대 이집트 → 중세 → 산업시대 → 미래 우주)를 건너 우체통까지 가는 플랫포머.

## 파일
- `t/timejump/engine.js` — DOM 없는 판(스테이지 5개·물리). Node에서 `require`로 불러 검사한다.
- `t/timejump/index.html` — 시대 고르기·조작 버튼·캔버스 그리기·대결/혼자놀기 연결.
- `scripts/timejump-routes.cjs` — 빔 탐색으로 넘어짐 없는 클리어 경로를 찾아 `test/timejump-routes.json`에 저장.
- `scripts/timejump-preview.cjs` — 실제 페이지를 Edge로 열어 경로를 따라가며 `output/timejump/`에 장면 캡처.
- `test/timejump.js` — 경로 재생·물리 규칙·링크·혼자놀기·두 손가락 입력 검사.
- `assets/art/timejump.svg`(홈 카드), `assets/share-cards/timejump.png`(OG·카톡 카드, `build-share-cards.cjs`의 페이지 전용 항목).

## 규칙
- 16ms 고정 걸음. 달리기 125px/s, 점프 높이 약 4.4칸·거리 약 4.6칸(한 칸 18px). 짧게 누르면 낮게 뛴다. 발판 끝 늦은 점프 96ms, 미리 누른 점프 128ms.
- 3단 점프: 공중에서 점프를 두 번 더 누를 수 있다(같은 힘). 땅에 닿거나 적을 밟으면 다시 채워진다. 화면 맨 위는 천장이라 3단이면 꼭대기에서 멈춘다.
- 적은 위에서 밟으면 사라지고 튀어 오른다. 옆에서 닿거나 가시·구멍이면 넘어짐 → 0.6초 뒤 마지막 깃발에서 다시(1초 무적), 시간은 계속 흐른다.
- 적·움직이는 발판 위치는 걸음 수만으로 정해져 두 사람이 같은 코스를 받는다(시드 없음).
- 둘이하기: 보내는 사람이 시대를 고르고 링크에 `l`(시대)·`d`(넘어짐)를 싣는다. 기록 = 걸린 시간(ms), 짧을수록 승, 같으면 덜 넘어진 쪽. 5분이 지나면 5분으로 기록.
- 혼자놀기: `solo.js` 5단계. 제한 시간(90·120·150·180·210초) 안에 도착하면 클리어, ★★★은 최단 경로 시간의 약 1.4배.

## 스테이지를 고칠 때
1. `engine.js`의 `LEVELS[n].build`를 고친다.
2. `node scripts/timejump-routes.cjs`(또는 `ONLY=3`)로 경로를 다시 찾는다. 경로가 없으면 가장 멀리 간 칸을 알려준다.
3. `index.html`의 `LEVELS[].best`가 새 최단 시간의 1.3배 이상인지 확인(`test/timejump.js`가 검사).
4. `node scripts/timejump-preview.cjs`로 화면 확인.

## 운영
- 운영 SQL 없이 동작한다. 홈 목록은 로컬 목록을 서버 게시본 끝에 붙이고, 통계 이벤트는 게임 이름 제한이 없다.
- 완료 알림(`result-notify.js`)은 넣지 않았다. 넣으려면 `game_catalog`·완료 알림 허용 목록 SQL이 함께 필요하다.
- 관리센터에서 초안 저장→게시를 한 번 하면 게시본 게임 목록에도 들어간다.
