import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";

import { HomePage } from "./HomePage";
import { ChannelDetailPage } from "./ChannelDetailPage";

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="channels/:id" element={<ChannelDetailPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };