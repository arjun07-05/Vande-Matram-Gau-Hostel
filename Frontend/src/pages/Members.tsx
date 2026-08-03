import React, { useState } from 'react';
import { Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Chip } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import TransliteratedInput from '../components/TransliteratedInput';
import { useTranslation } from 'react-i18next';
import DisplayNumber from '../components/DisplayNumber';
import GujaratiNumberInput from '../components/GujaratiNumberInput';
import { BarChart } from '@mui/icons-material';
import MemberChartModal from '../components/MemberChartModal';
import { useAuth } from '../contexts/AuthContext';

const Members = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [chartMember, setChartMember] = useState<any>(null);
  
  const { register, handleSubmit, reset, control } = useForm();

  const [shiftFilter, setShiftFilter] = useState('All');

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axiosClient.get('/members/');
      return res.data;
    }
  });

  const filteredMembers = Array.isArray(members) ? members.filter((m: any) => {
    if (shiftFilter === 'All') return true;
    if (shiftFilter === 'Morning' && (m.milk_preference === 'Morning' || m.milk_preference === 'Both')) return true;
    if (shiftFilter === 'Evening' && (m.milk_preference === 'Evening' || m.milk_preference === 'Both')) return true;
    if (shiftFilter === 'Both' && m.milk_preference === 'Both') return true;
    return false;
  }) : [];

  const getFilterText = () => {
    if (shiftFilter === 'Morning') return 'કુલ સવાર ના સભ્યો';
    if (shiftFilter === 'Evening') return 'કુલ સાંજ ના સભ્યો';
    if (shiftFilter === 'Both') return 'કુલ બંને (સવાર-સાંજ) ના સભ્યો';
    return t('members.total', 'કુલ સભ્યો');
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) formData.append(key, data[key]);
      });
      if (editingId) {
        return axiosClient.put(`/members/${editingId}`, data);
      }
      return axiosClient.post('/members/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] })
  });

  const handleOpen = (member?: any) => {
    if (member) {
      setEditingId(member.id);
      reset(member);
    } else {
      setEditingId(null);
      let nextNumber = 1;
      if (Array.isArray(members) && members.length > 0) {
        const numbers = members.map((m: any) => parseInt(m.member_number)).filter((n: number) => !isNaN(n));
        if (numbers.length > 0) {
           numbers.sort((a: number, b: number) => a - b);
           for (let i = 0; i < numbers.length; i++) {
             if (numbers[i] > nextNumber) break;
             if (numbers[i] === nextNumber) nextNumber++;
           }
        }
      }
      reset({ active: true, milk_preference: 'Both', family_members: 1, member_number: nextNumber.toString() });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    reset({});
  };

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (isLoading) return <MainLayout title={t('members.title')}><Typography>{t('milk.loading')}</Typography></MainLayout>;

  return (
    <MainLayout title={t('members.title')}>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField 
            select 
            size="small" 
            value={shiftFilter} 
            onChange={(e) => setShiftFilter(e.target.value)}
            sx={{ minWidth: 150, background: '#fff', borderRadius: 1, flexGrow: { xs: 1, sm: 0 } }}
          >
            <MenuItem value="All">બધા સભ્યો (All)</MenuItem>
            <MenuItem value="Morning">સવાર (Morning)</MenuItem>
            <MenuItem value="Evening">સાંજ (Evening)</MenuItem>
            <MenuItem value="Both">બંને (Both)</MenuItem>
          </TextField>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {getFilterText()}: <DisplayNumber value={filteredMembers.length} />
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ py: { xs: 1.2, sm: 1 } }}>{t('members.add')}</Button>
        )}
      </Box>

      <Card>
        <TableContainer>
          <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 0.5, sm: 2 }, py: { xs: 1, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('members.number')}</TableCell>
                <TableCell>{t('members.name')}</TableCell>
                <TableCell>{t('members.mobile')}</TableCell>
                <TableCell>{t('members.preference')}</TableCell>
                <TableCell align="right">{t('members.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(filteredMembers) ? filteredMembers : []).map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell><DisplayNumber value={member.member_number?.toString() || ''} /></TableCell>
                  <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>{member.name}</TableCell>
                  <TableCell><DisplayNumber value={member.mobile} /></TableCell>
                  <TableCell>
                    {member.milk_preference === 'Morning' ? t('milk.morning') :
                     member.milk_preference === 'Evening' ? t('milk.evening') :
                     member.milk_preference === 'Both' ? t('members.both') : member.milk_preference}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton color="info" size="small" onClick={() => setChartMember(member)}><BarChart fontSize="small" /></IconButton>
                    {isAdmin && (
                      <>
                        <IconButton color="primary" size="small" onClick={() => handleOpen(member)}><Edit fontSize="small" /></IconButton>
                        <IconButton color="error" size="small" onClick={() => deleteMutation.mutate(member.id)}><Delete fontSize="small" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">{t('members.noMembersFound')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingId ? t('members.edit') : t('members.add')}</DialogTitle>
          <DialogContent dividers>
            <GujaratiNumberInput name="member_number" control={control} label={t('members.number')} margin="normal" fullWidth />
            <TransliteratedInput name="name" control={control} label={t('members.name')} required />
            <GujaratiNumberInput name="mobile" control={control} label={t('members.mobile')} margin="normal" fullWidth rules={{ required: true }} />
            <TransliteratedInput name="address" control={control} label={t('members.address')} />
            <TextField fullWidth select label={t('members.milkPreference')} margin="normal" defaultValue="Both" {...register('milk_preference')}>
              <MenuItem value="Morning">{t('milk.morning')}</MenuItem>
              <MenuItem value="Evening">{t('milk.evening')}</MenuItem>
              <MenuItem value="Both">{t('members.both')}</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('members.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>{t('members.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>
      
      <MemberChartModal
        open={!!chartMember}
        onClose={() => setChartMember(null)}
        memberId={chartMember?.id || null}
        memberName={chartMember?.name || null}
      />
    </MainLayout>
  );
};

export default Members;
