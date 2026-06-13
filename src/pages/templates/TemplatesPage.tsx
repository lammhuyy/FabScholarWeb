import ComingSoon from "../../components/ui/ComingSoon";

export default function TemplatesPage() {
  return (
    <div>
      <ComingSoon
        title="Template Management"
        description="Create, edit, and manage extraction task templates. Coming soon."
      />
      <div className="mx-auto mt-6 max-w-lg">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-medium text-yellow-700">
          Preview — not live data
        </div>
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">standard_review</h3>
                <p className="text-sm text-gray-500">Default template</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Available
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tasks: Abstract, Contribution Audit, Genealogy & Positioning, System Assumptions, Methodological Deconstruction, Empirical Validation, Ablation Integrity, Limitation Forensics
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">survey_extraction</h3>
                <p className="text-sm text-gray-500">Survey extraction template</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Not yet available
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
