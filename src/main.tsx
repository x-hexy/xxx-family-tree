import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useFamilyStore } from "./store/useFamilyStore";
import "./index.css";
import "@xyflow/react/dist/style.css";

function AppBootstrap() {
  const initializeData = useFamilyStore((s) => s.initializeData);

  React.useEffect(() => {
    void initializeData();
  }, [initializeData]);

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>
);
