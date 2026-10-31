import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useLabRecords", () => ({
  useLabRecords: () => ({ data: [], isLoading: false }),
  useSaveLabRecord: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLabRecord: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/pages/dashboard/dlab/dlabMoney", () => ({
  useClientSummaries: () => ({ data: [], cases: [], payments: [], credits: [], isLoading: false }),
  money: (n: number) => `₦${n}`,
  sameClient: () => true,
}));

vi.mock("@/hooks/useDentalLab", () => ({
  clientOf: () => "",
}));

import DlabBillingPage from "@/pages/dashboard/dlab/DlabBillingPage";

describe("DlabBillingPage", () => {
  it("renders the four billing tabs and the statements panel", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/app/clinic/demo/dlab/billing"]}>
          <DlabBillingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("tab", { name: "Statements" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Payments Received" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Client Prices" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Credit Notes" })).toBeInTheDocument();
    expect(screen.getByText("Running account per client clinic: work billed, payments and credits.")).toBeInTheDocument();
  });
});
