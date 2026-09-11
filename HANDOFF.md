# 같이놀자 HANDOFF

최종 정리: 2026-09-12 (Asia/Seoul)

## 서비스와 현재 배포

- 서비스명: 같이놀자. 카카오톡 링크로 편지·게임·심리 콘텐츠를 주고받는 정적 웹사이트.
- 공개 주소: https://bingari69-jpg.github.io/couple-test/
- 저장소: https://github.com/bingari69-jpg/couple-test (배포 브랜치 `main`, GitHub Pages).
- 로컬 프로젝트: `C:/Users/USER/Desktop/couple-test`, 미리보기 `http://127.0.0.1:4173/`.
- Supabase 공용 상태 저장소와 단체방·완료 알림이 연결되어 있다.
- 관리자 모드 코드와 운영 Supabase SQL 적용, 첫 관리자 계정 등록이 완료됐다.

## 작업 디렉터리 주의사항

- 이 대화의 배포는 `tmp/ui-release`의 별도 Git checkout에서 수행했다. 해당 checkout이 최신 main 이력이다.
- 상위 작업 폴더의 Git HEAD는 이전 `43c60f6`에 남아 있고, 최신 파일들이 수정/미추적 상태로 존재한다. 이는 미배포라는 뜻이 아니다.
- 상위 폴더를 무작정 reset/clean하거나 전체 staging하지 말 것. 사용자의 파일을 보존하면서 최신 원격과 비교할 것.
- 후속 작업은 최신 main을 새 checkout으로 받거나 기존 `tmp/ui-release`의 상태를 확인한 뒤 계속하는 것이 안전하다.
- 이 handoff, 연구 자료, 남아 있던 편지 공유 보완을 최신 배포 checkout에 함께 커밋한다.
- `tmp/`, `design-previews/`, `output/`은 로컬 작업 산출물로 제외. 보존할 국제 조사 원고와 PDF는 `docs/research/`로 복사했다.

## 완료된 작업

### 편지

- 새 편지 한도 450자, 표시 `0/450`. 초과 글을 임의로 자르지 않고 전송을 막는다.
- 받는 화면 CTA를 '답장하기'로 변경. 기존 버전 링크 읽기 유지.
- 편지·편지지·글꼴·크기·수신/발신 이름을 링크로 복원. 서버에 본문을 저장하지 않는다.
- 이번 마무리 커밋: 로컬에 남아 있던 '카톡 공유 중 오류가 났나요? → 이미지 없이 보내기' 보완을 반영한다.
- 기본 발송은 통일된 이미지 피드. 텍스트형 발송은 사용자가 선택하는 오류 재시도 경로만 유지한다.
- 공유 작업이 끝날 때까지 두 전송 버튼을 잠그고, 실패하면 링크 복사를 제공한다.
- 수정 파일: `assets/letter-app.js`, `t/letter/index.html`, `test/letter.js`.

### 게임 UI·취향 맞히기·심리 메뉴

- 기존 19개 게임에 따뜻한 공통 UI와 게임별 캐릭터 적용. `assets/game-ui.js/css`.
- 내 취향 맞혀봐: 4개 순위 정하기에서 3개 보기 중 최애 하나 선택으로 간소화. 3문항, 초대/결과 비교.
- 심리 메뉴 `/t/psychology/`에 마음동물, 오늘의 운세, 타로 및 기존 심리 콘텐츠 연결.
- 나와 너의 마음동물: A의 응답 봉인 → B의 6문항 응답 → 둘의 동물/비교 공개 → 결과 답장.
- 오늘의 운세: 한국 날짜 기준 하루 카드, 공유 결과와 본인의 오늘 카드 보관을 분리.

### 나와 너의 타로 v2

- `/t/tarot/`, 보라·금색 밤 테마, 별 두건 병아리로 마스코트 통일.
- 22장 부채꼴을 가로 스크롤. 선택 표시 후 '이 카드로 할게'로 확정.
- A는 자기 카드 앞면·키워드만 먼저 본다. 전체 해석·B·우리 카드는 B 참여 후 공개.
- 새 초대: `#c=`에 `{v:2,s,t,a,n}`. 결과: `#r=`에 `{c,n,b}`.
- 시드로 A/B 별도 순열을 생성하며 두 사람의 같은 카드 선택 허용. 조언은 두 카드와 겹치지 않는 결정론적 카드.
- 기존 v1 초대/결과 링크 지원: 이전 3장 선택과 원래 카드 구성을 그대로 유지.
- 결과는 나/너/우리 세 장을 직접 탭해서 순서대로 개봉. 2축 상징 지도, 별칭 조합명, 같은 카드 특별 문구, 대화 질문 복사.
- 22장 원고, 축 좌표, 주제별 18개 패턴 문단, 같은 카드 원고 포함. 점수형 궁합 없음.
- 같은 브라우저의 참여 기록으로 관점 결정. 다른 기기/알 수 없는 관점에서는 이름을 선택하게 한다.
- sessionStorage로 본인/응답 기록 보관. '봉인'은 화면 연출이며 암호학적 비밀 보장이 아니다.
- 핵심 파일: `assets/tarot-engine.js`, `tarot-deck.js`, `tarot.js`, `tarot.css`, `t/tarot/index.html`.
- `test/tarot-golden.json`에 시드→배치/카드/축 패턴 고정. 484쌍 조언 비중복과 패턴 대칭 검사.

