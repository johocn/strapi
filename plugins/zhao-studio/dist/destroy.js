"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("./utils/queue");
exports.default = async () => {
    try {
        await (0, queue_1.closeStudioQueues)();
    }
    catch {
        // ignore
    }
};
//# sourceMappingURL=destroy.js.map