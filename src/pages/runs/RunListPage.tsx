import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import StatusBadge from "../../components/ui/StatusBadge";
import type { components } from "../../api/types.gen";

type RunSummary = components["schemas"]["RunSummary"];

const RUN_STATUSES = ["queued", "running", "done", "failed"] as const;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function hasActiveRun(data: RunSummary[] | undefined): boolean {
  return data?.some((r) => r.status === "queued" || r.status === "running") ?? false;
}

export default function RunListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "";
  const domain = searchParams.get("domain") || "";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page")) || 1;
  const PAGE_SIZE = 20;

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (status) p.status = status;
    if (domain) p.domain = domain;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [status, domain, debouncedSearch, page]);

  const { data: runs = [], isLoading, isFetching } = useQuery({
    queryKey: ["runs", queryParams],
    queryFn: () => apiGet<RunSummary[]>("/runs", queryParams),
    refetchInterval: (query) => {
      const data = query.state.data;
      return hasActiveRun(data) ? 5000 : false;
    },
  });

  const activePolling = runs.some((r) => r.status === "queued" || r.status === "running");
  const hasNext = runs.length === PAGE_SIZE;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
        <Link
          to="/runs/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Run
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {RUN_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          value={domain}
          onChange={(e) => setParam("domain", e.target.value)}
          placeholder="Filter by domain"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {activePolling && (
          <span className="inline-flex items-center gap-1.5 text-sm text-blue-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Auto-refreshing
          </span>
        )}
        {isFetching && (
          <span className="text-sm text-gray-400">Refreshing...</span>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No runs yet.</p>
          <Link
            to="/runs/new"
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Start your first extraction run
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">PDF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Topic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Profile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {runs.map((run) => (
                  <tr
                    key={run.run_id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => window.location.href = `/runs/${run.run_id}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-indigo-600">
                      <Link to={`/runs/${run.run_id}`} className="hover:underline">
                        {run.pdf_filename}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{run.domain}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500">
                      {run.research_topic || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{run.pipeline_profile}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {relativeTime(run.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setParam("page", String(page + 1))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
