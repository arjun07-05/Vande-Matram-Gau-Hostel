import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
  Autocomplete,
  Chip,
  Avatar,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add, Edit, Delete, Pets, Timeline, DragIndicator, FilterAlt, Close } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import TransliteratedInput from '../components/TransliteratedInput';
import { useTranslation } from 'react-i18next';
import DisplayNumber from '../components/DisplayNumber';
import GujaratiNumberInput from '../components/GujaratiNumberInput';
import CowChartModal from '../components/CowChartModal';
import CowDetailsModal from '../components/CowDetailsModal';
import { getErrorMessage } from '../utils/formatError';

const DEFAULT_CONDITION_OPTIONS = [
  'તંદુરસ્ત',
  'દૂધ આપતી',
  'ગાભણ',
  'વસૂકેલી',
  'સારવાર હેઠળ / બીમાર',
  'દૂધ ન આપતી'
];

const Cows = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [chartCow, setChartCow] = useState<any>(null);
  const [selectedCowForDetails, setSelectedCowForDetails] = useState<any>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { register, handleSubmit, reset, control } = useForm();

  // Multi-condition Filter State
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const { data: cows, isLoading } = useQuery({
    queryKey: ['cows'],
    queryFn: async () => {
      const res = await axiosClient.get('/cows/');
      const list = res.data;
      if (Array.isArray(list)) {
        list.sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0));
      }
      return list;
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderPayload: any) => {
      return axiosClient.post('/cows/reorder', orderPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
    },
    onError: (err: any) => {
      alert(getErrorMessage(err, 'Failed to reorder cows'));
      queryClient.invalidateQueries({ queryKey: ['cows'] });
    }
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAdmin) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isAdmin || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!isAdmin || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentList = Array.isArray(cows) ? [...cows] : [];
    currentList.sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0));

    const [movedItem] = currentList.splice(draggedIndex, 1);
    currentList.splice(targetIndex, 0, movedItem);

    // Reassign serial numbers sequentially: 1, 2, 3, ...
    const updatedList = currentList.map((c, idx) => ({
      ...c,
      cow_number: (idx + 1).toString()
    }));

    // Optimistically update React Query
    queryClient.setQueryData(['cows'], updatedList);

    // Persist to backend
    const orderPayload = {
      order: updatedList.map((c) => ({
        id: c.id,
        cow_number: c.cow_number
      }))
    };

    reorderMutation.mutate(orderPayload);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const { data: cowTypes } = useQuery({
    queryKey: ['cowTypes'],
    queryFn: async () => {
      const res = await axiosClient.get('/cow-type-options/');
      return res.data;
    }
  });

  const allOptions = (Array.isArray(cowTypes) ? cowTypes : []).map((ct: any) => ({ name: ct.name, label: ct.name, id: ct.id, isBuiltIn: false }));

  // Dynamic list of all possible conditions/types/calfs for filtering
  const allFilterableOptions = Array.from(
    new Set([
      ...DEFAULT_CONDITION_OPTIONS,
      'વાછરડો',
      'વાછરડી',
      ...((Array.isArray(cows) ? cows : []).flatMap((c: any) => {
        const conds = (c.condition || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const typ = c.type ? [c.type.trim()] : [];
        const calf = c.calf_type && c.calf_type !== 'નથી' ? [c.calf_type.trim()] : [];
        return [...conds, ...typ, ...calf];
      }))
    ])
  ).filter(Boolean);

  // Category-Aware Smart Multi-Filter Logic:
  // - Conditions in the SAME category (e.g. 'ગાભણ' OR 'વસૂકેલી') are combined with OR
  // - Conditions across DIFFERENT categories (e.g. 'દૂધ આપતી' AND 'ગાભણ') are combined with AND
  const filteredCows = Array.isArray(cows)
    ? cows.filter((cow: any) => {
        if (selectedConditions.length === 0) return true;

        const cowType = (cow.type || '').trim().toLowerCase();
        const calfType = (cow.calf_type || '').trim().toLowerCase();
        const cowConditions = (cow.condition || '')
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean);

        const selectedTypes: string[] = [];
        const selectedCalfs: string[] = [];
        const selectedConds: string[] = [];

        selectedConditions.forEach((filterItem) => {
          const lower = filterItem.trim().toLowerCase();
          if (lower === 'વાછરડો' || lower === 'વાછરડી' || lower === 'નથી') {
            selectedCalfs.push(lower);
          } else if (
            lower === 'દૂધ આપતી' ||
            lower === 'દૂધ ન આપતી' ||
            (cowTypes || []).some((ct: any) => ct.name.toLowerCase() === lower)
          ) {
            selectedTypes.push(lower);
          } else {
            selectedConds.push(lower);
          }
        });

        // 1. Milk / Cow Type Category
        if (selectedTypes.length > 0) {
          const matchesType = selectedTypes.some((t) => {
            if (t === 'દૂધ આપતી') {
              const hasMilking = cowType === 'દૂધ આપતી' || cowConditions.includes('દૂધ આપતી');
              const isNotMilking = cowType.includes('ન આપતી') || cowConditions.some((c: string) => c.includes('ન આપતી'));
              return hasMilking && !isNotMilking;
            }
            if (t === 'દૂધ ન આપતી') {
              return cowType.includes('ન આપતી') || cowConditions.some((c: string) => c.includes('ન આપતી'));
            }
            return cowType === t || cowType.includes(t);
          });
          if (!matchesType) return false;
        }

        // 2. Calf Category
        if (selectedCalfs.length > 0) {
          const matchesCalf = selectedCalfs.some((c) => {
            if (c === 'નથી') {
              return !calfType || calfType === 'નથી';
            }
            return calfType === c || calfType.includes(c);
          });
          if (!matchesCalf) return false;
        }

        // 3. Condition Category
        if (selectedConds.length > 0) {
          const matchesCond = selectedConds.some((cond) => {
            if (cond.includes('બીમાર') || cond.includes('સારવાર')) {
              return cowConditions.some((c: string) => c.includes('બીમાર') || c.includes('સારવાર') || c.includes('sick'));
            }
            return cowConditions.some((c: string) => c === cond || c.includes(cond) || cond.includes(c));
          });
          if (!matchesCond) return false;
        }

        return true;
      })
    : [];

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/cow-type-options/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cowTypes'] })
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) formData.append(key, data[key]);
      });
      if (editingId) {
        return axiosClient.put(`/cows/${editingId}`, data);
      }
      return axiosClient.post('/cows/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      handleClose();
    },
    onError: (error: any) => {
      alert(getErrorMessage(error, 'An error occurred while saving.'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/cows/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cows'] })
  });

  const handleOpen = (cow?: any) => {
    if (cow) {
      setEditingId(cow.id);
      const conditionList = (cow.condition || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      reset({
        ...cow,
        condition_list: conditionList.length > 0 ? conditionList : ['તંદુરસ્ત']
      });
    } else {
      setEditingId(null);
      let nextNumber = 1;
      if (Array.isArray(cows) && cows.length > 0) {
        const numbers = cows.map((c: any) => parseInt(c.cow_number)).filter((n: number) => !isNaN(n));
        if (numbers.length > 0) {
           numbers.sort((a: number, b: number) => a - b);
           for (let i = 0; i < numbers.length; i++) {
             if (numbers[i] > nextNumber) break;
             if (numbers[i] === nextNumber) nextNumber++;
           }
        }
      }
      reset({
        cow_number: nextNumber.toString(),
        cow_name: '',
        breed: '',
        type: 'દૂધ આપતી',
        calf_type: 'નથી',
        condition_list: ['તંદુરસ્ત']
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    reset({});
  };

  const onSubmit = (data: any) => {
    const payload = { ...data };
    if (Array.isArray(payload.condition_list)) {
      payload.condition = payload.condition_list.join(', ');
    }
    delete payload.condition_list;

    if (payload.purchase_price !== undefined && payload.purchase_price !== '') {
      payload.purchase_price = parseFloat(payload.purchase_price) || 0;
    } else {
      payload.purchase_price = null;
    }
    if (!payload.birth_date) payload.birth_date = null;
    if (!payload.purchase_date) payload.purchase_date = null;
    mutation.mutate(payload);
  };

  const getCalfChipColor = (calf: string | null) => {
    if (!calf || calf === 'નથી') return 'default';
    if (calf.includes('વાછરડો')) return 'primary';
    if (calf.includes('વાછરડી')) return 'secondary';
    return 'success';
  };

  const renderConditionBadges = (conditionStr: string | null) => {
    if (!conditionStr) return <Chip size="small" label="તંદુરસ્ત" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} />;
    const list = conditionStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return <Chip size="small" label="તંદુરસ્ત" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} />;

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {list.map((c) => {
          const lower = c.toLowerCase();
          let bg = '#f1f5f9';
          let col = '#334155';
          let bor = '#cbd5e1';

          if (lower.includes('ગાભણ') || lower.includes('pregnant')) {
            bg = '#fdf4ff'; col = '#a21caf'; bor = '#f0abfc';
          } else if (lower.includes('દૂધ આપતી') || lower.includes('milking')) {
            bg = '#eff6ff'; col = '#1d4ed8'; bor = '#bfdbfe';
          } else if (lower.includes('વસૂક') || lower.includes('dry')) {
            bg = '#fffbeb'; col = '#b45309'; bor = '#fde68a';
          } else if (lower.includes('બીમાર') || lower.includes('સારવાર') || lower.includes('sick')) {
            bg = '#fef2f2'; col = '#b91c1c'; bor = '#fecaca';
          } else if (lower.includes('તંદુરસ્ત') || lower.includes('healthy')) {
            bg = '#ecfdf5'; col = '#047857'; bor = '#a7f3d0';
          }

          return (
            <Chip
              key={c}
              size="small"
              label={c}
              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: bg, color: col, border: `1px solid ${bor}` }}
            />
          );
        })}
      </Box>
    );
  };

  if (isLoading) return <MainLayout title={t('cows.title')}><Typography>{t('milk.loading')}</Typography></MainLayout>;

  return (
    <MainLayout title={t('cows.title')}>
      {/* Top Filter & Action Bar */}
      <Box sx={{ mb: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        {/* Multi-Condition Dropdown Filter */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 260, bgcolor: '#fff', borderRadius: 1.5 }}>
            <InputLabel id="cow-condition-filter-label" sx={{ fontSize: '0.85rem' }}>
              ગાયની સ્થિતિઓ પસંદ કરો (Multiple Conditions)
            </InputLabel>
            <Select
              labelId="cow-condition-filter-label"
              multiple
              value={selectedConditions}
              onChange={(e) => {
                const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                setSelectedConditions(val);
              }}
              input={<OutlinedInput label="ગાયની સ્થિતિઓ પસંદ કરો (Multiple Conditions)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.2 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }} />
                  ))}
                </Box>
              )}
            >
              {allFilterableOptions.map((cond) => (
                <MenuItem key={cond} value={cond} sx={{ py: 0.5, fontSize: '0.85rem' }}>
                  <Checkbox checked={selectedConditions.indexOf(cond) > -1} size="small" />
                  <ListItemText primary={cond} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedConditions.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Close fontSize="small" />}
              onClick={() => setSelectedConditions([])}
              sx={{ borderRadius: 1.5, fontSize: '0.78rem', py: 0.6 }}
            >
              બધા ફિલ્ટર સાફ કરો
            </Button>
          )}

          <Typography variant="body1" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: '#334155' }}>
            {selectedConditions.length > 0 ? 'પસંદ કરેલ શરતો મુજબ ગાયો' : 'કુલ ગાયો'}: <span style={{ color: '#ea580c' }}><DisplayNumber value={filteredCows.length} /></span>
          </Typography>
        </Box>

        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ py: { xs: 1.2, sm: 1 }, borderRadius: 1.5 }}>
            {t('cows.add')}
          </Button>
        )}
      </Box>

      <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 0.5, sm: 1.5 }, py: { xs: 1, sm: 1.2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {isAdmin && <TableCell sx={{ width: 36, px: 0.5 }} />}
                <TableCell sx={{ fontWeight: 800, width: 70 }}>{t('cows.cowNumber')}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t('cows.name')}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t('cows.breed')}</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>{t('cows.calfType')}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ગાયની સ્થિતિઓ (Conditions)</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>{t('cows.type')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>{t('cows.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCows.slice().sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0)).map((cow: any, index: number) => {
                const photoUrl = cow.photo ? `/${cow.photo.replace(/\\/g, '/')}` : null;
                const isDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <TableRow
                    key={cow.id}
                    hover
                    draggable={isAdmin && selectedConditions.length === 0}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    sx={{
                      cursor: isAdmin && selectedConditions.length === 0 ? 'grab' : 'default',
                      opacity: isDragged ? 0.35 : 1,
                      borderTop: isDragOver ? '3px solid #ea580c !important' : 'none',
                      bgcolor: isDragOver ? '#fff7ed !important' : 'inherit',
                      transition: 'background-color 0.15s, opacity 0.15s',
                      userSelect: 'none'
                    }}
                  >
                    {isAdmin && (
                      <TableCell sx={{ width: 36, px: 0.5, textAlign: 'center', cursor: 'grab' }} title={selectedConditions.length > 0 ? 'ફિલ્ટર હટાવો ક્રમ બદલવા માટે' : 'ક્રમ બદલવા માટે ડ્રેગ કરો (Drag to reorder)'}>
                        <DragIndicator sx={{ color: '#94a3b8', fontSize: 20, verticalAlign: 'middle', '&:hover': { color: '#ea580c' } }} />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700 }}>
                      <DisplayNumber value={cow.cow_number} />
                    </TableCell>

                    {/* Clickable Cow Name (Opens Details Modal) */}
                    <TableCell sx={{ minWidth: { xs: '130px', sm: 'auto' } }}>
                      <Box
                        onClick={() => setSelectedCowForDetails(cow)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          cursor: 'pointer',
                          borderRadius: 1,
                          p: 0.5,
                          '&:hover': {
                            bgcolor: '#fff7ed',
                            '& .cow-name-text': {
                              color: 'primary.main',
                              textDecoration: 'underline'
                            }
                          }
                        }}
                        title={t('cows.detailsTitle')}
                      >
                        <Avatar
                          src={photoUrl || undefined}
                          sx={{ width: 28, height: 28, bgcolor: '#ffedd5', color: 'primary.main', fontSize: '0.75rem' }}
                        >
                          <Pets sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography
                          className="cow-name-text"
                          component="span"
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            transition: 'color 0.2s'
                          }}
                        >
                          {cow.cow_name || (i18n.language.startsWith('gu') ? 'નામ વગરની' : 'Unnamed')}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>{cow.breed || '-'}</TableCell>

                    {/* Calf Type Badge */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={cow.calf_type || '-'}
                        color={getCalfChipColor(cow.calf_type) as any}
                        variant={cow.calf_type && cow.calf_type !== 'નથી' ? 'filled' : 'outlined'}
                        sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                      />
                    </TableCell>

                    {/* Multi-Condition Badges */}
                    <TableCell>
                      {renderConditionBadges(cow.condition)}
                    </TableCell>

                    {/* Milk Status */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={cow.type === 'without milk' ? t('cows.typeWithoutMilk') : cow.type === 'milk' ? t('cows.typeMilk') : cow.type || '-'}
                        color={cow.type === 'without milk' || cow.type === 'દૂધ ન આપતી' ? 'default' : 'success'}
                        sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton color="info" size="small" onClick={() => setChartCow(cow)} title="ગ્રાફ (Chart)">
                        <Timeline fontSize="small" />
                      </IconButton>
                      {isAdmin && (
                        <>
                          <IconButton color="primary" size="small" onClick={() => handleOpen(cow)} title={t('cows.edit')}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton color="error" size="small" onClick={() => deleteMutation.mutate(cow.id)} title={t('cows.delete')}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                    {t('cows.noCowsFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add / Quick Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ fontWeight: 700, color: '#c2410c', borderBottom: '1px solid #fed7aa', bgcolor: '#fff7ed' }}>
            {editingId ? t('cows.edit') : t('cows.add')}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GujaratiNumberInput name="cow_number" control={control} label={t('cows.cowNumber')} size="small" margin="none" fullWidth rules={{ required: true }} />
            <TransliteratedInput name="cow_name" control={control} label={t('cows.name')} size="small" margin="none" fullWidth />
            <TransliteratedInput name="breed" control={control} label={t('cows.breed')} size="small" margin="none" fullWidth />

            {/* Multi-Condition Selection */}
            <Controller
              name="condition_list"
              control={control}
              defaultValue={['તંદુરસ્ત']}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={DEFAULT_CONDITION_OPTIONS}
                  value={Array.isArray(field.value) ? field.value : (field.value ? field.value.split(',').map((s: string) => s.trim()) : ['તંદુરસ્ત'])}
                  onChange={(_, newValue) => {
                    field.onChange(newValue);
                  }}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => (
                      <Chip
                        size="small"
                        label={option}
                        {...getTagProps({ index })}
                        sx={{ fontWeight: 600, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ગાયની સ્થિતિઓ (Conditions - એકથી વધુ પસંદ કરી શકો છો)"
                      placeholder="ગાભણ, દૂધ આપતી, વસૂકેલી, તંદુરસ્ત..."
                      helperText="ડ્રોપડાઉનમાંથી એકથી વધુ શરતો પસંદ કરી શકો છો"
                    />
                  )}
                />
              )}
            />

            {/* Calf Type */}
            <Controller
              name="calf_type"
              control={control}
              defaultValue="નથી"
              render={({ field }) => (
                <TextField {...field} select fullWidth size="small" margin="none" label={t('cows.calfType')}>
                  <MenuItem value="વાછરડો">{t('cows.calfMale')} (વાછરડો)</MenuItem>
                  <MenuItem value="વાછરડી">{t('cows.calfFemale')} (વાછરડી)</MenuItem>
                  <MenuItem value="નથી">{t('cows.calfNone')} (નથી)</MenuItem>
                </TextField>
              )}
            />

            {/* Cow Type */}
            <Controller
              name="type"
              control={control}
              defaultValue="દૂધ આપતી"
              render={({ field }) => (
                <TextField {...field} select fullWidth size="small" margin="none" label={t('cows.type')}>
                  <MenuItem value="દૂધ આપતી">{t('cows.typeMilk')}</MenuItem>
                  <MenuItem value="દૂધ ન આપતી">{t('cows.typeWithoutMilk')}</MenuItem>
                </TextField>
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={handleClose} sx={{ borderRadius: 1.5 }}>{t('cows.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ borderRadius: 1.5, px: 3 }}>
              {t('cows.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Cow Performance Chart Modal */}
      {chartCow && (
        <CowChartModal
          open={!!chartCow}
          onClose={() => setChartCow(null)}
          cowId={chartCow.id}
          cowNumber={chartCow.cow_number}
          cowName={chartCow.cow_name}
        />
      )}

      {/* Comprehensive Cow Dossier & Details Modal */}
      {selectedCowForDetails && (
        <CowDetailsModal
          open={!!selectedCowForDetails}
          onClose={() => setSelectedCowForDetails(null)}
          cowId={selectedCowForDetails.id}
          isAdmin={isAdmin}
        />
      )}
    </MainLayout>
  );
};

export default Cows;
