/** 本地化地域词典（省/市/区县，宽松匹配，用于标题地域校验） */
export declare const DISTRICT_WORDS: string[];
/** 标题是否含地域词 */
export declare function containsDistrictWord(title: string, extraWords?: string[]): boolean;
