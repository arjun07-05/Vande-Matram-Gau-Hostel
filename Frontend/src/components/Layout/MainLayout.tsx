import React, { useState } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Container, Button, IconButton } from '@mui/material';
import { Translate, Menu as MenuIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';

const MainLayout: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => {
  const { i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'gu' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#ffffff', color: '#333', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        
        {/* MOBILE & TABLET VIEW (xs, sm) - 2 Rows */}
        <Toolbar sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', py: 1, width: '100%', gap: 1, minHeight: 'auto' }}>
          {/* Row 1: Title - Logo - Lang */}
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
              <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                {title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Box component="img" src="/logo.jpg" alt="KBH Logo" sx={{ height: 28, width: 'auto', objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flex: 1 }}>
              <IconButton color="primary" onClick={toggleLanguage} size="small">
                <Translate fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {/* Row 2: Cow - Vande Mataram */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box component="img" src="/cow_icon.jpg" alt="Cow Icon" sx={{ height: 28, width: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 4px rgba(245, 124, 0, 0.3)' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
            <Typography variant="subtitle1" noWrap sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(45deg, #e65100 30%, #ff9800 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px'
            }}>
              વંદે માતરમ્ ગૌ હોસ્ટેલ
            </Typography>
          </Box>
        </Toolbar>

        {/* PC VIEW (md, lg, xl) - 1 Row */}
        <Toolbar sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', minHeight: 64, width: '100%' }}>
          {/* Left: Menu & Page Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
                {title}
              </Typography>
              <Box component="img" src="/logo.jpg" alt="KBH Logo" sx={{ height: 40, width: 'auto', objectFit: 'contain' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
            </Box>
          </Box>

          {/* Center: Vande Mataram Gau Hostel */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
            <Box component="img" src="/cow_icon.jpg" alt="Cow Icon" sx={{ height: 40, width: 40, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px rgba(245, 124, 0, 0.3)' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
            <Typography variant="h6" noWrap sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(45deg, #e65100 30%, #ff9800 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.6rem',
              letterSpacing: '0.5px'
            }}>
              વંદે માતરમ્ ગૌ હોસ્ટેલ
            </Typography>
          </Box>
          
          {/* Right: Language Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 250 }}>
            <IconButton color="primary" onClick={toggleLanguage} title={i18n.language.startsWith('en') ? 'ગુજરાતીમાં બદલો' : 'Change to English'}>
              <Translate />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 1, sm: 3 },
        backgroundColor: '#f4f6f8', 
        minHeight: '100vh', 
        pt: { xs: 14, sm: 15, md: 10 }, 
        width: '100%' 
      }}>
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 1, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
