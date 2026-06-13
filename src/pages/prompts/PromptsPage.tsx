import ComingSoon from "../../components/ui/ComingSoon";

export default function PromptsPage() {
  return (
    <div>
      <ComingSoon
        title="Prompt Library"
        description="View and edit the prompts used at each pipeline stage. Coming soon."
      />
      <div className="mx-auto mt-6 max-w-lg">
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900">Prompt categories (preview)</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-500">
            <li>• Synthesis agent prompts</li>
            <li>• Memory rollup prompts</li>
            <li>• Planner prompts</li>
            <li>• PDF categorization prompts</li>
            <li>• PDF distillation prompts</li>
            <li>• Immutable post-extract prompts (endorsement classification, atomic problem extraction)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
