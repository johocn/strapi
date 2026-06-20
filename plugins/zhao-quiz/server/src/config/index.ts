export default {
  default: {
    scoring: {
      difficultyMultiplier: {
        easy: 1.0,
        medium: 1.2,
        hard: 1.5,
      },
      partialScore: {
        multipleChoice: 0.5,
        matching: true,
      },
    },
    batch: {
      maxFileSize: 10485760,
      allowedFormats: [".csv", ".xlsx"],
    },
    exam: {
      defaultPassScore: 60,
      defaultTimeLimit: 0,
    },
  },
  validator: (config: Record<string, unknown>) => {
    if (config.scoring && typeof config.scoring !== "object") {
      throw new Error("scoring 配置必须是对象");
    }
  },
};
