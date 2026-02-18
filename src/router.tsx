import { Navigate, createBrowserRouter } from "react-router-dom";
import { EditorPage } from "./pages/EditorPage";
import { ReadOnlyPage } from "./pages/ReadOnlyPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PasswordGate } from "./components/layout/PasswordGate";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PasswordGate>
        <EditorPage />
      </PasswordGate>
    ),
  },
  {
    path: "/view/:token",
    element: <ReadOnlyPage />,
  },
  {
    path: "/404",
    element: <NotFoundPage />,
  },
  {
    path: "*",
    element: <Navigate to="/404" replace />,
  },
]);
