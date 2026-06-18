import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Menu } from 'antd';
import { UnorderedListOutlined, ImportOutlined, SettingOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import TodoList from './pages/TodoList';
import ImportPaste from './pages/ImportPaste';
import Settings from './pages/Settings';

const { Header, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <UnorderedListOutlined />, label: '待办首页' },
    { key: '/import', icon: <ImportOutlined />, label: '批量导入' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置' },
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginRight: 40, color: '#1677ff', whiteSpace: 'nowrap' }}>
            售后待办提醒助手
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1, border: 'none' }}
          />
        </Header>
        <Content style={{ padding: '20px 24px', background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<TodoList />} />
            <Route path="/import" element={<ImportPaste />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
