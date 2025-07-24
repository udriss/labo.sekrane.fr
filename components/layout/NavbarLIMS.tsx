import { useState } from 'react';
import { 
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Avatar, 
  Menu, MenuItem, Divider, ListItemIcon, Tooltip, InputBase,
  alpha, styled
} from '@mui/material';
import { 
  Menu as MenuIcon, Notifications, Brightness4, Brightness7, 
  AccountCircle, Logout, Settings, Search as SearchIcon, Science,
  ExpandMore, Person
} from '@mui/icons-material';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppSettings } from '@/app/layout';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

interface NavbarLIMSProps {
  onMenuClick: () => void;
  onThemeToggle: () => void;
}

export function NavbarLIMS({ onMenuClick, onThemeToggle }: NavbarLIMSProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme } = useAppSettings();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNotificationAnchor(null);
  };

  const notifications = [
    { id: 1, message: "Stock faible: Acide sulfurique", type: "warning" },
    { id: 2, message: "TP programmé demain à 14h", type: "info" },
    { id: 3, message: "Maintenance équipement terminée", type: "success" },
  ];

  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        bgcolor: 'background.paper', 
        borderBottom: 1, 
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        backgroundColor: alpha(theme === 'dark' ? '#121212' : '#ffffff', 0.8),
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Science sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.primary' }}>
          LIMS
        </Typography>

        <Search sx={{ display: { xs: 'none', md: 'block' } }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Rechercher…"
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Changer de thème">
            <IconButton onClick={onThemeToggle} color="inherit">
              {theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationMenu}>
              <Badge badgeContent={notifications.length} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profil">
            <IconButton onClick={handleProfileMenu} sx={{ p: 0, ml: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                {session?.user?.name?.[0] || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Menu Profil */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {session?.user?.name || 'Utilisateur'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {session?.user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { handleClose(); router.push('/profile'); }}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Mon Profil
          </MenuItem>
          <MenuItem onClick={() => { handleClose(); router.push('/settings'); }}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Paramètres
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { handleClose(); signOut(); }}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Déconnexion
          </MenuItem>
        </Menu>

        {/* Menu Notifications */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          <Divider />
          {notifications.map((notif) => (
            <MenuItem key={notif.id} sx={{ py: 2 }}>
              <Typography variant="body2">{notif.message}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}