### 카카오 공유 오류 수정·25종 메시지 통일

- 이전 오류 원인: 이미지 없는 콘텐츠가 `textOnly:true`를 보냈는데 공개 공통 모듈이 이를 무시하고 imageUrl 없는 피드를 생성.
- `assets/kakao-share.js`: 텍스트/피드 지원, Promise 반환, SDK 비동기 오류 처리, 정확한 원본 링크 보존.
- 이후 사용자 요청으로 기본 공유를 전부 이미지 피드로 통일. 초대/결과 모두 단일 버튼, 게임별 제목·설명, 800×480 이미지.
- `assets/share-cards/`: 25개 PNG와 catalog.json. 기존 게임별 캐릭터와 공통 브랜드·배치 사용.
- `scripts/build-share-cards.cjs`: 공유 이미지 재생성. Node/Playwright/브라우저 필요. 기본 경로는 현재 Windows 환경; `PLAYWRIGHT_PATH`, `BROWSER_PATH`로 변경 가능.
- 가위바위보 별도 SDK 코드를 공통 모듈에 연결. 페이지 OG 이미지도 새 이미지로 변경.
- 카카오 메시지 하단 앱 이름 '같이해봐'는 개발자 콘솔 변경 사항이며 아직 바꾸지 않았다.
- 통일 적용은 새로 보내는 메시지 기준. 기존 카톡 메시지/외부 스크랩 캐시는 별개.
- 실제 수신자에게 메시지는 보내지 않았다. 테스트는 실제 페이지 핸들러·공유 모듈을 거치고 SDK 경계만 모의 처리.

### 내기 패널 v2 (10개 승패 게임)

- 대상: rps, ten, react, num25, mole, ufo, tap, stroop, arrow, stop.
- 사용자가 승인한 시안에 맞춰 '이번 판, 뭐 걸까?'를 이름 설정 접힘 메뉴 밖에 표시.
- 첫 선택: 커피 한 잔 / 밥 한 끼(기존 payload `점심` 유지) / 업어주기.
- '판 키우기 😈': 내 자동차 / 내 전 재산 / 내 인생 / 지구 소유권. 선택별 반응과 게임별 마스코트.
- 허세 내기 안내 및 장난임이 드러나는 결과 문구. 실제 자산 이전/결제 기능은 없다.
- 그냥 하기 / 직접 입력 / 다른 내기도 보기. 기존 내기값·옛 도전장·무승부·재도전 승계 보존.
- 기록 완료 뒤 내기를 변경하면 도전장 링크도 다시 생성하도록 보완.
- 받는 사람은 초대에 정해진 내기를 확인하며 변경 불가. 별도 '내기 동의/거절' 단계는 아직 구현하지 않았다.
- `test/golden.json`은 '그냥 하기' 기본 선택에 따른 3개 기대값만 갱신; 기존 승패/링크 결과는 동일.

### Supabase 1차 연결·단체방

- Supabase 프로젝트 `couple-test`(서울)를 생성했고 익명 로그인을 켰다. 공개 URL·publishable key만 브라우저 코드에 사용한다.
- `site_settings`, `game_catalog`, `ad_slots`와 25개 콘텐츠 기본값 생성 완료. 홈은 `assets/supabase-data.js`로 공개 게임 목록을 읽고, 실패 시 로컬 목록을 그대로 사용한다.
- `supabase/migrations/20260911_group_rooms.sql` 실행 완료. 방 만들기/코드 참가/준비/전원 제출/한 번만 결과 확정/Realtime 갱신을 구현했다.
- 단체방 화면: `t/group-room/`, `assets/group-room-service.js`, `group-room.js`, `group-room.css`. 사다리 페이지에서 진입 가능.
- 실제 Supabase에 익명 사용자 2명으로 방 생성부터 랜덤 커피 내기 종료까지 통합 검사 완료.

### 게임·테스트 완료 알림

