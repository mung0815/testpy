# TODOS

## 기존 Python 스캐폴드 제거 + Node/TS 셋업 (구현 시작 시)
- **What:** `test.py` / `requirements.txt` / `.travis.yml`(Python·Travis) 제거,
  TypeScript/Node 프로젝트로 초기화(package.json, tsconfig, vitest, docx 의존성).
- **Why:** 스택을 전체 TypeScript로 확정(docx-js 사용). 기존 Python 스캐폴드는 불필요하고,
  `requirements.txt`의 구버전 pytest/py가 Dependabot 취약점(high 1, moderate 1)의 원인.
- **Pros:** 단일 언어, docx-js 네이티브, 구버전 Python 의존성·취약점 제거.
- **Cons:** 없음 — 빈 스캐폴드라 잃을 것 없음.
- **Context:** plan-eng-review(2026-06-07) + 추가 지시로 스택을 TS로 전환. 구현 첫
  단계(T1 이전)에서 처리. `docs/RULES.md`가 출력/문체/출처 규칙의 권위.
- **Depends on / blocked by:** 없음.

## CI 셋업 — GitHub Actions (deferred, 웨지 검증 후)
- **What:** TS 프로젝트용 GitHub Actions(타입체크 + vitest) 구성.
- **Why:** 자동 테스트 피드백. 단 사전제품 단계엔 우선순위 낮음.
- **Pros:** PR마다 자동 검증.
- **Cons:** 사용자 0명 단계엔 과투자.
- **Context:** 첫 사용자 인터뷰로 웨지 검증 후 착수.
- **Depends on / blocked by:** Node/TS 셋업 완료.
