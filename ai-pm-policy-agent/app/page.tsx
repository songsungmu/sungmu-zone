import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-secondary/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="size-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold">PM Agent</span>
            </div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              POLICY REVIEW CONSOLE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-status-confirmed-foreground" />
            인프라 정상 작동중
          </span>
          <Badge variant="outline">v0.1.0</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Figma 화면설계서 / 정책 시트 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Figma 파일 URL" />
              <Input placeholder="Google Sheet 정책 문서 URL" />
            </div>
            <Button disabled>분석 시작하기</Button>
            <p className="text-xs text-muted-foreground">
              분석 로직은 이후 Phase에서 연결됩니다. 지금은 디자인 시스템과
              프로젝트 뼈대만 구성된 상태입니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              리뷰 항목 상태 배지 (디자인 시스템 미리보기)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="confirmed">Confirmed</Badge>
              <Badge variant="suggested">Suggested</Badge>
              <Badge variant="need-decision">Need decision</Badge>
              <Badge variant="conflict">Conflict</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="requirements">
          <TabsList>
            <TabsTrigger value="requirements">상세 요구사항</TabsTrigger>
            <TabsTrigger value="policies">세부 정책</TabsTrigger>
            <TabsTrigger value="edge-cases">예외처리 케이스</TabsTrigger>
          </TabsList>
          <TabsContent value="requirements">
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 분석된 항목이 없습니다.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="policies">
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 분석된 항목이 없습니다.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="edge-cases">
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 분석된 항목이 없습니다.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
