'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  TextField,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import EventPrintTemplate from '@/components/pdf/EventPrintTemplate';

interface DraggableImageProps {
  image: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const DraggableImage: React.FC<DraggableImageProps> = ({
  image,
  onUpdate,
  onDelete,
  containerRef,
}) => {
  const [editDialog, setEditDialog] = React.useState(false);
  const [tempSize, setTempSize] = React.useState({ width: image.width, height: image.height });
  const [isDragging, setIsDragging] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);
  const startPointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number }>({ x: image.x, y: image.y });

  // Keep Atlaskit adapter minimal to avoid interfering with pointer fallback
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    return draggable({
      element,
      getInitialData: () => ({ id: image.id, type: 'image' }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [image.id]);

  const handleEdit = () => {
    setTempSize({ width: image.width, height: image.height });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    onUpdate({
      ...image,
      width: tempSize.width,
      height: tempSize.height,
    });
    setEditDialog(false);
  };

  // Robust fallback using Pointer Events for drag when adapter isn't active
  React.useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let containerRect: DOMRect | null = null;
    const onPointerDown = (e: PointerEvent) => {
      // Only left button or touch/pen
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      setIsDragging(true);
      el.setPointerCapture?.(e.pointerId);
      containerRect = containerRef.current?.getBoundingClientRect() || null;
      const baseLeft = containerRect ? containerRect.left : 0;
      const baseTop = containerRect ? containerRect.top : 0;
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startPosRef.current = { x: image.x || 0, y: image.y || 0 };
      offsetX = e.clientX - (baseLeft + (image.x || 0));
      offsetY = e.clientY - (baseTop + (image.y || 0));
      (el.style as any).cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const baseLeft = containerRect ? containerRect.left : 0;
      const baseTop = containerRect ? containerRect.top : 0;
      let x = e.clientX - baseLeft - offsetX;
      let y = e.clientY - baseTop - offsetY;
      // Clamp to container
      const w = containerRect?.width ?? Infinity;
      const h = containerRect?.height ?? Infinity;
      x = Math.max(0, Math.min(x, w - (image.width || 0)));
      y = Math.max(0, Math.min(y, h - (image.height || 0)));
      // Update visually only to avoid frequent re-renders
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      setIsDragging(false);
      (el.style as any).cursor = 'grab';
      el.releasePointerCapture?.(e.pointerId);
      // Commit position
      const left = parseFloat(el.style.left || '0');
      const top = parseFloat(el.style.top || '0');
      onUpdate({ ...image, x: left, y: top });
    };
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // do not depend on image.x/y to keep handlers stable during drag
    // Note: we intentionally avoid depending on `image` here to keep dragging smooth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdate, containerRef]);

  return (
    <>
      <div
        ref={elementRef}
        style={{
          position: 'absolute',
          left: image.x,
          top: image.y,
          width: image.width,
          height: image.height,
          cursor: 'grab',
          border: '2px dashed transparent',
          opacity: isDragging ? 0.5 : 1,
          touchAction: 'none',
        }}
        onDoubleClick={handleEdit}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.border = '2px dashed #1976d2';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.border = '2px dashed transparent';
        }}
      >
        <Box
          component="img"
          src={image.src}
          alt={image.title}
          draggable={false}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Controls overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: -35,
            right: 0,
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover, .image-container:hover &': {
              opacity: 1,
            },
          }}
          className="image-controls"
        >
          <Tooltip title="Redimensionner">
            <IconButton size="small" onClick={handleEdit} sx={{ bgcolor: 'white', boxShadow: 1 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={onDelete} sx={{ bgcolor: 'white', boxShadow: 1 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: -20,
            left: 0,
            right: 0,
            textAlign: 'center',
            bgcolor: 'rgba(255,255,255,0.9)',
            px: 1,
            borderRadius: 0.5,
            fontSize: 10,
          }}
        >
          {image.title}
        </Typography>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
        <DialogTitle>Redimensionner l'image</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Largeur: {tempSize.width}px
            </Typography>
            <Slider
              value={tempSize.width}
              onChange={(_, value) => setTempSize((prev) => ({ ...prev, width: value as number }))}
              min={100}
              max={800}
              step={10}
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Hauteur: {tempSize.height}px
            </Typography>
            <Slider
              value={tempSize.height}
              onChange={(_, value) => setTempSize((prev) => ({ ...prev, height: value as number }))}
              min={100}
              max={1000}
              step={10}
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button size="small" onClick={() => setTempSize({ width: 200, height: 150 })}>
              Petit
            </Button>
            <Button size="small" onClick={() => setTempSize({ width: 400, height: 300 })}>
              Moyen
            </Button>
            <Button size="small" onClick={() => setTempSize({ width: 600, height: 450 })}>
              Grand
            </Button>
            <Button size="small" onClick={() => setTempSize({ width: 750, height: 600 })}>
              Très Grand
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface PageCanvasProps {
  page: any;
  onUpdateImages: (images: any[]) => void;
  onDeletePage: () => void;
  excludeUrls?: string[];
  salleMap?: Record<number, string>;
  classMap?: Record<number, string>;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  page,
  onUpdateImages,
  onDeletePage,
  excludeUrls,
  salleMap = {},
  classMap = {},
}) => {
  const [isOver, setIsOver] = React.useState(false);
  const dropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = dropRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({ source, location }) => {
        setIsOver(false);
        const data = source.data;
        const dropTargetRect = element.getBoundingClientRect();
        // Pragmatic DnD may provide different pointer types; normalize coords
        const input: any = location.current.input as any;
        const clientX = input?.clientX ?? input?.pageX ?? 0;
        const clientY = input?.clientY ?? input?.pageY ?? 0;
        // Position relative to the drop container
        let dropX = clientX - dropTargetRect.left;
        let dropY = clientY - dropTargetRect.top;
        // Clamp within bounds
        dropX = Math.max(0, Math.min(dropX, dropTargetRect.width));
        dropY = Math.max(0, Math.min(dropY, dropTargetRect.height));

        if (data && data.id) {
          // Move image to new position
          const updatedImages = page.images.map((img: any) =>
            img.id === data.id ? { ...img, x: dropX, y: dropY, page: page.id } : img,
          );
          onUpdateImages(updatedImages);
        }
      },
    });
  }, [page.id, page.images, onUpdateImages]);

  const handleUpdateImage = (imageId: string, updates: any) => {
    const updatedImages = page.images.map((img: any) => (img.id === imageId ? updates : img));
    onUpdateImages(updatedImages);
  };

  const handleDeleteImage = (imageId: string) => {
    const updatedImages = page.images.filter((img: any) => img.id !== imageId);
    onUpdateImages(updatedImages);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 3,
        position: 'relative',
        minHeight: 0,
        bgcolor: isOver ? 'action.hover' : 'white',
        border: isOver ? '2px dashed #1976d2' : '1px solid #e0e0e0',
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">{page.title}</Typography>

        {page.editable && page.id !== 'main' && (
          <Tooltip title="Supprimer la page">
            <IconButton size="small" onClick={onDeletePage}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Page Content */}
      <Box
        ref={dropRef}
        sx={{
          position: 'relative',
          width: '210mm',
          ...(page.type === 'images'
            ? { height: '297mm', overflow: 'hidden' }
            : { minHeight: '297mm', height: 'auto', overflow: 'visible' }),
          bgcolor: 'white',
          mx: 'auto',
          p: page.type === 'content' ? 0 : 0,
        }}
        className="image-container"
      >
        {page.type === 'content' && (
          <EventPrintTemplate
            event={page.content}
            salleMap={salleMap}
            classMap={classMap}
            baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
            hideDocuments={false}
            docExcludeUrls={excludeUrls || []}
            showNonImagePlaceholders={false}
            docImageStyles={(() => {
              const styles: Record<string, { width?: number | string; height?: number | string }> =
                {};
              (page.images || []).forEach((img: any) => {
                if (!img?.src) return;
                if (img.customSize) {
                  styles[String(img.src)] = {
                    width: img.width,
                    height: img.height,
                  };
                }
              });
              return styles;
            })()}
            bare
          />
        )}

        {/* Only render draggable overlays on non-content pages */}
        {page.type !== 'content' &&
          page.images &&
          page.images.map((image: any) => (
            <DraggableImage
              key={image.id}
              image={image}
              onUpdate={(updates) => handleUpdateImage(image.id, updates)}
              onDelete={() => handleDeleteImage(image.id)}
              containerRef={dropRef}
            />
          ))}

        {isOver && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Déplacez l'image ici
          </Box>
        )}
      </Box>
    </Paper>
  );
};

