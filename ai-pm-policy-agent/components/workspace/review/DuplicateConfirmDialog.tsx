import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            유사한 정책이 이미 있습니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {reason} 그래도 추가하시겠습니까?
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button size="sm" onClick={onConfirm}>
              추가하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
