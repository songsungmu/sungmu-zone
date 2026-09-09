import { Card, CardContent } from "@/components/ui/card";
import type { ExceptionCategory, ExceptionItem } from "@/types/review";

const CATEGORY_LABEL: Record<ExceptionCategory, string> = {
  system: "시스템 오류",
  policy: "정책 위반",
  user: "사용자 입력",
  boundary: "경계값",
};

interface ExceptionGroupProps {
  category: ExceptionCategory;
  exceptions: ExceptionItem[];
}

export function ExceptionGroup({ category, exceptions }: ExceptionGroupProps) {
  if (exceptions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        {CATEGORY_LABEL[category]}{" "}
        <span className="text-muted-foreground">· {exceptions.length}건</span>
      </h3>
      <div className="space-y-2">
        {exceptions.map((item) => (
          <Card key={item.id} className="py-0">
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {item.id}
                </span>
                <span className="text-sm font-semibold">{item.situation}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                → {item.handling}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
