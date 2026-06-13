import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import RunListPage from "./pages/runs/RunListPage";
import NewRunPage from "./pages/runs/NewRunPage";
import RunDetailPage from "./pages/runs/RunDetailPage";
import BatchListPage from "./pages/batches/BatchListPage";
import NewBatchPage from "./pages/batches/NewBatchPage";
import BatchDetailPage from "./pages/batches/BatchDetailPage";
import TemplatesPage from "./pages/templates/TemplatesPage";
import SettingsPage from "./pages/settings/SettingsPage";
import PromptsPage from "./pages/prompts/PromptsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/runs" replace /> },
      { path: "runs", element: <RunListPage /> },
      { path: "runs/new", element: <NewRunPage /> },
      { path: "runs/:runId", element: <RunDetailPage /> },
      { path: "batches", element: <BatchListPage /> },
      { path: "batches/new", element: <NewBatchPage /> },
      { path: "batches/:batchId", element: <BatchDetailPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "prompts", element: <PromptsPage /> },
    ],
  },
]);
