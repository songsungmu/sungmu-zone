import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConflictBanner } from "@/components/workspace/review/ConflictBanner";
import { ExceptionGroup } from "@/components/workspace/review/ExceptionGroup";
import { PolicyGroup } from "@/components/workspace/review/PolicyGroup";
import { RequirementCard } from "@/components/workspace/review/RequirementCard";
import type {
  ExceptionCategory,
  ExceptionItem,
  PolicyConflict,
  PolicyDecision,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

const EXCEPTION_CATEGORIES: ExceptionCategory[] = [
  "system",
  "policy",
  "user",
  "boundary",
];

interface ReviewListPanelProps {
  requirements: RequirementItem[];
  policies: PolicyItem[];
  exceptions: ExceptionItem[];
  conflicts: PolicyConflict[];
  pendingPolicyIds?: Set<string>;
  onApprove: (policy: PolicyItem) => void;
  onReject: (policy: PolicyItem) => void;
  onEdit: (policy: PolicyItem, newContent: string) => void;
  onDecide: (policy: PolicyItem, decision: PolicyDecision) => void;
  onResolveConflict: (conflict: PolicyConflict, resolution: PolicyDecision) => void;
}

export function ReviewListPanel({
  requirements,
  policies,
  exceptions,
  conflicts,
  pendingPolicyIds = new Set(),
  onApprove,
  onReject,
  onEdit,
  onDecide,
  onResolveConflict,
}: ReviewListPanelProps) {
  const needDecisionPolicies = policies.filter(
    (p) => p.classification === "need_decision"
  );
  const suggestedPolicies = policies.filter(
    (p) => p.classification === "suggested"
  );
  const confirmedPolicies = policies.filter(
    (p) => p.classification === "confirmed"
  );

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <Tabs defaultValue="requirements" className="flex h-full flex-col gap-0">
        <CardHeader className="border-b py-3">
          <TabsList>
            <TabsTrigger value="requirements">
              요구사항 {requirements.length}
            </TabsTrigger>
            <TabsTrigger value="policies">정책 {policies.length}</TabsTrigger>
            <TabsTrigger value="exceptions">
              예외처리 {exceptions.length}
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto py-4">
          <TabsContent value="requirements" className="space-y-2">
            {requirements.length === 0 ? (
              <EmptyState text="아직 분석된 요구사항이 없습니다." />
            ) : (
              requirements.map((requirement) => (
                <RequirementCard key={requirement.id} requirement={requirement} />
              ))
            )}
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            {policies.length === 0 && conflicts.length === 0 ? (
              <EmptyState text="아직 분석된 정책이 없습니다." />
            ) : (
              <>
                {conflicts.map((conflict) => (
                  <ConflictBanner
                    key={conflict.id}
                    conflict={conflict}
                    onResolve={onResolveConflict}
                  />
                ))}

                <PolicyGroup
                  classification="need_decision"
                  policies={needDecisionPolicies}
                  pendingPolicyIds={pendingPolicyIds}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEdit={onEdit}
                  onDecide={onDecide}
                />
                <PolicyGroup
                  classification="suggested"
                  policies={suggestedPolicies}
                  pendingPolicyIds={pendingPolicyIds}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEdit={onEdit}
                  onDecide={onDecide}
                />
                <PolicyGroup
                  classification="confirmed"
                  policies={confirmedPolicies}
                  pendingPolicyIds={pendingPolicyIds}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEdit={onEdit}
                  onDecide={onDecide}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-4">
            {exceptions.length === 0 ? (
              <EmptyState text="아직 분석된 예외처리 케이스가 없습니다." />
            ) : (
              EXCEPTION_CATEGORIES.map((category) => (
                <ExceptionGroup
                  key={category}
                  category={category}
                  exceptions={exceptions.filter((e) => e.category === category)}
                />
              ))
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>
  );
}
