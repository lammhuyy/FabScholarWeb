import { useState } from "react";
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
}
