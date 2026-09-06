import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Autocomplete
} from '@mui/material';
import {
  Close,
  Pets,
  PhotoCamera,
  Edit,
  Save,
  Opacity,
  Person,
  DeleteOutline,
  CurrencyRupee,
  Print,
  History,
  EventNote
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosClient from '../api/axiosClient';
import DisplayNumber from './DisplayNumber';
import TransliteratedInput from './TransliteratedInput';
import GujaratiNumberInput from './GujaratiNumberInput';
import { useForm, Controller } from 'react-hook-form';
import { getErrorMessage } from '../utils/formatError';
import dayjs from 'dayjs';

interface CowDetailsModalProps {
  open: boolean;
  onClose: () => void;
  cowId: number | null;
  isAdmin: boolean;
}

const CowDetailsModal: React.FC<CowDetailsModalProps> = ({ open, onClose, cowId, isAdmin }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm();

  // Fetch full details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cowDetails', cowId],
    queryFn: async () => {
      if (!cowId) return null;
      const res = await axiosClient.get(`/cows/${cowId}/details`);
      return res.data;
    },
    enabled: !!cowId && open,
  });

  const cow = data?.cow;
  const stats = data?.stats;
  const assignedMembers = data?.assigned_members || [];
  const statusHistory = data?.status_history || [];
  const recentEntries = data?.recent_entries || [];

  // Initialize edit form when cow details arrive or edit mode starts
  const startEdit = () => {
    if (!cow) return;
    const conditionList = (cow.condition || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    reset({
      cow_name: cow.cow_name || '',
      cow_number: cow.cow_number || '',
      breed: cow.breed || '',
      type: cow.type || 'દૂધ આપતી',
      calf_type: cow.calf_type || 'નથી',
      condition_list: conditionList.length > 0 ? conditionList : ['તંદુરસ્ત'],
      purchase_price: cow.purchase_price ? cow.purchase_price.toString() : '',
      birth_date: cow.birth_date ? cow.birth_date.split('T')[0] : '',
      purchase_date: cow.purchase_date ? cow.purchase_date.split('T')[0] : '',
      change_date: dayjs().format('YYYY-MM-DD'),
      remarks: cow.remarks || ''
    });
    setIsEditing(true);
    setSaveSuccess(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    reset();
  };

  // Mutation for updating cow details
  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await axiosClient.put(`/cows/${cowId}`, formData);
      return res.data;
    },
    onSuccess: () => {
      setSaveSuccess(i18n.language.startsWith('gu') ? 'ગાયની વિગતો અને સ્થિતિ ઇતિહાસ સફળતાપૂર્વક સાચવવામાં આવ્યો!' : 'Cow details and status history saved successfully!');
      setIsEditing(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cows'] });
    },
    onError: (err: any) => {
      setPhotoError(getErrorMessage(err, 'Error saving cow details'));
    }
  });

  // Mutation for photo upload
  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await axiosClient.post(`/cows/${cowId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      setPhotoError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cows'] });
    },
    onError: (err: any) => {
      setPhotoError(getErrorMessage(err, 'Photo upload failed'));
    }
  });

  // Mutation for deleting photo (reverting to default avatar)
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.delete(`/cows/${cowId}/photo`);
      return res.data;
    },
    onSuccess: () => {
      setPhotoError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cows'] });
    },
    onError: (err: any) => {
      setPhotoError(getErrorMessage(err, 'Failed to remove photo'));
    }
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      photoMutation.mutate(e.target.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    if (window.confirm(i18n.language.startsWith('gu') ? 'શું તમે ફોટો દૂર કરી ડિફોલ્ટ કરવા માંગો છો?' : 'Do you want to remove photo and reset to default?')) {
      deletePhotoMutation.mutate();
    }
  };

  const onSubmit = (formData: any) => {
    const payload = { ...formData };
    if (Array.isArray(payload.condition_list)) {
      payload.condition = payload.condition_list.join(', ');
    }
    delete payload.condition_list;

    if (payload.purchase_price !== undefined && payload.purchase_price !== '') {
      payload.purchase_price = parseFloat(payload.purchase_price) || 0;
    } else {
      payload.purchase_price = null;
    }
    if (!payload.birth_date) {
      payload.birth_date = null;
    }
    if (!payload.purchase_date) {
      payload.purchase_date = null;
    }
    if (!payload.change_date) {
      payload.change_date = dayjs().format('YYYY-MM-DD');
    }
    updateMutation.mutate(payload);
  };

  const isGu = i18n.language && i18n.language.startsWith('gu');

  // Condition color helpers (soft, matching pastel colors)
  const getConditionChip = (cond: string | null) => {
    if (!cond) return <Chip size="small" label={isGu ? 'તંદુરસ્ત' : 'Healthy'} sx={{ bgcolor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 700, border: '1px solid' }} />;
    const list = cond.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return <Chip size="small" label={isGu ? 'તંદુરસ્ત' : 'Healthy'} sx={{ bgcolor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 700, border: '1px solid' }} />;

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
              sx={{ bgcolor: bg, color: col, borderColor: bor, fontWeight: 700, border: '1px solid' }}
            />
          );
        })}
      </Box>
    );
  };

  // Calf color helpers
  const getCalfChip = (calf: string | null) => {
    const label = calf || (isGu ? 'નથી' : 'None');
    if (!calf || calf === 'નથી' || calf.toLowerCase() === 'none') {
      return <Chip size="small" label={label} sx={{ bgcolor: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0', fontWeight: 600, border: '1px solid' }} />;
    }
    if (calf.includes('વાછરડો') || calf.toLowerCase().includes('male')) {
      return <Chip size="small" label={label} sx={{ bgcolor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 700, border: '1px solid' }} />;
    }
    if (calf.includes('વાછરડી') || calf.toLowerCase().includes('female')) {
      return <Chip size="small" label={label} sx={{ bgcolor: '#faf5ff', color: '#9333ea', borderColor: '#e9d5ff', fontWeight: 700, border: '1px solid' }} />;
    }
    return <Chip size="small" label={label} sx={{ bgcolor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0', fontWeight: 700, border: '1px solid' }} />;
  };

  // Function to print/export dedicated single Cow PDF Report
  const handlePrintCowPDF = () => {
    if (!cow) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isGu ? 'કૃપા કરીને PDF જોવા માટે પૉપઅપ (Pop-up) મંજૂરી આપો' : 'Please allow popups to generate PDF');
      return;
    }

    const assignedNames = assignedMembers.map((m: any) => `${m.name}${m.name2 ? ' / ' + m.name2 : ''} (નં. ${m.member_number || '-'})`).join(', ') || '-';
    const ageText = isGu ? (stats?.how_much_time_gu || '-') : (stats?.how_much_time || '-');

    const conditionHistoryRows = statusHistory.map((h: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center; font-weight:bold;">${h.change_date || '-'}</td>
        <td style="text-align:center; font-weight:bold; color:#047857;">${h.condition || '-'}</td>
        <td style="text-align:center;">${h.calf_type || '-'}</td>
        <td>${h.remarks || '-'}</td>
      </tr>
    `).join('');

    const milkStatusHistoryRows = statusHistory.map((h: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center; font-weight:bold;">${h.change_date || '-'}</td>
        <td style="text-align:center; font-weight:bold; color:${h.type?.includes('ન') ? '#dc2626' : '#15803d'}; font-size:10.5px;">
          ${h.type || '-'}
        </td>
        <td style="text-align:center; color:#334155;">${h.condition || '-'}</td>
        <td>${h.remarks || '-'}</td>
      </tr>
    `).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cow Report - ${cow.cow_number} ${cow.cow_name || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-bottom: 12px; }
          .org-title { font-size: 20px; font-weight: 800; color: #c2410c; margin: 0; }
          .sub-title { font-size: 13px; font-weight: bold; color: #475569; margin: 3px 0 0 0; }
          .report-badge { display: inline-block; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; padding: 3px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; margin-top: 5px; }

          .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .grid-table td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 10.5px; }
          .grid-table td.label { background: #f8fafc; font-weight: bold; color: #475569; width: 22%; }
          .grid-table td.val { width: 28%; font-weight: 600; color: #0f172a; }

          .section-title { font-size: 12px; font-weight: bold; color: #c2410c; margin: 12px 0 5px 0; border-left: 3px solid #ea580c; padding-left: 6px; }

          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 10px; }
          .data-table th { background: #ea580c; color: #fff; font-weight: bold; }
          .data-table tr:nth-child(even) { background: #f8fafc; }

          .footer { text-align: right; margin-top: 15px; font-size: 9px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="org-title">વંદે માતરમ્ ગૌ હોસ્ટેલ</h1>
          <div class="sub-title">ગાય વિગતવાર પરિચય અને સ્થિતિ અહેવાલ (Cow Profile & Status Report)</div>
          <div class="report-badge">ગાય નંબર: ${cow.cow_number} ${cow.cow_name ? ` • ${cow.cow_name}` : ''}</div>
        </div>

        <div class="section-title">૧. મૂળભૂત વિગતો (Basic Details)</div>
        <table class="grid-table">
          <tr>
            <td class="label">ગાય નંબર:</td>
            <td class="val">${cow.cow_number || '-'}</td>
            <td class="label">નામ:</td>
            <td class="val">${cow.cow_name || '-'}</td>
          </tr>
          <tr>
            <td class="label">ખીલા નં. / ઓલાદ:</td>
            <td class="val">${cow.breed || '-'}</td>
            <td class="label">દૂધ ઉત્પાદન સ્થિતિ:</td>
            <td class="val" style="color:${cow.type?.includes('ન') ? '#dc2626' : '#15803d'}; font-weight:bold;">${cow.type || '-'}</td>
          </tr>
          <tr>
            <td class="label">હાલની સ્થિતિ:</td>
            <td class="val" style="color:#047857; font-weight:bold;">${cow.condition || '-'}</td>
            <td class="label">વાછરડું કે વાછરડી:</td>
            <td class="val">${cow.calf_type || '-'}</td>
          </tr>
          <tr>
            <td class="label">ખરીદી કિંમત:</td>
            <td class="val">${cow.purchase_price ? `₹ ${cow.purchase_price}` : '-'}</td>
            <td class="label">સમયગાળો (ઉંમર):</td>
            <td class="val">${ageText}</td>
          </tr>
          <tr>
            <td class="label">ખરીદી તારીખ:</td>
            <td class="val">${cow.purchase_date || '-'}</td>
            <td class="label">જન્મ તારીખ:</td>
            <td class="val">${cow.birth_date || '-'}</td>
          </tr>
          <tr>
            <td class="label">ફાળવેલ સભાસદો:</td>
            <td class="val" colspan="3">${assignedNames}</td>
          </tr>
          ${cow.remarks ? `
          <tr>
            <td class="label">નોંધ (Remarks):</td>
            <td class="val" colspan="3">${cow.remarks}</td>
          </tr>` : ''}
        </table>

        <div class="section-title">૨. દૂધ ઉત્પાદન આંકડા (Milk Production Stats)</div>
        <table class="grid-table">
          <tr>
            <td class="label">દૈનિક સરેરાશ દૂધ:</td>
            <td class="val" style="color:#c2410c; font-weight:bold;">${stats?.daily_avg_milk || 0} L / દિવસ</td>
            <td class="label">સવારની સરેરાશ:</td>
            <td class="val">${stats?.morning_avg_milk || 0} L</td>
          </tr>
          <tr>
            <td class="label">સાંજની સરેરાશ:</td>
            <td class="val">${stats?.evening_avg_milk || 0} L</td>
            <td class="label">કુલ નોંધાયેલ દૂધ:</td>
            <td class="val">${stats?.total_milk_qty || 0} L (${stats?.milking_days_count || 0} દિવસ)</td>
          </tr>
        </table>

        <div class="section-title">૩. ગાયની સ્થિતિ અને આરોગ્ય ફેરફારનો ઇતિહાસ (Condition & Health History)</div>
        ${conditionHistoryRows ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th style="width:90px;">તારીખ</th>
              <th style="width:130px;">ગાયની સ્થિતિ</th>
              <th style="width:100px;">વાછરડું/વાછરડી</th>
              <th>નોંધ / વિગત</th>
            </tr>
          </thead>
          <tbody>
            ${conditionHistoryRows}
          </tbody>
        </table>
        ` : '<p style="color:#64748b; font-style:italic;">કોઈ ઇતિહાસ નોંધાયેલ નથી.</p>'}

        <div class="section-title">૪. દૂધ આપતી / ન આપતી ફેરફારનો ઇતિહાસ (Milk Producing Status History Timeline)</div>
        ${milkStatusHistoryRows ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th style="width:90px;">તારીખ</th>
              <th style="width:150px;">દૂધ આપતી / ન આપતી</th>
              <th style="width:130px;">તે સમયની સ્થિતિ</th>
              <th>નોંધ / વિગત</th>
            </tr>
          </thead>
          <tbody>
            ${milkStatusHistoryRows}
          </tbody>
        </table>
        ` : '<p style="color:#64748b; font-style:italic;">કોઈ દૂધ ઉત્પાદન ઇતિહાસ નોંધાયેલ નથી.</p>'}

        <div class="footer">
          રિપોર્ટ ડાઉનલોડ તારીખ: ${dayjs().format('DD-MM-YYYY hh:mm A')} | વંદે માતરમ્ ગૌ હોસ્ટેલ
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const photoUrl = cow?.photo ? `/${cow.photo.replace(/\\/g, '/')}` : null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
        }
      }}
    >
      {/* Light & Matching Header (Soft Warm Theme) */}
      <DialogTitle
        sx={{
          bgcolor: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
          color: '#9a3412',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              border: '1px solid #fed7aa'
            }}
          >
            <Pets sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#7c2d12', fontSize: '1.25rem' }}>
              {cow?.cow_name ? `${cow.cow_name}` : t('cows.detailsTitle')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: 0.6, fontWeight: 600 }}>
              {t('cows.cowNumber')}: <strong><DisplayNumber value={cow?.cow_number || ''} /></strong>
              {cow?.breed && ` • ${t('cows.breed')}: ${cow.breed}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isAdmin && (
            <Chip
              size="small"
              label={t('cows.viewOnlyNotice')}
              sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #fed7aa' }}
            />
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: '#9a3412', '&:hover': { bgcolor: '#ffedd5' } }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#ffffff', maxHeight: '78vh' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : !cow ? (
          <Alert severity="error">{t('cows.noCowsFound')}</Alert>
        ) : (
          <Box>
            {/* Alerts */}
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(null)}>
                {saveSuccess}
              </Alert>
            )}
            {photoError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPhotoError(null)}>
                {photoError}
              </Alert>
            )}

            {/* VIEW MODE */}
            {!isEditing ? (
              <Box>
                {/* Main Overview Grid */}
                <Grid container spacing={2.5} alignItems="flex-start" sx={{ mb: 2 }}>
                  {/* Photo Section (Left) */}
                  <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', width: { xs: 150, sm: 160 }, height: { xs: 150, sm: 160 } }}>
                      <Avatar
                        src={photoUrl || undefined}
                        variant="rounded"
                        sx={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: '#fff7ed',
                          color: 'primary.main',
                          border: '2px solid #fed7aa',
                          boxShadow: '0 4px 12px rgba(245, 124, 0, 0.08)'
                        }}
                      >
                        <Pets sx={{ fontSize: 64, opacity: 0.8 }} />
                      </Avatar>

                      {isAdmin && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handlePhotoChange}
                          />
                          <Tooltip title={t('cows.uploadPhoto')}>
                            <IconButton
                              onClick={() => fileInputRef.current?.click()}
                              disabled={photoMutation.isPending}
                              sx={{
                                position: 'absolute',
                                bottom: -6,
                                right: -6,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                                boxShadow: 2,
                                width: 34,
                                height: 34
                              }}
                            >
                              {photoMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>

                    {isAdmin && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PhotoCamera />}
                          onClick={() => fileInputRef.current?.click()}
                          sx={{
                            fontSize: '0.72rem',
                            textTransform: 'none',
                            color: 'primary.main',
                            borderColor: '#fed7aa',
                            bgcolor: '#fff7ed',
                            borderRadius: 1.5,
                            py: 0.3
                          }}
                          disabled={photoMutation.isPending}
                        >
                          {photoUrl ? t('cows.changePhoto') : t('cows.uploadPhoto')}
                        </Button>

                        {photoUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutline />}
                            onClick={handleRemovePhoto}
                            sx={{
                              fontSize: '0.72rem',
                              textTransform: 'none',
                              borderRadius: 1.5,
                              py: 0.3
                            }}
                            disabled={deletePhotoMutation.isPending}
                          >
                            {t('cows.removePhoto')}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Grid>

                  {/* Core Details (Right) */}
                  <Grid item xs={12} sm={8}>
                    {/* Header Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '1.4rem' }}>
                          {cow.cow_name || (isGu ? 'નામ વગરની' : 'Unnamed Cow')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.2, fontWeight: 500 }}>
                          <span>{t('cows.cowNumber')}: <strong><DisplayNumber value={cow.cow_number} /></strong></span>
                          <span>•</span>
                          <span>{t('cows.breed')}: <strong>{cow.breed || '-'}</strong></span>
                        </Typography>
                      </Box>

                      {isAdmin && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Edit />}
                          onClick={startEdit}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            bgcolor: 'primary.main',
                            fontWeight: 700,
                            boxShadow: 'none',
                            px: 2,
                            '&:hover': { bgcolor: 'primary.dark' }
                          }}
                        >
                          {t('cows.editDetails')}
                        </Button>
                      )}
                    </Box>

                    {/* 6 Core Cards Grid */}
                    <Grid container spacing={1.2}>
                      {/* 1. Calf Type (વાછરડું કે વાછરડી) */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4, fontWeight: 600 }}>
                            🐮 {t('cows.calfType')}
                          </Typography>
                          {getCalfChip(cow.calf_type)}
                        </Box>
                      </Grid>

                      {/* 2. Condition of Cow */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4, fontWeight: 600 }}>
                            🩺 {t('cows.condition')}
                          </Typography>
                          {getConditionChip(cow.condition)}
                        </Box>
                      </Grid>

                      {/* 3. Daily Average Milk */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa' }}>
                          <Typography variant="caption" sx={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.2, fontWeight: 700 }}>
                            <Opacity sx={{ fontSize: 14, color: 'primary.main' }} />
                            {t('cows.dailyAvgMilk')}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#c2410c', lineHeight: 1.2 }}>
                            <DisplayNumber value={stats?.daily_avg_milk || 0} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>L/Day</span>
                          </Typography>
                        </Box>
                      </Grid>

                      {/* 4. Buying Price (ખરીદી કિંમત) */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.2, mb: 0.2, fontWeight: 600 }}>
                            <CurrencyRupee sx={{ fontSize: 13 }} />
                            {t('cows.buyingPrice')}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                            {cow.purchase_price !== null && cow.purchase_price !== undefined ? (
                              <>₹ <DisplayNumber value={cow.purchase_price} /></>
                            ) : (
                              '-'
                            )}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* 5. How much time of cow (Age/Duration) */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontWeight: 600 }}>
                            ⏳ {t('cows.howMuchTime')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                            {isGu ? (stats?.how_much_time_gu || '-') : (stats?.how_much_time || '-')}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* 6. Cow Type */}
                      <Grid item xs={6}>
                        <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontWeight: 600 }}>
                            🥛 {t('cows.type')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                            {cow.type || (isGu ? 'દૂધ આપતી' : 'Milking')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Remarks if available */}
                    {cow.remarks && (
                      <Box sx={{ mt: 1.2, p: 1, bgcolor: '#fffbeb', borderRadius: 1.5, border: '1px solid #fef3c7' }}>
                        <Typography variant="caption" color="#92400e">
                          <strong>નોંધ / Remarks:</strong> {cow.remarks}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>



                {/* Assigned Members Section */}
                {assignedMembers.length > 0 && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Person sx={{ fontSize: 18, color: 'primary.main' }} />
                      {t('cows.assignedMembers')}:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {assignedMembers.map((m: any) => {
                        const mPhoto1 = m.photo ? `/${m.photo.replace(/\\/g, '/')}` : null;
                        const fullName = m.name2 ? `${m.name} / ${m.name2}` : m.name;
                        return (
                          <Chip
                            key={m.id}
                            avatar={
                              mPhoto1 ? (
                                <Avatar src={mPhoto1} sx={{ width: 24, height: 24 }} />
                              ) : (
                                <Avatar sx={{ bgcolor: '#fed7aa', color: '#9a3412', width: 24, height: 24 }}>
                                  <Person sx={{ fontSize: 14 }} />
                                </Avatar>
                              )
                            }
                            label={`${fullName} (${t('members.number')}: ${m.member_number || '-'})`}
                            sx={{ bgcolor: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa', fontWeight: 600, border: '1px solid', py: 0.5 }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              /* EDIT MODE */
              <form id="cow-edit-form" onSubmit={handleSubmit(onSubmit)}>
                {/* Edit Mode Header with Photo Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1.5, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={photoUrl || undefined}
                      variant="rounded"
                      sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#ffedd5', color: 'primary.main', border: '1px solid #fdba74' }}
                    >
                      <Pets />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#7c2d12' }}>
                        {t('cows.editDetails')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {photoUrl ? (isGu ? 'ફોટો ઉપલબ્ધ છે' : 'Photo available') : (isGu ? 'ડિફોલ્ટ અવતાર' : 'Default avatar')}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PhotoCamera />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ fontSize: '0.75rem', borderRadius: 1.5, textTransform: 'none', bgcolor: 'white' }}
                      disabled={photoMutation.isPending}
                    >
                      {photoUrl ? t('cows.changePhoto') : t('cows.uploadPhoto')}
                    </Button>
                    {photoUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutline />}
                        onClick={handleRemovePhoto}
                        sx={{ fontSize: '0.75rem', borderRadius: 1.5, textTransform: 'none', bgcolor: 'white' }}
                        disabled={deletePhotoMutation.isPending}
                      >
                        {t('cows.removePhoto')}
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Form Fields Grid */}
                <Grid container spacing={2}>
                  {/* Row 1: Cow Number & Name */}
                  <Grid item xs={12} sm={6}>
                    <GujaratiNumberInput name="cow_number" control={control} label={t('cows.cowNumber')} fullWidth rules={{ required: true }} size="small" margin="none" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TransliteratedInput name="cow_name" control={control} label={t('cows.name')} size="small" margin="none" fullWidth />
                  </Grid>

                  {/* Row 2: Khila No (Breed) & Cow Type */}
                  <Grid item xs={12} sm={6}>
                    <TransliteratedInput name="breed" control={control} label={t('cows.breed')} size="small" margin="none" fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="type"
                      control={control}
                      defaultValue="દૂધ આપતી"
                      render={({ field }) => (
                        <TextField {...field} select fullWidth size="small" margin="none" label={t('cows.type')} InputLabelProps={{ shrink: true }}>
                          <MenuItem value="દૂધ આપતી">{t('cows.typeMilk')}</MenuItem>
                          <MenuItem value="દૂધ ન આપતી">{t('cows.typeWithoutMilk')}</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>

                  {/* Row 3: Condition & Calf Type */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="condition_list"
                      control={control}
                      defaultValue={['તંદુરસ્ત']}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          size="small"
                          options={['તંદુરસ્ત', 'દૂધ આપતી', 'ગાભણ', 'વસૂકેલી', 'સારવાર હેઠળ / બીમાર', 'દૂધ ન આપતી']}
                          value={Array.isArray(field.value) ? field.value : (field.value ? field.value.split(',').map((s: string) => s.trim()) : ['તંદુરસ્ત'])}
                          onChange={(_, newValue) => field.onChange(newValue)}
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
                              placeholder="ગાભણ, દૂધ આપતી, વસૂકેલી..."
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="calf_type"
                      control={control}
                      defaultValue="નથી"
                      render={({ field }) => (
                        <TextField {...field} select fullWidth size="small" margin="none" label={t('cows.calfType')} InputLabelProps={{ shrink: true }}>
                          <MenuItem value="વાછરડો">{t('cows.calfMale')} (Male)</MenuItem>
                          <MenuItem value="વાછરડી">{t('cows.calfFemale')} (Female)</MenuItem>
                          <MenuItem value="નથી">{t('cows.calfNone')} (None)</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>

                  {/* Row 4: Status Change Effective Date */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="change_date"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          label={isGu ? "સ્થિતિ ફેરફાર તારીખ (Status Change Date)" : "Status Change Date"}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          size="small"
                          margin="none"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <GujaratiNumberInput name="purchase_price" control={control} label={t('cows.buyingPrice')} fullWidth size="small" margin="none" />
                  </Grid>

                  {/* Row 5: Purchase Date & Birth Date */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="purchase_date"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} type="date" label={t('cows.purchaseDate')} InputLabelProps={{ shrink: true }} fullWidth size="small" margin="none" />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="birth_date"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} type="date" label={t('cows.dateOfBirth')} InputLabelProps={{ shrink: true }} fullWidth size="small" margin="none" />
                      )}
                    />
                  </Grid>

                  {/* Row 6: Remarks */}
                  <Grid item xs={12}>
                    <TransliteratedInput name="remarks" control={control} label="નોંધ / વિગત (Remarks)" size="small" margin="none" fullWidth />
                  </Grid>
                </Grid>
              </form>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Sticky Bottom Actions */}
      <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        {/* Left: PDF Download */}
        {!isEditing && cow ? (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Print />}
            onClick={handlePrintCowPDF}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#fff7ed', borderColor: '#fed7aa' }}
          >
            {isGu ? 'ગાય રિપોર્ટ PDF' : 'Download Cow PDF'}
          </Button>
        ) : <Box />}

        {/* Right Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditing ? (
            <>
              <Button onClick={cancelEdit} color="inherit" sx={{ borderRadius: 2 }}>
                {t('cows.cancel')}
              </Button>
              <Button
                type="submit"
                form="cow-edit-form"
                variant="contained"
                color="primary"
                disabled={updateMutation.isPending}
                startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />}
                sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
              >
                {t('cows.save')}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} variant="contained" color="inherit" sx={{ borderRadius: 2, px: 3 }}>
              {t('cows.close')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CowDetailsModal;
