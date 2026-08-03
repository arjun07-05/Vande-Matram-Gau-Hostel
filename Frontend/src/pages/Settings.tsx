import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Box, MenuItem, Alert } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, getValues } = useForm();
  const [success, setSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/');
      return res.data;
    }
  });

  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        morning_gowal_milk: parseFloat(settings.morning_gowal_milk || 0).toFixed(3),
        evening_gowal_milk: parseFloat(settings.evening_gowal_milk || 0).toFixed(3)
      });
    }
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append('morning_gowal_milk', data.morning_gowal_milk);
      formData.append('evening_gowal_milk', data.evening_gowal_milk);
      formData.append('unit', data.unit);
      formData.append('member_mode', data.member_mode);
      // Skip logo for now to keep it simple
      return axiosClient.put('/settings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const handleBlur = (field: string) => {
    const val = getValues(field);
    if (val !== undefined && val !== '') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setValue(field, parsed.toFixed(3));
      }
    }
  };

  if (isLoading) return <MainLayout title={t('settings.title')}><Typography>{t('milk.loading')}</Typography></MainLayout>;

  return (
    <MainLayout title={t('settings.title')}>
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: { xs: 1, sm: 4 }, borderRadius: { xs: 0, sm: 2 }, boxShadow: { xs: 'none', sm: '0 2px 10px rgba(0,0,0,0.1)' } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{t('settings.general')}</Typography>
          
          {success && <Alert severity="success" sx={{ mb: 2 }}>{t('settings.success')}</Alert>}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField 
              fullWidth 
              type="number" 
              label={t('settings.morningGowalMilk', 'સવારનું ગોવાળનું દૂધ')} 
              margin="normal" 
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: "0.001", readOnly: !isAdmin }}
              {...register('morning_gowal_milk')} 
              onBlur={(e) => {
                register('morning_gowal_milk').onBlur(e);
                handleBlur('morning_gowal_milk');
              }}
            />

            <TextField 
              fullWidth 
              type="number" 
              label={t('settings.eveningGowalMilk', 'સાંજનું ગોવાળનું દૂધ')} 
              margin="normal" 
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: "0.001", readOnly: !isAdmin }}
              {...register('evening_gowal_milk')} 
              onBlur={(e) => {
                register('evening_gowal_milk').onBlur(e);
                handleBlur('evening_gowal_milk');
              }}
            />
            
            {isAdmin && (
              <Box sx={{ mt: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1.2, sm: 1 } }}>
                  {t('settings.save')}
                </Button>
              </Box>
            )}
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Settings;
