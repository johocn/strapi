import React from 'react';
import { Box, Typography } from '@strapi/design-system';

const Initializer = ({ setPlugin }: { setPlugin: any }) => {
  React.useEffect(() => {
    setPlugin('zhao-studio', true);
  }, [setPlugin]);

  return (
    <Box>
      <Typography>Loading zhao-studio...</Typography>
    </Box>
  );
};

export default Initializer;