export type PriceInput = {
  serviceType: "store" | "pickup";
  months: number;
  packageDoc: {
    baseMonths: number;
    storePrice: number;
    pickupPrice: number;
    extraMonthPrice: number;
  };
  addons: Array<{ price: number }>;
};

export const calcPrice = ({ serviceType, months, packageDoc, addons }: PriceInput) => {
  const base =
    serviceType === "store"
      ? Number(packageDoc.storePrice) || 0
      : Number(packageDoc.pickupPrice) || 0;
  const baseMonths = Number(packageDoc.baseMonths) || 0;
  const extraMonths = Math.max(0, Number(months || 0) - baseMonths);
  const amountPackage = base + extraMonths * (Number(packageDoc.extraMonthPrice) || 0);
  const amountAddon = (addons || []).reduce(
    (sum, addon) => sum + (Number(addon?.price) || 0),
    0
  );

  return { amountPackage, amountAddon, amountTotal: amountPackage + amountAddon };
};

export default () => ({ calcPrice });
