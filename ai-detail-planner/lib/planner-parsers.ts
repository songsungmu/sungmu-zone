import type { EdgeCase, Policy, Requirement } from "@/types/planner";

export function isValidRequirement(item: unknown): item is Requirement {
  if (typeof item !== "object" || item === null) return false;
  const { id, title, description, type } = item as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof title === "string" &&
    typeof description === "string" &&
    typeof type === "string"
  );
}

export function isValidPolicy(item: unknown): item is Policy {
  if (typeof item !== "object" || item === null) return false;
  const { id, policyName, content, rationale } = item as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof policyName === "string" &&
    typeof content === "string" &&
    typeof rationale === "string"
  );
}

export function isValidEdgeCase(item: unknown): item is EdgeCase {
  if (typeof item !== "object" || item === null) return false;
  const { id, situation, handling } = item as Record<string, unknown>;
  return typeof id === "string" && typeof situation === "string" && typeof handling === "string";
}
