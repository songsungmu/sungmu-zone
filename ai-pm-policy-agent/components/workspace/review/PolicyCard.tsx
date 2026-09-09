"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PolicyClassification, PolicyDecision, PolicyItem } from "@/types/review";

function classificationBadgeVariant(classification: PolicyClassification) {
  switch (classification) {
    case "confirmed":
      return "confirmed" as const;
    case "suggested":
      return "suggested" as const;
    case "need_decision":
      return "need-decision" as const;
  }
}

function classificationLabel(classification: PolicyClassification) {
  switch (classification) {
    case "confirmed":
      return "Confirmed";
    case "suggested":
      return "Suggested";
    case "need_decision":
      return "Need decision";
  }
}

interface PolicyCardProps {
  policy: PolicyItem;
  onApprove: (policy: PolicyItem) => void;
  onReject: (policy: PolicyItem) => void;
  onEdit: (policy: PolicyItem, newContent: string) => void;
  onDecide: (policy: PolicyItem, decision: PolicyDecision) => void;
}

export function PolicyCard({
  policy,
  onApprove,
  onReject,
  onEdit,
  onDecide,
}: PolicyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(policy.content);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] =
    useState<PolicyDecision>("apply_new");

  function handleStartEdit() {
    setDraftContent(policy.content);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    const trimmed = draftContent.trim();
    if (trimmed) onEdit(policy, trimmed);
    setIsEditing(false);
  }

  function handleConfirmDecision() {
    onDecide(policy, selectedDecision);
    setIsDecisionOpen(false);
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {policy.id}
              </span>
              <span className="text-sm font-semibold">{policy.title}</span>
            </div>

            {isEditing ? (
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="mt-1.5 text-xs"
                rows={3}
              />
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {policy.content}
              </p>
            )}

            {policy.rationale && !isEditing && (
              <p className="mt-1 text-[11px] italic text-muted-foreground">
                근거: {policy.rationale}
              </p>
            )}
          </div>

          <Badge
            variant={classificationBadgeVariant(policy.classification)}
            className="shrink-0"
          >
            {classificationLabel(policy.classification)}
          </Badge>
        </div>

        {/* confirmed: 액션 없음, 배지만 */}

        {policy.classification === "suggested" &&
          (isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                저장
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                취소
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onApprove(policy)}>
                승인
              </Button>
              <Button size="sm" variant="outline" onClick={handleStartEdit}>
                수정
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onReject(policy)}
              >
                반려
              </Button>
            </div>
          ))}

        {policy.classification === "need_decision" && (
          <div>
            <button
              type="button"
              onClick={() => setIsDecisionOpen((open) => !open)}
              className="flex items-center gap-1.5 text-xs font-semibold text-status-need-decision-foreground hover:underline"
            >
              <AlertTriangle className="size-3.5" />
              결정 필요 — 클릭해서 선택하기
            </button>

            {isDecisionOpen && (
              <div className="mt-2 space-y-2 rounded-md border bg-muted/50 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name={`decision-${policy.id}`}
                    checked={selectedDecision === "keep_existing"}
                    onChange={() => setSelectedDecision("keep_existing")}
                    className="accent-primary"
                  />
                  기존 정책 유지
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name={`decision-${policy.id}`}
                    checked={selectedDecision === "apply_new"}
                    onChange={() => setSelectedDecision("apply_new")}
                    className="accent-primary"
                  />
                  신규 정책 적용
                </label>
                <Button size="sm" onClick={handleConfirmDecision}>
                  결정 완료
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
