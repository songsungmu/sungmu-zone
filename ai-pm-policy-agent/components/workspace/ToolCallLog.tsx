import { Check, Loader2 } from "lucide-react";

export type ToolCallStatus = "running" | "done";

export interface ToolCallLogEntry {
  id: string;
  label: string;
  status: ToolCallStatus;
}

interface ToolCallLogProps {
  calls: ToolCallLogEntry[];
}

export function ToolCallLog({ calls }: ToolCallLogProps) {
  if (calls.length === 0) return null;

  return (
    <ul className="space-y-1 rounded-md bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground">
      {calls.map((call) => (
        <li key={call.id} className="flex items-center gap-1.5">
          {call.status === "done" ? (
            <Check className="size-3 shrink-0 text-status-confirmed-foreground" />
          ) : (
            <Loader2 className="size-3 shrink-0 animate-spin" />
          )}
          <span className="truncate">{call.label}</span>
        </li>
      ))}
    </ul>
  );
}
