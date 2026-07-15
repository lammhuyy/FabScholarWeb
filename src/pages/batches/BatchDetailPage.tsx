/*import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete } from "../../api/client";

interface RunSummary {
  id: string;
  pdf_filename: string;
  status: "queued" | "running" | "completed" | "failed";
  current_stage?: string;
  created_at: string;
  error_message?: string;
}

interface BatchDetail {
  batch_id: string;
  name: string;
  domain: string;
  research_topic?: string;
  status: "queued" | "running" | "partial" | "completed" | "failed";
  created_at: string;
  total_documents: number;
  completed_documents: number;
  runs: RunSummary[];
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "completed")
    return (
      <span className="bg-emerald-100 text-emerald-700 border-emerald-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
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
      <span className="bg-red-100 text-red-700 border-red-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        FAILED
      </span>
    );
  if (status === "queued")
    return (
      <span className="bg-gray-100 text-gray-600 border-gray-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        QUEUED
      </span>
    );
  return (
    <span className="bg-[#1488D8]/10 text-[#1488D8] border-[#1488D8]/30 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1488D8] animate-pulse"></span>
      RUNNING
    </span>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function BatchDetailPage() {
  const { batch_id } = useParams<{ batch_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "documents" | "matrix" | "artifacts"
  >("documents");
  const [deleting, setDeleting] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch", batch_id],
    queryFn: () => apiGet<BatchDetail>(`/batches/${batch_id}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.status === "queued" || data.status === "running"
        ? 3000
        : false;
    },
    enabled: !!batch_id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/batches/${batch_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      navigate("/batches");
    },
  });

  const handleDelete = () => {
    if (deleting) return;
    if (
      window.confirm(
        "Are you sure you want to delete this entire batch and all associated documents? This action cannot be undone.",
      )
    ) {
      setDeleting(true);
      deleteMutation.mutate(undefined, { onSettled: () => setDeleting(false) });
    }
  };

  if (isLoading)
    return (
      <div className="py-20 text-center text-[#1488D8] font-medium animate-pulse">
        Loading Systematic Batch...
      </div>
    );
  if (!batch)
    return (
      <div className="py-20 text-center text-red-500">Batch not found.</div>
    );

  const progress =
    batch.total_documents > 0
      ? Math.round((batch.completed_documents / batch.total_documents) * 100)
      : 0;
  const failedRuns =
    batch.runs?.filter((r) => r.status === "failed")?.length || 0;

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <Link
        to="/batches"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#1488D8] transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
        Back to Batches
      </Link>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#030391] to-[#1488D8]"></div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#030391] tracking-tight">
              {batch.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={batch.status} />
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                {batch.domain}
              </span>
              {batch.research_topic && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                  {batch.research_topic}
                </span>
              )}
            </div>
            <div className="mt-3 text-xs text-gray-400 font-medium">
              Created on {formatTimestamp(batch.created_at)}
            </div>
          </div>

          <div className="w-full lg:w-72 bg-gray-50 rounded-xl p-4 border border-gray-100 shrink-0">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Orchestration Progress
              </span>
              <span className="text-lg font-black text-[#030391] leading-none">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  batch.status === "failed"
                    ? "bg-red-500"
                    : batch.status === "partial"
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-[#030391] to-[#1488D8]"
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-600">
                {batch.completed_documents} Completed
              </span>
              <span className="text-gray-500">
                {batch.total_documents} Total
              </span>
              {failedRuns > 0 && (
                <span className="text-red-500">{failedRuns} Failed</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 text-red-600 px-4 py-2 text-xs font-bold transition-all hover:bg-red-50 disabled:opacity-50 h-fit"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Batch"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          {(["documents", "matrix", "artifacts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-black tracking-widest uppercase transition-all ${
                activeTab === tab
                  ? "border-b-[3px] border-[#1488D8] text-[#030391]"
                  : "border-b-[3px] border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
              }`}
            >
              {tab === "documents"
                ? "Processed Documents"
                : tab === "matrix"
                  ? "Traceability Matrix"
                  : "Batch Artifacts"}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "documents" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!batch.runs || batch.runs.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No documents found in this batch.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#030391]/5">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Document Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Current Stage
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {batch.runs.map((r) => (
                  <tr
                    key={r.id}
                    className="group hover:bg-[#1488D8]/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-[#1488D8] transition-colors"
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
                        <span className="text-sm font-bold text-gray-800">
                          {r.pdf_filename}
                        </span>
                      </div>
                      {r.error_message && (
                        <p className="mt-1 text-[10px] text-red-500 font-mono pl-8 line-clamp-1">
                          {r.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {r.current_stage?.replace(/_/g, " ") || "INITIALIZING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1488D8] hover:text-[#030391] border border-[#1488D8]/30 hover:border-[#030391] rounded-md px-3 py-1.5 transition-all bg-white"
                      >
                        Inspect Node
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          ></path>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          {batch.status === "completed" ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-black text-[#030391] mb-2">
                Comparative Matrix Generated
              </h3>
              <p className="text-sm text-gray-500 max-w-lg mx-auto mb-6">
                The agents have successfully synthesized the findings across all{" "}
                {batch.completed_documents} documents. You can now download the
                structured dataset for your Systematic Literature Review.
              </p>
              <div className="flex justify-center gap-4">
                <button className="flex items-center gap-2 rounded-lg bg-[#030391] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1488D8] shadow-md">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    ></path>
                  </svg>
                  Export as CSV
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 shadow-md">
                  Export Excel (.xlsx)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 border border-gray-100">
                <svg
                  className="h-8 w-8"
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
              <h3 className="text-xl font-black text-gray-800 mb-2">
                Matrix Synthesis Pending
              </h3>
              <p className="text-sm text-gray-500 max-w-lg mx-auto">
                The Traceability Matrix will be generated once all documents in
                the batch have successfully passed the integrity gates and
                extraction pipeline.
              </p>
            </>
          )}
        </div>
      )}

      {activeTab === "artifacts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1488D8]/10 text-[#1488D8] border border-[#1488D8]/20">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              ></path>
            </svg>
          </div>
          <h3 className="text-xl font-black text-[#030391] mb-2">
            Batch-Level Artifacts
          </h3>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mb-6">
            Download the entire collection of extracted YAMLs, Markdown
            syntheses, and raw bookmarks as a single compressed archive.
          </p>
          <button
            disabled={batch.status !== "completed"}
            className="inline-flex items-center gap-2 rounded-lg bg-white border-2 border-[#1488D8] px-6 py-2.5 text-sm font-bold text-[#1488D8] transition-all hover:bg-[#1488D8] hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
            Download Full Batch Archive (.zip)
          </button>
        </div>
      )}
    </div>
  );
}
*/
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete } from "../../api/client";

interface BatchItemSummary {
  id: number;
  pdf_filename: string;
  status: "pending" | "in_progress" | "done" | "failed";
  attempts: number;
  error_message?: string | null;
  run_id?: string | null;
}

interface BatchDetail {
  batch_id: string;
  domain: string;
  research_topic?: string | null;
  pipeline_profile: string;
  status: "queued" | "running" | "partial" | "completed" | "failed";
  created_at: string;
  finished_at?: string | null;
  total_papers: number;
  completed_papers: number;
  failed_papers: number;
  batch_size: number;
  max_retries: number;
  checkpoint_path: string;
  template_id?: string | null;
  items: BatchItemSummary[];
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

const StatusBadge = ({ status }: { status: string }) => {
  // batch-level: queued | running | partial | completed | failed
  // item-level:  pending | in_progress | done | failed
  if (status === "completed" || status === "done")
    return (
      <span className="bg-emerald-100 text-emerald-700 border-emerald-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        {status === "done" ? "DONE" : "COMPLETED"}
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
      <span className="bg-red-100 text-red-700 border-red-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        FAILED
      </span>
    );
  if (status === "queued" || status === "pending")
    return (
      <span className="bg-gray-100 text-gray-600 border-gray-300 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
        {status === "pending" ? "PENDING" : "QUEUED"}
      </span>
    );
  return (
    <span className="bg-[#1488D8]/10 text-[#1488D8] border-[#1488D8]/30 border px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1488D8] animate-pulse"></span>
      {status === "in_progress" ? "RUNNING" : "RUNNING"}
    </span>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function BatchDetailPage() {
  const { batch_id } = useParams<{ batch_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "documents" | "matrix" | "artifacts"
  >("documents");
  const [deleting, setDeleting] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch", batch_id],
    queryFn: () => apiGet<BatchDetail>(`/batches/${batch_id}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.status === "queued" || data.status === "running"
        ? 3000
        : false;
    },
    enabled: !!batch_id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/batches/${batch_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      navigate("/batches");
    },
  });

  const handleDelete = () => {
    if (deleting) return;
    if (
      window.confirm(
        "Are you sure you want to delete this entire batch and all associated documents? This action cannot be undone.",
      )
    ) {
      setDeleting(true);
      deleteMutation.mutate(undefined, { onSettled: () => setDeleting(false) });
    }
  };

  if (isLoading)
    return (
      <div className="py-20 text-center text-[#1488D8] font-medium animate-pulse">
        Loading Systematic Batch...
      </div>
    );
  if (!batch)
    return (
      <div className="py-20 text-center text-red-500">Batch not found.</div>
    );

  const progress =
    batch.total_papers > 0
      ? Math.round((batch.completed_papers / batch.total_papers) * 100)
      : 0;
  const failedItems =
    batch.items?.filter((i) => i.status === "failed")?.length ||
    batch.failed_papers ||
    0;
  // Backend has no dedicated "batch name" field yet — fall back to
  // research topic, then domain, same convention as BatchListPage.
  const batchTitle = batch.research_topic || batch.domain;

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <Link
        to="/batches"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#1488D8] transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
        Back to Batches
      </Link>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#030391] to-[#1488D8]"></div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#030391] tracking-tight">
              {batchTitle}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={batch.status} />
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                {batch.domain}
              </span>
              {batch.research_topic && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                  {batch.research_topic}
                </span>
              )}
            </div>
            <div className="mt-3 text-xs text-gray-400 font-medium">
              Created on {formatTimestamp(batch.created_at)}
            </div>
          </div>

          <div className="w-full lg:w-72 bg-gray-50 rounded-xl p-4 border border-gray-100 shrink-0">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Orchestration Progress
              </span>
              <span className="text-lg font-black text-[#030391] leading-none">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  batch.status === "failed"
                    ? "bg-red-500"
                    : batch.status === "partial"
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-[#030391] to-[#1488D8]"
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-600">
                {batch.completed_papers} Completed
              </span>
              <span className="text-gray-500">{batch.total_papers} Total</span>
              {failedItems > 0 && (
                <span className="text-red-500">{failedItems} Failed</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 text-red-600 px-4 py-2 text-xs font-bold transition-all hover:bg-red-50 disabled:opacity-50 h-fit"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Batch"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          {(["documents", "matrix", "artifacts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-black tracking-widest uppercase transition-all ${
                activeTab === tab
                  ? "border-b-[3px] border-[#1488D8] text-[#030391]"
                  : "border-b-[3px] border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
              }`}
            >
              {tab === "documents"
                ? "Processed Documents"
                : tab === "matrix"
                  ? "Traceability Matrix"
                  : "Batch Artifacts"}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "documents" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!batch.items || batch.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No documents found in this batch.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#030391]/5">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Document Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Attempts
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-[#030391]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {batch.items.map((r) => (
                  <tr
                    key={r.id}
                    className="group hover:bg-[#1488D8]/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-[#1488D8] transition-colors"
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
                        <span className="text-sm font-bold text-gray-800">
                          {r.pdf_filename}
                        </span>
                      </div>
                      {r.error_message && (
                        <p className="mt-1 text-[10px] text-red-500 font-mono pl-8 line-clamp-1">
                          {r.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {r.attempts}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {r.run_id ? (
                        <Link
                          to={`/runs/${r.run_id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1488D8] hover:text-[#030391] border border-[#1488D8]/30 hover:border-[#030391] rounded-md px-3 py-1.5 transition-all bg-white"
                        >
                          Inspect Node
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            ></path>
                          </svg>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          {batch.status === "completed" ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-black text-[#030391] mb-2">
                Comparative Matrix Generated
              </h3>
              <p className="text-sm text-gray-500 max-w-lg mx-auto mb-6">
                The agents have successfully synthesized the findings across all{" "}
                {batch.completed_papers} documents. You can now download the
                structured dataset for your Systematic Literature Review.
              </p>
              <div className="flex justify-center gap-4">
                <button className="flex items-center gap-2 rounded-lg bg-[#030391] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1488D8] shadow-md">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    ></path>
                  </svg>
                  Export as CSV
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 shadow-md">
                  Export Excel (.xlsx)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 border border-gray-100">
                <svg
                  className="h-8 w-8"
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
              <h3 className="text-xl font-black text-gray-800 mb-2">
                Matrix Synthesis Pending
              </h3>
              <p className="text-sm text-gray-500 max-w-lg mx-auto">
                The Traceability Matrix will be generated once all documents in
                the batch have successfully passed the integrity gates and
                extraction pipeline.
              </p>
            </>
          )}
        </div>
      )}

      {activeTab === "artifacts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1488D8]/10 text-[#1488D8] border border-[#1488D8]/20">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              ></path>
            </svg>
          </div>
          <h3 className="text-xl font-black text-[#030391] mb-2">
            Batch-Level Artifacts
          </h3>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mb-6">
            Download the entire collection of extracted YAMLs, Markdown
            syntheses, and raw bookmarks as a single compressed archive.
          </p>
          <button
            disabled={batch.status !== "completed"}
            className="inline-flex items-center gap-2 rounded-lg bg-white border-2 border-[#1488D8] px-6 py-2.5 text-sm font-bold text-[#1488D8] transition-all hover:bg-[#1488D8] hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
            Download Full Batch Archive (.zip)
          </button>
        </div>
      )}
    </div>
  );
}
