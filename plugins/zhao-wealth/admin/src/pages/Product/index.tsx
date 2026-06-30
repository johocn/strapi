import { Tabs } from 'antd';
import ProductList from './ProductList';
import CompanyList from './CompanyList';

const Product = () => (
  <Tabs
    defaultActiveKey="product"
    items={[
      { key: 'product', label: '产品列表', children: <ProductList /> },
      { key: 'company', label: '理财公司', children: <CompanyList /> },
    ]}
  />
);

export default Product;
