import { getQuotes } from "@/actions/quotes";
import { QuotesTable } from "@/components/quotes/quotes-table";

export default async function QuotesPage() {
  const result = await getQuotes({
    limit: 10000,
    category: "all",
  });

  return <QuotesTable initialQuotes={result.data} />;
}