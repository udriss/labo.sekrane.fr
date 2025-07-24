// components/notebook/entry-content-preview.tsx

import { Typography, Box } from '@mui/material';

// On définit les props que le composant accepte
interface EntryContentPreviewProps {
  // Le contenu à afficher, qui peut être undefined
  content?: string; 
  // La longueur maximale avant de tronquer
  maxLength: number;
}

export function EntryContentPreview({ content, maxLength }: EntryContentPreviewProps) {
  // 1. Gérer le cas où il n'y a pas de contenu
  if (!content) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Pas de contenu disponible.
      </Typography>
    );
  }

  // 2. Gérer le cas où le contenu est plus court que la limite
  if (content.length <= maxLength) {
    return (
      <Typography variant="body2" color="text.secondary">
        {content}
      </Typography>
    );
  }

  // 3. Gérer le cas où le contenu doit être tronqué
  const truncatedContent = content.substring(0, maxLength) + "...";

  return (
    <Typography variant="body2" color="text.secondary">
      {truncatedContent}
    </Typography>
  );
}