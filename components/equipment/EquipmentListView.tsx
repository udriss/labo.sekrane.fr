import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Slider,
  Tooltip
} from "@mui/material";
import { Edit, Delete, Room as RoomIcon, HomeFilled } from "@mui/icons-material";

interface EquipmentListViewProps {
  items: any[];
  quantityValues: {[key: string]: number};
  onQuantityChange: (equipmentId: string, newValue: number) => void;
  onQuantityCommitted: (equipmentId: string, newValue: number) => void;
  onEditEquipment: (equipment: any) => void;
  onDeleteEquipment: (equipment: any) => void;
  getTypeLabel: (type: string) => string;
}

export const EquipmentListView = ({
  items,
  quantityValues,
  onQuantityChange,
  onQuantityCommitted,
  onEditEquipment,
  onDeleteEquipment,
  getTypeLabel
}: EquipmentListViewProps) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Volume</TableCell>
            <TableCell>Quantité</TableCell>
            <TableCell>Localisation</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const currentQuantity = quantityValues[item.id] ?? item.quantity;
            const maxQuantity = Math.max(currentQuantity * 2, 10);
            const displayName = item.volume ? `${item.name} ${item.volume}` : item.name;

            return (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1">{displayName}</Typography>
                    {item.isCustom && (
                      <Chip 
                        label={`👤 ${item.createdBy || 'Personnalisé'}`}
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', mt: 0.5 }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{getTypeLabel(item.type)}</TableCell>
                <TableCell>{item.volume || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ width: 120 }}>
                    <Typography variant="body2" gutterBottom>
                      {currentQuantity}
                    </Typography>
                    <Slider
                      value={currentQuantity}
                      onChange={(_, newValue) => onQuantityChange(item.id, newValue as number)}
                      onChangeCommitted={(_, newValue) => onQuantityCommitted(item.id, newValue as number)}
                      min={0}
                      max={maxQuantity}
                      step={1}
                      size="small"
                      sx={{
                        color: currentQuantity === 0 ? 'error.main' : 'primary.main'
                      }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  {item.room && (
                    <Typography variant="body2">
                      <HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.room}
                      {item.location && <><br /><RoomIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.location}</>}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.status || 'Disponible'} 
                    color="success" 
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => onEditEquipment(item)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={() => onDeleteEquipment(item)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
