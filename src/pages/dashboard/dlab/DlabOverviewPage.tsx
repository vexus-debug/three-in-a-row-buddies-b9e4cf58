import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, AlertTriangle, Zap, Truck, Inbox, PauseCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAB_STAGES, normalizeStage, stageLabel } from "@/config/dentalLab";
import { useLabCases } from "@/hooks/useLabCases";
import { useOrg } from "@/hooks/useOrg";
import { clientOf, isRush, isOverdue } from "@/hooks/useDentalLab";
import { NewCaseDialog } from "./DlabCasesPage";

export default function DlabOverviewPage() {
  const { basePath } = useOrg();
  const { data: cases = [], isLoading } = useLabCases();
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const s = useMemo(() => {
    const active = cases.filter((c) => normalizeStage(c.status) !== "delivered" && c.status !== "cancelled");
    return {
      active,
      late: active.filter(isOverdue),
      rush: active.filter(isRush),
      dueToday: active.filter((c) => c.due_date === today),
      held: active.filter((c) => c.status === "on_hold"),
      ready: active.filter((c) => normalizeStage(c.status) === "ready"),
      receivedToday: cases.filter((c) => c.created_at.slice(0, 10) === today),
    };
  }, [cases, today]);

  const kpis = [
    { label: "In production", value: s.active.length, icon: Inbox },
    { label: "Due today", value: s.dueToday.length, icon: Truck },
    { label: "Late", value: s.late.length, icon: AlertTriangle, warn: s.late.length > 0 },
    { label: "Rush", value: s.rush.length, icon: Zap },
    { label: "On hold", value: s.held.length, icon: PauseCircle, warn: s.held.length > 0 },
  ];
  const urgent = [...s.late, ...s.rush.filter((c) => !s.late.includes(c))].slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader title="Production Overview" description={`${s.receivedToday.length} cases received today · ${s.ready.length} ready to ship`}>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" />New case</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="flex items-center gap-3 p-4">
            <k.icon className={`h-5 w-5 ${k.warn ? "text-destructive" : "text-primary"}`} />
            <div><p className="text-2xl font-bold">{isLoading ? "–" : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cases per stage</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {LAB_STAGES.filter((st) => st.key !== "delivered").map((st) => {
            const n = s.active.filter((c) => normalizeStage(c.status) === st.key).length;
            const pct = s.active.length ? (n / s.active.length) * 100 : 0;
            return (
              <div key={st.key} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 truncate">{st.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <span className="w-6 text-right font-medium">{n}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Needs attention</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to={`${basePath}/dlab/cases`}>Open board</Link></Button>
        </CardHeader>
        <CardContent className="divide-y">
          {urgent.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{cases.length ? "Nothing late or rushed. Nice." : "No cases yet. Add your first case to get started."}</p>}
          {urgent.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{c.case_number} · {c.work_type}</p><p className="truncate text-xs text-muted-foreground">{clientOf(c)} · {stageLabel(c.status)}</p></div>
              <div className="flex shrink-0 items-center gap-1">
                {isOverdue(c) && <Badge variant="destructive">Late</Badge>}
                {isRush(c) && <Badge variant="secondary">Rush</Badge>}
                {c.due_date && <span className="text-xs text-muted-foreground">{format(new Date(c.due_date), "d MMM")}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <NewCaseDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
