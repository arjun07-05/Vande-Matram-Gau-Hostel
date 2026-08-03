import React, { useState } from 'react';
import { Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, MenuItem, Chip, CircularProgress, IconButton, Autocomplete, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { CheckCircle, CheckCircleOutline } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import DisplayNumber from '../components/DisplayNumber';
import { useAuth } from '../contexts/AuthContext';

const Distribution = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isGowal = user?.role === 'Gowal';
  const canReceive = user?.role === 'Admin' || user?.role === 'Gowal';
  
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [shift, setShift] = useState(dayjs().hour() < 12 ? 'Morning' : 'Evening');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [reassigningIds, setReassigningIds] = useState<number[]>([]);

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axiosClient.get('/members/');
      return res.data.filter((m: any) => m.active);
    }
  });

  const { data: distributions, isLoading } = useQuery({
    queryKey: ['distribution', date, shift],
    queryFn: async () => {
      const res = await axiosClient.get(`/distribution/?target_date=${date}`);
      return res.data.filter((d: any) => d.shift === shift);
    }
  });

  const generateMutation = useMutation({
    mutationFn: () => axiosClient.post(`/distribution/generate?target_date=${date}&shift=${shift}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution', date, shift] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  React.useEffect(() => {
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift]);

  const manualMutation = useMutation({
    mutationFn: (memberId: number) => axiosClient.post(`/distribution/manual?target_date=${date}&shift=${shift}&member_id=${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution', date, shift] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setSelectedMember(null);
      setOpenAddDialog(false);
    }
  });

  const reassignMutation = useMutation({
    mutationFn: ({ distId, newMemberId }: { distId: number, newMemberId: number | null }) => 
      axiosClient.put(`/distribution/reassign/${distId}${newMemberId ? `?new_member_id=${newMemberId}` : ''}`),
    onMutate: ({ distId }) => {
      setReassigningIds(prev => [...prev, distId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution', date, shift] });
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || error.message || 'An error occurred while reassigning.');
    },
    onSettled: (data, error, { distId }) => {
      setReassigningIds(prev => prev.filter(id => id !== distId));
    }
  });

  const receiveMutation = useMutation({
    mutationFn: (id: number) => axiosClient.put(`/distribution/receive/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['distribution', date, shift] });
      const previousDistributions = queryClient.getQueryData(['distribution', date, shift]);
      queryClient.setQueryData(['distribution', date, shift], (old: any) => {
        if (!old) return old;
        return old.map((d: any) => {
          if (d.id === id) {
            return {
              ...d,
              received: !d.received,
              received_time: !d.received ? new Date().toISOString() : null
            };
          }
          return d;
        });
      });
      return { previousDistributions };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousDistributions) {
        queryClient.setQueryData(['distribution', date, shift], context.previousDistributions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution', date, shift] });
    }
  });

  return (
    <MainLayout title={t('distribution.title')}>
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField 
            label={t('distribution.date')} 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 130 }}
          />
          <TextField 
            select 
            label={t('distribution.shift')} 
            value={shift} 
            onChange={(e) => setShift(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 130 }}
          >
            <MenuItem value="Morning">{t('milk.morning')}</MenuItem>
            <MenuItem value="Evening">{t('milk.evening')}</MenuItem>
          </TextField>
          {generateMutation.isPending && <CircularProgress size={24} sx={{ ml: 1 }} />}
        </Box>
      </Card>

      <Card>
        {isLoading ? (
          <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 0.5, sm: 2 }, py: { xs: 1, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('distribution.memberName')}</TableCell>
                  <TableCell align="center">{t('distribution.allotted')}</TableCell>
                  <TableCell align="center" sx={{ width: { xs: '80px', sm: '120px' } }}>{t('members.status')}</TableCell>
                  {!isGowal && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 0, sm: 2 } }}>
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>બીજા સભ્યનું દૂધ</Box>
                      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>ફાળવો</Box>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {distributions?.slice().sort((a: any, b: any) => (a.member?.member_number || 0) - (b.member?.member_number || 0)).map((dist: any) => (
                  <TableRow key={dist.id}>
                    <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: 1, px: { xs: 0.5, sm: 2 } }}>
                      {dist.member?.member_number ? `${dist.member.member_number}. ` : ''}{dist.member?.name}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, verticalAlign: 'middle', px: { xs: 0.5, sm: 2 } }}>
                      {dist.assigned_to_id ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.75em' }}>
                            <DisplayNumber value={dist.milk_qty.toFixed(3)} />
                          </Typography>
                          <Typography color="error.main" sx={{ fontSize: '0.9em', fontWeight: 'bold' }}>
                            0.000
                          </Typography>
                        </Box>
                      ) : (
                        (() => {
                          const assignedToMe = distributions?.filter((d: any) => d.assigned_to_id === dist.member_id) || [];
                          const extraMilk = assignedToMe.reduce((sum: number, d: any) => sum + d.milk_qty, 0);
                          const total = dist.milk_qty + extraMilk;
                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography sx={{ fontSize: '1em', fontWeight: extraMilk > 0 ? 'bold' : 'normal', color: extraMilk > 0 ? 'success.main' : 'inherit' }}>
                                <DisplayNumber value={total.toFixed(3)} />
                              </Typography>
                              {extraMilk > 0 && (
                                <Typography color="success.main" sx={{ fontSize: '0.75em', fontWeight: 'bold' }}>
                                  (+{extraMilk.toFixed(3)})
                                </Typography>
                              )}
                            </Box>
                          );
                        })()
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap', px: { xs: 0, sm: 2 }, width: { xs: '80px', sm: '120px' } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60px' }}>
                        <IconButton 
                          color={!dist.received ? "primary" : "success"}
                          onClick={() => receiveMutation.mutate(dist.id)}
                          disabled={!canReceive}
                          size="small"
                          sx={{ p: { xs: 0.5, sm: 1 } }}
                        >
                          {!dist.received ? (
                            <CheckCircleOutline sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
                          ) : (
                            <CheckCircle sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
                          )}
                        </IconButton>
                        
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            mt: -0.5, 
                            fontSize: { xs: '0.6rem', sm: '0.75rem' },
                            visibility: dist.received ? 'visible' : 'hidden',
                            color: 'text.secondary'
                          }}
                        >
                          <DisplayNumber value={dist.received_time ? dayjs(dist.received_time).format('hh:mm') : '00:00'} /> {dist.received_time ? dayjs(dist.received_time).format('A') : 'AM'}
                        </Typography>

                        {dist.assigned_to && (
                          <Typography 
                            variant="caption" 
                            color={!dist.received ? "primary" : "success.main"} 
                            sx={{ mt: 0, fontWeight: 'bold', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                          >
                            ({dist.assigned_to.name})
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    {!isGowal && (
                      <TableCell align="right" sx={{ p: { xs: 0, sm: 2 }, pr: { xs: 0.5, sm: 2 } }}>
                          <TextField
                            select
                            variant="standard"
                            size="small"
                            value={dist.assigned_to_id || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newId = val === "" ? null : parseInt(val, 10);
                              if (newId !== dist.assigned_to_id) {
                                reassignMutation.mutate({ distId: dist.id, newMemberId: newId as any });
                              }
                            }}
                            disabled={reassigningIds.includes(dist.id) || user?.role !== 'Admin'}
                            sx={{ 
                              width: { xs: 35, sm: 'auto' },
                              minWidth: { xs: 35, sm: 150 }, 
                              maxWidth: { xs: 35, sm: 200 }, 
                              textAlign: 'left',
                              '& .MuiInputBase-root': { 
                                  fontSize: { xs: '0.7rem', sm: '0.875rem' }
                              },
                              '& .MuiSelect-select': {
                                  color: { xs: 'transparent', sm: 'inherit' }, // Hide text on mobile
                                  paddingRight: { xs: '20px !important', sm: '32px !important' },
                              },
                              '& .MuiSvgIcon-root': {
                                  right: { xs: 0, sm: 7 },
                                  fontSize: { xs: '1.5rem', sm: '1.5rem' },
                                  color: 'text.secondary'
                              }
                            }}
                          >
                            <MenuItem value=""><em>કોઈ નહી (None)</em></MenuItem>
                            {(members || []).map((m: any) => (
                              <MenuItem key={m.id} value={m.id}>
                                {m.member_number ? `${m.member_number}. ` : ''}{m.name}
                              </MenuItem>
                            ))}
                          </TextField>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!distributions || distributions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {t('distribution.noListGenerated')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>સભ્ય ઉમેરો (Add Member)</DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 4 }}>
          <Autocomplete
            options={members || []}
            getOptionLabel={(option: any) => `${option.member_number ? option.member_number + '. ' : ''}${option.name}`}
            value={selectedMember}
            onChange={(e, newValue) => {
              setSelectedMember(newValue);
              if (newValue) {
                manualMutation.mutate(newValue.id);
              }
            }}
            disabled={manualMutation.isPending}
            renderInput={(params) => <TextField {...params} label="સભ્ય શોધો (Search Member)" autoFocus margin="dense" />}
            sx={{ width: '100%', mt: 1 }}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Distribution;
