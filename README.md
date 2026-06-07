# policygen

주제와 목차를 입력하면 **출처 검증을 거친 정책보고서(DOCX) 초안**을 만드는 도구.

설계·규칙: `docs/RULES.md`(권위), 설계 문서는 office-hours/plan-eng-review 산출물 기준.

## 핵심 원칙
- **할루시네이션 방지**: 모든 인용은 원문에서 그대로 따온 verbatim 스니펫 + url/저자/발행일 필수.
  검증을 통과 못 한 인용은 제거되고 해당 문장은 `[근거 필요]`로 강등된다. 발행연도 거짓표기 차단.
- **생성은 Claude Code(구독)가 수행** — 종량 API 호출 없음. 도구는 코퍼스 준비/검증/DOCX 조립을 담당.
- **출력은 DOCX**(docx-js), `docs/RULES.md §2` 형식.

## 파이프라인
```
config.json ──build-corpus──▶ corpus.json
corpus.json ──prompt──▶ 생성 지침 ──(Claude Code 생성)──▶ draft.json
draft.json + corpus.json ──verify──▶ verified.json (+ 접지율)
verified.json + corpus.json ──assemble──▶ report.docx
```

## 사용법
```bash
npm install
npm run build           # dist/ 로 컴파일 (또는 npm run cli 로 tsx 직접 실행)

# 1) 코퍼스 빌드 (URL 출처는 --fetch, 또는 source.text 로 사전 fetch 한 내용 공급)
node dist/cli.js build-corpus examples/sample.config.json -o corpus.json

# 2) 생성 지침 출력 → Claude Code 가 draft.json 생성
node dist/cli.js prompt corpus.json -o prompt.txt

# 3) 검증 (접지율 출력)
node dist/cli.js verify draft.json corpus.json -o verified.json

# 4) DOCX 조립
node dist/cli.js assemble verified.json corpus.json -o report.docx

# 접지율 회귀 게이트(1.0 미만이면 비정상 종료)
node dist/cli.js eval draft.json corpus.json
```

## 개발
```bash
npm run typecheck
npm test
```

## 보고서 유형 추가
`report_types/<key>.yaml` 파일을 하나 추가하면 새 유형이 생긴다(코드 수정 불필요).
