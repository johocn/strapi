import type { Core } from "@strapi/strapi";

const PACKAGE_UID = "plugin::zhao-tire.tire-package";
const ADDON_UID = "plugin::zhao-tire.tire-addon";
const FAQ_UID = "plugin::zhao-tire.tire-faq";
const REVIEW_UID = "plugin::zhao-tire.tire-review";
const CONFIG_UID = "plugin::zhao-tire.tire-config";

const PACKAGES = [
  {
    name: "标准寄存",
    code: "standard",
    baseMonths: 6,
    storePrice: 3000,
    pickupPrice: 3000,
    extraMonthPrice: 3000,
    overdueDayPrice: 3000,
    durationText: "最长存至 2027-05-01",
    highlights: [
      "原价 80 元 / 6 个月，会员价 60 元 / 6 个月",
      "限时优惠 30 元 / 6 个月（即日起至 11 月 30 日）",
      "介绍 3 人存胎（达成交易）免费",
      "独立仓位，干燥避光",
      "入库拍照建档，出库核对",
      "到期前 7 天、3 天各提醒一次",
      "丢失按协议赔付",
    ],
    enabled: true,
    sort: 0,
  },
];

const ADDONS = [
  {
    name: "精存（打油缠保鲜膜）",
    code: "valve-care",
    price: 6000,
    unitText: "套",
    enabled: true,
    sort: 0,
  },
];

const FAQS = [
  {
    question: "寄存从什么时候开始比较合适？",
    answer:
      "建议在换季降温后、第一场雪前完成寄存。当天取胎、当天入库，入库后可在订单详情查看仓位与实拍照片。",
  },
  {
    question: "上门取胎怎么约时间？",
    answer:
      "下单时选择「上门取胎」并选择上午或下午时段。每个时段有预约上限，约满后该时段会置灰，请改选其他日期或时段。",
  },
  {
    question: "轮胎入库后会做哪些记录？",
    answer:
      "仓库会对每套轮胎拍摄胎侧、花纹与套装照片，登记独立仓位编号与入库时间，照片长期保存在订单档案中。",
  },
  {
    question: "寄存到期了怎么办？",
    answer:
      "到期前 7 天和 3 天会短信提醒。可以线上续费延长存期，或提交出库申请；超期未取按天计收超期保管费，超过协议约定期限按无主轮胎处理。",
  },
  {
    question: "取回时需要带什么？",
    answer: "报订单号或手机号即可，仓库核对仓位编号与出库照片后交付，建议本人到场或提前告知代取人信息。",
  },
  {
    question: "轮胎丢失或损坏怎么赔付？",
    answer:
      "以入库照片与仓位记录为准。因仓库保管不当造成的丢失或损坏，按协议约定赔付；自然老化、原有损伤不在赔付范围。",
  },
];

const REVIEWS = [
  {
    nickname: "李女士",
    content: "上门取胎很准时，入库照片拍得清楚，仓位号也能查到，换季不用自己搬轮胎了。",
    rating: 5,
    showOnHome: true,
    sort: 0,
  },
  {
    nickname: "王先生",
    content: "第二年续存直接在手机上操作，到期前有短信提醒，省心。",
    rating: 5,
    showOnHome: true,
    sort: 1,
  },
  {
    nickname: "张先生",
    content: "仓库干燥，取胎时轮胎状态和入库照片一致，核对很仔细。",
    rating: 4,
    showOnHome: true,
    sort: 2,
  },
];

const AGREEMENT_TEXT = `<h3>轮胎寄存须知及赔付协议</h3>
<p>一、寄存范围：本服务仅受理乘用车、SUV 与皮卡轮胎寄存，寄存前请确认轮胎无严重结构性损伤。</p>
<p>二、入库建档：仓库在入库时拍摄胎侧、花纹与套装照片并登记仓位编号，照片与仓位记录作为取回与赔付依据。</p>
<p>三、寄存期限：本季寄存最长至 2027 年 5 月 1 日。到期前 7 天、3 天通过短信提醒；超期未取按天计收超期保管费。</p>
<p>四、续费与出库：可在订单详情在线申请续费或提交出库申请，出库申请经商家审核后安排取回。</p>
<p>五、赔付约定：因仓库保管不当造成的丢失或损坏，按订单轮胎实际价值与协议约定赔付；自然老化、原有损伤、胎压异常等非保管原因不在赔付范围。</p>
<p>六、无主处理：超过约定寄存期限且经两次提醒仍未续费、未取回的轮胎，视为无主物品，商家可按约定自行处理。</p>
<p>七、其他：本协议未尽事宜由双方协商解决，商家对协议内容保留最终解释权。</p>`;

const DEFAULT_BANNER_TITLE = "雪地胎专业寄存";
const DEFAULT_BANNER_SUBTITLE = "恒温仓储 · 建档留痕 · 到期提醒";

const seed = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.log;

  try {
    const packageCount = await strapi.documents(PACKAGE_UID).count({});
    if (packageCount === 0) {
      for (const data of PACKAGES) {
        await strapi.documents(PACKAGE_UID).create({ data });
      }
      logger.info("[zhao-tire] seed: 套餐已创建");
    }

    const addonCount = await strapi.documents(ADDON_UID).count({});
    if (addonCount === 0) {
      for (const data of ADDONS) {
        await strapi.documents(ADDON_UID).create({ data });
      }
      logger.info("[zhao-tire] seed: 增值项已创建");
    }

    const faqCount = await strapi.documents(FAQ_UID).count({});
    if (faqCount === 0) {
      for (const data of FAQS) {
        await strapi.documents(FAQ_UID).create({ data });
      }
      logger.info("[zhao-tire] seed: FAQ 已创建");
    }

    const reviewCount = await strapi.documents(REVIEW_UID).count({});
    if (reviewCount === 0) {
      for (const data of REVIEWS) {
        await strapi.documents(REVIEW_UID).create({ data });
      }
      logger.info("[zhao-tire] seed: 评价已创建");
    }

    const config: any = await strapi.documents(CONFIG_UID).findFirst({});
    if (config && !config.bannerTitle) {
      await strapi.documents(CONFIG_UID).update({
        documentId: config.documentId,
        data: {
          bannerTitle: DEFAULT_BANNER_TITLE,
          bannerSubtitle: DEFAULT_BANNER_SUBTITLE,
          serviceIntro: `<p>净月本地雪地胎寄存服务，提供上门取胎、独立仓位、入库拍照建档与到期提醒。</p>`,
          warehouseConditions:
            "恒温恒湿独立仓位，避免日晒雨淋；每套轮胎独立编号，入库出库全程留痕；仓位定期巡检，支持预约查看。",
          guarantees: [
            "丢失按协议赔付",
            "入库/出库全程拍照留档",
            "到期前 7 天、3 天短信提醒",
            "独立仓位，不与散胎混放",
          ],
          serviceAreaText:
            "上门取送范围：长春净月开发区及周边 15 公里内；超出范围可到店送存或联系客服确认。",
          warehouseAddress: "长春市净月开发区福祉大路 588 号（轮胎寄存仓）",
          warehouseLat: 43.7833,
          warehouseLng: 125.4233,
          contactPhone: "0431-8888 6666",
          dailyPickupLimitMorning: 6,
          dailyPickupLimitAfternoon: 6,
          maxStorageDate: "2027-05-01",
          agreementText: AGREEMENT_TEXT,
          announcement:
            "限时优惠 30 元 / 6 个月（即日起至 11 月 30 日）；介绍 3 人存胎（达成交易）免费。",
          paymentOnlineEnabled: false,
          depositEnabled: false,
        } as any,
      });
      logger.info("[zhao-tire] seed: 站点配置已初始化");
    }
  } catch (error) {
    logger.error(`[zhao-tire] seed failed: ${error}`);
  }
};

export default seed;