- 대상: 10초·반응속도 등 기록 게임, 가위바위보/넌센스, 배달·MBTI·추락·좌석·결혼·싸움·기억, 취향·마음동물·타로. 편지·운세·사다리·조편성·시험지·단체방은 제외.
- 카카오 초대 URL에 `ch` 완료 코드만 추가한다. 상대가 최종 결과까지 진행해 `responded`가 발생하면 Supabase에 결과를 한 번만 확정한다.
- 보낸 사람의 페이지가 열려 있으면 Realtime으로 즉시 완료 카드와 `결과 보기` 버튼을 표시한다. 다시 방문해도 미확인 결과를 복구한다.
- `화면을 닫아도 알림 받기`는 사용자가 직접 누를 때만 브라우저 알림 권한을 요청한다. 서비스 워커 `sw.js`와 Edge Function `notify-result`가 Web Push를 담당한다.
- RLS상 보낸 사람만 자신의 완료 행을 읽는다. 상대는 비밀 완료 코드로 첫 결과만 기록할 수 있다. 답변/이름을 GA 이벤트에 보내지 않는다.
- 코드: `assets/result-notify.js`, `sw.js`, `supabase/functions/clever-service/index.ts`, `supabase/migrations/20260911_result_notifications.sql`. Dashboard가 배포한 실제 함수 이름은 `clever-service`이며 프런트 호출도 여기에 맞췄다.
- 로컬 비밀키: `supabase/.env.local`(gitignore). 절대 커밋하지 않는다.
- 운영 적용 완료: 완료 알림 SQL migration 실행, Edge Function `clever-service` 배포, VAPID 3개 Supabase Secrets 등록.
- 실제 Supabase에서 익명 사용자 A/B로 초대 생성 → B 완료 → A만 결과 조회 → Edge Function `200 OK`와 전송 준비(`sent: 0`, 아직 구독 기기 없음)까지 검사했다.
- 남은 확인은 실제 휴대폰 A에서 브라우저 알림 허용 후, 휴대폰 B가 게임을 끝냈을 때 알림 수신·결과 열기 실기기 검사다.

### 관리자 모드

- `/admin/`: 이메일·비밀번호 로그인, 운영 현황, 게임·메뉴·디자인·광고, 게시 이력 화면 구현.
- 공개 홈페이지 푸터의 작은 `admin` 링크로 관리센터에 진입한다.
- 공개/숨김/점검을 구분한다. 숨김은 홈 목록에서만 제외하고 점검은 기존 링크에도 안내를 띄운다.
- 초안 저장 → 실제 홈 미리보기 → 게시 → 이전 게시본 복원 흐름. 공개 사이트는 게시본만 읽는다.
- 제목·본문 글꼴, 글자 크기, 강조·보조·바탕색, 서비스 이름을 공통 런타임에서 적용. 타로 색상 테마는 유지.
- 자체 배너와 AdSense 자리를 분리. 홈 목록 중간, 결과 아래, 추천 영역 위를 지원하고 게임별 광고 제외 가능.
- 공개 페이지 이벤트를 개인정보 없이 Supabase에 기록하고 관리자에서 오늘·7일·30일 방문/시작/완료/공유/초대 방문/친구 완료를 조회.
- 관리자 이미지 업로드는 `admin-assets` 공개 bucket을 사용하며 관리자만 쓰기 가능, 이미지 2MB·허용 형식 제한.
- DB 파일: `supabase/migrations/20260911_admin_center.sql`. 적용 안내: `docs/admin-setup.md`.
- 공개 적용 코드: `assets/app-config.js`, `analytics.js`, `home-catalog.js`, `home.js`, `game-ui.js`, `supabase-data.js`.
- 보안: publishable key만 브라우저에 있고 관리자 쓰기는 Auth JWT + `app_admins` + RPC 내부 검사로 제한. RLS 테이블은 직접 접근 불가.
- 로컬 자동 검사와 Edge/Playwright 데스크톱·390px 모바일 화면 검수 완료.
- 운영 Supabase에 관리자 SQL 실행과 Auth 사용자·owner 권한 등록 완료. 공개 관리센터는 `/admin/`에서 사용한다.

### 어린이도 보는 사용설명서

