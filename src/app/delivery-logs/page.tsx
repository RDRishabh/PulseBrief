import { getDeliveryLogs } from "@/actions/delivery-logs";
import { DeliveryLogsTable } from "@/components/delivery-logs/delivery-logs-table";

interface DeliveryLogsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function DeliveryLogsPage({
  searchParams,
}: DeliveryLogsPageProps) {
  const params = await searchParams;
  const result = await getDeliveryLogs({
    page: Number(params.page) || 1,
    search: params.search,
    status: (params.status as "sent" | "failed" | "pending" | "delivered" | "read" | "all") || "all",
  });

  return (
    <DeliveryLogsTable
      logs={result.data}
      pagination={result.pagination}
      initialSearch={params.search ?? ""}
      initialStatus={params.status ?? "all"}
    />
  );
}