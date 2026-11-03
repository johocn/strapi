import React from "react";
import { Tag } from "antd";
import { STATUS_COLOR, STATUS_TEXT } from "../utils/constants";

type StatusTagProps = {
  status?: string | null;
  prefix?: string;
};

const StatusTag = ({ status, prefix }: StatusTagProps) => {
  const key = String(status || "");
  const color = STATUS_COLOR[key];
  return (
    <Tag color={color} bordered={color !== "default"}>
      {prefix ? `${prefix}${STATUS_TEXT[key] || key || "-"}` : STATUS_TEXT[key] || key || "-"}
    </Tag>
  );
};

export { StatusTag };
export default StatusTag;
