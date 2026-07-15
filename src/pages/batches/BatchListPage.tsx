import { useState, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";

interface BatchSummary {
  batch_id: string;
  domain: string;
  research_topic?: string | null;
  pipeline_profile: string;
  total_papers: number;
  completed_papers: number;
  failed_papers: number;
  status: "queued" | "running" | "partial" | "completed" | "failed";
  created_at: string;
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

const BatchStatusBadge = ({ status }: { status: string }) => {
  if (status === "completed")
    return (
      <span className="bg-emerald-100 text-emerald-700 border-emerald-300 border px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
        COMPLETED
      </span>
    );
  if (status === "partial")
    return (
      <span className="bg-amber-100 text-amber-700 border-amber-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        PARTIAL
      </span>
    );
  if (status === "failed")
    return (
      <span className="bg-red-100 text-red-700 border-red-300 border px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
        FAILED
      </span>
    );
  if (status === "queued")
    return (
      <span className="bg-gray-100 text-gray-600 border-gray-300 border px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
        QUEUED
      </span>
    );
  return (
    <span className="bg-[#1488D8]/10 text-[#1488D8] border-[#1488D8]/30 border px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1488D8] animate-pulse"></span>
      PROCESSING
    </span>
  );
};

export default function BatchListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const PAGE_SIZE = 20;
  const navigate = useNavigate();

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

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches", page],
    queryFn: () =>
      apiGet<BatchSummary[]>("/batches", { page, page_size: PAGE_SIZE }).catch(
        () => [],
      ),
  });

  const hasNext = batches.length === PAGE_SIZE;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#030391] tracking-tight">
            Systematic Batches
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Run parallel extractions for systematic literature reviews.
          </p>
        </div>
        <Link
          to="/batches/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1488D8] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#030391] hover:shadow-lg"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          New Batch
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#1488D8]/20 border-t-[#1488D8] rounded-full animate-spin"></div>
        </div>
      ) : batches.length === 0 ? (
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
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              ></path>
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-black text-[#030391]">
            No Batches Found
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-gray-600 leading-relaxed">
            Upload multiple academic papers at once to orchestrate a systematic
            literature review. FabScholar will process them in parallel and
            synthesize a comparative matrix.
          </p>
          <Link
            to="/batches/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#030391] px-8 py-3 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-[#1488D8] shadow-md"
          >
            Create Literature Batch
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
                    Batch Collection
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Domain
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-wider text-[#030391]">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {batches.map((batch) => {
                  const progress =
                    batch.total_papers > 0
                      ? Math.round(
                          (batch.completed_papers / batch.total_papers) * 100,
                        )
                      : 0;
                  return (
                    <tr
                      key={batch.batch_id}
                      onClick={() => navigate(`/batches/${batch.batch_id}`)}
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
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              ></path>
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-[#1488D8] transition-colors">
                              {batch.research_topic || batch.domain}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {batch.batch_id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                          {batch.domain}
                        </span>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-gray-500">
                            <span>
                              {batch.completed_papers} / {batch.total_papers}{" "}
                              docs
                            </span>
                            <span className="text-[#030391]">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-[#030391] to-[#1488D8] h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <BatchStatusBadge status={batch.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className="text-xs font-medium text-gray-500">
                          {relativeTime(batch.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
