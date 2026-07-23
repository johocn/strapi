import query from "./query";
import preFilter from "./pre-filter";
import candidate from "./candidate";
import sync from "./sync";
import syncScheduler from "./sync-scheduler";
import adapterRegistry from "./adapter-registry-service";

export default {
  query,
  "pre-filter": preFilter,
  candidate,
  sync,
  syncScheduler,
  adapterRegistry,
};
