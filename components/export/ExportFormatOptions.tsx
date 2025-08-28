'use client';
import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Grid,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { ExportFormat } from '@/types/export';

interface ExportFormatOptionsProps {
  exportFormat: ExportFormat;
  setExportFormat: (value: ExportFormat) => void;
  onExport: () => void;
  disabled?: boolean;
}

const ExportFormatOptions: React.FC<ExportFormatOptionsProps> = ({
  exportFormat,
  setExportFormat,
  onExport,
  disabled,
}) => {
  const exportOptions = [
    {
      value: 'pdf' as const,
      title: 'PDF Document',
      description: 'Document portable lisible sur tous les appareils',
      icon: <PictureAsPdfIcon sx={{ fontSize: 50, color: '#f44336' }} />,
      buttonIcon: <SaveIcon />,
      buttonText: 'Générer PDF',
      color: '#f44336',
      bgColor: '#ffebee',
    },
    {
      value: 'xlsx' as const,
      title: 'Excel (XLSX)',
      description: "Fichier tableur Microsoft Excel pour l'analyse des données",
      icon: <TableChartIcon sx={{ fontSize: 50, color: '#4caf50' }} />,
      buttonIcon: <FileDownloadIcon />,
      buttonText: 'Exporter en Excel',
      color: '#4caf50',
      bgColor: '#e8f5e9',
    },
    {
      value: 'csv' as const,
      title: 'CSV Format',
      description: 'Format texte compatible avec tous les tableurs',
      icon: <InsertDriveFileIcon sx={{ fontSize: 50, color: '#ff9800' }} />,
      buttonIcon: <FileDownloadIcon />,
      buttonText: 'Exporter en CSV',
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
  ];

  const selectedOption = exportOptions.find((o) => o.value === exportFormat) || exportOptions[0];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
        Format d'export
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {exportOptions.map((option) => (
          <Grid key={option.value} size={{ xs: 12, sm: 4 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                border:
                  exportFormat === option.value ? `2px solid ${option.color}` : '1px solid #e0e0e0',
                borderRadius: 2,
                boxShadow: exportFormat === option.value ? `0 4px 8px rgba(0,0,0,0.15)` : 'none',
                transition: 'all 0.3s ease',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderColor: option.color },
              }}
            >
              <CardActionArea onClick={() => setExportFormat(option.value)} sx={{ height: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
                  <CardMedia
                    sx={{
                      width: 80,
                      height: 80,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: option.bgColor,
                      borderRadius: 2,
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {option.icon}
                  </CardMedia>
                  <CardContent sx={{ flex: '1 0 auto', p: 1, textAlign: 'center' }}>
                    <Typography component="div" variant="h6">
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </CardContent>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          startIcon={selectedOption.buttonIcon}
          disabled={!!disabled}
          onClick={onExport}
          size="large"
          sx={{
            px: 4,
            backgroundColor: selectedOption.color,
            '&:hover': { backgroundColor: selectedOption.color, filter: 'brightness(0.9)' },
          }}
        >
          {selectedOption.buttonText}
        </Button>
      </Box>
      <Typography
        variant="caption"
        align="center"
        color="text.secondary"
        display="block"
        sx={{ mt: 1 }}
      >
        Export des données au format sélectionné
      </Typography>
    </Paper>
  );
};

export default ExportFormatOptions;
