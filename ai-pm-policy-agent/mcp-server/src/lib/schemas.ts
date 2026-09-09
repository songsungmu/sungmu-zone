import { z } from "zod";

/**
 * 이 파일의 스키마들은 도구 입출력 검증에만 쓰인다. Google Sheet에 값을
 * 쓰는 스키마는 이 서버에 정의하지 않는다 — 쓰기 로직은 이 프로젝트의
 * 별도 승인 REST 엔드포인트(Phase 9) 몫이다.
 */

export const figmaFrameSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export const figmaContextSchema = z.object({
  fileName: z.string(),
  frames: z.array(figmaFrameSchema),
  summary: z.string(),
});

export const requirementItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sourceFrame: z.string().nullable(),
});

export const policyRecordSchema = z.object({
  id: z.string(),
  policyName: z.string(),
  content: z.string(),
  category: z.string(),
});

export const policyClassificationSchema = z.enum([
  "confirmed",
  "suggested",
  "need_decision",
]);

export const policySourceTypeSchema = z.enum(["existing", "inferred"]);

export const policyAnalysisItemSchema = z.object({
  id: z.string(),
  policyName: z.string(),
  content: z.string(),
  classification: policyClassificationSchema,
  sourceType: policySourceTypeSchema,
  sourceRef: z.string().nullable(),
  rationale: z.string(),
});

export const policyConflictSchema = z.object({
  existingPolicyRef: z.string(),
  newPolicyId: z.string(),
  description: z.string(),
});

export const exceptionCategorySchema = z.enum([
  "system",
  "policy",
  "user",
  "boundary",
]);

export const exceptionItemSchema = z.object({
  id: z.string(),
  situation: z.string(),
  handling: z.string(),
  category: exceptionCategorySchema,
});
