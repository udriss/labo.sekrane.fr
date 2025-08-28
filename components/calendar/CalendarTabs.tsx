'use client';

import React from 'react';
import { Box, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calendar-tabpanel-${index}`}
      aria-labelledby={`calendar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface CalendarTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  children: React.ReactNode;
  tabs: string[];
  sx?: any;
}

export default function CalendarTabs({ value, onChange, children, tabs, sx }: CalendarTabsProps) {
  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Box
      sx={{
        background: 'background.paper',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Modern Tabs */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
        }}
      >
        <Tabs
          value={value}
          onChange={onChange}
          variant={isMobile ? 'scrollable' : 'scrollable'}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              minWidth: 50,
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab} />
          ))}
        </Tabs>
      </Box>

      {children}
    </Box>
  );
}

export { TabPanel };
