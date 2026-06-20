import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader,
  TextInput, Field, SingleSelect, SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useNavigate, useParams } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const ProductFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { get, post, put } = useFetchClient();

  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [stock, setStock] = useState("0");
  const [deliveryType, setDeliveryType] = useState("self_pickup");
  const [maxPerUser, setMaxPerUser] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
          setName(data.name);
          setDescription(data.description || "");
          setPointsCost(String(data.pointsCost));
          setStock(String(data.stock));
          setDeliveryType(data.deliveryType);
          setMaxPerUser(String(data.maxPerUser || 0));
          setSortOrder(String(data.sortOrder || 0));
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const handleSubmit = async () => {
    const body = {
      name,
      description,
      pointsCost: parseInt(pointsCost),
      stock: parseInt(stock),
      deliveryType,
      maxPerUser: parseInt(maxPerUser),
      sortOrder: parseInt(sortOrder),
    };

    try {
      if (isEdit) {
        await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, body);
      } else {
        await post(`/admin/plugins/${PLUGIN_ID}/products`, body);
      }
      navigate(`/plugins/${PLUGIN_ID}/products`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <Loader>加载中...</Loader>;

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch" maxWidth="600px">
          <Typography variant="alpha">{isEdit ? "编辑商品" : "新建商品"}</Typography>

          <Field.Root>
            <Field.Label>商品名称</Field.Label>
            <TextInput value={name} onChange={(e: any) => setName(e.target.value)} />
          </Field.Root>

          <Field.Root>
            <Field.Label>描述</Field.Label>
            <TextInput value={description} onChange={(e: any) => setDescription(e.target.value)} />
          </Field.Root>

          <Field.Root>
            <Field.Label>所需积分</Field.Label>
            <TextInput value={pointsCost} onChange={(e: any) => setPointsCost(e.target.value)} type="number" />
          </Field.Root>

          <Field.Root>
            <Field.Label>库存（-1为不限）</Field.Label>
            <TextInput value={stock} onChange={(e: any) => setStock(e.target.value)} type="number" />
          </Field.Root>

          <Field.Root>
            <Field.Label>配送方式</Field.Label>
            <SingleSelect value={deliveryType} onChange={(v: string | number) => setDeliveryType(String(v))}>
              <SingleSelectOption value="self_pickup">到店自提</SingleSelectOption>
              <SingleSelectOption value="express">快递配送</SingleSelectOption>
              <SingleSelectOption value="both">两者均可</SingleSelectOption>
            </SingleSelect>
          </Field.Root>

          <Field.Root>
            <Field.Label>每人限兑</Field.Label>
            <TextInput value={maxPerUser} onChange={(e: any) => setMaxPerUser(e.target.value)} type="number" />
          </Field.Root>

          <Field.Root>
            <Field.Label>排序</Field.Label>
            <TextInput value={sortOrder} onChange={(e: any) => setSortOrder(e.target.value)} type="number" />
          </Field.Root>

          <Flex gap={3}>
            <Button onClick={handleSubmit}>{isEdit ? "保存" : "创建"}</Button>
            <Button variant="tertiary" onClick={() => navigate(`/plugins/${PLUGIN_ID}/products`)}>
              取消
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Main>
  );
};

export { ProductFormPage };
