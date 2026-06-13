import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPostMultipart, ApiError } from "../../api/client";
import type { components } from "../../api/types.gen";

type RunCreated = components["schemas"]["RunCreated"];
type ValidationError = components["schemas"]["ValidationError"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractFieldErrors(errors: ValidationError[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!errors) return map;
  for (const e of errors) {
    const field = e.loc.filter((s) => typeof s === "string").join(".");
    map.set(field, e.msg);
  }
  return map;
}

export default function NewRunPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [domain, setDomain] = useState("");
  const [researchTopic, setResearchTopic] = useState("");
  const [pipelineProfile, setPipelineProfile] = useState("standard_review");
  const [templateId, setTemplateId] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
  const [bannerError, setBannerError] = useState<string | null>(null);

  const createRun = useMutation({
    mutationFn: (formData: FormData) =>
      apiPostMultipart<RunCreated>("/runs", formData),
    onSuccess: (data) => {
      navigate(`/runs/${data.run_id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        const body = err.body as { detail?: ValidationError[] };
        setFieldErrors(extractFieldErrors(body?.detail));
        setBannerError(null);
      } else if (err instanceof ApiError) {
        setBannerError(`Server error (${err.status})`);
        setFieldErrors(new Map());
      } else {
        setBannerError("Network error — is the backend running?");
        setFieldErrors(new Map());
      }
    },
  });

  const validate = useCallback((): boolean => {
    const errors = new Map<string, string>();
    if (!file) errors.set("file", "Please select a PDF file");
    else if (!file.name.toLowerCase().endsWith(".pdf"))
      errors.set("file", "Only PDF files are accepted");
    if (!domain.trim()) errors.set("domain", "Domain is required");
    setFieldErrors(errors);
    setBannerError(null);
    return errors.size === 0;
  }, [file, domain]);

  const handleFileChange = useCallback((f: File | null) => {
    setFile(f);
    setFieldErrors((prev) => {
      const next = new Map(prev);
      next.delete("file");
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFileChange(f);
    },
    [handleFileChange],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append("file", file!);
    fd.append("domain", domain.trim());
    if (researchTopic.trim()) fd.append("research_topic", researchTopic.trim());
    fd.append("pipeline_profile", pipelineProfile);
    if (templateId.trim()) fd.append("template_id", templateId.trim());

    createRun.mutate(fd);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Extraction Run</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {bannerError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {bannerError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">PDF File *</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
            }`}
          >
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleFileChange(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <svg className="mb-2 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PDF only, up to 50 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {fieldErrors.get("file") && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.get("file")}</p>
          )}
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
            Domain *
          </label>
          <input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setFieldErrors((prev) => { const n = new Map(prev); n.delete("domain"); return n; }); }}
            placeholder="e.g. machine learning, computational biology"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {fieldErrors.get("domain") && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.get("domain")}</p>
          )}
        </div>

        <div>
          <label htmlFor="researchTopic" className="block text-sm font-medium text-gray-700">
            Research topic <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="researchTopic"
            type="text"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
            placeholder="e.g. transformer attention mechanisms"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="pipelineProfile" className="block text-sm font-medium text-gray-700">
            Pipeline profile
          </label>
          <select
            id="pipelineProfile"
            value={pipelineProfile}
            onChange={(e) => setPipelineProfile(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="standard_review">standard_review — Standard literature review</option>
            <option value="survey_extraction" disabled className="text-gray-400">
              survey_extraction — Survey extraction (not yet available)
            </option>
          </select>
          {pipelineProfile === "survey_extraction" && (
            <p className="mt-1 text-xs text-yellow-600">
              Not yet available — the required template file does not exist on the server.
            </p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <svg
              className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Advanced options
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
                  Template ID <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="templateId"
                  type="text"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  placeholder="e.g. my-custom-template"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to use the default template for the selected profile. Template browsing is coming soon (see the Templates tab).
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span className="text-sm font-medium text-gray-500">Citation metadata</span>
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">Coming soon</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Coming soon — citation data will be added automatically from the paper for now.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createRun.isPending}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createRun.isPending ? "Uploading..." : "Start extraction"}
          </button>
          {createRun.isPending && (
            <svg className="h-5 w-5 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </form>
    </div>
  );
}
