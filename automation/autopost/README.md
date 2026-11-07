# devcol autopost (클라우드 예약 작업)

claude.ai 클라우드 예약 작업 **"devcol autopost"**가 매일 08:45(KST)에 돈다. 맥이 꺼져 있거나 잠자기여도 실행된다(2026-11-04부터). 하는 일:

- PSEUDO의 `Documents/Debugging/DBG-*.md`와 TumbleTeams의 `Documents/Devlogs/`·새 커밋을 확인한다.
- 새 노트를 영어 DevLog 글로 써서 `publishAt` 큐(하루 최대 2개)에 넣고, `docs:build` 통과 후 main에 push한다.
- 사이트 공개는 기존 GitHub Actions 일일 빌드가 날짜에 맞춰 처리한다.
- 글마다 커버 이미지(라이트/다크 jpg)를 `scripts/cover.mjs`로 만들어 넣는다(Playwright 필요, 실패하면 이미지 없이 올리고 요약에 적는다).
- 새 글이 생기면 휴대폰 푸시 알림, 새 노트가 없으면 조용히 끝난다.

| 파일 | 역할 |
|---|---|
| `prompt.md` | 글 작성·스케줄·사이드바 연결 규칙. main에서 매번 새로 읽으므로 고치면 바로 반영된다 |
| `ledger.md` | 이미 처리한 소스 노트. 여기 없는 노트만 새 글 대상 |
| `cloud-task-prompt.md` | **클라우드 예약 작업의 지시문 사본** (작업 설정을 바꾸면 여기도 맞춰 둔다) |
| `task-prompt.md` | (구) 맥 Claude 앱 예약 작업용 지시문. 지금은 쓰지 않음 |
| `run.sh`, `setup.sh` | (구) 터미널·launchd용 대안. 지금은 쓰지 않음 |

## 확인·관리

- 실행 기록: claude.ai 예약 작업 목록의 "devcol autopost" → 실행 기록(History). 각 실행은 새 세션에서 시작한다.
- 저장소 접근: GitHub `devcol-main/devcol-site`(push), `pseudo`·`tumbleteams`(읽기). 접근이 끊기면 작업이 오류를 그대로 보고하고 멈춘다.
- 하루 한 번만 돈다. 놓친 날은 없지만, 실행이 실패하면 다음 날 실행이 밀린 노트를 한꺼번에(최대 6개) 처리한다.
- **맥 Claude 앱의 예전 예약 작업(09·21시)은 꺼 둔다.** 같이 돌아도 `ledger.md` 덕분에 대개 "새 노트 없음"으로 끝나지만, 같은 시간대에 겹치면 push 충돌이 날 수 있다.

## 안전장치

- `docs:build`가 실패하면 push하지 않는다. push는 빌드가 통과한 뒤 마지막 단계에서만 한다.
- 한 번에 최대 6개 글. 아직 Fixed가 아닌 DBG 노트는 다음 실행으로 넘긴다.
- AI·자동화 언급 금지, 내부 이슈 번호·로컬 경로·미공개 일정 제외(`prompt.md`).
- 위키가 낡은 걸 발견하면 위키를 고치지 않고 `ledger.md`의 "Wiki follow-ups"에 적는다.

## (구) 맥에서 돌리기

예전 방식(맥 Claude 앱 예약 작업에 `task-prompt.md`를 붙여 넣거나, `./setup.sh --launchd`로 `run.sh`를 매일 실행)은 클라우드 작업으로 대체됐다. 클라우드 작업을 끄고 맥으로 돌아갈 때만 쓴다. launchd 제거: `./setup.sh --remove-launchd`
