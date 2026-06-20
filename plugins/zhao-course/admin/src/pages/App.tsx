import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";

import { HomePage } from "./HomePage";
import { ProgressPage } from "./ProgressPage";
import { AuthPage } from "./AuthPage";
import { PointsPage } from "./PointsPage";

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="auth" element={<AuthPage />} />
      <Route path="points" element={<PointsPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
