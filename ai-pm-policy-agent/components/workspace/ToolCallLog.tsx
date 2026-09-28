import { Check } from "lucide-react";

export type ToolCallStatus = "running" | "done";

export interface ToolCallLogEntry {
  id: string;
  label: string;
  status: ToolCallStatus;
}

interface ToolCallLogProps {
  calls: ToolCallLogEntry[];
}

/** 분석 단계를 세로 진행 목록으로 보여준다. */
export function ToolCallLog({ calls }: ToolCallLogProps) {
  if (calls.length === 0) return null;

  return (
    <ol className="space-y-2.5">
      {calls.map((call) => (
        <li key={call.id} className="flex items-center gap-2.5 text-[13px]">
          {call.status === "done" ? (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Check className="size-2.5 text-primary" strokeWidth={3} />
            </span>
          ) : (
            <span className="size-4 shrink-0 animate-spin rounded-full border-[1.5px] border-primary/20 border-t-primary" />
          )}
          <span
            className={
              call.status === "done" ? "text-muted-foreground" : "font-medium text-foreground"
            }
          >
            {call.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
