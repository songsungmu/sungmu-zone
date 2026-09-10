-- AI PM Policy Agent — Phase 10 초기 스키마
-- 분석 1회 실행(=Claude 채팅 1회 응답) 당 projects 1행이 생기고,
-- 그 안에서 나온 requirements/policies/exceptions/policy_conflicts가
-- project_id로 묶인다. trace_links는 이 엔티티들 사이의 연결 관계
-- (근거, 충돌, 원인)를 기록해 get_change_impact가 조회할 수 있게 한다.
--
-- 이 파일은 이 세션에서 실제로 적용(supabase db push 등)되지 않았다 —
-- 연결된 Supabase 프로젝트가 없는 샌드박스라 SQL만 준비해둔 상태다.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  figma_file_url text,
  created_at timestamptz not null default now()
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  analysis_id text not null,
  title text not null,
  description text not null,
  source_frame text,
  created_at timestamptz not null default now(),
  unique (project_id, analysis_id)
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  analysis_id text not null,
  title text not null,
  content text not null,
  classification text not null check (classification in ('confirmed', 'suggested', 'need_decision')),
  rationale text,
  source_type text check (source_type in ('ai_suggested', 'company_sheet')),
  source_ref text,
  approval_status text check (approval_status in ('approved', 'rejected')),
  sheet_policy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, analysis_id)
);

create table if not exists exceptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  analysis_id text not null,
  situation text not null,
  handling text not null,
  category text not null check (category in ('system', 'policy', 'user', 'boundary')),
  -- 이 예외를 발생시킨 requirements.analysis_id 또는 policies.analysis_id.
  -- mcp-server의 analyze_exceptions가 Phase 10에서 새로 채운다.
  source_ref text,
  created_at timestamptz not null default now(),
  unique (project_id, analysis_id)
);

create table if not exists policy_conflicts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  existing_policy text not null,
  new_policy text not null,
  -- 원본 mcp-server 참조값 — trace_links 기록/조회에 쓴다.
  existing_policy_ref text not null,
  new_policy_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  policy_analysis_id text not null,
  selected_option text not null check (selected_option in ('keep_existing', 'apply_new')),
  decided_at timestamptz not null default now()
);

create table if not exists trace_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_type text not null check (source_type in ('requirement', 'policy', 'exception', 'sheet_policy')),
  source_id text not null,
  target_type text not null check (target_type in ('requirement', 'policy', 'exception', 'sheet_policy')),
  target_id text not null,
  relation text not null check (relation in ('derived_from', 'matches_existing', 'conflicts_with', 'raised_by')),
  created_at timestamptz not null default now()
);

create index if not exists idx_requirements_project on requirements (project_id);
create index if not exists idx_policies_project on policies (project_id);
create index if not exists idx_policies_sheet_policy_id on policies (sheet_policy_id);
create index if not exists idx_exceptions_project on exceptions (project_id);
create index if not exists idx_policy_conflicts_project on policy_conflicts (project_id);
create index if not exists idx_decisions_project on decisions (project_id);
create index if not exists idx_trace_links_project on trace_links (project_id);
-- get_change_impact가 "이 sheet_policy_id가 어디에 걸려있나"를 project 전체
-- 범위로 조회하므로, source/target id 각각에 인덱스를 둔다.
create index if not exists idx_trace_links_source on trace_links (source_type, source_id);
create index if not exists idx_trace_links_target on trace_links (target_type, target_id);
