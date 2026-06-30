import { Page } from "@strapi/strapi/admin";
import { Routes, Route } from "react-router-dom";

import { HomePage } from "./HomePage";
import { CompanyPage } from "./CompanyPage";
import { ProductPage } from "./ProductPage";
import { ProductFormPage } from "./ProductFormPage";
import { CollectConfigPage } from "./CollectConfigPage";
import { NavDataPage } from "./NavDataPage";
import { RecommendPage } from "./RecommendPage";
import { CustomerProductPage } from "./CustomerProductPage";

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="companies" element={<CompanyPage />} />
      <Route path="products" element={<ProductPage />} />
      <Route path="products/new" element={<ProductFormPage />} />
      <Route path="products/:id/edit" element={<ProductFormPage />} />
      <Route path="collect-configs" element={<CollectConfigPage />} />
      <Route path="nav-data" element={<NavDataPage />} />
      <Route path="recommend" element={<RecommendPage />} />
      <Route path="customer-products" element={<CustomerProductPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };