import React from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Routes, Route } from "react-router-dom";
import { PluginLayout, PermissionProvider } from "../components/Layout";
import OrdersPage from "./OrdersPage";
import InventoryPage from "./InventoryPage";
import PaymentsPage from "./PaymentsPage";
import CatalogPage from "./CatalogPage";
import CustomersPage from "./CustomersPage";
import MessagesPage from "./MessagesPage";
import ContentPage from "./ContentPage";

const App = () => (
  <ConfigProvider
    locale={zhCN}
    theme={{ token: { colorPrimary: "#2563EB", borderRadius: 6 } }}
  >
    <PermissionProvider>
      <PluginLayout>
        <Routes>
          <Route index element={<OrdersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="*" element={<div>页面建设中</div>} />
        </Routes>
      </PluginLayout>
    </PermissionProvider>
  </ConfigProvider>
);

export default App;
