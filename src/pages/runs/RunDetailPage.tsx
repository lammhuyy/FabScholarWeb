/*import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../api/client";
import StatusBadge from "../../components/ui/StatusBadge";
import type { components } from "../../api/types.gen";

type RunDetail = components["schemas"]["RunDetail"];
type ArtifactItem = components["schemas"]["ArtifactItem"];
type RunCreated = components["schemas"]["RunCreated"];

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const STAGES = [
  { id: "load_template", label: "Load Template" },
  { id: "plan_tasks", label: "Plan Tasks" },
  { id: "extract_bookmarks", label: "Extract Bookmarks" },
  { id: "inject_appendix", label: "Inject Appendix" },
  { id: "populate_bookmark_markdown", label: "Populate Bookmark Markdown" },
  { id: "categorize_sections", label: "Categorize Sections" },
  { id: "promote_contributions", label: "Promote Contributions" },
  { id: "distribute_task_markdown", label: "Distribute Task Markdown" },
  { id: "synthesize", label: "Synthesize" },
  { id: "aggregate_markdown", label: "Aggregate Markdown" },
  { id: "immutable_post_extract", label: "Immutable Post-Extract" },
];

function stageIndex(stageId: string): number {
  return STAGES.findIndex((s) => s.id === stageId);
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TASK_KIND_LABELS: Record<string, string> = {
  abstract: "Abstract",
  contribution_audit: "Contribution Audit",
  genealogy_positioning: "Genealogy & Positioning",
  system_assumptions: "System Assumptions",
  methodological_deconstruction: "Methodological Deconstruction",
  empirical_validation: "Empirical Validation",
  ablation_integrity: "Ablation Integrity",
  limitation_forensics: "Limitation Forensics",
};

function formatKind(kind: string): string {
  return TASK_KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ExtractAuthor {
  family?: string;
  given?: string;
  orcid?: string;
}

interface ExtractCitation {
  publication_kind?: string;
  title?: string;
  authors?: ExtractAuthor[];
  year?: number;
  doi?: string;
  url?: string;
  notes?: string;
  journal?: Record<string, unknown>;
  conference?: Record<string, unknown>;
  preprint?: Record<string, unknown>;
}

interface ExtractTask {
  task_id: string;
  kind: string;
  synthesis: string;
}

interface ExtractDocument {
  schema_version?: string;
  pipeline_profile?: string;
  provenance?: Record<string, unknown>;
  citation?: ExtractCitation;
  extract?: {
    domain?: string;
    research_topic?: string;
    tasks?: ExtractTask[];
  };
  immutable_post_extract?: {
    endorsement?: Record<string, unknown>;
    atomic_problems?: Record<string, unknown>;
  };
}

function formatAuthor(a: ExtractAuthor): string {
  const parts: string[] = [];
  if (a.family) parts.push(a.family);
  if (a.given) parts.push(a.given.charAt(0) + ".");
  return parts.join(", ");
}

function renderVenue(citation: ExtractCitation): string {
  const kind = citation.publication_kind;
  if (kind === "journal_article" && citation.journal) {
    return citation.journal.name ? String(citation.journal.name) : "Journal article";
  }
  if (kind === "conference_paper" && citation.conference) {
    return citation.conference.name ? String(citation.conference.name) : "Conference paper";
  }
  if (kind === "preprint") return "Preprint";
  return kind?.replace(/_/g, " ") ?? "";
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"artifacts" | "extract" | "usage">("artifacts");
  const [deleting, setDeleting] = useState(false);

  const { data: run, isLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => apiGet<RunDetail>(`/runs/${runId}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "queued" || data.status === "running" ? 3000 : false;
    },
    enabled: !!runId,
  });

  const { data: artifacts = [] } = useQuery({
    queryKey: ["run-artifacts", runId],
    queryFn: () => apiGet<ArtifactItem[]>(`/runs/${runId}/artifacts`),
    enabled: !!runId,
  });

  const { data: extractRaw } = useQuery({
    queryKey: ["run-extract", runId],
    queryFn: () => apiGet<unknown>(`/runs/${runId}/extract`),
    enabled: !!runId && run?.status === "done",
  });

  const extractDoc = extractRaw as ExtractDocument | undefined;

  const rerunMutation = useMutation({
    mutationFn: () => apiPost<RunCreated>(`/runs/${runId}/rerun`, {}),
    onSuccess: (data) => navigate(`/runs/${data.run_id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/runs/${runId}`, { purge_files: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      navigate("/runs");
    },
  });

  const handleDelete = () => {
    if (deleting) return;
    if (window.confirm("Are you sure you want to delete this run? This action cannot be undone.")) {
      setDeleting(true);
      deleteMutation.mutate(undefined, { onSettled: () => setDeleting(false) });
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading...</div>;
  }
  if (!run) {
    return <div className="py-12 text-center text-sm text-red-500">Run not found.</div>;
  }

  const idx = stageIndex(run.current_stage ?? "");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.pdf_filename}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{run.domain}</span>
            {run.research_topic && <><span className="text-gray-300">|</span><span>{run.research_topic}</span></>}
            <span className="text-gray-300">|</span>
            <StatusBadge status={run.status} />
            <span className="text-gray-300">|</span>
            <span>{run.pipeline_profile}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-400">
            <span>Created: {formatTimestamp(run.created_at)}</span>
            {run.started_at && <span>Started: {formatTimestamp(run.started_at)}</span>}
            {run.finished_at && <span>Finished: {formatTimestamp(run.finished_at)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
            className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rerunMutation.isPending ? "Re-running..." : "Re-run"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
          <button
            disabled
            title="Coming soon — for now, download artifacts individually from the Artifacts tab."
            className="cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-400"
          >
            Download bundle (.zip)
          </button>
        </div>
      </div>

      {run.status === "failed" && run.error_message && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {run.error_message}
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Progress</h2>
        <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-gray-200">
          {STAGES.map((stage, i) => {
            let bg = "bg-gray-100";
            let text = "text-gray-400";
            if (idx >= 0 && i < idx) { bg = "bg-green-500"; text = "text-white"; }
            else if (idx >= 0 && i === idx) { bg = "bg-blue-500"; text = "text-white"; }
            return (
              <div
                key={stage.id}
                className={`flex-1 px-1 py-2 text-center text-[10px] font-medium leading-tight ${bg} ${text} border-r last:border-r-0 border-gray-200`}
                title={stage.label}
              >
                {stage.label}
              </div>
            );
          })}
        </div>
        {run.current_stage && idx < 0 && (
          <p className="mt-1 text-xs text-gray-500">Current stage: {run.current_stage}</p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Live step-by-step progress streaming is coming soon — this view refreshes automatically every few seconds.
        </p>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(["artifacts", "extract", "usage"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "artifacts" && (
        <div>
          {artifacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No artifacts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {artifacts.map((a) => (
                    <tr key={a.name}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{a.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatSize(a.size)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{a.stage || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <a
                          href={`${BASE_URL}/runs/${runId}/artifacts/${encodeURIComponent(a.name)}`}
                          download
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "extract" && (
        <div>
          {run.status === "done" && extractDoc ? (
            <div className="space-y-6">
              {extractDoc.citation && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Citation</h3>
                  {extractDoc.citation.title && (
                    <p className="text-sm font-medium text-gray-800">{extractDoc.citation.title}</p>
                  )}
                  {extractDoc.citation.authors && extractDoc.citation.authors.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      {extractDoc.citation.authors.map(formatAuthor).join(", ")}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
                    {extractDoc.citation.year && <span>({extractDoc.citation.year})</span>}
                    <span>{renderVenue(extractDoc.citation)}</span>
                  </div>
                  {(extractDoc.citation.doi || extractDoc.citation.url) && (
                    <div className="mt-2 flex gap-3 text-xs">
                      {extractDoc.citation.doi && (
                        <a
                          href={`https://doi.org/${extractDoc.citation.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          DOI: {extractDoc.citation.doi}
                        </a>
                      )}
                      {extractDoc.citation.url && (
                        <a
                          href={extractDoc.citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          URL
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {extractDoc.extract?.tasks?.map((task) => (
                <div key={task.task_id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">
                    {formatKind(task.kind)}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{task.synthesis}</p>
                </div>
              ))}

              {extractDoc.immutable_post_extract && (
                <>
                  {extractDoc.immutable_post_extract.endorsement && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <h3 className="mb-1 text-sm font-semibold text-gray-900">Endorsement</h3>
                      <pre className="text-xs text-gray-700">
                        {JSON.stringify(extractDoc.immutable_post_extract.endorsement, null, 2)}
                      </pre>
                    </div>
                  )}
                  {extractDoc.immutable_post_extract.atomic_problems && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <h3 className="mb-1 text-sm font-semibold text-gray-900">Atomic Problems</h3>
                      <pre className="text-xs text-gray-700">
                        {JSON.stringify(extractDoc.immutable_post_extract.atomic_problems, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : run.status === "done" && !extractDoc ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading extract...</p>
          ) : run.status !== "failed" ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Extract will be available once the run completes.
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              Extract could not be generated because the run failed.
            </p>
          )}
        </div>
      )}

      {activeTab === "usage" && (
        <div>
          {run.usage_summary && Object.keys(run.usage_summary).length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Object.entries(run.usage_summary).map(([key, value]) => (
                    <tr key={key}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{key}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              {run.status === "done"
                ? "No usage data available."
                : "Usage data will appear once the run completes."}
            </p>
          )}
        </div>
      )}

      {rerunMutation.isPending && (
        <div className="mt-4 text-sm text-indigo-600">Re-running... navigating to new run.</div>
      )}
    </div>
  );
}*/

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../api/client";
import type { components } from "../../api/types.gen";

