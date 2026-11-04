# devcol autopost (로컬 Mac 자동 포스팅)

PSEUDO의 `Documents/Debugging/DBG-*.md`와 TumbleTeams의 `Documents/Devlogs/`·새 커밋을 매일 확인한다. 새 노트가 있으면 Claude Code(`claude -p`)가 영어 DevLog 글로 써서 `publishAt` 큐(하루 최대 2개)에 넣고 main에 push한다. 실제 공개는 기존 GitHub Actions 일일 빌드가 날짜에 맞춰 처리한다.

| 파일 | 역할 |
|---|---|
| `prompt.md` | Claude가 따르는 작업 지시 (글 작성 규칙, 스케줄, 사이드바 연결). main에서 매번 새로 읽으므로 고치면 바로 반영 |
| `ledger.md` | 이미 처리한 소스 노트 목록. 여기 없는 노트만 새 글 대상 |
| `run.sh` | 실행 본체: 전용 clone 갱신 → claude 실행 → `docs:build` 통과 시에만 push |
| `install.sh` | macOS LaunchAgent 등록/해제 |

## 설치 (Mac에서 한 번)

필요한 것: Claude Code CLI 로그인(`claude` 한 번 실행), Node.js/npm, GitHub에 push 가능한 git 인증.

```bash
cd ~/path/to/devcol-site && git pull
./automation/autopost/install.sh          # 매일 10:17 실행 (다른 시간: ./install.sh 21:43)
launchctl kickstart gui/$(id -u)/net.devcol.autopost   # 지금 한 번 돌려보기
```

- 작업은 `~/.devcol-autopost/` 아래 전용 clone에서만 한다. 평소 작업하는 폴더는 건드리지 않는다.
- 로그: `~/Library/Logs/devcol-autopost/`. 실패하거나 글이 큐에 들어가면 macOS 알림이 뜬다.
- 실행 시각에 Mac이 잠자기 중이었다면 깨어난 직후 실행된다. 전원이 꺼져 있었다면 그날은 건너뛴다.
- 해제: `./automation/autopost/install.sh --uninstall`
- `run.sh`를 고쳤다면 `install.sh`를 다시 실행해야 반영된다(복사본을 실행). `prompt.md`·`ledger.md`는 다시 설치하지 않아도 된다.

## 안전장치

- `docs:build`가 실패하면 push하지 않는다.
- claude는 `git push`·`git reset`·웹 접근이 막힌 상태로 실행되고, push는 스크립트가 직접 한다.
- 한 번에 최대 6개 글을 쓴다. 아직 Fixed가 아닌 DBG 노트는 다음 실행으로 넘긴다.
- AI·자동화 언급 금지, 내부 이슈 번호·로컬 경로·미공개 일정 제외(`prompt.md` 규칙).
- 위키가 낡은 것을 발견하면 위키는 고치지 않고 `ledger.md`의 "Wiki follow-ups"에 적어 둔다.
