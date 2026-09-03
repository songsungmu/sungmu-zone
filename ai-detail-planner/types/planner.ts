export type PlannerItemStatus = "ai_suggested" | "confirmed";
export type ItemSource = "document" | "inferred";

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: PlannerItemStatus;
  source: ItemSource;
}

export interface Policy {
  id: string;
  policyName: string;
  content: string;
  status: PlannerItemStatus;
  rationale: string;
  source: ItemSource;
}

export interface EdgeCase {
  id: string;
  situation: string;
  handling: string;
  status: PlannerItemStatus;
  source: ItemSource;
}

export interface PlannerInput {
  functionName: string;
  requirementDraft: string;
  target: string;
  goal: string;
  referenceDocText: string;
}

export type PlannerLoadingStage =
  | "idle"
  | "requirements"
  | "policies"
  | "edgeCases"
  | "done";

export interface PlannerState {
  input: PlannerInput;
  requirements: Requirement[];
  policies: Policy[];
  edgeCases: EdgeCase[];
  loadingStage: PlannerLoadingStage;
}