- `/guide/`: 모든 놀이의 공통 흐름을 `내가 먼저 하기 → 카톡 보내기 → 결과 같이 보기` 세 단계로 설명한다.
- 홈의 큰 `처음이야? 10초면 알 수 있어!` 카드는 제거했다. 상단 선택 메뉴의 네 번째 항목 `게임방법`과 푸터에서 `/guide/`로 들어간다.
- `같이놀자♥` 로고 바로 아래에 `카카오톡으로 보내고 같이 놀아요`를 작은 글씨로 표시한다.
- 27개 게임·테스트에 `게임 방법` 버튼, 한 줄 규칙, 3단계, 도움말을 공통으로 제공한다. 처음 방문한 게임은 설명창을 한 번 자동으로 연다.
- 편지는 화면 자체에 작성 단계가 있으므로 게임 방법 버튼과 자동 설명창을 표시하지 않는다.
- 카톡 초대 링크로 들어오면 `친구가 같이 하자고 보냈어요!` 안내를 별도로 표시한다.
- 조작을 미리 알아야 하는 11개 기록 게임만 실제 기록에 들어가지 않는 짧은 연습을 제공한다. 선택·심리·편지·운세·단체 도구에는 불필요한 연습을 넣지 않는다.
- 전용 연습: 10초는 3초 감각, 숫자는 1→2→3, 두더지는 두더지, UFO는 UFO, 연타는 연타 버튼을 사용한다. 반응속도·딱 멈춰·가위바위보·색깔 함정·화살표 함정·넌센스도 각 실제 규칙과 같은 예시를 쓴다.
- 27개 실제 게임 주소를 Playwright/Edge 390px 화면으로 전수 검사해 제목·규칙·3단계·연습 유무가 모두 일치하는지 확인했다.
- 관리센터의 게임 수정 화면에서 규칙·3단계·도움말·연습 종류를 바꿀 수 있다. 내용은 기존 설정 JSON에 함께 저장된다.
- `/admin/guide/`: 초안 저장·미리보기·게시, 게임 상태, 메뉴·디자인, 광고, 복원을 그림처럼 짧게 설명하는 관리자 전용 사용법이다.
- `test/guides.js`가 홈 게임 전체의 설명 누락, 3단계, 초대 안내, 연습, 관리자 편집 항목을 검사한다.
- Playwright/Edge로 `/guide/` 데스크톱, 홈 390px, 두더지 초대 설명창 390px, 관리자 사용법 데스크톱 화면을 확인했다.


### 2026-09-12 보안·개인정보 보완 (분석 1~5번 항목)

배경: 2026-09-12 전체 코드 분석에서 보안·개인정보 상위 5개 항목을 골라 수정했다. 아래 순서는 분석 보고서의 번호와 같다.

1. 결혼 테스트 링크 XSS 차단
   - 문제: `t/marriage/index.html`이 `#r=`/`#i=` 링크에 담긴 이름을 `innerHTML`에 그대로 넣었고, 이 페이지만 `esc()` 도우미가 없었다. 조작된 링크를 열면 사이트 도메인에서 스크립트가 실행됐다.
   - 수정: `esc()` 추가, `renderResult`의 두 이름에 적용. `validAnswers()`로 링크 속 답 묶음(이름 문자열, 문항 수와 같은 정수 배열, 보기 범위)을 검사해 모양이 틀리면 첫 화면으로 보낸다. 초대 링크(`#i=`)도 같은 검사기를 쓴다.
   - 검사: `test/marriage.js` 신설(package.json `test`에 추가). 이름에 `<img onerror>`를 넣은 결과·초대 링크가 글자로만 보이는지, 잘못된 링크 4종이 첫 화면으로 가는지, 정상 링크는 그대로인지 확인한다. 수정 전 페이지로 돌리면 실패하는 것을 확인했다.

2. 관리자 세션 저장 위치 변경
   - 문제: `admin/admin-api.js`가 access_token과 refresh_token을 localStorage에 영구 보관했다. 같은 도메인의 공개 게임 페이지에서 XSS가 나면 관리자 세션이 통째로 새어 나갈 수 있었다.
   - 수정: 세션 키를 `gatchi_admin_session_v2`로 바꾸고 sessionStorage에 저장한다. 탭을 닫으면 세션이 사라지므로 관리자는 다시 로그인해야 한다. 페이지가 열릴 때 예전 localStorage 키(`gatchi_admin_session_v1`)는 삭제한다.
   - 한계: 탭이 열려 있는 동안은 여전히 같은 도메인 스크립트가 읽을 수 있다. 근본 해결은 1번처럼 XSS를 없애는 것이며, 앞으로 관리자를 별도 도메인/하위 도메인으로 분리하는 방안을 검토한다.
   - `admin/index.html`의 `admin-api.js` 버전을 `20260912-session`으로 올렸다.

