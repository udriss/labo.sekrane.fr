'use client';

import React from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import PdfPreviewEditor from '@/components/pdf/PdfPreviewEditor';

export default function PdfPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [event, setEvent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [pages, setPages] = React.useState<any[]>([]);
  const [sequence, setSequence] = React.useState<Array<{ type: 'page' | 'pdf'; id: string }>>([]);
  const [pdfDocs, setPdfDocs] = React.useState<any[]>([]);
  const [imageDocs, setImageDocs] = React.useState<any[]>([]);
  const [salleMap, setSalleMap] = React.useState<Record<number, string>>({});
  const [classMap, setClassMap] = React.useState<Record<number, string>>({});

  // Load event data
  React.useEffect(() => {
    if (!eventId) {
      router.push('/calendrier');
      return;
    }

    const loadEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();

          // Fetch maps for salle and classe names in parallel
          const [roomsRes, classesRes] = await Promise.all([
            fetch('/api/rooms'),
            fetch('/api/classes'),
          ]);
          let sMap: Record<number, string> = {};
          if (roomsRes.ok) {
            const { rooms } = await roomsRes.json();
            if (Array.isArray(rooms)) {
              sMap = rooms.reduce(
                (acc: any, r: any) => {
                  acc[r.id] = r.name || `Salle ${r.id}`;
                  return acc;
                },
                {} as Record<number, string>,
              );
            }
          }
          let cMap: Record<number, string> = {};
          if (classesRes.ok) {
            const json = await classesRes.json();
            const all = [
              ...(Array.isArray(json?.predefinedClasses) ? json.predefinedClasses : []),
              ...(Array.isArray(json?.customClasses) ? json.customClasses : []),
            ];
            cMap = all.reduce(
              (acc: any, c: any) => {
                acc[c.id] = c.name || `Classe ${c.id}`;
                return acc;
              },
              {} as Record<number, string>,
            );
          }
          setSalleMap(sMap);
          setClassMap(cMap);

          const ev = { ...data.event };
          setEvent(ev);

          // Initialize pages with event content and images
          initializePages(ev, sMap, cMap);
        } else {
          router.push('/calendrier');
        }
      } catch (err) {
        console.error('Error loading event:', err);
        router.push('/calendrier');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, router]);

  const initializePages = (
    eventData: any,
    sMap?: Record<number, string>,
    cMap?: Record<number, string>,
  ) => {
    // Build salle/class maps for display
    const localSalleMap = sMap || salleMap;
    const localClassMap = cMap || classMap;
    const documents = eventData.documents || [];
    const imageDocuments = documents.filter((doc: any) => {
      const fileName = doc.fileName || '';
      return /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
    });
    setImageDocs(imageDocuments);
    const pdfDocuments = documents.filter((doc: any) => /\.pdf$/i.test(doc.fileName || ''));
    setPdfDocs(pdfDocuments);

    const basePages = [
      {
        id: 'main',
        type: 'content',
        title: 'Fiche événement',
        content: { ...eventData, __salleMap: localSalleMap, __classMap: localClassMap },
        images: imageDocuments.map((doc: any, index: number) => ({
          id: `img-${index}`,
          src: doc.fileUrl || doc.url,
          title: doc.fileName,
          width: 300,
          height: 200,
          x: 50,
          y: 50, // will be auto-placed after content on first render
          page: 'main',
          autoplace: true,
        })),
        editable: false,
      },
    ];

    setPages(basePages);

    // Build initial sequence: all pages then PDFs
    const seq: Array<{ type: 'page' | 'pdf'; id: string }> = basePages.map((p) => ({
      type: 'page',
      id: p.id,
    }));
    for (const pdf of pdfDocuments) {
      seq.push({ type: 'pdf', id: String(pdf.id || pdf.fileUrl || pdf.fileName) });
    }
    setSequence(seq);
  };

  const handleAddPage = () => {
    const newPage = {
      id: `page-${Date.now()}`,
      type: 'images',
      title: 'Nouvelle page',
      content: null, // Add missing content property
      images: [],
      editable: true,
    };
    setPages((prev) => [...prev, newPage]);
  };

  const handleDeletePage = (pageId: string) => {
    if (pageId === 'main') return; // Cannot delete main page
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    setSequence((prev) => prev.filter((it) => !(it.type === 'page' && it.id === pageId)));
  };

  const handleUpdateImages = (pageId: string, images: any[]) => {
    setPages((prev) => prev.map((page) => (page.id === pageId ? { ...page, images } : page)));
  };

  // Toggle presence of an image doc in composition: add/remove on main content page
  const handleToggleImagePresence = (doc: any, present: boolean) => {
    setPages((prev) => {
      return prev.map((p) => {
        if (p.id !== 'main') return p;
        const exists = (p.images || []).some(
          (img: any) => String(img.src) === String(doc.fileUrl || doc.url),
        );
        if (present) {
          if (exists) return p;
          const newImg = {
            id: `img-${Date.now()}`,
            src: doc.fileUrl || doc.url,
            title: doc.fileName,
            width: 300,
            height: 200,
            x: 50,
            y: 50,
            page: p.id,
            autoplace: true,
          };
          return { ...p, images: [...(p.images || []), newImg] };
        } else {
          if (!exists) return p;
          return {
            ...p,
            images: (p.images || []).filter(
              (img: any) => String(img.src) !== String(doc.fileUrl || doc.url),
            ),
          };
        }
      });
    });
  };

  const handleExportPdf = async () => {
    if (!event) return;

    setExporting(true);
    try {
      // Ensure images use proxy URLs or data URLs like in server template
      const enrichedEvent = {
        ...event,
        documents: (event.documents || []).map((d: any) => ({
          ...d,
          // keep original url; server will convert via proxy/dataUrl
        })),
      };
      // Send pages configuration to PDF generation endpoint
      const response = await fetch('/api/generate-event-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: enrichedEvent, // send full event
          salleMap,
          classMap,
          pages,
          sequence,
          customLayout: true,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Déclencher un téléchargement classique pour éviter les bloqueurs de pop-up
        const a = document.createElement('a');
        const filename = `evenement-${event.id || 'export'}-${Date.now()}.pdf`;
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // Nettoyage
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
          <Box
            minHeight="100vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            gap={2}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Chargement…
            </Typography>
          </Box>
    );
  }

  if (!event) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Événement non trouvé</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => router.back()} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Prévisualisation PDF - {event.title || `Événement ${event.id}`}
          </Typography>

          <Tooltip title="Ajouter une page">
            <IconButton onClick={handleAddPage} sx={{ mr: 1 }}>
              <AddIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? 'Export...' : 'Exporter PDF'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* spacer for fixed AppBar height */}
      <Box sx={{ height: 64 }} />
      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <PdfPreviewEditor
          pages={pages}
          onUpdateImages={handleUpdateImages}
          onDeletePage={handleDeletePage}
          sequence={sequence}
          onReorderSequence={setSequence}
          pdfDocs={pdfDocs}
          imageDocs={imageDocs}
          onToggleImagePresence={handleToggleImagePresence}
          salleMap={salleMap}
          classMap={classMap}
        />
      </Box>
    </Box>
  );
}
