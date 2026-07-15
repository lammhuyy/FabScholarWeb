import { useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPostMultipart, ApiError } from "../../api/client";

// Định nghĩa tạm thời kiểu dữ liệu trả về khi tạo Batch thành công
interface BatchCreated {
  batch_id: string;
  status: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewBatchPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [domain, setDomain] = useState("");
  const [researchTopic, setResearchTopic] = useState("");
  const [pipelineProfile, setPipelineProfile] = useState("standard_review");

  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(
    new Map(),
  );
  const [bannerError, setBannerError] = useState<string | null>(null);

  const createBatch = useMutation({
    mutationFn: (formData: FormData) =>
      apiPostMultipart<BatchCreated>("/batches", formData),
    onSuccess: (data) => {
      navigate(`/batches/${data.batch_id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        setBannerError("Validation error. Please check your inputs.");
      } else if (err instanceof ApiError) {
        setBannerError(`Server error (${err.status})`);
      } else {
        setBannerError("Network error — is the backend running?");
      }
    },
  });

  const validate = useCallback((): boolean => {
    const errors = new Map<string, string>();
    if (files.length === 0)
      errors.set("files", "Please select at least one PDF or a ZIP file.");
    if (!batchName.trim()) errors.set("batchName", "Batch name is required.");
    if (!domain.trim()) errors.set("domain", "Domain is required.");

    setFieldErrors(errors);
    setBannerError(null);
    return errors.size === 0;
  }, [files, batchName, domain]);

  const handleFilesChange = useCallback(
    (newFiles: FileList | File[] | null) => {
      if (!newFiles) return;
      const fileArray = Array.from(newFiles);

      // Lọc chỉ nhận file PDF hoặc ZIP
      const validFiles = fileArray.filter(
        (f) =>
          f.name.toLowerCase().endsWith(".pdf") ||
          f.name.toLowerCase().endsWith(".zip"),
      );

      setFiles((prev) => [...prev, ...validFiles]);
      setFieldErrors((prev) => {
        const next = new Map(prev);
        next.delete("files");
        return next;
      });
    },
    [],
  );

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFilesChange(e.dataTransfer.files);
    },
    [handleFilesChange],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    files.forEach((file) => {
      fd.append("files", file); // Backend cần hỗ trợ nhận mảng files
    });
    fd.append("name", batchName.trim());
    fd.append("domain", domain.trim());
    if (researchTopic.trim()) fd.append("research_topic", researchTopic.trim());
    fd.append("pipeline_profile", pipelineProfile);

    createBatch.mutate(fd);
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/batches"
          className="text-gray-400 hover:text-[#1488D8] transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            ></path>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#030391] tracking-tight">
            New Systematic Batch
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Upload multiple documents for parallel orchestration.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
      >
        {bannerError && (
          <div className="rounded-xl border-l-4 border-red-500 bg-red-50 px-5 py-4 shadow-sm">
            <h3 className="text-red-800 font-bold mb-1 text-sm">
              Upload Failed
            </h3>
            <p className="text-xs text-red-700">{bannerError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="batchName"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2"
            >
              Batch Collection Name *
            </label>
            <input
              id="batchName"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Backdoor LLM Survey 2026"
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
            />
            {fieldErrors.get("batchName") && (
              <p className="mt-1.5 text-xs font-bold text-red-500">
                {fieldErrors.get("batchName")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="domain"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2"
            >
              Domain *
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. AI Security, Computational Biology"
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
            />
            {fieldErrors.get("domain") && (
              <p className="mt-1.5 text-xs font-bold text-red-500">
                {fieldErrors.get("domain")}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="researchTopic"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2"
          >
            Specific Research Topic{" "}
            <span className="text-gray-400 font-normal normal-case">
              (optional)
            </span>
          </label>
          <input
            id="researchTopic"
            type="text"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
            placeholder="e.g. Defense mechanisms against hidden-state manipulation"
            className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-[#1488D8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1488D8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
            Documents (PDFs or .ZIP) *
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 ${
              dragOver
                ? "border-[#1488D8] bg-[#1488D8]/5 scale-[1.01]"
                : "border-gray-300 bg-gray-50 hover:border-[#1488D8] hover:bg-white"
            }`}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1488D8]/10 text-[#1488D8]">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Upload multiple PDFs or a single .zip bundle (Max 500MB total)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.zip"
            multiple
            className="hidden"
            onChange={(e) => handleFilesChange(e.target.files)}
          />
          {fieldErrors.get("files") && (
            <p className="mt-1.5 text-xs font-bold text-red-500">
              {fieldErrors.get("files")}
            </p>
          )}
        </div>

        {/* DANH SÁCH FILE ĐÃ CHỌN */}
        {files.length > 0 && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {files.length} Files Selected
              </span>
              <span className="text-xs font-mono text-gray-500">
                Total: {formatFileSize(totalSize)}
              </span>
            </div>
            <ul className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {files.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <svg
                      className="h-4 w-4 text-[#1488D8] shrink-0"
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
                    <span className="text-xs font-bold text-gray-700 truncate">
                      {f.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatFileSize(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
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
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            to="/batches"
            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createBatch.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#030391] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#1488D8] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createBatch.isPending ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Orchestrating Batch...
              </>
            ) : (
              "Initialize Multi-Agent Batch"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