interface PdfPreviewEditorProps {
  pages: any[];
  onUpdateImages: (pageId: string, images: any[]) => void;
  onDeletePage: (pageId: string) => void;
  // Sidebar ordering of pages and pdf attachments
  sequence?: Array<{ type: 'page' | 'pdf'; id: string } & any>;
  onReorderSequence?: (next: Array<{ type: 'page' | 'pdf'; id: string } & any>) => void;
  pdfDocs?: any[];
  imageDocs?: any[];
  onToggleImagePresence?: (doc: any, present: boolean) => void;
  salleMap?: Record<number, string>;
  classMap?: Record<number, string>;
}

const PdfPreviewEditor: React.FC<PdfPreviewEditorProps> = ({
  pages,
  onUpdateImages,
  onDeletePage,
  sequence = [],
  onReorderSequence,
  pdfDocs = [],
  imageDocs = [],
  onToggleImagePresence,
  salleMap = {},
  classMap = {},
}) => {
  // local reorder via native HTML5 drag
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const handleDragStart = (idx: number) => () => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex === null || !onReorderSequence) return;
    if (dragIndex === idx) return;
    const next = [...sequence];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    onReorderSequence(next);
    setDragIndex(null);
  };

  const renderThumb = (item: any, idx: number) => {
    const isPage = item.type === 'page';
    const page = isPage ? pages.find((p) => p.id === item.id) : null;
    const doc = !isPage ? pdfDocs.find((d) => String(d.id) === String(item.id)) : null;
    return (
      <Paper
        key={`${item.type}-${item.id}`}
        elevation={dragIndex === idx ? 6 : 1}
        sx={{
          p: 1,
          mb: 1,
          cursor: 'grab',
          borderLeft: `4px solid ${isPage ? '#1976d2' : '#8e24aa'}`,
        }}
        draggable
        onDragStart={handleDragStart(idx)}
        onDragOver={handleDragOver}
        onDrop={handleDrop(idx)}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {isPage ? 'Page' : 'PDF'}
        </Typography>
        <Typography variant="body2" noWrap>
          {isPage ? page?.title || page?.id : doc?.fileName || 'Document PDF'}
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Sidebar order panel */}
      <Box
        sx={{
          width: 260,
          flex: '0 0 260px',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          maxHeight: '100vh',
          overflow: 'auto',
          pt: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Ordre des pages et PDF
        </Typography>
        <Box>{sequence.map((item, idx) => renderThumb(item, idx))}</Box>

        {/* Images presence section */}
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
          Images présentes
        </Typography>
        <Box>
          {imageDocs.map((doc) => {
            const main = pages.find((p) => p.id === 'main');
            const present =
              !!main &&
              (main.images || []).some(
                (img: any) => String(img.src) === String(doc.fileUrl || doc.url),
              );
            return (
              <Paper key={String(doc.id || doc.fileUrl || doc.fileName)} sx={{ p: 1, mb: 1 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" noWrap sx={{ mr: 1 }}>
                    {doc.fileName || 'Image'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Supprimer de la composition">
                      <span>
                        <IconButton
                          size="small"
                          color={present ? 'error' : 'default'}
                          disabled={!present}
                          onClick={() => onToggleImagePresence && onToggleImagePresence(doc, false)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Ajouter à la composition">
                      <span>
                        <IconButton
                          size="small"
                          color={!present ? 'primary' : 'default'}
                          disabled={present}
                          onClick={() => onToggleImagePresence && onToggleImagePresence(doc, true)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
                {present && (
                  <Box
                    sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}
                  >
                    <Typography variant="caption" sx={{ minWidth: 70 }}>
                      Largeur
                    </Typography>
                    <Slider
                      size="small"
                      sx={{ width: 150 }}
                      min={30}
                      max={120}
                      step={5}
                      value={(() => {
                        const url = String(doc.fileUrl || doc.url);
                        const mainPage = pages.find((p) => p.id === 'main');
                        const img = (mainPage?.images || []).find(
                          (i: any) => String(i.src) === url,
                        );
                        const w = img?.width;
                        if (typeof w === 'string' && w.endsWith('%')) return parseFloat(w);
                        // default 100% display value if no explicit percentage
                        return 100;
                      })()}
                      onChange={(_, value) => {
                        const percent = value as number;
                        const url = String(doc.fileUrl || doc.url);
                        const mainPage = pages.find((p) => p.id === 'main');
                        if (!mainPage) return;
                        const nextImgs = (mainPage.images || []).map((img: any) =>
                          String(img.src) === url
                            ? { ...img, customSize: true, width: `${percent}%`, height: undefined }
                            : img,
                        );
                        onUpdateImages('main', nextImgs);
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        // set full width
                        const url = String(doc.fileUrl || doc.url);
                        const mainPage = pages.find((p) => p.id === 'main');
                        if (!mainPage) return;
                        const nextImgs = (mainPage.images || []).map((img: any) =>
                          String(img.src) === url
                            ? { ...img, customSize: true, width: '100%', height: undefined }
                            : img,
                        );
                        onUpdateImages('main', nextImgs);
                      }}
                    >
                      Pleine largeur
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        // reset size
                        const url = String(doc.fileUrl || doc.url);
                        const mainPage = pages.find((p) => p.id === 'main');
                        if (!mainPage) return;
                        const nextImgs = (mainPage.images || []).map((img: any) =>
                          String(img.src) === url
                            ? { ...img, customSize: false, width: undefined, height: undefined }
                            : img,
                        );
                        onUpdateImages('main', nextImgs);
                      }}
                    >
                      Taille d'origine
                    </Button>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* Main preview */}
      <Box sx={{ flex: 1, maxWidth: 860, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Prévisualisation et édition du PDF
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Vous pouvez redimensionner et déplacer les images sur les pages. Double-cliquez pour
          redimensionner.
        </Typography>

        {pages.map((page) => (
          <PageCanvas
            key={page.id}
            page={page}
            onUpdateImages={(images) => onUpdateImages(page.id, images)}
            onDeletePage={() => onDeletePage(page.id)}
            excludeUrls={(() => {
              // Exclude images that are NOT present on the main content page
              const main = pages.find((p) => p.id === 'main');
              const present = new Set<string>();
              (main?.images || []).forEach((img: any) => present.add(String(img.src)));
              const allImageDocUrls = (imageDocs || []).map((d: any) => String(d.fileUrl || d.url));
              return allImageDocUrls.filter((u: string) => !present.has(u));
            })()}
            salleMap={salleMap}
            classMap={classMap}
          />
        ))}
      </Box>
    </Box>
  );
};

export default PdfPreviewEditor;
