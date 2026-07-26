"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const CODE_UID = "plugin::zhao-sso.sso-sms-code";
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    return {
        /**
         * 发送验证码
         * - SMS_PROVIDER=mock(默认):固定 1234,仅写入 DB
         * - SMS_PROVIDER=aliyun:对接阿里云 dysmsapi
         * - SMS_PROVIDER=tencent:对接腾讯云 sms
         */
        async sendCode(mobile, scene = "login", ip) {
            if (!/^1[3-9]\d{9}$/.test(mobile)) {
                throwErr("SSO_SMS_001", 400, "手机号格式不正确");
            }
            const provider = process.env.SMS_PROVIDER || "mock";
            const ttlMinutes = 5;
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
            // 生成验证码(mock 模式固定 1234,其余随机)
            const code = provider === "mock" ? "1234" : crypto_1.default.randomInt(100000, 999999).toString();
            // 写入 DB
            await strapi.db.query(CODE_UID).create({
                data: { mobile, code, scene, expires_at: expiresAt, used: false, ip: ip || null, provider },
            });
            if (provider === "mock") {
                strapi.log.info(`[zhao-sso] Mock SMS code sent to ${mobile}: ${code}`);
                return { sent: true, provider, ttlMinutes };
            }
            try {
                if (provider === "aliyun") {
                    await this.sendViaAliyun(mobile, code);
                }
                else if (provider === "tencent") {
                    await this.sendViaTencent(mobile, code);
                }
                else {
                    throwErr("SSO_SMS_008", 400, `不支持的 SMS provider: ${provider}`);
                }
                return { sent: true, provider, ttlMinutes };
            }
            catch (e) {
                strapi.log.error(`[zhao-sso] SMS provider=${provider} 发送失败: ${e.message}`);
                return { sent: false, provider, error: e.message, ttlMinutes };
            }
        },
        /**
         * 校验验证码(校验成功后标记 used=true)
         */
        async verifyCode(mobile, code, scene = "login") {
            const record = await strapi.db.query(CODE_UID).findOne({
                where: { mobile, code, scene, used: false },
                orderBy: { id: "DESC" },
            });
            if (!record)
                throwErr("SSO_SMS_002", 400, "验证码错误");
            if (new Date(record.expires_at) < new Date())
                throwErr("SSO_SMS_003", 400, "验证码已过期");
            await strapi.db.query(CODE_UID).update({
                where: { id: record.id },
                data: { used: true },
            });
            return true;
        },
        /**
         * 阿里云 SMS 发送(HMAC-SHA1 签名,GET 请求)
         * 环境变量:SMS_ALIYUN_ACCESS_KEY_ID / SMS_ALIYUN_ACCESS_KEY_SECRET / SMS_ALIYUN_SIGN_NAME / SMS_ALIYUN_TEMPLATE_CODE
         */
        async sendViaAliyun(mobile, code) {
            var _a, _b, _c;
            const accessKeyId = process.env.SMS_ALIYUN_ACCESS_KEY_ID;
            const accessKeySecret = process.env.SMS_ALIYUN_ACCESS_KEY_SECRET;
            const signName = process.env.SMS_ALIYUN_SIGN_NAME;
            const templateCode = process.env.SMS_ALIYUN_TEMPLATE_CODE;
            if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
                throwErr("SSO_SMS_006", 500, "阿里云 SMS 配置缺失");
            }
            const percentEncode = (str) => encodeURIComponent(str)
                .replace(/\+/g, "%20")
                .replace(/\*/g, "%2A")
                .replace(/%7E/g, "~");
            const params = {
                AccessKeyId: accessKeyId,
                Action: "SendSms",
                Format: "JSON",
                PhoneNumbers: mobile,
                RegionId: "cn-hangzhou",
                SignName: signName,
                SignatureMethod: "HMAC-SHA1",
                SignatureNonce: crypto_1.default.randomUUID(),
                SignatureVersion: "1.0",
                TemplateCode: templateCode,
                TemplateParam: JSON.stringify({ code }),
                Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
                Version: "2017-05-25",
            };
            const canonicalized = Object.keys(params)
                .sort()
                .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
                .join("&");
            const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalized)}`;
            const signature = crypto_1.default
                .createHmac("sha1", `${accessKeySecret}&`)
                .update(stringToSign)
                .digest("base64");
            const url = `https://dysmsapi.aliyuncs.com/?${canonicalized}&Signature=${percentEncode(signature)}`;
            const resp = await axios_1.default.get(url, { timeout: 10000 });
            if (((_a = resp.data) === null || _a === void 0 ? void 0 : _a.Code) !== "OK") {
                throwErr("SSO_SMS_006", 500, `阿里云 SMS 发送失败: ${((_b = resp.data) === null || _b === void 0 ? void 0 : _b.Message) || ((_c = resp.data) === null || _c === void 0 ? void 0 : _c.Code) || "unknown"}`);
            }
            return resp.data;
        },
        /**
         * 腾讯云 SMS 发送(TC3-HMAC-SHA256 签名,POST 请求)
         * 环境变量:SMS_TENCENT_SECRET_ID / SMS_TENCENT_SECRET_KEY / SMS_TENCENT_SDK_APP_ID / SMS_TENCENT_SIGN_NAME / SMS_TENCENT_TEMPLATE_ID
         */
        async sendViaTencent(mobile, code) {
            var _a, _b;
            const secretId = process.env.SMS_TENCENT_SECRET_ID;
            const secretKey = process.env.SMS_TENCENT_SECRET_KEY;
            const sdkAppId = process.env.SMS_TENCENT_SDK_APP_ID;
            const signName = process.env.SMS_TENCENT_SIGN_NAME;
            const templateId = process.env.SMS_TENCENT_TEMPLATE_ID;
            if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
                throwErr("SSO_SMS_007", 500, "腾讯云 SMS 配置缺失");
            }
            const host = "sms.tencentcloudapi.com";
            const service = "sms";
            const action = "SendSms";
            const version = "2021-01-11";
            const region = "ap-beijing";
            const timestamp = Math.floor(Date.now() / 1000);
            const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
            const payload = JSON.stringify({
                SmsSdkAppId: sdkAppId,
                SignName: signName,
                TemplateId: templateId,
                PhoneNumberSet: [`+86${mobile}`],
                TemplateParamSet: [code],
            });
            const hashedPayload = crypto_1.default.createHash("sha256").update(payload).digest("hex");
            const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
            const signedHeaders = "content-type;host;x-tc-action";
            const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
            const credentialScope = `${date}/${service}/tc3_request`;
            const hashedCanonicalRequest = crypto_1.default.createHash("sha256").update(canonicalRequest).digest("hex");
            const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
            const secretDate = crypto_1.default.createHmac("sha256", secretKey).update(date).digest();
            const secretService = crypto_1.default.createHmac("sha256", secretDate).update(service).digest();
            const secretSigning = crypto_1.default.createHmac("sha256", secretService).update("tc3_request").digest();
            const signature = crypto_1.default.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");
            const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
            const resp = await axios_1.default.post(`https://${host}`, payload, {
                timeout: 10000,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    Authorization: authorization,
                    "X-TC-Action": action,
                    "X-TC-Timestamp": String(timestamp),
                    "X-TC-Version": version,
                    "X-TC-Region": region,
                },
            });
            const respData = (_a = resp.data) === null || _a === void 0 ? void 0 : _a.Response;
            if (respData === null || respData === void 0 ? void 0 : respData.Error) {
                throwErr("SSO_SMS_007", 500, `腾讯云 SMS 发送失败: ${respData.Error.Message || respData.Error.Code}`);
            }
            const firstStatus = (_b = respData === null || respData === void 0 ? void 0 : respData.SendStatusSet) === null || _b === void 0 ? void 0 : _b[0];
            if (firstStatus && firstStatus.Code !== "Ok") {
                throwErr("SSO_SMS_007", 500, `腾讯云 SMS 发送失败: ${firstStatus.Message || firstStatus.Code}`);
            }
            return respData;
        },
    };
};
