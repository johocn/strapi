"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISTRICT_WORDS = void 0;
exports.containsDistrictWord = containsDistrictWord;
/** 本地化地域词典（省/市/区县，宽松匹配，用于标题地域校验） */
exports.DISTRICT_WORDS = [
    // 吉林省
    "吉林", "长春", "松原", "四平", "辽源", "通化", "白山", "白城", "延边", "梅河", "公主岭",
    "珲春", "蛟河", "桦甸", "舒兰", "磐石", "永吉", "九台", "榆树", "德惠", "农安",
    // 长春市辖区
    "昌邑", "船营", "龙潭", "丰满", "宽城", "南关", "二道", "绿园", "双阳", "净月", "高新", "经开", "汽开",
];
/** 标题是否含地域词 */
function containsDistrictWord(title, extraWords = []) {
    const words = exports.DISTRICT_WORDS.concat(extraWords);
    return words.some((w) => w.length > 0 && title.includes(w));
}
//# sourceMappingURL=geo-district-words.js.map