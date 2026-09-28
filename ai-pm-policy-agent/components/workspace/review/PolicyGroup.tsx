import { CLASSIFICATION_META, PolicyCard } from "@/components/workspace/review/PolicyCard";
import { SectionHeader } from "@/components/workspace/review/SectionHeader";
import type { PolicyClassification, PolicyDecision, PolicyItem } from "@/types/review";

interface PolicyGroupProps {
  classification: PolicyClassification;
  policies: PolicyItem[];
  pendingPolicyIds: Set<string>;
  onApprove: (policy: PolicyItem) => void;
  onReject: (policy: PolicyItem) => void;
  onEdit: (policy: PolicyItem, newContent: string) => void;
  onDecide: (policy: PolicyItem, decision: PolicyDecision) => void;
}

export function PolicyGroup({
  classification,
  policies,
  pendingPolicyIds,
  onApprove,
  onReject,
  onEdit,
  onDecide,
}: PolicyGroupProps) {
  if (policies.length === 0) return null;

  // 반려된 항목은 지우지 않고 흐리게 표시한 채 그룹 하단으로 내린다.
  const sortedPolicies = [...policies].sort((a, b) => {
    const aRejected = a.approvalStatus === "rejected" ? 1 : 0;
    const bRejected = b.approvalStatus === "rejected" ? 1 : 0;
    return aRejected - bRejected;
  });

  return (
    <section>
      <SectionHeader label={CLASSIFICATION_META[classification].label} count={policies.length} />
      <ul className="divide-y">
        {sortedPolicies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            isSubmitting={pendingPolicyIds.has(policy.id)}
            onApprove={onApprove}
            onReject={onReject}
            onEdit={onEdit}
            onDecide={onDecide}
          />
        ))}
      </ul>
    </section>
  );
}
