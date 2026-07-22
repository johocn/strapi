import click from "./click";
import source from "./source";
import query from "./query";
import report from "./report";
import adminSync from "./admin-sync";

export default {
  click,
  source,
  query,
  report,
  "admin-sync": adminSync,
};
