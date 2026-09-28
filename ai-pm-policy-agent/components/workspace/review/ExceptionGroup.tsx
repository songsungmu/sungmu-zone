import { SectionHeader } from "@/components/workspace/review/SectionHeader";
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
    <section>
      <SectionHeader label={CATEGORY_LABEL[category]} count={exceptions.length} />
      <ul className="divide-y">
        {exceptions.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
          >
            <span className="pt-px font-mono text-xs text-muted-foreground">{item.id}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{item.situation}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                <span className="mr-1.5 text-xs font-medium text-foreground/70">처리</span>
                {item.handling}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
