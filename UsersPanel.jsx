import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search, Users } from "lucide-react";
import { UserDialog } from "@/components/admin/UserDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListUsers } from "@/lib/admin-fns";
import { formatBytes, timeAgo } from "@/lib/format";

const STATUS_TONE = {
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-rose-50 text-rose-700",
  deletion_requested: "bg-amber-50 text-amber-700",
  deleted: "bg-slate-100 text-slate-600",
};

export function UsersPanel() {
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(term.trim()), 350);
    return () => clearTimeout(timer);
  }, [term]);

  const query = useInfiniteQuery({
    queryKey: ["admin-users", search, status],
    queryFn: ({ pageParam }) => adminListUsers({ data: { search: search || undefined, status, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
    staleTime: 10_000,
  });

  const users = (query.data?.pages ?? []).flatMap((page) => page.users ?? []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Registered users</h2>
        <p className="text-xs text-slate-500">Quotas, usage and account status for every member.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search by username or email" className="h-11 rounded-xl bg-white pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-11 w-[190px] rounded-xl bg-white" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deletion_requested">Deletion requested</SelectItem>
            <SelectItem value="deleted">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No matching accounts</p>
            <p className="mt-1 text-sm text-slate-500">Adjust the search or the status filter to see more members.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Files</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelected(user)}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{user.username || "—"}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_TONE[user.status] || STATUS_TONE.deleted}`}>
                      {(user.status || "active").replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(user.quota_bytes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(user.used_bytes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(user.remaining_bytes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{user.file_count}</TableCell>
                  <TableCell className="text-xs text-slate-500">{user.last_seen ? timeAgo(user.last_seen) : "never"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="rounded-lg">
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-xl" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}

      <UserDialog
        user={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => query.refetch()}
      />
    </div>
  );
}