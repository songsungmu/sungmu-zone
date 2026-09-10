import type { PlannerState } from "@/types/planner";

export const initialPlannerState: PlannerState = {
  input: {
    functionName: "",
    requirementDraft: "",
    target: "",
    goal: "",
  },
  requirements: [],
  policies: [],
  edgeCases: [],
  loadingStage: "idle",
};
