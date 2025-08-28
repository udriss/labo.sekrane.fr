'use client';
import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Avatar,
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, link }) => {
  const theme = useTheme();
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      sx={{ height: '100%', cursor: 'pointer', transition: 'all .3s', '&:hover': { boxShadow: 6 } }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 56, height: 56 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          {link && (
            <Button endIcon={<ArrowForward />} size="small" sx={{ alignSelf: 'flex-start' }}>
              En savoir plus
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
