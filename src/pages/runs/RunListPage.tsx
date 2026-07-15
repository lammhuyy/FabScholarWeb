/*import { useState, useCallback, useMemo, useEffect } from "react";
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
*/
import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
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
  return (
    data?.some((r) => r.status === "queued" || r.status === "running") ?? false
  );
}

// Inline Status Badge for customized brand colors
const RunStatusBadge = ({ status }: { status: string }) => {
  if (status === "done")
    return (
      <span className="bg-emerald-50 text-emerald-700 border-emerald-200 border px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
        COMPLETED
      </span>
    );
  if (status === "failed")
    return (
      <span className="bg-red-50 text-red-700 border-red-200 border px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
        FAILED
      </span>
    );
  if (status === "queued")
    return (
      <span className="bg-gray-100 text-gray-600 border-gray-200 border px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
        QUEUED
      </span>
    );
  return (
    <span className="bg-[#1488D8]/10 text-[#1488D8] border-[#1488D8]/30 border px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1488D8] animate-pulse"></span>
      RUNNING
    </span>
  );
};

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

  const {
    data: runs = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["runs", queryParams],
    queryFn: () => apiGet<RunSummary[]>("/runs", queryParams),
    refetchInterval: (query) => {
      const data = query.state.data;
      return hasActiveRun(data) ? 5000 : false;
    },
  });

  const activePolling = runs.some(
    (r) => r.status === "queued" || r.status === "running",
  );
  const hasNext = runs.length === PAGE_SIZE;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#030391] tracking-tight">
            Extraction Runs
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Monitor and manage multi-agent literature processing pipelines.
          </p>
        </div>
        <Link
          to="/runs/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1488D8] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#030391] hover:shadow-lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          New Extraction
        </Link>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex flex-1 gap-4 min-w-[300px]">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by filename or topic..."
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 py-2 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
            />
          </div>
          <select
            value={domain}
            onChange={(e) => setParam("domain", e.target.value)}
            className="block w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
          >
            <option value="">All Domains</option>
            <option value="cs">Computer Science</option>
            <option value="bio">Biology</option>
            <option value="med">Medicine</option>
          </select>
          <select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="block w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
          >
            <option value="">All Statuses</option>
            {RUN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          {activePolling ? (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-[#1488D8] uppercase tracking-wider">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1488D8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1488D8]"></span>
              </span>
              Live Sync
            </span>
          ) : isFetching ? (
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Refreshing...
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Synced
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#1488D8]/20 border-t-[#1488D8] rounded-full animate-spin"></div>
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[#1488D8]/30 bg-gradient-to-b from-white to-[#1488D8]/5 px-6 py-20 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#030391]/5 text-[#030391]">
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              ></path>
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-black text-[#030391]">
            No Extractions Found
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-gray-600 leading-relaxed">
            Initialize your first multi-agent research pipeline. The system will
            automatically retrieve literature, verify citations, and synthesize
            findings through structured integrity gates.
          </p>
          <Link
            to="/runs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#030391] px-8 py-3 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-[#1488D8] shadow-md"
          >
            Start Pipeline Configuration
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              ></path>
            </svg>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#030391]/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Document
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Domain & Topic
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    State
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Pipeline Profile
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Timeline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {runs.map((run) => (
                  <tr
                    key={run.run_id}
                    onClick={() =>
                      (window.location.href = `/runs/${run.run_id}`)
                    }
                    className="group cursor-pointer transition-colors hover:bg-[#1488D8]/5"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-[#1488D8]/10 group-hover:text-[#1488D8] transition-colors">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            ></path>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <Link
                            to={`/runs/${run.run_id}`}
                            className="text-sm font-bold text-gray-900 group-hover:text-[#1488D8] transition-colors"
                          >
                            {run.pdf_filename}
                          </Link>
                          <span className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {run.run_id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                          {run.domain}
                        </span>
                        {run.research_topic && (
                          <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">
                            {run.research_topic}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-xs font-semibold text-gray-600">
                        {run.pipeline_profile.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="text-xs font-medium text-gray-500">
                        {relativeTime(run.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#030391] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Page {page}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setParam("page", String(page + 1))}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#030391] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
