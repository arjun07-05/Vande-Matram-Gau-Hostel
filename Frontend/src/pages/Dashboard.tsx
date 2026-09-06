import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { LocalDrink, Pets, People, Assignment } from '@mui/icons-material';
import DisplayNumber from '../components/DisplayNumber';
import dayjs from 'dayjs';

const StatRow = ({ title, value, icon, color }: any) => (
  <Box sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: { xs: 1.2, sm: 2 },
    py: { xs: 0.6, sm: 0.8, md: 0.9, lg: 1.1 },
    borderRadius: 1.5,
    bgcolor: '#f8fafc',
    border: '1px solid #f1f5f9',
    transition: 'all 0.2s',
    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#e2e8f0' }
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.2 } }}>
      <Box sx={{
        color: color,
        display: 'flex',
        p: { xs: 0.4, sm: 0.6 },
        backgroundColor: `${color}18`,
        borderRadius: 1.5
      }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', fontSize: { xs: '0.8rem', sm: '0.95rem', md: '1rem' }, lineHeight: 1.2 }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '0.9rem', sm: '1.15rem', md: '1.25rem' } }}>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.2, md: 1.4 }, width: '100%', maxWidth: 1400, mx: 'auto' }}>
        {/* Clock Banner (Day | Date | Time) */}
        <Card sx={{ background: '#ffffff', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(245, 124, 0, 0.08)', borderRadius: 2 }}>
          <CardContent sx={{ py: { xs: 0.8, sm: 1 }, px: { xs: 1.5, sm: 3 }, '&:last-child': { pb: { xs: 0.8, sm: 1 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: { xs: '1rem', sm: '1.4rem', md: '1.6rem' } }}>
                {getGujaratiDay(now.day(), i18n.language)}
              </Typography>
              <Typography sx={{ fontWeight: 900, color: '#ea580c', fontSize: { xs: '1.1rem', sm: '1.5rem', md: '1.75rem' } }}>
                <DisplayNumber value={now.format('DD-MM-YYYY')} />
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: { xs: '1rem', sm: '1.4rem', md: '1.6rem' } }}>
                <DisplayNumber value={now.format('hh:mm:ss')} /> {now.format('A')}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Milking Cows Banner */}
        <Card sx={{ textAlign: 'center', background: '#ffffff', borderRadius: 2, border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ py: { xs: 0.5, sm: 0.8 }, px: 2, '&:last-child': { pb: { xs: 0.5, sm: 0.8 } } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.35rem' }, fontWeight: 700, color: '#64748b' }}>
                {t('dashboard.milkingCows')} :
              </Typography>
              <Pets sx={{ color: '#dc2626', fontSize: { xs: 26, sm: 32 } }} />
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.4rem' }, color: '#991b1b', lineHeight: 1 }}>
                <DisplayNumber value={data.milking_cows} />
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Side-by-side Shift Stats */}
        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          {/* Morning Shift */}
          <Grid item xs={12} sm={6}>
            <Card sx={{ height: '100%', borderTop: '4px solid #16a34a', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
                <Typography variant="subtitle1" align="center" sx={{ color: '#15803d', mb: { xs: 0.8, sm: 1.2 }, fontWeight: 800, fontSize: { xs: '1rem', sm: '1.25rem', md: '1.35rem' } }}>
                  {t('dashboard.morningMilk')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.6, sm: 0.8, md: 1 } }}>
                  <StatRow title={t('dashboard.morningMilk')} value={<><DisplayNumber value={data.morning_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#16a34a" />
                  <StatRow title={t('dashboard.morningGowal')} value={<><DisplayNumber value={data.morning_gowal_milk?.toFixed(3)} /> L</>} icon={<Pets sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#dc2626" />
                  {data.morning_other_milk > 0 && (
                    <StatRow title="અન્ય બાદબાકી (Other Deduction)" value={<><DisplayNumber value={data.morning_other_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#ea580c" />
                  )}
                  <StatRow title={t('dashboard.morningRemaining')} value={<><DisplayNumber value={data.morning_remaining_milk?.toFixed(3)} /> L</>} icon={<Assignment sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#2563eb" />
                  <StatRow title={t('dashboard.morningMembers')} value={<DisplayNumber value={data.morning_members} />} icon={<People sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#0d9488" />
                  <StatRow title={t('dashboard.morningPerMember')} value={<><DisplayNumber value={data.morning_milk_per_member?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#9333ea" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Evening Shift */}
          <Grid item xs={12} sm={6}>
            <Card sx={{ height: '100%', borderTop: '4px solid #d97706', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
                <Typography variant="subtitle1" align="center" sx={{ color: '#b45309', mb: { xs: 0.8, sm: 1.2 }, fontWeight: 800, fontSize: { xs: '1rem', sm: '1.25rem', md: '1.35rem' } }}>
                  {t('dashboard.eveningMilk')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.6, sm: 0.8, md: 1 } }}>
                  <StatRow title={t('dashboard.eveningMilk')} value={<><DisplayNumber value={data.evening_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#d97706" />
                  <StatRow title={t('dashboard.eveningGowal')} value={<><DisplayNumber value={data.evening_gowal_milk?.toFixed(3)} /> L</>} icon={<Pets sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#dc2626" />
                  {data.evening_other_milk > 0 && (
                    <StatRow title="અન્ય બાદબાકી (Other Deduction)" value={<><DisplayNumber value={data.evening_other_milk?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#ea580c" />
                  )}
                  <StatRow title={t('dashboard.eveningRemaining')} value={<><DisplayNumber value={data.evening_remaining_milk?.toFixed(3)} /> L</>} icon={<Assignment sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#2563eb" />
                  <StatRow title={t('dashboard.eveningMembers')} value={<DisplayNumber value={data.evening_members} />} icon={<People sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#0d9488" />
                  <StatRow title={t('dashboard.eveningPerMember')} value={<><DisplayNumber value={data.evening_milk_per_member?.toFixed(3)} /> L</>} icon={<LocalDrink sx={{ fontSize: { xs: 18, sm: 20 } }} />} color="#9333ea" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default Dashboard;
