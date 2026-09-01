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
import type { Requirement } from "@/types/planner";

interface RequirementColumnProps {
  items: Requirement[];
  onAdd: (text: string) => void;
}

export function RequirementColumn({ items, onAdd }: RequirementColumnProps) {
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
          1. 상세 요구사항 (AI 초안)
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>요구사항</TableHead>
              <TableHead className="w-14">유형</TableHead>
              <TableHead className="w-24">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="align-top font-mono text-xs text-slate-500">
                  {item.id}
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </div>
                </TableCell>
                <TableCell className="align-top text-xs text-slate-600">
                  {item.type}
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
