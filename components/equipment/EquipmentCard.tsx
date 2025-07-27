import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Slider,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Edit, Delete, Room } from "@mui/icons-material";

interface EquipmentCardProps {
  item: any;
  quantityValues: {[key: string]: number};
  animatingQuantities: Set<string>;
  updatingCards: Set<string>;
  deletingItems: Set<string>;
  onQuantityChange: (equipmentId: string, newValue: number) => void;
  onQuantityCommitted: (equipmentId: string, newValue: number) => void;
  onEditEquipment: (equipment: any) => void;
  onDeleteEquipment: (equipment: any) => void;
  getTypeLabel: (type: string) => string;
  isCustomItem?: boolean;
}

export const EquipmentCard = ({
  item,
  quantityValues,
  animatingQuantities,
  updatingCards,
  deletingItems,
  onQuantityChange,
  onQuantityCommitted,
  onEditEquipment,
  onDeleteEquipment,
  getTypeLabel,
  isCustomItem = false
}: EquipmentCardProps) => {
  const currentQuantity = quantityValues[item.id] ?? item.quantity;
  const maxQuantity = Math.max(currentQuantity * 2, 10);
  const isUpdating = updatingCards.has(item.id);
  const isDeleting = deletingItems.has(item.id);

  // Affichage du nom concaténé avec le volume si présent
  const displayName = item.volume ? `${item.name} ${item.volume}` : item.name;

  return (
    <Card sx={{ 
      height: '100%', 
      position: 'relative',
      opacity: isUpdating || isDeleting ? 0.5 : 1,
      transform: isDeleting ? 'scale(0.9)' : 'scale(1)',
      transition: 'all 0.5s ease-in-out',
      border: isDeleting ? '2px solid' : '1px solid',
      borderColor: isDeleting ? 'error.main' : 'divider'
    }}>
      {/* Overlay avec spinner pendant la mise à jour ou suppression */}
      {(isUpdating || isDeleting) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 1
          }}
        >
          <CircularProgress size={24} color={isDeleting ? "error" : "primary"} />
        </Box>
      )}

      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6">{displayName}</Typography>
          {isCustomItem && (
            <Chip 
              label={`👤 ${item.createdBy || 'Personnalisé'}`}
              size="small" 
              color="secondary" 
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Typography color="text.secondary">
          Type: {getTypeLabel(item.type)}
        </Typography>

        {/* Slider de quantité */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{
              fontWeight: animatingQuantities.has(item.id) ? 'bold' : 'normal',
              fontSize: animatingQuantities.has(item.id) ? '1.1rem' : '0.875rem',
              color: animatingQuantities.has(item.id) ? 'success.main' : 'text.secondary',
              transition: 'all 0.3s ease-in-out',
              transform: animatingQuantities.has(item.id) ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            Quantité: {currentQuantity}
          </Typography>
          <Slider
            value={currentQuantity}
            onChange={(_, newValue) => onQuantityChange(item.id, newValue as number)}
            onChangeCommitted={(_, newValue) => onQuantityCommitted(item.id, newValue as number)}
            min={0}
            max={maxQuantity}
            step={1}
            size="small"
            valueLabelDisplay="auto"
            sx={{
              color: currentQuantity === 0 ? 'error.main' : 'primary.main'
            }}
          />
        </Box>

        {item.location && (
          <Typography color="text.secondary">
            <Room sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.location}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip 
            label={item.status || 'Disponible'} 
            color="success" 
            size="small"
          />
          <Box>
            <Tooltip title="Modifier">
              <IconButton
                size="small"
                onClick={() => onEditEquipment(item)}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Supprimer">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDeleteEquipment(item)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
