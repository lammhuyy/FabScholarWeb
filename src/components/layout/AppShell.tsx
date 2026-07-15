import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";

const navItems = [
  { to: "/runs", label: "Runs", badge: null as string | null },
  { to: "/batches", label: "Batches", badge: null },
  { to: "/templates", label: "Templates", badge: "Soon" },
  { to: "/settings", label: "Settings", badge: "Soon" },
  { to: "/prompts", label: "Prompts", badge: "Soon" },
];

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function HealthIndicator() {
  const { isSuccess, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<unknown>("/health"),
    retry: 1,
    staleTime: 30_000,
  });

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={classNames(
          "inline-block h-2 w-2 rounded-full",
          isLoading
            ? "bg-yellow-400"
            : isSuccess
              ? "bg-green-500"
              : "bg-red-500",
        )}
      />
      <span className="text-gray-500">
        {isLoading
          ? "Checking..."
          : isSuccess
            ? "Connected"
            : "Backend unreachable"}
      </span>
    </div>
  );
}

/* export default function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">FabScholar</h1>
        </div>
        <HealthIndicator />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="flex w-56 flex-col border-r border-gray-200 bg-white pt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-r-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )
              }
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}*/
export default function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header tối màu mang phong cách nền tảng học thuật */}
      <header className="flex h-14 items-center justify-between border-b border-brand-dark bg-brand-dark px-6 shadow-md z-10">
        <div className="flex items-center gap-3">
          <img
            src="/FabScholar_Logo.png" // Đảm bảo file logo đã xóa nền được đặt tên là logo.png và để trong thư mục public/
            alt="FabScholar Logo"
            className="h-12 w-auto max-w-[120px] object-contain rounded-md"
            onError={(e) => {
              // Dự phòng nếu ảnh bị lỗi đường dẫn thì tự động ẩn khung lỗi ảnh đi
              e.currentTarget.style.display = "none";
            }}
          />
          {/* Đổi text sang màu trắng */}
          <h1 className="text-xl font-bold tracking-wide text-white">
            Fab<span className="text-brand-light">Scholar</span>
          </h1>
        </div>
        {/* Health indicator có thể bọc trong một div nền hơi mờ để dễ nhìn trên nền tối */}
        <div className="rounded-full bg-white/10 px-3 py-1">
          <HealthIndicator />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar với hiệu ứng highlight */}
        <nav className="flex w-56 flex-col border-r border-gray-200 bg-white pt-6 shadow-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "flex items-center justify-between px-6 py-3 text-sm font-medium transition-all duration-200 border-l-4",
                  isActive
                    ? "border-brand-light bg-brand-light/10 text-brand-dark"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )
              }
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-brand-light/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
