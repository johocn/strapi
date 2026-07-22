"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncStatus = void 0;
/** 同步记录状态 */
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["PENDING"] = "pending";
    SyncStatus["SYNCING"] = "syncing";
    SyncStatus["SUCCESS"] = "success";
    SyncStatus["FAILED"] = "failed";
    SyncStatus["SKIPPED"] = "skipped";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
