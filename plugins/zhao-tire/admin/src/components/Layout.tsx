import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, Layout, Menu, Spin } from "antd";
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canFullAccess,
  canStorageAccess,
  errorMessage,
  useTireApi,
  type PermissionState,
} from "../utils/api";

const { Sider, Content } = Layout;

const defaultState: PermissionState = {
  loading: true,
  me: null,
  canFull: false,
  canStorage: false,
};

const PermissionContext = createContext<PermissionState>(defaultState);

export const usePermissions = () => useContext(PermissionContext);

export const PermissionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getMe } = useTireApi();
  const [state, setState] = useState<PermissionState>(defaultState);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => {
        if (!alive) return;
        setState({
          loading: false,
          me,
          canFull: canFullAccess(me.roleCodes),
          canStorage: canStorageAccess(me.roleCodes),
        });
      })
      .catch((error) => {
        if (!alive) return;
        setState({
          loading: false,
          me: null,
          canFull: false,
          canStorage: false,
          error: errorMessage(error),
        });
      });
    return () => {
      alive = false;
    };
  }, [getMe]);

  return (
    <PermissionContext.Provider value={state}>
      {children}
    </PermissionContext.Provider>
  );
};

const MENU_ITEMS = [
  { key: "orders", icon: <ShoppingCartOutlined />, label: "订单管理" },
  { key: "inventory", icon: <DatabaseOutlined />, label: "仓储库存" },
  {
    key: "catalog",
    icon: <AppstoreOutlined />,
    label: "套餐配置",
    fullOnly: true,
  },
  {
    key: "customers",
    icon: <TeamOutlined />,
    label: "客户管理",
    fullOnly: true,
  },
  {
    key: "messages",
    icon: <MessageOutlined />,
    label: "消息通知",
    fullOnly: true,
  },
  {
    key: "content",
    icon: <FileTextOutlined />,
    label: "站点内容",
    fullOnly: true,
  },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = usePermissions();

  const relative =
    location.pathname.split("/plugins/zhao-tire")[1] || "";
  const selectedKey = relative.replace(/^\//, "").split("/")[0] || "orders";

  const items = MENU_ITEMS.filter(
    (item) => !item.fullOnly || permissions.canFull
  ).map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <Layout style={{ minHeight: "calc(100vh - 70px)" }}>
      <Sider width={208} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ height: "100%", borderRight: 0, paddingTop: 8 }}
          onClick={({ key }) => navigate(`/plugins/zhao-tire/${key}`)}
        />
      </Sider>
      <Content
        style={{
          padding: 24,
          background: "#F5F7FA",
          overflowX: "auto",
        }}
      >
        {permissions.loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <>
            {permissions.error ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`权限信息加载失败：${permissions.error}`}
              />
            ) : null}
            {children}
          </>
        )}
      </Content>
    </Layout>
  );
};

export { PluginLayout };
export default PluginLayout;
