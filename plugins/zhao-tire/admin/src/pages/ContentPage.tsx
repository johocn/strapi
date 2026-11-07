import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { MediaPicker, type MediaValue } from "../components/PhotoUploader";
import {
  FaqManager,
  GalleryManager,
  ReviewManager,
} from "../components/ContentCollections";
import { absoluteMediaUrl, errorMessage, useTireApi } from "../utils/api";

const { Text } = Typography;

const ContentPage = () => {
  const api = useTireApi();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerImage, setBannerImage] = useState<MediaValue>(null);
  const [wechatQr, setWechatQr] = useState<MediaValue>(null);

  const load = async () => {
    setLoading(true);
    try {
      const config = await api.getConfig();
      form.setFieldsValue({
        bannerTitle: config.bannerTitle || "",
        bannerSubtitle: config.bannerSubtitle || "",
        serviceIntro: config.serviceIntro || "",
        warehouseConditions: config.warehouseConditions || "",
        guaranteesText: JSON.stringify(config.guarantees || [], null, 2),
        serviceAreaText: config.serviceAreaText || "",
        warehouseAddress: config.warehouseAddress || "",
        warehouseLat: config.warehouseLat ?? undefined,
        warehouseLng: config.warehouseLng ?? undefined,
        mapUrl: config.mapUrl || "",
        contactPhone: config.contactPhone || "",
        dailyPickupLimitMorning: config.dailyPickupLimitMorning ?? 6,
        dailyPickupLimitAfternoon: config.dailyPickupLimitAfternoon ?? 6,
        agreementText: config.agreementText || "",
        agreementVersion: config.agreementVersion || "",
        maxStorageDate: config.maxStorageDate
          ? dayjs(config.maxStorageDate)
          : null,
        announcement: config.announcement || "",
      });
      setBannerImage(
        config.bannerImage
          ? {
              id: Number(config.bannerImage.id),
              url: absoluteMediaUrl(config.bannerImage.url),
            }
          : null
      );
      setWechatQr(
        config.wechatQr
          ? {
              id: Number(config.wechatQr.id),
              url: absoluteMediaUrl(config.wechatQr.url),
            }
          : null
      );
    } catch (error) {
      message.error(`加载站点内容失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const values: any = await form.validateFields();
    let guarantees: any = [];
    const rawGuarantees = String(values.guaranteesText || "").trim();
    if (rawGuarantees) {
      try {
        guarantees = JSON.parse(rawGuarantees);
      } catch {
        message.error("保障内容必须是合法的 JSON 数组");
        return;
      }
      if (!Array.isArray(guarantees)) {
        message.error("保障内容必须是 JSON 数组");
        return;
      }
    }

    setSaving(true);
    try {
      await api.updateConfig({
        bannerTitle: values.bannerTitle || "",
        bannerSubtitle: values.bannerSubtitle || "",
        serviceIntro: values.serviceIntro || "",
        warehouseConditions: values.warehouseConditions || "",
        guarantees,
        serviceAreaText: values.serviceAreaText || "",
        warehouseAddress: values.warehouseAddress || "",
        warehouseLat: values.warehouseLat ?? null,
        warehouseLng: values.warehouseLng ?? null,
        mapUrl: values.mapUrl || "",
        contactPhone: values.contactPhone || "",
        dailyPickupLimitMorning: Number(values.dailyPickupLimitMorning) || 0,
        dailyPickupLimitAfternoon:
          Number(values.dailyPickupLimitAfternoon) || 0,
        agreementText: values.agreementText || "",
        agreementVersion: String(values.agreementVersion || "").trim() || null,
        maxStorageDate: values.maxStorageDate
          ? values.maxStorageDate.format("YYYY-MM-DD")
          : null,
        announcement: values.announcement || "",
        bannerImageId: bannerImage?.id ?? null,
        wechatQrId: wechatQr?.id ?? null,
      });
      message.success("站点内容已保存");
      await load();
    } catch (error) {
      message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const siteForm = (
    <Card
      title="站点内容"
      loading={loading}
      extra={
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存站点内容
        </Button>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="bannerTitle" label="Banner 主标题">
              <Input maxLength={60} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="bannerSubtitle" label="Banner 副标题">
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Banner 图片">
              <MediaPicker
                value={bannerImage}
                onChange={setBannerImage}
                hint="建议尺寸 750 × 420，横图。"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="客服微信二维码">
              <MediaPicker
                value={wechatQr}
                onChange={setWechatQr}
                hint="用于订单页展示客服二维码。"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="contactPhone" label="客服电话">
              <Input maxLength={20} />
            </Form.Item>
            <Form.Item name="announcement" label="公告">
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="serviceIntro" label="服务说明">
              <Input.TextArea rows={5} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="warehouseConditions" label="寄存条件">
              <Input.TextArea rows={5} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="guaranteesText"
              label="服务保障（JSON 数组）"
              extra="示例：[{&quot;title&quot;:&quot;专业仓储&quot;,&quot;desc&quot;:&quot;恒温干燥&quot;}]"
            >
              <Input.TextArea rows={6} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="serviceAreaText" label="服务区域">
              <Input.TextArea rows={6} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="warehouseAddress" label="仓库地址">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="warehouseLat" label="纬度">
              <InputNumber style={{ width: "100%" }} step={0.000001} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="warehouseLng" label="经度">
              <InputNumber style={{ width: "100%" }} step={0.000001} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="mapUrl" label="地图链接">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="dailyPickupLimitMorning" label="上午上门名额">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="dailyPickupLimitAfternoon" label="下午上门名额">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="maxStorageDate" label="最晚寄存期限">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="agreementVersion"
              label="条款版本号"
              extra="格式 YYYY.MM.DD-N，例如 2026.11.05-1。保存后仅对新下单/新入库订单生效，不追溯已存在订单。"
              rules={[
                {
                  pattern: /^\d{4}\.\d{2}\.\d{2}-\d+$/,
                  message: "版本号格式应为 YYYY.MM.DD-N，例如 2026.11.05-1",
                },
              ]}
            >
              <Input maxLength={20} placeholder="2026.11.05-1" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="agreementText" label="协议文案">
              <Input.TextArea rows={10} />
            </Form.Item>
            <Space>
              <Text type="secondary">
                协议支持纯文本，换行会保留在页面上。
              </Text>
              <Button onClick={load}>重新加载</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  return (
    <Tabs
      defaultActiveKey="site"
      items={[
        { key: "site", label: "站点内容", children: siteForm },
        {
          key: "faq",
          label: "常见问答",
          children: <FaqManager name="faqs" title="常见问答" />,
        },
        {
          key: "review",
          label: "用户评价",
          children: <ReviewManager name="reviews" title="用户评价" />,
        },
        {
          key: "gallery",
          label: "实拍相册",
          children: <GalleryManager name="gallery" title="实拍相册" />,
        },
      ]}
    />
  );
};

export default ContentPage;
