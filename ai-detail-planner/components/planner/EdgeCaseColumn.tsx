"use client";

import { Loader2 } from "lucide-react";
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
import type { EdgeCase } from "@/types/planner";

interface EdgeCaseColumnProps {
  items: EdgeCase[];
  onAdd: (text: string) => void;
  isLoading?: boolean;
  isAdding?: boolean;
}

export function EdgeCaseColumn({
  items,
  onAdd,
  isLoading = false,
  isAdding = false,
}: EdgeCaseColumnProps) {
  const [draft, setDraft] = useState("");
  const disabled = isLoading || isAdding;

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <Card className="flex flex-col gap-0 overflow-hidden py-0 lg:h-full">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          3. 예외처리 케이스 (AI 초안)
          {isLoading && (
            <span className="text-xs font-normal text-slate-400">생성 중...</span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">예외 ID</TableHead>
              <TableHead>예외 상황</TableHead>
              <TableHead>처리 방식</TableHead>
              <TableHead className="w-24">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell className="align-top">
                      <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="h-4 w-full max-w-28 animate-pulse rounded bg-slate-200" />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="h-4 w-full max-w-36 animate-pulse rounded bg-slate-200" />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="h-5 w-16 animate-pulse rounded bg-slate-200" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top font-mono text-xs text-slate-500">
                      {item.id}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal text-sm font-semibold text-slate-900">
                      {item.situation}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal text-xs text-slate-600">
                      {item.handling}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={item.status} />
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
          disabled={disabled}
        />
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleAdd}
          disabled={disabled}
        >
          {isAdding ? <Loader2 className="size-4 animate-spin" /> : "입력"}
        </Button>
      </div>
    </Card>
  );
}
