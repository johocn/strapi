import React, { useState } from "react";
import { Button, Image, Modal, Space, Typography, Upload, message } from "antd";
import { DeleteOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { errorMessage, useTireApi } from "../utils/api";

type PhotoUploaderProps = {
  max?: number;
  disabled?: boolean;
  onChange?: (files: File[]) => void;
};

const PhotoUploader = ({ max = 6, disabled, onChange }: PhotoUploaderProps) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [preview, setPreview] = useState<string>("");

  const handleChange = ({ fileList: next }: any) => {
    const limited = (next || []).slice(0, max).map((item: any) => ({
      ...item,
      thumbUrl:
        item.thumbUrl ||
        (item.originFileObj ? URL.createObjectURL(item.originFileObj) : undefined),
    }));
    setFileList(limited);
    const files = limited
      .map((item: any) => item.originFileObj)
      .filter(Boolean) as File[];
    onChange?.(files);
  };

  return (
    <>
      <Upload
        accept="image/*"
        multiple
        listType="picture-card"
        fileList={fileList}
        maxCount={max}
        disabled={disabled}
        beforeUpload={() => false}
        onChange={handleChange}
        onPreview={(file: any) => setPreview(file.thumbUrl || file.url || "")}
      >
        {fileList.length >= max ? null : (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 6, fontSize: 12 }}>上传照片</div>
          </div>
        )}
      </Upload>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        最多 {max} 张，支持 JPG/PNG；提交时随表单一起上传。
      </Typography.Text>
      <Modal
        open={!!preview}
        footer={null}
        onCancel={() => setPreview("")}
        width={720}
      >
        {preview ? <img src={preview} style={{ width: "100%" }} alt="预览" /> : null}
      </Modal>
    </>
  );
};

export type MediaValue = { id: number; url: string } | null;

type MediaPickerProps = {
  value?: MediaValue;
  onChange?: (value: MediaValue) => void;
  disabled?: boolean;
  hint?: string;
};

const MediaPicker = ({ value, onChange, disabled, hint }: MediaPickerProps) => {
  const { uploadImage } = useTireApi();
  const [uploading, setUploading] = useState(false);

  const beforeUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      if (!uploaded.id) throw new Error("上传返回的图片 id 为空");
      onChange?.({ id: uploaded.id, url: uploaded.url });
      message.success("图片已上传");
    } catch (error) {
      message.error(`上传失败：${errorMessage(error)}`);
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;
  };

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {value?.url ? (
        <Space align="start">
          <Image src={value.url} width={96} height={96} style={{ objectFit: "cover" }} />
          {!disabled ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange?.(null)}
            >
              移除
            </Button>
          ) : null}
        </Space>
      ) : null}
      {!disabled ? (
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            选择图片
          </Button>
        </Upload>
      ) : null}
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </Space>
  );
};

export { PhotoUploader, MediaPicker };
export default PhotoUploader;
