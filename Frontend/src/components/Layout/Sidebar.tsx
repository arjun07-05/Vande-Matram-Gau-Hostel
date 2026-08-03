import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Box, Typography, IconButton } from '@mui/material';
import { Dashboard, Pets, LocalDrink, People, Assignment, Settings, Logout, Close } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    { text: t('menu.dashboard'), icon: <Dashboard />, path: '/' },
    { text: t('menu.milk'), icon: <LocalDrink />, path: '/milk' },
    { text: t('menu.cows'), icon: <Pets />, path: '/cows' },
    { text: t('menu.members'), icon: <People />, path: '/members' },
    { text: t('menu.distribution'), icon: <LocalDrink />, path: '/distribution' },
    { text: t('menu.reports'), icon: <Assignment />, path: '/reports' },
    { text: t('menu.settings'), icon: <Settings />, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        '& .MuiDrawer-paper': { 
          width: drawerWidth, 
          boxSizing: 'border-box', 
          backgroundColor: '#ffffff', 
          color: '#333333' 
        },
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
          {t('app.title')}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#333' }}>
          <Close />
        </IconButton>
      </Toolbar>
      <Box sx={{ 
        overflowY: 'auto', 
        mt: 2,
        '&::-webkit-scrollbar': { display: 'none' }, 
        msOverflowStyle: 'none', 
        scrollbarWidth: 'none'
      }}>
        <List>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem 
                button 
                key={item.text} 
                onClick={() => handleNavigate(item.path)}
                sx={{
                  backgroundColor: isActive ? 'rgba(245, 124, 0, 0.1)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(245, 124, 0, 0.05)' },
                  my: 0.5, mx: 1, borderRadius: 1
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#f57c00' : '#666' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ color: isActive ? '#f57c00' : '#333', fontWeight: isActive ? 'bold' : 'normal' }} />
              </ListItem>
            );
          })}
        </List>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <List sx={{ mb: 2 }}>
        <ListItem>
          <Box>
            <Typography variant="body2" sx={{ color: '#666' }}>Logged in as</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#333' }}>{user?.name}</Typography>
          </Box>
        </ListItem>
        <ListItem button onClick={handleLogout} sx={{ '&:hover': { backgroundColor: 'rgba(255,0,0,0.05)' }, mx: 1, borderRadius: 1 }}>
          <ListItemIcon sx={{ color: '#ef5350' }}><Logout /></ListItemIcon>
          <ListItemText primary={t('menu.logout')} sx={{ color: '#ef5350' }} />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
