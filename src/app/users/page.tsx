import { getUsers } from "@/actions/users";
import { UsersTable } from "@/components/users/users-table";



export default async function UsersPage() {
  const result = await getUsers({
    limit: 10000,
    status: "all",
  });

  return <UsersTable initialUsers={result.data} />;
}