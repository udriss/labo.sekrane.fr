'use client';

import React from 'react';
import { Box, Skeleton, Card } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'event' | 'calendar' | 'list' | 'card';
  count?: number;
  height?: number | string;
}

export function LoadingSkeleton({
  variant = 'card',
  count = 3,
  height = 80,
}: LoadingSkeletonProps) {
  const renderEventSkeleton = () => (
    <Card sx={{ p: 3, borderRadius: 3, mb: 2 }}>
      <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="40%" height={20} />
    </Card>
  );

  const renderCalendarSkeleton = () => (
    <Box>
      <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
      <Box display="grid" gridTemplateColumns="80px repeat(7, 1fr)" gap={1}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
        ))}
        {Array.from({ length: 168 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Box>
  );

  const renderListSkeleton = () => (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} display="flex" alignItems="center" gap={2} p={2} mb={1}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
    </Box>
  );

  const renderCardSkeleton = () => (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box flex={1}>
              <Skeleton variant="text" width="70%" height={28} />
              <Skeleton variant="text" width="50%" height={20} />
            </Box>
          </Box>
          <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 2 }} />
        </Card>
      ))}
    </Box>
  );

  switch (variant) {
    case 'event':
      return (
        <Box>
          {Array.from({ length: count }).map((_, i) => (
            <Box key={i}>{renderEventSkeleton()}</Box>
          ))}
        </Box>
      );
    case 'calendar':
      return renderCalendarSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'card':
    default:
      return renderCardSkeleton();
  }
}

export function CalendarSkeleton() {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 4,
        p: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Skeleton variant="text" width="40%" height={48} sx={{ mb: 3 }} />
      <LoadingSkeleton variant="calendar" />
    </Box>
  );
}

export function EventListSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
      <LoadingSkeleton variant="event" count={5} />
    </Box>
  );
}
