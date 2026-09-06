import React, { useState, useEffect } from 'react';
import { Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import DisplayNumber from '../components/DisplayNumber';
import GujaratiNumberInput from '../components/GujaratiNumberInput';
import { useAuth } from '../contexts/AuthContext';

const MilkEntry = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Entry';

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [shift, setShift] = useState(dayjs().hour() < 12 ? 'Morning' : 'Evening');
  const [entries, setEntries] = useState<Record<number, string>>({});

  const { data: cows, isLoading: cowsLoading } = useQuery({
    queryKey: ['activeCows'],
    queryFn: async () => {
      const res = await axiosClient.get('/cows/');
      return (Array.isArray(res.data) ? res.data : []).filter((c: any) => {
        if (!c.type) return false;
        const t_val = c.type.trim();
        return t_val === 'milk' ||
               t_val === 'Milk' ||
               t_val === 'દૂધ આપતી' ||
               t_val === t('cows.typeMilk');
      });
    }
  });

  const { data: todayMilk, isLoading: milkLoading, refetch } = useQuery({
    queryKey: ['milk', date],
    queryFn: async () => {
      const res = await axiosClient.get(`/milk/today?target_date=${date}`);
      return res.data;
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/');
      return res.data;
    }
  });

  const { data: members } = useQuery({
    queryKey: ['activeMembers'],
    queryFn: async () => {
      const res = await axiosClient.get('/members/');
      return res.data.filter((m: any) => m.active);
    }
  });

  // Pre-fill entries if already exists for the day/shift
  useEffect(() => {
    if (todayMilk && cows) {
      const newEntries: Record<number, string> = {};
      (Array.isArray(todayMilk) ? todayMilk : []).forEach((m: any) => {
        if (m.shift === shift) {
          newEntries[m.cow_id] = Number(m.milk_qty).toFixed(3);
        }
      });
      setEntries(newEntries);
    }
  }, [todayMilk, shift, cows]);

  const mutation = useMutation({
    mutationFn: async (bulkData: any) => {
      return axiosClient.post('/milk/', bulkData);
    },
    onSuccess: () => {
      // Intentionally not refetching to avoid wiping out user's fast typing
    }
  });

  const handleEntryChange = (cowId: number, value: string) => {
    setEntries(prev => ({ ...prev, [cowId]: value }));
  };

  const handleBlur = (cowId: number) => {
    const val = entries[cowId];
    if (val === undefined || val === null || val.toString().trim() === '') {
      // User cleared the box
      setEntries(prev => {
        const next = { ...prev };
        delete next[cowId];
        return next;
      });
      if (canEdit) {
        mutation.mutate({
          entries: [{
            cow_id: cowId,
            date: date,
            shift: shift,
            milk_qty: 0
          }]
        });
      }
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setEntries(prev => ({ ...prev, [cowId]: parsed.toFixed(3) }));
        if (canEdit) {
          mutation.mutate({
            entries: [{
              cow_id: cowId,
              date: date,
              shift: shift,
              milk_qty: parsed
            }]
          });
        }
      } else {
        // Zero or non-numeric input
        setEntries(prev => {
          const next = { ...prev };
          delete next[cowId];
          return next;
        });
        if (canEdit) {
          mutation.mutate({
            entries: [{
              cow_id: cowId,
              date: date,
              shift: shift,
              milk_qty: 0
            }]
          });
        }
      }
    }
  };



  const totalCowMilk = Object.values(entries).reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const gowalMilk = shift === 'Morning' ? (settings?.morning_gowal_milk || 2.0) : (settings?.evening_gowal_milk || 2.0);
  const otherDeductionMilk = shift === 'Morning' ? (settings?.morning_other_milk || 0.0) : (settings?.evening_other_milk || 0.0);

  const bakiMilk = Math.max(0, totalCowMilk - gowalMilk - otherDeductionMilk);
  const shiftMembersCount = members ? members.filter((m: any) => m.milk_preference === 'Both' || m.milk_preference === shift).length : 0;
  const sabhyaMilk = shiftMembersCount > 0 ? (bakiMilk / shiftMembersCount) : 0;

  if (cowsLoading || milkLoading) return <MainLayout title={t('milk.title')}><CircularProgress /></MainLayout>;

  return (
    <MainLayout title={t('milk.title')}>
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label={t('milk.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 130 }}
          />
          <TextField
            select
            label={t('milk.shift')}
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            sx={{ flex: 1, minWidth: 130 }}
          >
            <MenuItem value="Morning">{t('milk.morning')}</MenuItem>
            <MenuItem value="Evening">{t('milk.evening')}</MenuItem>
          </TextField>
          {mutation.isPending && <CircularProgress size={24} />}
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 0.5, sm: 2 }, py: { xs: 1, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('cows.cowNumber')}</TableCell>
                <TableCell>{t('cows.name')}</TableCell>
                <TableCell>{t('milk.quantity')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cows?.slice().sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0)).map((cow: any) => (
                <TableRow key={cow.id}>
                  <TableCell><DisplayNumber value={cow.cow_number} /></TableCell>
                  <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>{cow.cow_name || '-'}</TableCell>
                  <TableCell>
                    <GujaratiNumberInput
                      name={`entry-${cow.id}`}
                      size="small"
                      placeholder="0.000"
                      value={entries[cow.id] || ''}
                      onChangeValue={(val) => handleEntryChange(cow.id, val)}
                      onBlur={() => handleBlur(cow.id)}
                      inputProps={{ step: "0.001", readOnly: !canEdit }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {cows && cows.length > 0 && (
                <>
                  <TableRow sx={{ backgroundColor: '#e3f2fd', '& td': { color: '#1565c0', fontWeight: 'bold', fontSize: '1.05rem', borderTop: '2px solid #90caf9' } }}>
                    <TableCell colSpan={2} align="right">ગાયોનું કુલ દૂધ (Total Cow Milk)</TableCell>
                    <TableCell>
                      <DisplayNumber value={totalCowMilk.toFixed(3)} />
                    </TableCell>
                  </TableRow>
                  {totalCowMilk > 0 && (
                    <>
                      <TableRow sx={{ backgroundColor: '#fff9c4', '& td': { color: '#f57f17', fontWeight: 'bold' } }}>
                        <TableCell colSpan={2} align="right">- ગોવાળનું દૂધ (Gowal Milk)</TableCell>
                        <TableCell>
                          <DisplayNumber value={gowalMilk.toFixed(3)} />
                        </TableCell>
                      </TableRow>
                      {otherDeductionMilk > 0 && (
                        <TableRow sx={{ backgroundColor: '#fef2f2', '& td': { color: '#dc2626', fontWeight: 'bold' } }}>
                          <TableCell colSpan={2} align="right">- અન્ય બાદબાકી / સાઈડ-આઉટ (Other Deduction)</TableCell>
                          <TableCell>
                            <DisplayNumber value={otherDeductionMilk.toFixed(3)} />
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ backgroundColor: '#ffe0b2', '& td': { color: '#e65100', fontWeight: 'bold' } }}>
                        <TableCell colSpan={2} align="right">વિતરણ માટે બાકી દૂધ (Available for Distribution)</TableCell>
                        <TableCell>
                          <DisplayNumber value={bakiMilk.toFixed(3)} />
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: '#c8e6c9', '& td': { color: '#1b5e20', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '2px solid #81c784' } }}>
                        <TableCell colSpan={2} align="right">સભ્યોનું દૂધ (સભ્ય દીઠ / Per Member)</TableCell>
                        <TableCell>
                          <DisplayNumber value={sabhyaMilk.toFixed(3)} />
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </>
              )}
              {(!cows || cows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} align="center">{t('milk.noActiveCows')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </MainLayout>
  );
};

export default MilkEntry;
