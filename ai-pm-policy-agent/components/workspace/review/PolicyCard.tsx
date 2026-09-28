"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PolicyClassification, PolicyDecision, PolicyItem } from "@/types/review";

export const CLASSIFICATION_META: Record<
  PolicyClassification,
  { label: string; variant: "confirmed" | "suggested" | "need-decision" }
> = {
  confirmed: { label: "확정", variant: "confirmed" },
  suggested: { label: "제안", variant: "suggested" },
  need_decision: { label: "결정 필요", variant: "need-decision" },
};

interface PolicyCardProps {
  policy: PolicyItem;
  isSubmitting?: boolean;
  onApprove: (policy: PolicyItem) => void;
  onReject: (policy: PolicyItem) => void;
  onEdit: (policy: PolicyItem, newContent: string) => void;
  onDecide: (policy: PolicyItem, decision: PolicyDecision) => void;
}

export function PolicyCard({
  policy,
  isSubmitting = false,
  onApprove,
  onReject,
  onEdit,
  onDecide,
}: PolicyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(policy.content);
  const [selectedDecision, setSelectedDecision] = useState<PolicyDecision>("apply_new");

  function handleStartEdit() {
    setDraftContent(policy.content);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    const trimmed = draftContent.trim();
    if (trimmed) onEdit(policy, trimmed);
    setIsEditing(false);
  }

  const isRejected = policy.approvalStatus === "rejected";
  const meta = CLASSIFICATION_META[policy.classification];

  return (
    <li
      className={cn(
        "grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40",
        isRejected && "opacity-45"
      )}
    >
      <span className="pt-px font-mono text-xs text-muted-foreground">{policy.id}</span>

      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-[13px] font-medium">
            {policy.title}
            {isRejected && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">반려됨</span>
            )}
          </p>

          {isEditing ? (
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="mt-2"
              rows={3}
            />
          ) : (
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {policy.content}
            </p>
          )}

          {policy.rationale && !isEditing && (
            <p className="mt-1.5 text-xs text-muted-foreground/80">
              근거 — {policy.rationale}
            </p>
          )}

          {policy.approvalStatus === "approved" && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-status-confirmed-foreground">
              <Check className="size-3" strokeWidth={2.5} />
              정책 시트에 반영됨
            </p>
          )}
        </div>

        {policy.classification === "suggested" &&
          !isRejected &&
          (isEditing ? (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleSaveEdit} disabled={isSubmitting}>
                저장 후 승인
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => onApprove(policy)} disabled={isSubmitting}>
                {isSubmitting ? "처리 중" : "승인"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleStartEdit} disabled={isSubmitting}>
                수정
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="hover:text-destructive"
                onClick={() => onReject(policy)}
                disabled={isSubmitting}
              >
                반려
              </Button>
            </div>
          ))}

        {policy.classification === "need_decision" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-md border p-0.5">
              {(
                [
                  ["keep_existing", "기존 정책 유지"],
                  ["apply_new", "신규 정책 적용"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedDecision(value)}
                  className={cn(
                    "h-6 rounded-[4px] px-2.5 text-xs transition-colors",
                    selectedDecision === value
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => onDecide(policy, selectedDecision)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "처리 중" : "결정"}
            </Button>
          </div>
        )}
      </div>

      <Badge variant={meta.variant}>{meta.label}</Badge>
    </li>
  );
}
