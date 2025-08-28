// app/mentions/page.tsx

'use client';
import React from 'react';
import { Box, Typography, Link, Divider, List, ListItem, ListItemText, useTheme, alpha } from '@mui/material';

// Mentions légales – adaptées au style des pages existantes (calendrier, materiel)
// Contenu générique à compléter avec vos informations exactes si besoin.

export default function MentionsLegalesPage() {
    const theme = useTheme();

  const primaryColor =
    theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.primary.dark;
  const secondaryColor =
    theme.palette.mode === 'light' ? theme.palette.secondary.light : theme.palette.secondary.dark;
  const primaryTransparent = alpha(primaryColor, 0.12);
  const secondaryTransparent = alpha(secondaryColor, 0.08);

  const innerPanelStyles = {
    background: `linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%)`,
    p: { xs: 2, md: 4 },
    borderRadius: 4,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    mx: 'auto',
    height: '90%',
    mt: 4,
  } as const;

  return (
    <Box
      data-page="mentions"
      sx={innerPanelStyles}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 4,
          p: { xs: 2, sm: 3 },
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
          Mentions légales
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Conformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la
          confiance dans l'économie numérique, il est précisé aux utilisateurs du site
          les présentes informations.
        </Typography>

        <Section title="Éditeur du site">
          <List dense>
            <Info label="Nom de l'application" value="Labo – Gestion de laboratoire" />
            <Info label="Responsable de publication" value="Nom Prénom" />
            <Info label="Contact" value={<Link href="mailto:admin@sekrane.fr">admin@sekrane.fr</Link>} />
            <Info label="Adresse" value="Établissement scolaire / Adresse postale" />
          </List>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Hébergeur">
          <List dense>
            <Info label="Hébergeur" value="IONOS" />
            <Info label="Adresse" value="Elgendorfer Str. 57, 56410 Montabaur, Allemagne" />
            <Info label="Téléphone" value={<Link href="tel:+49721913740">+49 721 91374-0</Link>} />
            <Info label="Site web" value={<Link href="https://www.ionos.fr/" target="_blank" rel="noopener noreferrer">ionos.fr</Link>} />
          </List>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Propriété intellectuelle">
          <Typography variant="body2" color="text.secondary">
            L'ensemble des contenus (textes, images, logos, éléments graphiques) présents sur
            cette application est protégé par le droit d'auteur et les lois relatives à la
            propriété intellectuelle. Toute reproduction, représentation, modification, publication
            ou adaptation, totale ou partielle, de ces éléments, quel que soit le moyen ou le
            procédé utilisé, est interdite, sauf autorisation écrite préalable.
          </Typography>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Protection des données personnelles (RGPD)">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
            Informatique et Libertés, vous disposez des droits suivants sur vos données :
          </Typography>
          <List dense sx={{ ml: 2 }}>
            <ListItem sx={{ py: 0.25 }}>
              <ListItemText slotProps={{ primary: { variant: 'body2' } }} primary="Droit d'accès, de rectification et d'effacement" />
            </ListItem>
            <ListItem sx={{ py: 0.25 }}>
              <ListItemText slotProps={{ primary: { variant: 'body2' } }} primary="Droit à la limitation et à l'opposition au traitement" />
            </ListItem>
            <ListItem sx={{ py: 0.25 }}>
              <ListItemText slotProps={{ primary: { variant: 'body2' } }} primary="Droit à la portabilité des données" />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Pour exercer ces droits ou pour toute question relative à la gestion de vos données,
            contactez-nous à l'adresse suivante :{' '}
            <Link href="mailto:admin@sekrane.fr">admin@sekrane.fr</Link>. Vous pouvez également déposer
            une réclamation auprès de la CNIL (cnil.fr).
          </Typography>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Cookies et traceurs">
          <Typography variant="body2" color="text.secondary">
            Cette application peut utiliser des cookies strictement nécessaires au fonctionnement
            (session, sécurité) et des cookies fonctionnels. Aucun cookie publicitaire n'est utilisé.
            Vous pouvez paramétrer votre navigateur pour bloquer tout ou partie des cookies. Pour en
            savoir plus, consultez notre politique relative aux cookies si disponible.
          </Typography>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Responsabilités">
          <Typography variant="body2" color="text.secondary">
            L'éditeur s'efforce de fournir des informations à jour et exactes. Néanmoins, des
            erreurs ou omissions peuvent survenir. L'utilisateur est invité à vérifier les
            informations et à signaler toute inexactitude. L'éditeur ne saurait être tenu responsable
            en cas de dommages directs ou indirects résultant de l'utilisation de l'application.
          </Typography>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Lien de contact">
          <Typography variant="body2" color="text.secondary">
            Pour toute question relative à ces mentions, vous pouvez nous écrire à :{' '}
            <Link href="mailto:admin@sekrane.fr">admin@sekrane.fr</Link>
          </Typography>
        </Section>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block' }}>
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </Typography>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListItem sx={{ py: 0.25 }}>
      <ListItemText
        slotProps={{
          primary: { variant: 'body2' },
          secondary: { variant: 'body2', color: 'text.secondary' }
        }}
        primary={label}
        secondary={value}
      />
    </ListItem>
  );
}