type RunDetail = components["schemas"]["RunDetail"];
type ArtifactItem = components["schemas"]["ArtifactItem"];
type RunCreated = components["schemas"]["RunCreated"];

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const JsonRenderer = ({ data }: { data: Record<string, unknown> }) => {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 border-b border-gray-100/50 last:border-0 pb-2 last:pb-0"
        >
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-1/3 shrink-0 pt-0.5">
            {key.replace(/_/g, " ")}
          </span>
          <span className="text-[13px] text-gray-800 break-words flex-1">
            {typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};
const ParsedMarkdownBlock = ({
  text,
  textSize = "text-14",
}: {
  text: string;
  textSize?: string;
}) => {
  if (!text) return null;

  // 1. Cải tiến Parser: Dọn dẹp định dạng khoa học bị lỗi
  let cleanText = text
    // Chuyển $\mathrm{ASR}_{\mathrm{w/t}}$ thành "ASR w/t"
    .replace(/\$\\mathrm\{ASR\}_\{\\mathrm\{w\/t\}\}\$/g, "ASR w/t")
    // Chuyển $\mathrm{ASR}_{\mathrm{w/o}}$ thành "ASR w/o"
    .replace(/\$\\mathrm\{ASR\}_\{\\mathrm\{w\/o\}\}\$/g, "ASR w/o")
    // Chuyển $\mathrm{ASR}$ thành "ASR"
    .replace(/\$\\mathrm\{ASR\}\$/g, "ASR")
    // Chuyển $ LLM^{1} $ thành "LLM [1]"
    .replace(/\$\s*(.*?)\s*\$/g, "$1")
    .replace(/\^\{([^}]+)\}/g, " [$1]")
    .replace(/\s{2,}\[/g, " [");

  const sections = cleanText.split(/(?:^|\n)(?=\s*##\s+)/);

  if (sections.length <= 1 && !cleanText.match(/^\s*##/)) {
    return (
      <p
        className={`whitespace-pre-wrap text-gray-700 leading-relaxed ${textSize}`}
      >
        {cleanText}
      </p>
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        const match = trimmed.match(/^##\s+([^\r\n]+)(?:\r?\n([\s\S]*))?$/);

        if (!match) {
          return (
            <p
              key={idx}
              className={`whitespace-pre-wrap text-gray-700 leading-relaxed ${textSize}`}
            >
              {trimmed}
            </p>
          );
        }

        const title = match[1].trim();
        const content = (match[2] || "").trim();

        // Phối màu & Icon (giữ nguyên logic cũ của bạn)
        let colorClass = "bg-gray-50/50 border-gray-200";
        let titleColor = "text-gray-700";
        let icon = (
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        );

        const tLow = title.toLowerCase();
        if (
          tLow.includes("finding") ||
          tLow.includes("result") ||
          tLow.includes("abstract")
        ) {
          colorClass = "bg-[#1488D8]/5 border-[#1488D8]/20";
          titleColor = "text-[#030391]";
        } else if (tLow.includes("evidence")) {
          colorClass = "bg-emerald-50/50 border-emerald-200";
          titleColor = "text-emerald-800";
        } else if (tLow.includes("gap") || tLow.includes("limitation")) {
          colorClass = "bg-amber-50 border-amber-200";
          titleColor = "text-amber-800";
        }

        const lines = content.split(/\r?\n/);
        const formattedContent = [];
        let currentList: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Xử lý danh sách (Bullet points)
          if (line.startsWith("- ") || line.startsWith("* ")) {
            currentList.push(line.substring(2));
          } else {
            if (currentList.length > 0) {
              formattedContent.push(
                <ul
                  key={`ul-${i}`}
                  className="list-disc pl-5 mb-3 space-y-1 text-gray-700"
                >
                  {currentList.map((item, j) => (
                    <li key={j} className={`pl-1 leading-relaxed ${textSize}`}>
                      {item}
                    </li>
                  ))}
                </ul>,
              );
              currentList = [];
            }
            if (line) {
              formattedContent.push(
                <p
                  key={`p-${i}`}
                  className={`mb-3 last:mb-0 text-gray-700 leading-relaxed ${textSize}`}
                >
                  {line}
                </p>,
              );
            }
          }
        }
        if (currentList.length > 0) {
          formattedContent.push(
            <ul
              key={`ul-end`}
              className="list-disc pl-5 mb-3 space-y-1 text-gray-700"
            >
              {currentList.map((item, j) => (
                <li key={j} className={`pl-1 leading-relaxed ${textSize}`}>
                  {item}
                </li>
              ))}
            </ul>,
          );
        }

        return (
          <div key={idx} className={`p-4 rounded-xl border ${colorClass}`}>
            <h4
              className={`text-[11px] font-black mb-3 flex items-center gap-1.5 uppercase tracking-widest ${titleColor}`}
            >
              {icon} {title}
            </h4>
            <div className="text-gray-800">{formattedContent}</div>
          </div>
        );
      })}
    </div>
  );
};

const STAGES = [
  { id: "load_template", label: "Load Template" },
  { id: "plan_tasks", label: "Plan Tasks" },
  { id: "extract_bookmarks", label: "Bookmarks" },
  { id: "inject_appendix", label: "Appendix" },
  { id: "populate_bookmark_markdown", label: "Populate" },
  { id: "categorize_sections", label: "Categorize" },
  { id: "promote_contributions", label: "Promote" },
  { id: "distribute_task_markdown", label: "Distribute" },
  { id: "synthesize", label: "Synthesize" },
  { id: "aggregate_markdown", label: "Aggregate" },
  { id: "immutable_post_extract", label: "Audit" },
];

function stageIndex(stageId: string): number {
  if (!stageId) return -1;
  
  const normalizedId = stageId.toLowerCase().trim();
  
  const stageMap: Record<string, string> = {
    inject_synthetic_appendix_bookmarks: "inject_appendix",
    synthesis: "synthesize",
    complete: "immutable_post_extract",
  };

  const mappedId = stageMap[normalizedId] || normalizedId;

  let idx = STAGES.findIndex((s) => s.id === mappedId);
  
 
  if (idx === -1) {
    idx = STAGES.findIndex((s) => 
      mappedId.includes(s.id) || s.id.includes(mappedId)
    );
  }
  
  return idx;
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TASK_KIND_LABELS: Record<string, string> = {
  abstract: "Abstract",
  contribution_audit: "Contribution Audit",
  genealogy_positioning: "Genealogy & Positioning",
  system_assumptions: "System Assumptions",
  methodological_deconstruction: "Methodological Deconstruction",
  empirical_validation: "Empirical Validation",
  ablation_integrity: "Ablation Integrity",
  limitation_forensics: "Limitation Forensics",
};

function formatKind(kind: string): string {
  return (
    TASK_KIND_LABELS[kind] ??
    kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface ExtractAuthor {
  family?: string;
  given?: string;
  orcid?: string;
}
interface ExtractCitation {
  publication_kind?: string;
  title?: string;
  authors?: ExtractAuthor[];
  year?: number;
  doi?: string;
  url?: string;
  notes?: string;
  journal?: Record<string, unknown>;
  conference?: Record<string, unknown>;
  preprint?: Record<string, unknown>;
}
interface ExtractTask {
  task_id: string;
  kind: string;
  synthesis: string;
}
interface ExtractDocument {
  schema_version?: string;
  pipeline_profile?: string;
  provenance?: Record<string, unknown>;
  citation?: ExtractCitation;
  extract?: { domain?: string; research_topic?: string; tasks?: ExtractTask[] };
  immutable_post_extract?: {
    endorsement?: Record<string, unknown>;
    atomic_problems?: Record<string, unknown>;
  };
}

function formatAuthor(a: ExtractAuthor): string {
  const parts: string[] = [];
  if (a.family) parts.push(a.family);
  if (a.given) parts.push(a.given.charAt(0) + ".");
  return parts.join(", ");
}

function renderVenue(citation: ExtractCitation): string {
  const kind = citation.publication_kind;
  if (kind === "journal_article" && citation.journal)
    return citation.journal.name
      ? String(citation.journal.name)
      : "Journal article";
  if (kind === "conference_paper" && citation.conference)
    return citation.conference.name
      ? String(citation.conference.name)
      : "Conference paper";
  if (kind === "preprint") return "Preprint";
  return kind?.replace(/_/g, " ") ?? "";
}

// Inline Status Badge Component
const CustomBadge = ({ status }: { status: string }) => {
  if (status === "done")
    return (
      <span className="bg-emerald-100 text-emerald-700 border-emerald-300 border px-3 py-1 rounded-full text-xs font-bold shadow-sm">
        COMPLETED
      </span>
    );
  if (status === "failed")
    return (
      <span className="bg-red-100 text-red-700 border-red-300 border px-3 py-1 rounded-full text-xs font-bold shadow-sm">
        FAILED
      </span>
    );
  if (status === "queued")
    return (
      <span className="bg-gray-100 text-gray-600 border-gray-300 border px-3 py-1 rounded-full text-xs font-bold shadow-sm">
        QUEUED
      </span>
    );
  return (
    <span className="bg-[#1488D8]/10 text-[#1488D8] border-[#1488D8]/30 border px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[#1488D8] animate-pulse"></span>
      IN PROGRESS
    </span>
  );
};

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"artifacts" | "extract" | "usage">(
    "extract",
  );
  const [deleting, setDeleting] = useState(false);

  // 100% Nguyên bản logic fetch dữ liệu
  const { data: run, isLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => apiGet<RunDetail>(`/runs/${runId}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.status === "queued" || data.status === "running"
        ? 3000
        : false;
    },
    enabled: !!runId,
  });

  const { data: artifacts = [] } = useQuery({
  queryKey: ["run-artifacts", runId],
  queryFn: () => apiGet<ArtifactItem[]>(`/runs/${runId}/artifacts`),
  enabled: !!runId,
  // Thêm cơ chế tự động làm mới để lấy file ngay khi pipeline đang chạy
  refetchInterval: () => {
    if (!run) return 3000;
    return run.status === "queued" || run.status === "running" ? 3000 : false;
  },
});

  const { data: extractRaw } = useQuery({
    queryKey: ["run-extract", runId],
    queryFn: () => apiGet<unknown>(`/runs/${runId}/extract`),
    enabled: !!runId && run?.status === "done",
  });

  const extractDoc = extractRaw as ExtractDocument | undefined;

  const rerunMutation = useMutation({
    mutationFn: () => apiPost<RunCreated>(`/runs/${runId}/rerun`, {}),
    onSuccess: (data) => navigate(`/runs/${data.run_id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/runs/${runId}`, { purge_files: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      navigate("/runs");
    },
  });

  const handleDelete = () => {
    if (deleting) return;
    if (
      window.confirm(
        "Are you sure you want to delete this run? This action cannot be undone.",
      )
    ) {
      setDeleting(true);
      deleteMutation.mutate(undefined, { onSettled: () => setDeleting(false) });
    }
  };

  if (isLoading)
    return (
      <div className="py-20 text-center text-[#1488D8] font-medium animate-pulse">
        Initializing FabScholar Engine...
      </div>
    );
  if (!run)
    return <div className="py-20 text-center text-red-500">Run not found.</div>;

  const idx = stageIndex(run.current_stage ?? "");

  const pdfUrl = `${BASE_URL}/runs/${runId}/artifacts/${encodeURIComponent(run.pdf_filename)}`;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] w-full gap-6 pb-4">
      <div className="flex-1 lg:w-1/2 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#030391] to-[#1488D8]"></div>
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#030391] tracking-tight leading-tight">
                {run.pdf_filename}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CustomBadge status={run.status} />
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                  {run.domain}
                </span>
                {run.research_topic && (
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                    {run.research_topic}
                  </span>
                )}
                <span className="bg-[#030391]/5 text-[#030391] px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                  {run.pipeline_profile}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 text-[11px] text-gray-400 font-medium">
                <span className="flex items-center gap-1">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>{" "}
                  Created: {formatTimestamp(run.created_at)}
                </span>
                {run.finished_at && (
                  <span className="flex items-center gap-1 text-emerald-600">
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
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>{" "}
                    Finished: {formatTimestamp(run.finished_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 mt-2 xl:mt-0">
              <button
                onClick={() => rerunMutation.mutate()}
                disabled={rerunMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border-2 border-[#1488D8] text-[#1488D8] px-3 py-1.5 text-xs font-bold transition-all hover:bg-[#1488D8] hover:text-white disabled:opacity-50"
              >
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
                {rerunMutation.isPending ? "Running..." : "Re-run"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-bold transition-all hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {run.status === "failed" && run.error_message && (
          <div className="mb-6 rounded-xl border-l-4 border-red-500 bg-red-50 px-5 py-4 shadow-sm">
            <h3 className="text-red-800 font-bold mb-1 text-sm flex items-center gap-2">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
              Extraction Failed
            </h3>
            <p className="text-xs text-red-700 font-mono bg-white/50 p-2 rounded">
              {run.error_message}
            </p>
          </div>
        )}

        <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#030391]">
            Orchestration Pipeline
          </h2>

          <div className="relative flex items-start justify-between min-w-[700px] pt-1 pb-2">
            <div className="absolute left-4 right-4 top-[11px] h-[3px] bg-gray-100 rounded-full"></div>

            <div
              className="absolute left-4 top-[11px] h-[3px] bg-gradient-to-r from-[#030391] to-[#1488D8] rounded-full transition-all duration-500"
              style={{
                width: `${idx >= 0 ? (idx / (STAGES.length - 1)) * 100 : run.status === "done" ? 100 : 0}%`,
              }}
            ></div>

            {STAGES.map((stage, i) => {
              const isCompleted = idx > i || run.status === "done";
              const isCurrent =
                idx === i && run.status !== "done" && run.status !== "failed";
              const isFailed = run.status === "failed" && idx === i;

              return (
                <div
                  key={stage.id}
                  className="relative z-10 flex flex-col items-center w-16"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${
                      isCompleted
                        ? "border-[#1488D8] text-[#1488D8]"
                        : isCurrent
                          ? "border-[#1488D8] text-[#1488D8] shadow-[0_0_10px_rgba(20,136,216,0.4)] ring-4 ring-[#1488D8]/20"
                          : isFailed
                            ? "border-red-500 text-red-500"
                            : "border-gray-300 text-gray-300"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-1.5 h-1.5 bg-[#1488D8] rounded-full animate-ping"></div>
                    ) : isFailed ? (
                      <span className="font-bold text-[10px]">!</span>
                    ) : (
                      <span className="text-[9px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-center text-[9px] font-bold uppercase tracking-wider leading-tight ${
                      isCompleted || isCurrent
                        ? "text-[#030391]"
                        : isFailed
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TABS MENU */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex gap-6">
            {(["extract", "artifacts", "usage"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === tab
                    ? "border-b-[3px] border-[#1488D8] text-[#030391]"
                    : "border-b-[3px] border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                }`}
              >
                {tab === "extract" ? "Extracted Knowledge" : tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "extract" && (
          <div className="space-y-5">
            {run.status === "done" && extractDoc ? (
              <>
                {extractDoc.citation && (
                  <div className="bg-white rounded-xl border-l-[6px] border-[#030391] p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#1488D8] uppercase tracking-widest mb-2">
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
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        ></path>
                      </svg>
                      Verified Source Metadata
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {extractDoc.citation.title}
                    </h3>
                    {extractDoc.citation.authors && (
                      <p className="mt-1.5 text-sm text-gray-600 font-medium">
                        {extractDoc.citation.authors
                          .map(formatAuthor)
                          .join(", ")}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium">
                        {renderVenue(extractDoc.citation)}{" "}
                        {extractDoc.citation.year &&
                          `(${extractDoc.citation.year})`}
                      </span>
                      {extractDoc.citation.doi && (
                        <a
                          href={`https://doi.org/${extractDoc.citation.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1488D8] hover:text-[#030391] font-semibold flex items-center gap-1"
                        >
                          DOI: {extractDoc.citation.doi}
                          <svg
                            className="w-3 h-3"
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
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {extractDoc.extract?.tasks?.map((task) => (
                    <div
                      key={task.task_id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-[#1488D8]/50 transition-colors"
                    >
                      <h3 className="mb-3 text-xs font-bold text-[#030391] uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1488D8]"></span>
                        {formatKind(task.kind)}
                      </h3>
                      <ParsedMarkdownBlock text={task.synthesis} />
                    </div>
                  ))}
                </div>

                {extractDoc.immutable_post_extract && (
                  <div className="grid grid-cols-1 gap-4 mt-2">
                    {extractDoc.immutable_post_extract.endorsement && (
                      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 p-5 shadow-sm">
                        <h3 className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
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
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                          </svg>
                          System Endorsement
                        </h3>
                        <pre className="text-[11px] text-emerald-700 bg-white/70 p-3 rounded-lg overflow-x-auto border border-emerald-100">
                          {JSON.stringify(
                            extractDoc.immutable_post_extract.endorsement,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    )}
                    {extractDoc.immutable_post_extract.atomic_problems && (
                      <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 p-5 shadow-sm">
                        <h3 className="text-amber-800 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
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
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            ></path>
                          </svg>
                          Atomic Problems Detected
                        </h3>
                        <pre className="text-[11px] text-amber-700 bg-white/70 p-3 rounded-lg overflow-x-auto border border-amber-100">
                          {JSON.stringify(
                            extractDoc.immutable_post_extract.atomic_problems,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : run.status === "running" || run.status === "queued" ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300">
                <div className="w-12 h-12 border-4 border-[#1488D8]/20 border-t-[#1488D8] rounded-full animate-spin mb-4"></div>
                <p className="text-base font-bold text-[#030391]">
                  Processing Literature...
                </p>
                <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">
                  Agents are extracting knowledge and passing data through
                  integrity gates.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                No knowledge extracted.
              </div>
            )}
          </div>
        )}
        {activeTab === "artifacts" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {artifacts.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">
                No artifacts generated yet.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#030391]/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#030391]">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#030391]">
                      Stage
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#030391]">
                      Size
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#030391]">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {artifacts.map((a) => (
                    <tr key={a.name} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-3 text-xs font-medium text-gray-900">
                        {a.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-600">
                        {a.stage || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500 font-mono">
                        {formatSize(a.size)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <a
                          href={`${BASE_URL}/runs/${runId}/artifacts/${encodeURIComponent(a.name)}?download=true`}
                          className="text-xs font-bold text-[#1488D8] hover:text-[#030391]"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "usage" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {run.usage_summary && Object.keys(run.usage_summary).length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(run.usage_summary).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                  >
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-xl font-black text-[#030391] font-mono">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                Usage data will appear here.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="hidden lg:flex lg:w-1/2 flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-full">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#1488D8]"
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
            <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">
              Source Document
            </span>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#1488D8] hover:text-[#030391] flex items-center gap-1"
          >
            Open in new tab
            <svg
              className="w-3 h-3"
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
          </a>
        </div>

        <div className="flex-1 bg-gray-100 relative">
          <iframe
            src={`${pdfUrl}#view=FitH`}
            className="absolute inset-0 w-full h-full border-none"
            title="PDF Viewer"
          />
        </div>
      </div>
    </div>
  );
}
