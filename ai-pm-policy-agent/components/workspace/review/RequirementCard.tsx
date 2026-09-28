import type { RequirementItem } from "@/types/review";

interface RequirementCardProps {
  requirement: RequirementItem;
}

export function RequirementCard({ requirement }: RequirementCardProps) {
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
      <span className="pt-px font-mono text-xs text-muted-foreground">{requirement.id}</span>

      <div className="min-w-0">
        <p className="text-[13px] font-medium">{requirement.title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {requirement.description}
        </p>
      </div>

      <span
        className="max-w-40 truncate pt-px text-xs text-muted-foreground"
        title={requirement.sourceFrame}
      >
        {requirement.sourceFrame ?? "추론"}
      </span>
    </li>
  );
}
