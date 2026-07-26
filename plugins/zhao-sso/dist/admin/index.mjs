// ESM wrapper for admin entry point
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./index.js");
export const register = mod.register;
export const registerTrads = mod.registerTrads;
export default mod;