3. 완료 알림에 개인 내용이 남는 문제
   - 문제: `assets/result-notify.js`가 결과 화면의 이름·점수를 긁어(`visibleText`) `result_summary`와 푸시 본문에 넣었다. `result_url`에는 두 사람의 답이 담긴 `#r=` 해시가 그대로 들어간다. 만료 행을 지우는 절차가 없었다.
   - 수정: `visibleText()`를 없애고 고정 문구(`summaryText`)만 보낸다. `result_url`은 보낸 사람이 '결과 보기'로 열어야 하므로 유지하되, 보낸 사람만 읽는 RLS와 7일 만료를 전제로 한다.
   - 새 SQL: `supabase/migrations/20260912_result_cleanup.sql`. `purge_expired_game_challenges()` 함수와 pg_cron 매일 04:00 UTC 예약. pg_cron이 꺼져 있으면 함수만 만들고 NOTICE를 낸다. 2026-09-12 사용자가 운영 SQL Editor에서 실행했다고 보고. `select jobname, schedule, active from cron.job;`으로 예약 행 확인은 아직 받지 못했다.
   - `assets/kakao-share.js`가 주입하는 `result-notify.js` 버전을 `20260912-privacy`로 올렸다.

4. 개인정보 안내 페이지 신설
   - `privacy/index.html`: 서버에 저장하지 않는 것(편지 본문, 게임 답, 연락처), 잠시 저장되는 것(완료 알림 결과 주소 7일, 단체방, 임시 익명 계정, 푸시 구독), 이용 통계, 카카오 공유, 광고(현재 없음), 브라우저 저장, 삭제 요청 경로를 쉬운 말로 적었다. `noindex`.
   - 링크: 홈 푸터(`index.html`), 사용법 푸터(`guide/index.html`), 공통 게임 UI 푸터(`assets/game-ui.js`의 `.game-privacy`, 스타일은 `game-ui.css`).
   - `game-ui.js/css` 버전을 20개 게임 페이지 전부 `20260912-privacy`로 통일했다. 이전에는 같은 파일이 세 가지 `?v=`로 불려 캐시가 갈라져 있었다.
   - 남은 일: 편지·타로·마음동물·운세·단체방·취향·심리 메뉴는 game-ui.js를 쓰지 않아 푸터 링크가 없다. 광고를 실제로 붙이면 안내 문구를 먼저 고친다.

5. 푸시 Edge Function CORS 보완
   - 문제: `supabase/functions/clever-service/index.ts`가 OPTIONS(preflight)와 `Access-Control-*` 헤더를 처리하지 않았고, 프런트는 실패를 조용히 삼켰다. `@supabase/server`의 `withSupabase`가 preflight를 대신 처리하는지 확인하지 못했다.
   - 수정: `withSupabase` 앞단에서 OPTIONS를 204로 응답하고 모든 JSON 응답에 CORS 헤더를 붙인다. 허용 출처는 `https://bingari69-jpg.github.io`, `http://127.0.0.1:4173`, `http://localhost:4173`. 내부 오류 문구는 서버 로그에만 남기고 클라이언트에는 코드만 돌려준다.
   - 프런트: `client.functions.invoke` 실패 시 `console.warn`으로 남긴다(`[결과 알림] 푸시 ...`).
   - 2026-09-12 Supabase Dashboard 코드 편집기에 붙여넣어 배포 완료. 외부에서 확인: `OPTIONS` → 204와 `Access-Control-Allow-Origin: https://bingari69-jpg.github.io`, 허용 헤더·메서드·Max-Age 정상. 사용자 토큰 없는 `POST` → 401(withSupabase가 거절, 정상). 남은 확인은 실기기에서 A 알림 허용 → B 완료 → A 수신이다.

검사: `npm test` 17개 묶음 전부 통과(`test/marriage.js` 포함). `git diff --check` 이상 없음. 커밋·푸시는 하지 않았다.

배포 전 확인 목록
- 운영 Supabase에 `20260912_result_cleanup.sql` 실행, pg_cron 켜기.
- `supabase functions deploy clever-service`.
- 배포 후 관리자는 한 번 다시 로그인한다(세션 저장소가 바뀜).
- 홈·게임 페이지 푸터의 '개인정보 안내' 링크가 `/privacy/`로 열리는지 확인.


### 2026-09-12 잘린 링크 공통 안내 (분석 6번 항목)

