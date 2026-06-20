import { Main, Box, Flex, Typography, Button } from "@strapi/design-system";
import { useState } from "react";

import { DashboardTab } from "./DashboardTab";
import { UsersTab } from "./UsersTab";
import { AppsTab } from "./AppsTab";
import { ChannelsTab } from "./ChannelsTab";
import { LoginLogsTab } from "./LoginLogsTab";

export const API_PREFIX = "/admin/plugins/zhao-sso";

const tabs = [
  { value: "dashboard", label: "仪表盘" },
  { value: "users", label: "用户管理" },
  { value: "apps", label: "应用管理" },
  { value: "channels", label: "渠道管理" },
  { value: "logs", label: "登录日志" },
];

export const HomePage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <Main>
      <Box
        paddingTop={6}
        paddingBottom={4}
        paddingLeft={10}
        paddingRight={10}
        background="neutral0"
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" fontWeight="bold" tag="h1">
              SSO 统一登录管理
            </Typography>
          </Box>
        </Flex>
      </Box>

      <Box paddingLeft={10} paddingRight={10} paddingTop={2} paddingBottom={2}>
        <Flex gap={2}>
          {tabs.map((t) => (
            <Button
              key={t.value}
              variant={activeTab === t.value ? "default" : "secondary"}
              onClick={() => setActiveTab(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </Flex>
      </Box>

      <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "apps" && <AppsTab />}
        {activeTab === "channels" && <ChannelsTab />}
        {activeTab === "logs" && <LoginLogsTab />}
      </Box>
    </Main>
  );
};
