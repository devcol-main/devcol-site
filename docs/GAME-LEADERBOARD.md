# 새 게임 온라인 리더보드 연동 체크리스트

`docs/public/games/<slug>/`의 게임을 공용 온라인 리더보드(`https://a.devcol.net/lb`)에 붙일 때 이 문서만 따르면 된다. (VitePress `srcExclude`로 사이트에는 게시되지 않는 내부 문서. 애널리틱스는 `GAME-ANALYTICS.md`.)

서버(devcol-main/devcol-analytics)와 관리자 대시보드는 **고칠 필요가 없다.** 게임 목록은 코드에 없다. 처음 보는 slug로 제출이 오면 서버가 `https://devcol.net/games/<slug>/`가 200인지 확인하고 넉넉한 기본 한도로 등록한다. 한도(최고 점수, 초당 점수, 최소 플레이 시간, stat별 최댓값)는 나중에 `/admin` → Leaderboard → Game bounds에서 조인다.

## 체크리스트

- [ ] **사이트에 먼저 올린다**: `docs/public/games/<slug>/index.html`이 배포돼 있어야 첫 제출이 등록된다. 배포 전 제출은 `unknown_game`(404)으로 거절되고 게임은 로컬 기록만 보여 준다.
- [ ] **slug 규칙**: 폴더 이름 = 게임 ID. 소문자·숫자·하이픈 (`^[a-z0-9][a-z0-9-]{0,39}$`). 게임 코드의 `gameId`와 같아야 한다.
- [ ] **공용 모듈 복사**: Stack-Up의 `src/shared/`와 `tests/shared/`를 **바꾸지 않고** 그대로 복사한다 (`diff -r`가 깨끗해야 함). 여기에 `LocalLeaderboardService`, `OnlineLeaderboardService`, 닉네임 형식 규칙(`nickname.ts`), `PlayerProfile`(토큰 `devcol.player.token`)이 있다.
- [ ] **서비스 만들기**: 게임은 `LeaderboardService` 인터페이스로만 접근한다.

  ```ts
  import { OnlineLeaderboardService, LocalLeaderboardService, resolveLbEndpoint } from './shared/leaderboard';
  import { PlayerProfile, LEGACY_NICKNAME_KEYS } from './shared/player';

  const profile = new PlayerProfile({ legacyNicknameKeys: LEGACY_NICKNAME_KEYS });
  // devcol.net이면 a.devcol.net/lb, 그 밖(로컬 dev)은 null = 로컬 전용. <html data-lb-endpoint="...">로 바꿀 수 있다.
  const endpoint = resolveLbEndpoint(location.hostname, document.documentElement.dataset.lbEndpoint);
  const leaderboard = new OnlineLeaderboardService<MyStats>({
    gameId: '<slug>',
    local: new LocalLeaderboardService<MyStats>({ gameId: '<slug>', key: '<game>.leaderboard', sanitizeStats }),
    identity: profile,
    sanitizeStats,
    endpoint,
  });
  ```

- [ ] **제출**: 게임 오버 후 닉네임 입력 → `leaderboard.submit({ playerId, nickname, score, stats, ts, durationMs })`. `durationMs`(이번 판 플레이 시간)는 서버의 sanity 검사에 쓰인다. stats는 숫자만, 키 10개 이하. 로컬에 먼저 저장되고 서버는 4초 안에 답이 없으면 포기한다(예외 없음).
- [ ] **순위표**: `getTop(10)` 결과를 보여 주고 `leaderboard.lastSource === 'local' && leaderboard.online`이면 "Offline: showing scores on this device"를 띄운다. 내 줄 하이라이트는 온라인이면 `leaderboard.isMine(entry)`(entryId 비교).
- [ ] **UI 필수 3가지** (애드센스·개인정보 정책과 맞춰야 함, 문구는 영어):
  - 닉네임 입력 아래 `NICKNAME_RULE_TEXT` ("Letters, Hangul and numbers only. Offensive names are shown as Player####."). 입력 중 `nicknameFormatOk()`가 false면 경고색.
  - 다른 사람 줄에 **Report** 버튼 (2단계 확인 → `leaderboard.report(entryId)`). 내 줄과 오프라인 순위표에는 없음.
  - 옵션에 **Online scores (all games) → Delete mine** (2단계 확인 → `leaderboard.deleteMine()`). 토큰은 모든 게임이 공유하므로 모든 게임의 내 온라인 기록이 지워진다. 결과 `deleted | none | failed`를 버튼에 표시.
  - 제출 결과 `leaderboard.lastResult`의 `nameStatus`가 `ok`/`unchecked_ai`가 아니고 이름이 `Player####`이면 "Your name is shown as Player####." 안내.
- [ ] **텍스트는 textContent로만**: 순위표의 이름은 다른 방문자가 입력한 값이다. `innerHTML` 금지.
- [ ] **테스트**: `tests/shared/`(복사본)가 통과하는지, 게임 쪽은 엔드포인트 없을 때 로컬 전용으로 동작하는지 (Stack-Up `tests/uiLeaderboard.test.ts` 참고).
- [ ] **로컬 확인(선택)**: devcol-analytics에서 `npx wrangler dev --local --var ALLOW_LOCALHOST:true --var AI_MODERATION:off` (로컬 D1은 먼저 `npm run db:migrate:local`) → 게임 `npm run dev` 주소에 `?lb=http://localhost:8787/lb`를 붙여 연다.
- [ ] **배포 후**: `/admin` → Leaderboard에서 새 게임이 등록됐는지 보고, Game bounds를 실제 점수 범위에 맞게 조인다.

## 하지 말 것

- 서버/대시보드에 게임 목록 추가 (필요 없음, 하드코딩 금지)
- `playerId`를 서버로 보내기 (`OnlineLeaderboardService`는 보내지 않는다. 직접 fetch하지 말 것)
- `src/shared`를 한 게임에서만 고치기 (모든 게임 리포에 같은 내용으로)
- Turnstile 등 외부 스크립트를 게임 안에 넣기 (게임 리포 규칙: 외부 CDN 금지)