- 문제: 카톡 카드를 손으로 복사하거나 다른 앱을 거치며 `#i=`/`#c=`/`#r=` 뒤의 내용이 끊기면, 배달·MBTI·시험지·추락·좌석·기록 게임 10개 등이 아무 안내 없이 첫 화면("새로 만들기")으로 떨어졌다. 자체 안내 화면은 타로·편지·마음동물·취향·운세에만 있었다.
- 수정: `assets/link-guard.js` 신설. 주소에 `#c=`/`#i=`/`#r=` 표시는 있는데 base64url JSON으로 풀리지 않으면 화면 위쪽에 "링크가 잘렸어요 — 카카오톡에서 받은 카드를 다시 눌러 주세요" 안내(role=alert, 닫기 버튼)를 붙인다. 게임별 파싱 코드는 건드리지 않고 같은 주소를 한 번 더 풀어 보는 방식이라 27개 게임에 한 번에 적용된다. URI 인코딩된 링크(기억·싸움)도 정상으로 본다. 표시 자체가 없는 주소(새로 시작)는 그대로 둔다.
- 제외: tarot, letter, personality, ranking, fortune, psychology, group-room (자체 안내 있음 또는 해시 미사용).
- 주입: `assets/analytics.js`가 `link-guard.js?v=20260912-1`을 함께 싣는다. 편지는 analytics.js를 안 쓰므로 영향 없음. `analytics.js` 버전을 28개 페이지 전부 `20260912-linkguard`로 통일했다(이전에는 두 가지 버전이 섞여 있었다).
- 추락 게임의 자체 토스트("링크를 읽지 못했어요")는 중복을 피하려고 제거했다.
- 통계: 안내가 뜰 때 `track("broken_link",{game})`을 보낸다(관리자 통계에서 잘린 링크 빈도 확인 가능).
- 검사: `test/link-guard.js` 신설(package.json `test`에 추가). 6개 게임 잘린 링크 안내·닫기, 정상/빈/인코딩 링크 제외, 타로 건너뜀, 추락 토스트 제거, 공통 주입 확인.
- 정정: 처음에는 `t/memory`가 모양이 다른 링크에서 예외를 낸다고 기록했으나, 확인 결과 실제 페이지 문제가 아니라 테스트 도구의 한계였다. `test/dom.js`는 `../../assets/` 스크립트만 인라인하고 같은 폴더의 `data.js`는 싣지 않아서 jsdom에서 `window.MEMORY`가 비어 있었고, 해시와 무관하게 빈 주소에서도 같은 예외가 난다. 실제 브라우저에서는 `data.js`가 실리고, 기억 게임은 링크의 문항 id를 목록과 대조해 없으면 홈으로 보낸다. → 아래 '테스트 도구 보완'에서 해결.


### 2026-09-12 테스트 도구 보완과 기억 게임 검사

- `test/dom.js`: 이전에는 `../../assets/` 스크립트만 인라인해서 같은 폴더의 `data.js`(`t/memory`, `t/mind/fight`)가 jsdom에 실리지 않았다. 이제 `<script src="...">` 형태의 로컬 스크립트를 전부 인라인한다(외부 http(s) 주소만 제외). `defer`가 붙은 `game-ui.js`는 기존처럼 인라인하지 않는다. jsdom에서 `script.src`가 비어 `new URL('../', '')`이 실패하기 때문이며, 기존 골든 테스트와 동작을 맞춘 것이다.
- 실제 결함 발견·수정: `t/memory/index.html`의 결과 링크(`#r=`) 분기가 `a`/`b` 답 배열을 검사하지 않아, 배열이 없거나 칸 수가 다른 링크를 열면 `R.a[i]` 읽기에서 예외가 났다. 문항의 `fields` 수와 같은 배열일 때만 결과를 그리고, 아니면 홈으로 보낸다. `j`(판정)도 배열이 아니면 무시한다.
- `test/memory.js` 신설(package.json `test`에 추가): 홈 목록·세트 탭, 선물 문제 봉인 초대(답이 링크에 평문으로 안 보임), 응답자 잠금 카드·답·사람 판정·결과 카톡 메시지, 도전자가 결과 링크 열기, 잘못된 링크 4종(모르는 문항·답 없음·개수 불일치·잘린 링크) 홈 이동, 이름 XSS 안전.
- `npm test` 19개 묶음 통과.


### 2026-09-12 홈 목록에 타로·마음동물·운세·단체방 추가 (분석 7번 항목)

