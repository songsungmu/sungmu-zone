import { Button } from "@/components/ui/button";

interface DuplicateConfirmDialogProps {
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateConfirmDialog({
  reason,
  onConfirm,
  onCancel,
}: DuplicateConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.18)]">
        <h2 className="text-[15px] font-semibold">유사한 정책이 이미 있습니다</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {reason} 그래도 정책 시트에 추가하시겠습니까?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={onConfirm}>추가</Button>
        </div>
      </div>
    </div>
  );
}
