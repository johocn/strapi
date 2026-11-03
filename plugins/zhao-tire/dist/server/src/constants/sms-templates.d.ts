export type SmsTemplateType = "order_created" | "accepted" | "inbound" | "due_7" | "due_3" | "outbound_done" | "manual";
/** 可用变量：{name} {orderNo} {expireAt} {daysLeft} {locationCode} {pickupText} {content} */
export declare const SMS_TEMPLATES: Record<SmsTemplateType, string>;
export declare const SMS_TEMPLATE_VARIABLES: string[];
