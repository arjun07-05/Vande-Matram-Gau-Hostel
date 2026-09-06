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
        evening_gowal_milk: parseFloat(settings.evening_gowal_milk || 0).toFixed(3),
        morning_other_milk: parseFloat(settings.morning_other_milk || 0).toFixed(3),
        evening_other_milk: parseFloat(settings.evening_other_milk || 0).toFixed(3)
      });
    }
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append('morning_gowal_milk', data.morning_gowal_milk || '0.000');
      formData.append('evening_gowal_milk', data.evening_gowal_milk || '0.000');
      formData.append('morning_other_milk', data.morning_other_milk || '0.000');
      formData.append('evening_other_milk', data.evening_other_milk || '0.000');
      formData.append('unit', data.unit || 'Liter');
      formData.append('member_mode', data.member_mode || 'Automatic');
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
      <Card sx={{ maxWidth: 650, mx: 'auto', mt: { xs: 1, sm: 4 }, borderRadius: { xs: 0, sm: 2 }, boxShadow: { xs: 'none', sm: '0 2px 10px rgba(0,0,0,0.1)' } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' }, fontWeight: 'bold' }}>
            {t('settings.general')}
          </Typography>

          {success && <Alert severity="success" sx={{ mb: 2 }}>{t('settings.success')}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Section 1: Gowal Milk */}
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 'bold', mt: 1, mb: 0.5 }}>
              ૧. ગોવાળનું દૂધ (Gowal Milk Deductions)
            </Typography>

            <TextField
              fullWidth
              type="number"
              label={t('settings.morningGowalMilk', 'સવારનું ગોવાળનું દૂધ (Morning Gowal Milk)')}
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
              label={t('settings.eveningGowalMilk', 'સાંજનું ગોવાળનું દૂધ (Evening Gowal Milk)')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: "0.001", readOnly: !isAdmin }}
              {...register('evening_gowal_milk')}
              onBlur={(e) => {
                register('evening_gowal_milk').onBlur(e);
                handleBlur('evening_gowal_milk');
              }}
            />

            {/* Section 2: Other Milk Deduction / Sideout */}
            <Typography variant="subtitle2" sx={{ color: '#ea580c', fontWeight: 'bold', mt: 2.5, mb: 0.5 }}>
              ૨. અન્ય બાદબાકી / સાઈડ-આઉટ દૂધ (Other Milk Deduction / Side-out)
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              કુલ દૂધમાંથી જો કોઈ અન્ય ઉપયોગ માટે દૂધ અલગ કાઢવાનું/બાદ કરવાનું હોય (Side-out) તો તે અહીં લખો (જો ખાલી અથવા ૦ હશે તો સામાન્ય ગણતરી થશે).
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="સવારનું અન્ય બાદબાકીનું દૂધ (Morning Other Deduction - Before 12 PM)"
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: "0.001", readOnly: !isAdmin }}
              {...register('morning_other_milk')}
              onBlur={(e) => {
                register('morning_other_milk').onBlur(e);
                handleBlur('morning_other_milk');
              }}
            />

            <TextField
              fullWidth
              type="number"
              label="સાંજનું અન્ય બાદબાકીનું દૂધ (Evening Other Deduction - After 12 PM)"
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: "0.001", readOnly: !isAdmin }}
              {...register('evening_other_milk')}
              onBlur={(e) => {
                register('evening_other_milk').onBlur(e);
                handleBlur('evening_other_milk');
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
