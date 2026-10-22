# 새 게임 애널리틱스 연동 체크리스트

`docs/public/games/<slug>/`에 게임을 추가할 때 이 문서만 따르면 된다. (VitePress `srcExclude`로 사이트에는 게시되지 않는 내부 문서)

서버(devcol-main/devcol-analytics)와 대시보드, `/stats` 페이지는 **고칠 필요가 없다.** 게임 ID는 URL 경로 `/games/<slug>/...`에서 자동으로 뽑고, 게임 목록은 DB에 들어온 값으로 만든다.

## 자동으로 수집되는 것 (작업 0)

`/t.js`만 로드되면 `/games/<slug>/` 아래 페이지에서 다음이 자동으로 기록된다.

| 이벤트 | 시점 | 비고 |
|---|---|---|
| `game_start` | 게임 페이지 첫 로드 | 대시보드의 Opens, `/stats`의 Plays |
| `page_leave` | 탭 숨김/페이지 이탈 | `duration_ms` = 페이지에 머문 시간 |

## 체크리스트

- [ ] **slug 규칙**: 폴더 이름이 곧 게임 ID. 소문자·숫자·하이픈만 (`^[a-z0-9][a-z0-9-]{0,40}$`). 예: `docs/public/games/neon-runner/` → `neon-runner`. `/stats`에는 `Neon Runner`로 표시된다.
- [ ] **스크립트 태그 1줄**: 게임의 `index.html` `<head>`에 추가 (게임 원본 리포의 index.html에 넣어서 빌드 결과에 포함되게).

  ```html
  <script defer src="/t.js"></script>
  ```

  - 절대 경로 `/t.js`여야 한다 (사이트 루트의 파일). 게임 로컬 dev 서버에서는 404가 나지만 게임 동작에는 영향 없다.
- [ ] **호출 2곳**: 게임 코드에서
  - 스테이지(레벨, 웨이브, 마일스톤 등 게임에 맞는 단위)를 넘길 때: `stage_clear` + `{ stage, score }`
  - 게임 오버 때: `game_over` + `{ stage, score, duration_ms }` (`stage` = 도달한 스테이지, `duration_ms` = 이번 판 플레이 시간)
  - 매 프레임/매 입력마다 보내지 않는다. 방문자당 분당 60건을 넘으면 서버가 버린다.
  - `stage`가 없는 게임은 의미 있는 진행 단위를 하나 정한다 (예: Bug Squash는 보드 확장 3x3→4x4를 stage 1 클리어로 정의).
- [ ] **TypeScript 래퍼**: 아래 파일을 `src/analytics.ts`로 추가하고 위 두 곳에서 `track(...)`을 호출한다. t.js가 없거나(애드블록, DNT, 로컬) 오류가 나도 게임은 계속 돈다.

  ```ts
  // devcol.net 애널리틱스 연동. 사이트의 /t.js가 window.devcol을 만든다.
  export type AnalyticsProps = Record<string, string | number | boolean | null>;

  interface DevcolAnalytics {
    track(type: string, props?: AnalyticsProps): void;
  }

  export function track(type: 'stage_clear' | 'game_over', props: AnalyticsProps): void {
    try {
      (globalThis as { devcol?: DevcolAnalytics }).devcol?.track(type, props);
    } catch {
      // 무시
    }
  }
  ```

  호출 예:

  ```ts
  track('stage_clear', { stage: 3, score: 1200 });
  track('game_over', { stage: 4, score: 1530, duration_ms: Math.round(performance.now() - runStartedAt) });
  ```

- [ ] **테스트**: `window.devcol`이 없을 때 no-op, 있을 때 전달, 예외를 삼키는지 (Stack-Up/Bug-Squash의 `tests/analytics.test.ts` 참고).
- [ ] **빌드 후 확인**: `dist/index.html`에 `<script defer src="/t.js">`가 남아 있는지 (`grep 't.js' dist/index.html`). 그 다음 게임 리포의 복사 스크립트로 `docs/public/games/<slug>/`에 반영.
- [ ] **로컬 확인(선택)**: `npm run docs:dev` → `/games/<slug>/index.html` 열고 개발자도구 Network에서 `a.devcol.net/e` 요청(`game_start`, 플레이 후 `game_over`)이 나가는지 본다. 운영 Worker는 localhost Origin을 버리므로 DB에는 안 쌓인다(정상).

## 하지 말 것

- 서버/대시보드에 게임 목록 추가 (필요 없음, 하드코딩 금지)
- 닉네임, 플레이어 ID, 리더보드 같은 개인 단위 값을 props에 넣기
- props에 객체/배열 넣기 (문자열·숫자·불리언·null만, 전체 1KB 이하)
