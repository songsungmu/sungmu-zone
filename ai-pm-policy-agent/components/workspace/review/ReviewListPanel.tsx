import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/workspace/Panel";
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

const EXCEPTION_CATEGORIES: ExceptionCategory[] = ["system", "policy", "user", "boundary"];

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

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      <span className="text-xs font-normal text-muted-foreground">{count}</span>
    </>
  );
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
  const groupProps = { pendingPolicyIds, onApprove, onReject, onEdit, onDecide };
  const pendingDecisionCount =
    policies.filter((p) => p.classification === "need_decision").length + conflicts.length;

  return (
    <Panel>
      <Tabs defaultValue="requirements" className="flex h-full min-h-0 flex-col gap-0">
        <div className="flex h-12 shrink-0 items-stretch justify-between border-b px-5">
          <TabsList>
            <TabsTrigger value="requirements">
              <TabLabel label="요구사항" count={requirements.length} />
            </TabsTrigger>
            <TabsTrigger value="policies">
              <TabLabel label="정책" count={policies.length} />
            </TabsTrigger>
            <TabsTrigger value="exceptions">
              <TabLabel label="예외처리" count={exceptions.length} />
            </TabsTrigger>
          </TabsList>

          {pendingDecisionCount > 0 && (
            <span className="hidden self-center text-xs text-status-need-decision-foreground sm:inline">
              검토가 필요한 항목 {pendingDecisionCount}건
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <TabsContent value="requirements">
            {requirements.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y">
                {requirements.map((requirement) => (
                  <RequirementCard key={requirement.id} requirement={requirement} />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="policies">
            {policies.length === 0 && conflicts.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {conflicts.length > 0 && (
                  <div className="space-y-3 border-b px-5 py-4">
                    {conflicts.map((conflict) => (
                      <ConflictBanner
                        key={conflict.id}
                        conflict={conflict}
                        onResolve={onResolveConflict}
                      />
                    ))}
                  </div>
                )}
                <PolicyGroup
                  classification="need_decision"
                  policies={policies.filter((p) => p.classification === "need_decision")}
                  {...groupProps}
                />
                <PolicyGroup
                  classification="suggested"
                  policies={policies.filter((p) => p.classification === "suggested")}
                  {...groupProps}
                />
                <PolicyGroup
                  classification="confirmed"
                  policies={policies.filter((p) => p.classification === "confirmed")}
                  {...groupProps}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="exceptions">
            {exceptions.length === 0 ? (
              <EmptyState />
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
        </div>
      </Tabs>
    </Panel>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="text-[13px] font-medium">아직 분석 결과가 없습니다</p>
      <p className="text-xs text-muted-foreground">
        화면설계서를 업로드하고 정책 검토를 시작하세요.
      </p>
    </div>
  );
}
