import { useState, useEffect } from "react";

const Initializer = ({ setPlugin }: { setPlugin: (id: string) => void }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 插件初始化完成
    setPlugin("zhao-course");
    setIsLoading(false);
  }, [setPlugin]);

  return isLoading ? <p>Loading...</p> : null;
};

export { Initializer };
