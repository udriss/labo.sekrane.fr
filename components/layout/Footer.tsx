'use client';

import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  Stack,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Description as DocsIcon,
  Search as SearchIcon,
  Gavel as LegalIcon,
  Science as ScienceIcon,
  Copyright,
  Psychology,
} from '@mui/icons-material';
import NextLink from 'next/link';

interface FooterProps {
  brandName?: string;
}

export default function Footer({ brandName }: FooterProps) {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'Documentation', href: '/docs', icon: <DocsIcon fontSize="small" /> },
    { label: 'Recherche', href: '/recherche', icon: <SearchIcon fontSize="small" /> },
    { label: 'Mentions légales', href: '/mentions', icon: <LegalIcon fontSize="small" /> },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        bgcolor: theme.palette.mode === 'light' ? 'grey.50' : 'grey.900',
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Branding Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScienceIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  SGIL{brandName ? ` • ${brandName}` : ''}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Système de Gestion Intégrée de Laboratoire - Une solution complète pour 
                la gestion des activités pédagogiques et scientifiques.
              </Typography>
              <Typography variant="caption" color="text.secondary"
          sx = {{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
          >
                Développé avec <Psychology color="primary" sx={{ fontSize: 24 }} /> pour l'éducation scientifique
              </Typography>
            </Stack>
          </Grid>

          {/* Quick Links */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Liens rapides
            </Typography>
            <Stack spacing={1}>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  component={NextLink}
                  href={link.href}
                  color="inherit"
                  underline="hover"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    transition: 'color 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {link.icon}
                  <Typography variant="body2">{link.label}</Typography>
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Developer & Support */}
          <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Développement
            </Typography>
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  par <strong>M. Idriss SEKRANE</strong>
                </Typography>
                <Box>
                  <IconButton
                    component="a"
                    href="https://github.com/udriss"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    size="small"
                    sx={{
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    <GitHubIcon />
                  </IconButton>
                <Link
                    component="a"
                    href="https://github.com/udriss"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover"
                    sx={{
                        ml: 1,
                        transition: 'color 0.2s',
                        '&:hover': {
                            color: 'primary.main',
                        },
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Suivez le projet sur GitHub
                    </Typography>
                </Link>
                </Box>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        {/* Bottom Section */}
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary"
          sx = {{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
          >
            <Copyright color="primary" sx={{ fontSize: 14 }} /> {currentYear} SGIL - Tous droits réservés
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Typography variant="caption" color="text.secondary">
              Material-UI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Prisma
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
