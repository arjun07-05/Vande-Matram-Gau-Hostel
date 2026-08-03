import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);

      const response = await axiosClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      await login(response.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f4f6f8',
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('/login_bg.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      p: 2,
      position: 'relative'
    }}>

      
      {/* Top Right Logo (KBH) */}
      <Box 
        component="img" 
        src="/logo.jpg" 
        alt="KBH Logo" 
        sx={{ 
          position: 'absolute', 
          top: { xs: 12, sm: 24 }, 
          right: { xs: 12, sm: 32 }, 
          height: { xs: 24, sm: 45 }, 
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))'
        }} 
        onError={(e: any) => { e.target.style.display = 'none'; }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', pt: { xs: 8, sm: 0 } }}>
        <Card sx={{ 
          maxWidth: 420, 
          width: '100%', 
          p: { xs: 2, sm: 4 }, 
          borderRadius: 4, 
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)'
        }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box 
              component="img" 
              src="/cow_icon.jpg" 
              alt="Cow Icon" 
              sx={{ 
                height: 90, 
                width: 90, 
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(245, 124, 0, 0.4)',
                mb: 2,
                border: '4px solid white'
              }} 
            />
            <Typography variant="h4" sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(45deg, #e65100 30%, #ff9800 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0px 2px 4px rgba(0,0,0,0.05)',
              mb: 1
            }}>
              વંદે માતરમ્ ગૌ હોસ્ટેલ
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>
              {t('login.subtitle')}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label={t('login.email')}
              margin="normal"
              {...register('email', { required: 'Email is required' })}
              error={!!errors.email}
              helperText={errors.email?.message as string}
            />
            <TextField
              fullWidth
              label={t('login.password')}
              type="password"
              margin="normal"
              {...register('password', { required: 'Password is required' })}
              error={!!errors.password}
              helperText={errors.password?.message as string}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : t('login.submit')}
            </Button>
          </form>
        </CardContent>
        </Card>
        
        {/* Footer Text */}
        <Typography variant="subtitle1" sx={{ 
          mt: 3, 
          fontWeight: 800, 
          color: '#f57c00', // Deep orange to match theme
          background: 'linear-gradient(45deg, #ffb74d 30%, #f57c00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))', // strong shadow to pop off background
          textAlign: 'center'
        }}>
          Managed by : KBH TECHNOLOGIES PVT. LTD.
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
