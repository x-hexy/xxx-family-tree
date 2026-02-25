import { Navigate, createBrowserRouter } from "react-router-dom";
import { EditorPage } from "./pages/EditorPage";
import { ReadOnlyPage } from "./pages/ReadOnlyPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <EditorPage />,
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