- 문제: 홈 목록 카드 23개에 `tarot`, `personality`, `fortune`, `group-room`이 없었다. 심리 메뉴(`/t/psychology/`)나 사다리 페이지의 링크로만 갈 수 있어 가장 공들인 콘텐츠가 가장 찾기 어려웠다.
- 수정: `assets/home-catalog.js`의 `ITEMS`와 `CARDS`에 네 게임을 추가해 홈 카드 27개. 위치는 타로→편지 다음, 마음동물→MBTI 다음, 운세→추락 다음, 단체방→사다리 다음. 그림: 타로는 `art/tarot-chick.png`(`.catalog-mascot.tarot`, `social-ui.css`), 마음동물은 아틀라스 4번(커플), 운세는 17번(선물), 단체방은 7번(커피 사다리, 사다리와 공유).
- 서버 목록과의 관계: 홈은 Supabase `game_catalog`(또는 관리자 게시본)가 응답하면 그 목록으로 덮어쓰는데, 이전에는 서버에 없는 로컬 게임을 버렸다. 운영 `game_catalog`에는 tarot·personality만 있고 fortune·group-room이 없어(2026-09-12 REST로 확인) 코드에만 추가하면 배포 후 사라질 상황이었다. `appendUnknownLocal()`을 두 병합 경로 모두에 넣어, 서버가 모르는 로컬 게임은 목록 끝에 그대로 붙인다. 서버가 명시적으로 숨긴 게임은 행이 있으므로 되살아나지 않는다.
- 새 SQL: `supabase/migrations/20260912_catalog_add_fortune_group_room.sql`. `fortune`(260), `group-room`(270) 행을 `on conflict do nothing`으로 넣는다. 2026-09-12 운영 Supabase SQL Editor에서 실행 완료(결과: fortune 260, group-room 270).
- 관리자 게시본은 현재 null(게시한 적 없음)이라 영향 없음. 관리자가 게시하면 `localGames()`가 `HOME_ITEMS` 27개를 그대로 읽어 간다.
- 버전: `index.html`의 `social-ui.css`, `home-catalog.js`를 `20260912-catalog4`로 올렸다.
- 검사: `test/letter.js`의 홈 카드 수 기대값 23→27(3곳). `test/guides.js`는 카탈로그 슬러그마다 사용법이 있는지 보는데 네 게임 모두 `guide-data.js`에 이미 있다. `npm test` 19개 묶음 통과.


### 2026-09-12 나머지 개선 1묶음: 캐시 버전 통일·SW 출처 검사·OG/SEO·PWA·움직임 줄이기·홈 고정

- 캐시 버전 통일: `kakao-share.js`, `home-catalog.js`, `supabase-data.js`, `social-ui.css`, `psychology.css`, `ui.js`, `ranking.css`, `letter-legacy.js`, `letter-templates.js`, `roster.js`를 모든 페이지에서 `?v=20260912-a`로 맞췄다(31개 파일). 버전이 아예 없던 4개도 붙였다. 새 검사 `test/asset-versions.js`: HTML/JS에서 부르는 `assets/*.js|css` 38개 모두 버전이 있고 파일당 버전이 하나인지 확인한다. 앞으로 공용 파일을 고치면 그 파일을 부르는 모든 페이지의 `?v=`를 같은 값으로 올려야 검사가 통과한다.
- `sw.js`: 알림 클릭 시 여는 주소가 같은 출처일 때만 열고, 아니면 홈으로 보낸다.
- OG/SEO: og:url·canonical을 fortune, personality, tarot, letter, group-room, psychology, guide에 추가(og:image 크기 800×480 포함). `index.html`에 canonical과 manifest 링크. `robots.txt`(admin·privacy 제외), `sitemap.xml`(홈·사용법·게임 28개).
- PWA: `manifest.webmanifest`(이름·start_url·색·아이콘 192/512). 아이콘은 `assets/icons/`에 타로 병아리로 생성. 오프라인 캐시는 여전히 없다(서비스워커는 푸시 전용).
- 움직임 줄이기: `psychology.css`에 `prefers-reduced-motion` 규칙을 추가해 운세·마음동물·심리 메뉴도 대응. 이제 27개 게임 페이지 전부 적용.
- 홈 화면 고정: `assets/home.js`가 첫 방문에 고른 홈(편지/놀이)을 `gatchi-home-v1`에 기억해 다음 방문에도 같은 화면을 보여준다. `?home=`으로 지정하면 그 값을 기억한다.
- `test/letter.js`의 social-ui.css 버전 고정 검사는 `?v=2026` 형식 검사로 완화(일치 여부는 asset-versions가 담당).
- `npm test` 20개 묶음 통과.

## 테스트·배포 확인

- 실행: `npm install` 후 `npm test` (현재 환경에는 의존성 설치됨).
- 테스트: 기존 10종 골든, 편지/홈/개봉 효과, 가위바위보 UI, 취향, 심리 메뉴, 타로, 공유 어댑터, 실제 심리 공유 흐름, 내기 패널, 단체방, 완료 알림 대상/코드/해시 보존.
- 2026-09-11 사용설명서 추가 후 `npm test` 전체 통과. 배포 전 `git diff --check`를 다시 실행한다.
- Playwright/Edge로 10개 내기 패널 상시 노출, 해제·선택·반응, 320/390px 화면 점검.
- 타로는 별도 A/B/새 브라우저 관점, 세 장 개봉, 질문 복사, 공유, 모바일 너비 확인.
- 실제 휴대폰 카카오톡 수신 UI/발송 성공을 모두 실기기로 검증한 것은 아니다.
- GitHub Pages 배포 커밋 `8a32eb2` 성공. 공개 `result-notify.js`, 게임 캐시 버전, `sw.js` 반영과 개인키 미노출 확인.
- 배포 전 `git diff --check`, 명시적 파일 staging, commit, `git push origin main`.
- 배포 후 GitHub Pages Actions 성공 및 공개 HTML의 버전 쿼리·JS·이미지 실제 내용을 확인한다.
- 버전 쿼리는 함께 갱신할 것. 이전에 공통 파일 누락/캐시로 신규 화면과 예전 공유 모듈이 섞인 문제가 있었다.

