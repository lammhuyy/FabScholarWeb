const statusColors: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700 border-gray-300",
  pending: "bg-gray-100 text-gray-700 border-gray-300",
  running: "bg-blue-100 text-blue-700 border-blue-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-green-100 text-green-700 border-green-300",
  failed: "bg-red-100 text-red-700 border-red-300",
  partial: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}
