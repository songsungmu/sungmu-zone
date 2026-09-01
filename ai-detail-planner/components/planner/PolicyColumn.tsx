"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/planner/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Policy } from "@/types/planner";

interface PolicyColumnProps {
  items: Policy[];
  onAdd: (text: string) => void;
}

export function PolicyColumn({ items, onAdd }: PolicyColumnProps) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <Card className="flex flex-col gap-0 overflow-hidden py-0 lg:h-full">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm font-semibold text-blue-700">
          2. 세부 정책 (AI 초안)
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">정책 항목</TableHead>
              <TableHead>정책 내용</TableHead>
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-20">근거</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="align-top text-sm font-semibold text-slate-900">
                  {item.policyName}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-xs text-slate-600">
                  {item.content}
                </TableCell>
                <TableCell className="align-top">
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="align-top text-xs text-slate-500">
                  {item.rationale}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          placeholder="추가 요구사항 입력"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-9"
        />
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleAdd}
        >
          입력
        </Button>
      </div>
    </Card>
  );
}
