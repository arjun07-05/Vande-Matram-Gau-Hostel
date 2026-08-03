import React, { useState } from 'react';
import { Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Autocomplete } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import TransliteratedInput from '../components/TransliteratedInput';
import { useTranslation } from 'react-i18next';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import DisplayNumber from '../components/DisplayNumber';
import GujaratiNumberInput from '../components/GujaratiNumberInput';
import { Timeline } from '@mui/icons-material';
import CowChartModal from '../components/CowChartModal';

const Cows = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [chartCow, setChartCow] = useState<any>(null);
  
  const { register, handleSubmit, reset, control } = useForm();

  const [typeFilter, setTypeFilter] = useState('All');

  const { data: cows, isLoading } = useQuery({
    queryKey: ['cows'],
    queryFn: async () => {
      const res = await axiosClient.get('/cows/');
      return res.data;
    }
  });

  const { data: cowTypes } = useQuery({
    queryKey: ['cowTypes'],
    queryFn: async () => {
      const res = await axiosClient.get('/cow-type-options/');
      return res.data;
    }
  });

  const allOptions = (Array.isArray(cowTypes) ? cowTypes : []).map((ct: any) => ({ name: ct.name, label: ct.name, id: ct.id, isBuiltIn: false }));

  const getDisplayType = (type: string) => {
    if (!type) return '';
    const t_val = type.trim();
    const t_lower = t_val.toLowerCase();
    
    // Normalize any variation of milk to standard Gujarati string
    if (t_lower === 'milk' || t_val === 'દૂધ આપતી' || t_val === t('cows.typeMilk')) {
      return 'દૂધ આપતી';
    }
    // Normalize any variation of without milk to standard Gujarati string
    if (t_lower === 'without milk' || t_val === 'દૂધ વગરની' || t_val === t('cows.typeWithoutMilk')) {
      return 'દૂધ વગરની';
    }
    return t_val;
  };

  const rawTypes = [
    ...((Array.isArray(cows) ? cows : []).map((c: any) => c.type).filter(Boolean)),
    ...allOptions.map((opt: any) => opt.name)
  ];
  
  const uniqueDisplayTypes = Array.from(new Set(rawTypes.map(getDisplayType))).filter(t => t !== '');

  const filteredCows = Array.isArray(cows) ? cows.filter((c: any) => {
    if (typeFilter === 'All') return true;
    const cowType = c.type || '';
    const cowDisplayType = getDisplayType(cowType);
    return cowDisplayType === typeFilter;
  }) : [];

  const getFilterText = () => {
    if (typeFilter === 'All') return t('cows.total', 'કુલ ગાયો');
    return `કુલ ${typeFilter} ગાય`;
  };

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/cow-type-options/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cowTypes'] })
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Using FormData because backend expects Form fields for creating cow
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key]) formData.append(key, data[key]);
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
      alert(error?.response?.data?.detail || error.message || 'An error occurred while saving.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/cows/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cows'] })
  });

  const handleOpen = (cow?: any) => {
    if (cow) {
      setEditingId(cow.id);
      reset(cow);
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
      reset({ cow_number: nextNumber.toString(), cow_name: '', breed: '', type: '' });
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

  if (isLoading) return <MainLayout title={t('cows.title')}><Typography>{t('milk.loading')}</Typography></MainLayout>;

  return (
    <MainLayout title={t('cows.title')}>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField 
            select 
            size="small" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150, background: '#fff', borderRadius: 1, flexGrow: { xs: 1, sm: 0 } }}
          >
            <MenuItem value="All">બધી ગાયો (All)</MenuItem>
            {uniqueDisplayTypes.map((type: string) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {getFilterText()}: <DisplayNumber value={filteredCows.length} />
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ py: { xs: 1.2, sm: 1 } }}>{t('cows.add')}</Button>
        )}
      </Box>

      <Card>
        <TableContainer>
          <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 0.5, sm: 2 }, py: { xs: 1, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('cows.cowNumber')}</TableCell>
                <TableCell>{t('cows.name')}</TableCell>
                <TableCell>{t('cows.breed')}</TableCell>
                <TableCell>{t('cows.type')}</TableCell>
                <TableCell align="right">{t('cows.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCows.slice().sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0)).map((cow: any) => (
                <TableRow key={cow.id}>
                  <TableCell><DisplayNumber value={cow.cow_number} /></TableCell>
                  <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>{cow.cow_name || '-'}</TableCell>
                  <TableCell>{cow.breed || '-'}</TableCell>
                  <TableCell>
                    {cow.type === 'without milk' ? t('cows.typeWithoutMilk') : cow.type === 'milk' ? t('cows.typeMilk') : cow.type}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton color="info" size="small" onClick={() => setChartCow(cow)}><Timeline fontSize="small" /></IconButton>
                    {isAdmin && (
                      <>
                        <IconButton color="primary" size="small" onClick={() => handleOpen(cow)}><Edit fontSize="small" /></IconButton>
                        <IconButton color="error" size="small" onClick={() => deleteMutation.mutate(cow.id)}><Delete fontSize="small" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredCows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">{t('cows.noCowsFound')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingId ? t('cows.edit') : t('cows.add')}</DialogTitle>
          <DialogContent dividers>
            <GujaratiNumberInput name="cow_number" control={control} label={t('cows.cowNumber')} margin="normal" fullWidth rules={{ required: true }} />
            <TransliteratedInput name="cow_name" control={control} label={t('cows.name')} />
            <TransliteratedInput name="breed" control={control} label={t('cows.breed')} />
            <Controller
              name="type"
              control={control}
              defaultValue=""
              render={({ field, fieldState: { error } }) => (
                <Autocomplete
                  {...field}
                  freeSolo
                  options={allOptions}
                  getOptionLabel={(option: any) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.name || '';
                  }}
                  value={
                    typeof field.value === 'string'
                      ? allOptions.find((o: any) => o.name === field.value) || field.value
                      : field.value || ''
                  }
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      field.onChange(newValue);
                    } else if (newValue) {
                      field.onChange(newValue.name);
                    } else {
                      field.onChange("");
                    }
                  }}
                  onInputChange={(_, newInputValue) => {
                    field.onChange(newInputValue);
                  }}
                  renderOption={(props, option: any) => {
                    const label = typeof option === 'string' ? option : option.label;
                    const id = typeof option === 'string' ? null : option.id;
                    return (
                    <li {...props} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{label}</span>
                      {id && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm('Delete this option?')) {
                            deleteTypeMutation.mutate(id);
                          }
                        }}
                      >
                        <Delete fontSize="small" color="error" />
                      </IconButton>
                      )}
                    </li>
                  )}}
                  renderInput={(params) => {
                    if (i18n.language && i18n.language.startsWith('gu')) {
                      return (
                        <ReactTransliterate
                          renderComponent={(props) => {
                            const { ref: transliterateRef, onChange, onKeyDown, onBlur, ...rest } = props as any;
                            return (
                              <TextField
                                {...params}
                                {...rest}
                                label={t('cows.type')}
                                margin="normal"
                                fullWidth
                                onChange={(e) => {
                                  if (onChange) onChange(e);
                                }}
                                onKeyDown={(e) => {
                                  if (onKeyDown) onKeyDown(e);
                                  if (params.inputProps.onKeyDown) params.inputProps.onKeyDown(e as any);
                                }}
                                onBlur={(e) => {
                                  if (onBlur) onBlur(e);
                                  if (params.inputProps.onBlur) params.inputProps.onBlur(e as any);
                                }}
                                inputRef={(node) => {
                                  if (typeof transliterateRef === 'function') transliterateRef(node);
                                  else if (transliterateRef && 'current' in transliterateRef) transliterateRef.current = node;
                                  const paramsRef = params.InputProps.ref;
                                  if (typeof paramsRef === 'function') paramsRef(node);
                                  else if (paramsRef && 'current' in paramsRef) (paramsRef as any).current = node;
                                }}
                              />
                            );
                          }}
                          value={(params.inputProps.value as string) || ""}
                          onChangeText={(text) => {
                            if (params.inputProps.onChange) {
                              params.inputProps.onChange({ target: { value: text } } as any);
                            }
                            field.onChange(text);
                          }}
                          lang="gu"
                        />
                      );
                    }
                    return <TextField {...params} label={t('cows.type')} margin="normal" fullWidth />;
                  }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('cows.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>{t('cows.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>
      
      <CowChartModal 
        open={!!chartCow} 
        onClose={() => setChartCow(null)} 
        cowId={chartCow?.id || null}
        cowName={chartCow?.cow_name || null}
        cowNumber={chartCow?.cow_number || null}
      />
    </MainLayout>
  );
};

export default Cows;
