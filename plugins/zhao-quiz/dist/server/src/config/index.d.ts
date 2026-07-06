declare const _default: {
    default: {
        scoring: {
            difficultyMultiplier: {
                easy: number;
                medium: number;
                hard: number;
            };
            partialScore: {
                multipleChoice: number;
                matching: boolean;
            };
        };
        batch: {
            maxFileSize: number;
            allowedFormats: string[];
        };
        exam: {
            defaultPassScore: number;
            defaultTimeLimit: number;
        };
    };
    validator: (config: Record<string, unknown>) => void;
};
export default _default;
