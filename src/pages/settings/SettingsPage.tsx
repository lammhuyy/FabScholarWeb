import ComingSoon from "../../components/ui/ComingSoon";

export default function SettingsPage() {
  return (
    <div>
      <ComingSoon
        title="Settings"
        description="Configure LLM provider, model, and API keys. Coming soon — currently configured via environment variables on the server."
      />
      <div className="mx-auto mt-6 max-w-lg">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-medium text-yellow-700">
          Preview — not editable yet
        </div>
        <div className="mt-3 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">LLM Provider</label>
            <select disabled className="mt-1 block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              <option>openai_compat</option>
              <option disabled>anthropic (not yet supported)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Model</label>
            <input
              disabled
              className="mt-1 block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              placeholder="configured via environment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">OCR Model</label>
            <input
              disabled
              className="mt-1 block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              placeholder="configured via environment"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
