import { PolicyCard } from "@/components/workspace/review/PolicyCard";
import type {
  PolicyClassification,
  PolicyDecision,
  PolicyItem,
} from "@/types/review";

const GROUP_META: Record<
  PolicyClassification,
  { label: string; colorClassName: string }
> = {
  confirmed: {
    label: "Confirmed",
    colorClassName: "text-status-confirmed-foreground",
  },
  suggested: {
    label: "Suggested",
    colorClassName: "text-status-suggested-foreground",
  },
  need_decision: {
    label: "Need decision",
    colorClassName: "text-status-need-decision-foreground",
  },
};

interface PolicyGroupProps {
  classification: PolicyClassification;
  policies: PolicyItem[];
  onApprove: (policy: PolicyItem) => void;
  onReject: (policy: PolicyItem) => void;
  onEdit: (policy: PolicyItem, newContent: string) => void;
  onDecide: (policy: PolicyItem, decision: PolicyDecision) => void;
}

export function PolicyGroup({
  classification,
  policies,
  onApprove,
  onReject,
  onEdit,
  onDecide,
}: PolicyGroupProps) {
  if (policies.length === 0) return null;

  const meta = GROUP_META[classification];

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold ${meta.colorClassName}`}>
        {meta.label} <span className="text-muted-foreground">· {policies.length}건</span>
      </h3>
      <div className="space-y-2">
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            onApprove={onApprove}
            onReject={onReject}
            onEdit={onEdit}
            onDecide={onDecide}
          />
        ))}
      </div>
    </div>
  );
}
