import { Box, Container, Typography, Link, Divider, Stack, IconButton } from '@mui/material';
import { GitHub, Email, Info, Science, Insights } from '@mui/icons-material';

export function FooterLIMS() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.grey[900],
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Science sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              © {currentYear} M. I. SEKRANE. Tous droits réservés.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Link
              href="/about"
              color="text.secondary"
              underline="hover"
              variant="body2"
            >
              À propos
            </Link>
            <Link
              href="/docs"
              color="text.secondary"
              underline="hover"
              variant="body2"
            >
              Documentation
            </Link>
            <Link
              href="/support"
              color="text.secondary"
              underline="hover"
              variant="body2"
            >
              Support
            </Link>
            <Link
              href="/privacy"
              color="text.secondary"
              underline="hover"
              variant="body2"
            >
              Confidentialité
            </Link>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton size="small" color="inherit" href="https://github.com">
              <GitHub fontSize="small" />
            </IconButton>
            <IconButton size="small" color="inherit" href="mailto:support@lims.lab">
              <Email fontSize="small" />
            </IconButton>
            <IconButton size="small" color="inherit" href="/about">
              <Info fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="center"
          alignItems="center"
          spacing={1}
        >
            <Typography variant="caption" color="text.secondary" align="center">
            Développé avec{' '}
            <Insights sx={{ fontSize: 16, color: 'primary.main' }} />
            {' '}pour simplifier la gestion de laboratoire
            </Typography>
          <Typography variant="caption" color="text.secondary">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Propulsé par Next.js & Material-UI
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}