import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabRegisterPage from "./LabRegisterPage";
import DlabStatementsPage from "./DlabStatementsPage";

const TABS = [
  { value: "statements", label: "Statements" },
  { value: "payments", label: "Payments Received" },
  { value: "prices", label: "Client Prices" },
  { value: "credits", label: "Credit Notes" },
];

export default function DlabBillingPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "statements";

  return (
    <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-5">
      <TabsList className="flex h-auto flex-wrap justify-start">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="statements"><DlabStatementsPage /></TabsContent>
      <TabsContent value="payments"><LabRegisterPage kind="client-payments" /></TabsContent>
      <TabsContent value="prices"><LabRegisterPage kind="client-prices" /></TabsContent>
      <TabsContent value="credits"><LabRegisterPage kind="credit-notes" /></TabsContent>
    </Tabs>
  );
}
