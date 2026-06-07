# TODOS

## 테스트/CI 현대화 (deferred — 웨지 검증 후)
- **What:** pytest를 최신 버전으로 올리고, Travis CI를 GitHub Actions로 이전.
- **Why:** 현재 `requirements.txt`는 pytest 3.0.2(2016년대), `.travis.yml`은 Travis 기반.
  방치하면 의존성·CI 부채가 누적됨.
- **Pros:** 최신 pytest 기능·보안 패치, GitHub 네이티브 CI(무료·통합), 빠른 피드백.
- **Cons:** 지금 당장은 핵심 가치(출처 신뢰)와 무관 — 사전제품 단계엔 과투자.
- **Context:** plan-eng-review(2026-06-07)에서 식별. v1은 구독형(Claude Code) 전용
  개인·내부 도구로 범위 고정 → 배포/CI 우선순위 낮음. 첫 사용자 인터뷰로 웨지가
  검증되고 제품화로 갈 때 함께 처리.
- **Depends on / blocked by:** 없음. 단, 제품화(API 전환) 결정과 함께 묶는 것이 효율적.
