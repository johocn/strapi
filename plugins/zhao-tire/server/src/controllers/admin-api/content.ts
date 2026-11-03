import { buildCollectionCrud, prefixHandlers } from "./catalog";

export default {
  ...prefixHandlers("faq", buildCollectionCrud("faqs")),
  ...prefixHandlers("review", buildCollectionCrud("reviews")),
  ...prefixHandlers("gallery", buildCollectionCrud("gallery")),
};