## 주요 배포 이력

- `0a80472`: 기존 19개 게임 UI
- `b6a26fb`: 심리 메뉴와 취향/운세 콘텐츠
- `717bb79`: 둘이 여는 마음동물
- `2c658d9`: 타로 초기 버전
- `3822494`: 카카오 텍스트 초대 오류 수정
- `a481b29`: 타로 v2, 22장/반봉인/대화 결과
- `c04d5a0`: 25종 카카오 이미지 카드 통일
- `1cd74f5`: 10종 게임 내기 패널·허세 선택지
- 이번 커밋: handoff·연구 자료 보존, 편지 공유 재시도 보완, 로컬 산출물 제외.

## 기획만 진행했으며 미구현인 항목

### 단체방 게임 다음 범위

- 현재 공용 방 서버와 로비/제출/결과 공개까지 구현. 시범 화면은 랜덤 커피 내기 흐름이다.
- 실제 10초 대결과 가위바위보 점수/승패 엔진을 방 제출에 연결하는 작업은 남아 있다.
- 카카오는 참가 링크 전달만 담당하며 참가자 명단·게임 제출 정보는 Supabase 방이 관리한다.

### 별자리 콘텐츠

- '나와 너의 별자리': 월·일 선택 → 내 메시지 → 친구 초대 → 둘의 오늘/작은 행동/질문.
- 실제 천체 계산 없이 제공하면 별자리에서 영감을 얻은 재미용 메시지로 표시.
- 사용자와 제안만 논의; 구현 요청/완료로 취급하지 말 것.

### 광고

- 공통 광고 자리(홈 목록 중간, 결과 아래, 추천 위) + 전체 기본값/게임별 예외.
- 플레이 중/선택 버튼 근처 광고 제외, 편지 기본 비노출을 제안.
- 자체 이미지 배너와 AdSense 설정을 구분. 광고 계정/심사/실제 게재는 별도.
- 광고 자리와 관리 UI·공개 페이지 삽입은 구현. 광고 계정 심사·실제 소재 등록·수익 데이터 연동은 미구현.

### 통계

- 추천 흐름: 방문 → 시작 → 완료 → 공유 시도 → 초대 방문 → 친구 완료 → 결과 공유/재대결.
- 내기 선택/허세 이용, 타로 질문 복사/개봉, 단체방 전원 완료, 광고 전후 완료율 등을 제안.
- GA4와 함께 Supabase 익명 이벤트를 기록하고 관리자 통계 RPC·화면을 구현. 운영 SQL 적용 후 실제 데이터 수집 확인이 남아 있다.
- 공유 클릭 ≠ 발송 성공. SDK 호출 성공도 실제 수신 성공이 아님. 발송 성공은 카카오 공유 웹훅 설정 필요.
- 초대별 식별·중복 기준·게임별 이벤트를 먼저 통일해야 정확한 전환율을 계산할 수 있음.
- 편지 내용·이름·생일·직접 입력 내기 등 개인 내용을 통계에 넣지 않을 것. URL 해시/쿼리는 GA page_location에서 제거.
- 편지 페이지는 현재 자체 분석 스크립트를 로드하지 않음. 향후 편지 이벤트 수집은 별도 결정 필요.

## 사용자 선호와 다음 작업 원칙

- 한국어로 짧고 명확하게 설명. 사용자는 비기술적인 설명과 실제 미리보기를 선호.
- 게임별 캐릭터 유지, 같은 서비스의 폰트/배치/색상 체계 공유.
- 시안 요청 시 실제 서비스 변경과 구분. 승인 전 기획을 완료된 구현처럼 표현하지 말 것.
- 새 서버 기능은 SQL/Edge Function을 실제 Supabase에 적용한 뒤 공개 배포한다. 비밀키 파일은 GitHub에 올리지 않는다.

## 참고 자료

- 국제 콘텐츠 조사: `docs/research/같이놀자_국제콘텐츠_심층조사_2026-09-10.md` 및 같은 이름 PDF.
- Kakao Share: https://developers.kakao.com/docs/ko/kakaotalk-share/common
- Kakao webhook: https://developers.kakao.com/docs/ko/kakaotalk-share/callback
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- AdSense: https://support.google.com/adsense/answer/9261307?hl=ko
