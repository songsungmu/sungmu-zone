/** 목록 안의 그룹 구분 헤더 — 스크롤해도 위에 붙어 있어 지금 보는 그룹을 알 수 있다. */
export function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted px-5 py-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}
