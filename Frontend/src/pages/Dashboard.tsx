import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { LocalDrink, Pets, People, Assignment, AccessTime } from '@mui/icons-material';
import DisplayNumber from '../components/DisplayNumber';
import dayjs from 'dayjs';

const StatRow = ({ title, value, icon, color }: any) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    py: { xs: 1, sm: 2 }, 
    borderBottom: '1px solid #f0f0f0',
    gap: { xs: 0.5, sm: 1 }
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, textAlign: 'center' }}>
      <Box sx={{ color: color, display: 'flex', p: { xs: 0.5, sm: 1 }, backgroundColor: `${color}15`, borderRadius: '50%' }}>
        {icon}
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '1rem' }, lineHeight: 1.2 }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="subtitle1" color="textPrimary" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.4rem' }, mt: { xs: 0.5, sm: 1 } }}>
      {value}
    </Typography>
  </Box>
);

const getGujaratiDay = (dayIndex: number, lang: string) => {
  if (!lang.startsWith('gu')) return dayjs().day(dayIndex).format('dddd');
  const days = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
  return days[dayIndex];
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(dayjs());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await axiosClient.get('/dashboard/');
      return response.data;
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  });

  if (isLoading) return <MainLayout title={t('menu.dashboard')}><Typography>{t('milk.loading')}</Typography></MainLayout>;
  if (error) return <MainLayout title={t('menu.dashboard')}><Typography color="error">Error loading stats</Typography></MainLayout>;

  return (
    <MainLayout title={t('menu.dashboard')}>
      {/* Clock Banner (Day | Date | Time) */}
      <Card sx={{ mb: 1, background: '#ffffff', border: '1px solid #ffcc80', boxShadow: '0px 2px 4px rgba(245, 124, 0, 0.1)', borderRadius: 2 }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: { xs: '1rem', sm: '1.6rem' } }}>
              {getGujaratiDay(now.day(), i18n.language)}
            </Typography>
            <Typography sx={{ fontWeight: 900, color: '#f57c00', fontSize: { xs: '1.1rem', sm: '1.8rem' } }}>
              <DisplayNumber value={now.format('DD-MM-YYYY')} />
            </Typography>
            <Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: { xs: '1rem', sm: '1.6rem' } }}>
              <DisplayNumber value={now.format('hh:mm:ss')} /> {now.format('A')}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Milking Cows Banner */}
      <Card sx={{ mb: 1, textAlign: 'center', background: '#ffffff', borderRadius: 2 }}>
        <CardContent sx={{ py: 0.5, '&:last-child': { pb: 0.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Typography color="textSecondary" variant="overline" sx={{ fontSize: { xs: '1rem', sm: '1.4rem' }, lineHeight: 1, mt: 0.5 }}>
              {t('dashboard.milkingCows')} :
            </Typography>
            <Pets sx={{ color: '#d32f2f', fontSize: { xs: 28, sm: 36 } }} />
            <Typography variant="h4" color="textPrimary" sx={{ fontWeight: 'bold', fontSize: { xs: '2rem', sm: '2.5rem' }, lineHeight: 1 }}>
              <DisplayNumber value={data.milking_cows} />
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Side-by-side Shift Stats */}
      <Grid container spacing={2}>
        {/* Morning Shift */}
        <Grid item xs={6}>
          <Card sx={{ height: '100%', borderTop: '4px solid #2e7d32' }}>
            <CardContent sx={{ p: { xs: 1, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 3 } } }}>
              <Typography variant="subtitle2" align="center" sx={{ color: '#2e7d32', mb: { xs: 1, sm: 3 }, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.6rem' } }}>
                {t('dashboard.morningMilk')}
              </Typography>
              
              <StatRow title={t('dashboard.morningMilk')} value={<><DisplayNumber value={data.morning_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#2e7d32" />
              <StatRow title={t('dashboard.morningGowal')} value={<><DisplayNumber value={data.morning_gowal_milk?.toFixed(3)} /> L</>} icon={<Pets sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#d32f2f" />
              <StatRow title={t('dashboard.morningRemaining')} value={<><DisplayNumber value={data.morning_remaining_milk?.toFixed(3)} /> L</>} icon={<Assignment sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#1976d2" />
              <StatRow title={t('dashboard.morningMembers')} value={<DisplayNumber value={data.morning_members} />} icon={<People sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#009688" />
              <StatRow title={t('dashboard.morningPerMember')} value={<><DisplayNumber value={data.morning_milk_per_member?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#9c27b0" />
            </CardContent>
          </Card>
        </Grid>

        {/* Evening Shift */}
        <Grid item xs={6}>
          <Card sx={{ height: '100%', borderTop: '4px solid #f9a825' }}>
            <CardContent sx={{ p: { xs: 1, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 3 } } }}>
              <Typography variant="subtitle2" align="center" sx={{ color: '#f57f17', mb: { xs: 1, sm: 3 }, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.6rem' } }}>
                {t('dashboard.eveningMilk')}
              </Typography>

              <StatRow title={t('dashboard.eveningMilk')} value={<><DisplayNumber value={data.evening_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#f9a825" />
              <StatRow title={t('dashboard.eveningGowal')} value={<><DisplayNumber value={data.evening_gowal_milk?.toFixed(3)} /> L</>} icon={<Pets sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#d32f2f" />
              <StatRow title={t('dashboard.eveningRemaining')} value={<><DisplayNumber value={data.evening_remaining_milk?.toFixed(3)} /> L</>} icon={<Assignment sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#1976d2" />
              <StatRow title={t('dashboard.eveningMembers')} value={<DisplayNumber value={data.evening_members} />} icon={<People sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#009688" />
              <StatRow title={t('dashboard.eveningPerMember')} value={<><DisplayNumber value={data.evening_milk_per_member?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 24 } }} />} color="#9c27b0" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
};

export default Dashboard;
