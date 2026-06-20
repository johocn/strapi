import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";

import { HomePage } from "./HomePage";
import { PointRecordsPage } from "./PointRecordsPage";
import { PointRulePage } from "./PointRulePage";
import { RuleTemplatePage } from "./RuleTemplatePage";
import { ProductPage } from "./ProductPage";
import { ProductFormPage } from "./ProductFormPage";
import { RedemptionPage } from "./RedemptionPage";
import { ConfigPage } from "./ConfigPage";
import { VerificationPage } from "./VerificationPage";

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="records" element={<PointRecordsPage />} />
      <Route path="rules" element={<PointRulePage />} />
      <Route path="rule-templates" element={<RuleTemplatePage />} />
      <Route path="products" element={<ProductPage />} />
      <Route path="products/new" element={<ProductFormPage />} />
      <Route path="products/:id/edit" element={<ProductFormPage />} />
      <Route path="redemptions" element={<RedemptionPage />} />
      <Route path="config" element={<ConfigPage />} />
      <Route path="verifications" element={<VerificationPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
