export type PriceInput = {
    serviceType: "store" | "pickup";
    months: number;
    packageDoc: {
        baseMonths: number;
        storePrice: number;
        pickupPrice: number;
        extraMonthPrice: number;
    };
    addons: Array<{
        price: number;
    }>;
};
export declare const calcPrice: ({ serviceType, months, packageDoc, addons }: PriceInput) => {
    amountPackage: number;
    amountAddon: number;
    amountTotal: number;
};
declare const _default: () => {
    calcPrice: ({ serviceType, months, packageDoc, addons }: PriceInput) => {
        amountPackage: number;
        amountAddon: number;
        amountTotal: number;
    };
};
export default _default;
