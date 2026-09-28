import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const STATUS_BASE =
  "border-transparent before:size-1.5 before:rounded-full before:bg-current before:content-['']";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-muted-foreground",
        // 상태 배지 4종 — 프로젝트 전체에서 리뷰 항목 상태 표시는 이 4개 variant만 사용한다.
        confirmed: `${STATUS_BASE} bg-status-confirmed text-status-confirmed-foreground`,
        suggested: `${STATUS_BASE} bg-status-suggested text-status-suggested-foreground`,
        "need-decision": `${STATUS_BASE} bg-status-need-decision text-status-need-decision-foreground`,
        conflict: `${STATUS_BASE} bg-status-conflict text-status-conflict-foreground`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
