import React from 'react';
import { Card, CardContent, Typography, LinearProgress, Box, Chip } from '@mui/material';

export default function StatCard({ title, value, unit='', percent=null, color='primary', secondary, icon }) {
  const getColor = () => {
    if (percent !== null && percent !== undefined) {
      if (percent > 90) return 'error';
      if (percent > 75) return 'warning';
      return 'success';
    }
    return color;
  };

  return (
    <Card sx={{ height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 0 }}>{title}</Typography>
          {icon && icon}
        </Box>
        <Box display="flex" alignItems="baseline" gap={1}>
          <Typography variant="h5" fontWeight={600} color={getColor() + '.main'}>{value}{unit}</Typography>
          {secondary && <Chip size="small" label={secondary} variant="outlined" />}
        </Box>
        {percent !== null && percent !== undefined && (
          <Box mt={2}>
            <LinearProgress variant="determinate" value={percent} color={getColor()} sx={{ height: 8, borderRadius: 5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{percent.toFixed(1)}%</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
