import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Chip,
  Autocomplete,
  Divider,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Print,
  Inventory2,
  ShoppingCart,
  AccountBalanceWallet,
  RemoveCircleOutline,
  CheckCircle,
  WarningAmber,
  PictureAsPdf,
  HistoryEdu,
  Visibility,
  GroupAdd,
  PersonAdd,
  MonetizationOn,
  AccountBalance,
  Search,
  RestartAlt,
  DeleteSweep
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import axiosClient from '../api/axiosClient';
import MainLayout from '../components/Layout/MainLayout';
import TransliteratedInput from '../components/TransliteratedInput';
import TransliteratedAutocomplete from '../components/TransliteratedAutocomplete';
import DisplayNumber from '../components/DisplayNumber';
import GujaratiNumberInput, { formatToEnglishNumber } from '../components/GujaratiNumberInput';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../utils/formatError';
import dayjs from 'dayjs';

const UNIT_OPTIONS_GU = [
  'નંગ',
  'બોરી / થેલી',
  'કિલો',
  'ટન',
  'લિટર',
  'ગાડી / ટ્રેક્ટર',
  'પેકેટ',
  'અન્ય'
];

const UNIT_OPTIONS_EN = [
  'Nos',
  'Bags',
  'Kg',
  'Tons',
  'Liters',
  'Vehicles',
  'Packets',
  'Other'
];

const PAYMENT_MODES_GU = [
  'રોકડ',
  'ઓનલાઇન / UPI',
  'બેંક ટ્રાન્સફર',
  'ચેક'
];

const PAYMENT_MODES_EN = [
  'Cash',
  'Online / UPI',
  'Bank Transfer',
  'Cheque'
];

const Materials = () => {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language && i18n.language.startsWith('gu');

  const unitOptions = isGu ? UNIT_OPTIONS_GU : UNIT_OPTIONS_EN;
  const paymentModes = isGu ? PAYMENT_MODES_GU : PAYMENT_MODES_EN;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState(0);

  // Modals
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);

  const [openUsageModal, setOpenUsageModal] = useState(false);
  const [selectedItemForReport, setSelectedItemForReport] = useState<any | null>(null);

  // Contribution Modals
  const [openBulkContribModal, setOpenBulkContribModal] = useState(false);
  const [openSingleContribModal, setOpenSingleContribModal] = useState(false);
  const [selectedMemberForContrib, setSelectedMemberForContrib] = useState<any | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Purchase Form
  const {
    register: registerPurchase,
    handleSubmit: handleSubmitPurchase,
    reset: resetPurchase,
    watch: watchPurchase,
    setValue: setValuePurchase,
    control: controlPurchase
  } = useForm<any>({
    defaultValues: {
      item_name: '',
      quantity: 1,
      unit: isGu ? 'નંગ' : 'Nos',
      price_per_unit: 0,
      total_price: 0,
      purchase_date: dayjs().format('YYYY-MM-DD'),
      supplier: '',
      remarks: ''
    }
  });

  const watchPurchaseQty = watchPurchase('quantity');
  const watchPurchasePrice = watchPurchase('price_per_unit');

  // Auto-calculate Total Price live in Purchase form
  React.useEffect(() => {
    const rawQ = typeof watchPurchaseQty === 'string' ? formatToEnglishNumber(watchPurchaseQty) : watchPurchaseQty;
    const rawP = typeof watchPurchasePrice === 'string' ? formatToEnglishNumber(watchPurchasePrice) : watchPurchasePrice;
    const q = parseFloat(rawQ as any) || 0;
    const p = parseFloat(rawP as any) || 0;
    setValuePurchase('total_price', parseFloat((q * p).toFixed(2)));
  }, [watchPurchaseQty, watchPurchasePrice, setValuePurchase]);

  // Usage Form
  const {
    handleSubmit: handleSubmitUsage,
    reset: resetUsage,
    setValue: setValueUsage,
    control: controlUsage
  } = useForm<any>({
    defaultValues: {
      item_name: '',
      quantity_used: 1,
      unit: isGu ? 'નંગ' : 'Nos',
      usage_date: dayjs().format('YYYY-MM-DD'),
      purpose: isGu ? 'ગાયોના ખોરાક માટે' : 'Cow Feeding',
      remarks: ''
    }
  });

  // Bulk Contribution Form
  const {
    handleSubmit: handleSubmitBulkContrib,
    reset: resetBulkContrib,
    control: controlBulkContrib,
    register: registerBulkContrib
  } = useForm<any>({
    defaultValues: {
      amount_per_member: '',
      contribution_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: isGu ? 'રોકડ' : 'Cash',
      remarks: isGu ? 'સભાસદો પાસેથી સામાન/ખોરાક ફાળો' : 'Member Material Fund'
    }
  });

  // Single Member Contribution Form
  const {
    handleSubmit: handleSubmitSingleContrib,
    reset: resetSingleContrib,
    control: controlSingleContrib,
    register: registerSingleContrib
  } = useForm<any>({
    defaultValues: {
      member_id: '',
      amount: '',
      contribution_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: isGu ? 'રોકડ' : 'Cash',
      remarks: ''
    }
  });

  // Queries
  const { data: inventorySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['inventorySummary'],
    queryFn: async () => {
      const res = await axiosClient.get('/materials/inventory-summary');
      return res.data;
    }
  });

  const { data: purchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['materials', startDate, endDate],
    queryFn: async () => {
      let url = '/materials/';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await axiosClient.get(url);
      return res.data;
    }
  });

  const { data: usages, isLoading: loadingUsages } = useQuery({
    queryKey: ['materialUsages', startDate, endDate],
    queryFn: async () => {
      let url = '/materials/usages';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await axiosClient.get(url);
      return res.data;
    }
  });

  // Fund Summary Query
  const { data: fundSummary, isLoading: loadingFundSummary } = useQuery({
    queryKey: ['materialFundSummary'],
    queryFn: async () => {
      const res = await axiosClient.get('/materials/fund-summary');
      return res.data;
    }
  });

  // Members list query for single member selection
  const { data: membersList } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axiosClient.get('/members/');
      return res.data;
    }
  });

  // Purchase Mutations
  const purchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPurchaseId) {
        return axiosClient.put(`/materials/${editingPurchaseId}`, data);
      }
      return axiosClient.post('/materials/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
      handleClosePurchaseModal();
    },
    onError: (err: any) => {
      alert(getErrorMessage(err, 'Failed to save purchase record'));
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to delete purchase record'))
  });

  // Usage Mutations
  const usageMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosClient.post('/materials/usages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialUsages'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      handleCloseUsageModal();
    },
    onError: (err: any) => {
      alert(getErrorMessage(err, 'Failed to save usage record'));
    }
  });

  const deleteUsageMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/materials/usages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialUsages'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to delete usage record'))
  });

  // Contribution Mutations
  const bulkContributionMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosClient.post('/materials/contributions/bulk-all', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
      handleCloseBulkContribModal();
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to process bulk contribution'))
  });

  const singleContributionMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosClient.post('/materials/contributions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
      handleCloseSingleContribModal();
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to record contribution'))
  });

  const resetAllContributionsMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.delete('/materials/contributions/reset-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
      alert(isGu ? 'તમામ સભાસદોના ફાળા સફળતાપૂર્વક ૦ (રીસેટ) કરવામાં આવ્યા છે.' : 'All member contributions successfully reset to 0.');
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to reset contributions'))
  });

  const resetMemberContributionsMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return axiosClient.delete(`/materials/contributions/member/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialFundSummary'] });
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to reset member contribution'))
  });

  // Handlers for Contribution Modals
  const handleOpenBulkContribModal = () => {
    resetBulkContrib({
      amount_per_member: '',
      contribution_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: 'રોકડ (Cash)',
      remarks: 'સભાસદો પાસેથી સામાન/ખોરાક ફાળો'
    });
    setOpenBulkContribModal(true);
  };

  const handleCloseBulkContribModal = () => {
    setOpenBulkContribModal(false);
  };

  const handleOpenSingleContribModal = (memberItem?: any) => {
    setSelectedMemberForContrib(memberItem || null);
    resetSingleContrib({
      member_id: memberItem ? memberItem.member_id : '',
      amount: '',
      contribution_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: 'રોકડ (Cash)',
      remarks: ''
    });
    setOpenSingleContribModal(true);
  };

  const handleCloseSingleContribModal = () => {
    setOpenSingleContribModal(false);
    setSelectedMemberForContrib(null);
  };

  const onSubmitBulkContrib = (data: any) => {
    const rawA = typeof data.amount_per_member === 'string' ? formatToEnglishNumber(data.amount_per_member) : data.amount_per_member;
    const amt = parseFloat(rawA as any) || 0;
    if (amt <= 0) {
      alert('કૃપા કરીને માન્ય રકમ દાખલ કરો');
      return;
    }
    const payload = {
      ...data,
      amount_per_member: amt
    };
    bulkContributionMutation.mutate(payload);
  };

  const onSubmitSingleContrib = (data: any) => {
    const rawA = typeof data.amount === 'string' ? formatToEnglishNumber(data.amount) : data.amount;
    const amt = parseFloat(rawA as any) || 0;
    if (amt <= 0) {
      alert('કૃપા કરીને માન્ય રકમ દાખલ કરો');
      return;
    }
    const payload = {
      ...data,
      member_id: parseInt(data.member_id, 10),
      amount: amt
    };
    singleContributionMutation.mutate(payload);
  };

  // Distinct item names from summary for autocomplete
  const distinctItemNames: string[] = (Array.isArray(inventorySummary) ? inventorySummary : [])
    .map((it: any) => it.item_name)
    .filter(Boolean);

  // Handlers
  const handleOpenPurchaseModal = (item?: any) => {
    if (item) {
      setEditingPurchaseId(item.id);
      resetPurchase({
        item_name: item.item_name || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'નંગ (Nos)',
        price_per_unit: item.price_per_unit || 0,
        total_price: item.total_price || 0,
        purchase_date: item.purchase_date || dayjs().format('YYYY-MM-DD'),
        supplier: item.supplier || '',
        remarks: item.remarks || ''
      });
    } else {
      setEditingPurchaseId(null);
      resetPurchase({
        item_name: '',
        quantity: 1,
        unit: 'નંગ (Nos)',
        price_per_unit: 0,
        total_price: 0,
        purchase_date: dayjs().format('YYYY-MM-DD'),
        supplier: '',
        remarks: ''
      });
    }
    setOpenPurchaseModal(true);
  };

  const handleClosePurchaseModal = () => {
    setOpenPurchaseModal(false);
    setEditingPurchaseId(null);
  };

  const handleOpenUsageModal = (presetItemName?: string, presetUnit?: string) => {
    resetUsage({
      item_name: presetItemName || '',
      quantity_used: 1,
      unit: presetUnit || 'નંગ (Nos)',
      usage_date: dayjs().format('YYYY-MM-DD'),
      purpose: 'ગાયોના ખોરાક માટે (For Cow Feeding)',
      remarks: ''
    });
    setOpenUsageModal(true);
  };

  const handleCloseUsageModal = () => {
    setOpenUsageModal(false);
  };

  const onSubmitPurchase = (data: any) => {
    const rawQ = typeof data.quantity === 'string' ? formatToEnglishNumber(data.quantity) : data.quantity;
    const rawP = typeof data.price_per_unit === 'string' ? formatToEnglishNumber(data.price_per_unit) : data.price_per_unit;
    const q = parseFloat(rawQ as any) || 0;
    const p = parseFloat(rawP as any) || 0;
    const payload = {
      ...data,
      quantity: q,
      price_per_unit: p,
      total_price: parseFloat((q * p).toFixed(2))
    };
    purchaseMutation.mutate(payload);
  };

  const onSubmitUsage = (data: any) => {
    const rawQ = typeof data.quantity_used === 'string' ? formatToEnglishNumber(data.quantity_used) : data.quantity_used;
    const q = parseFloat(rawQ as any) || 0;
    const payload = {
      ...data,
      quantity_used: q
    };
    usageMutation.mutate(payload);
  };

  // Filtered lists
  const filteredSummary = (Array.isArray(inventorySummary) ? inventorySummary : []).filter((item: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const suppliersStr = (item.suppliers || []).join(' ').toLowerCase();
    return item.item_name?.toLowerCase().includes(term) || suppliersStr.includes(term);
  });

  const filteredPurchases = (Array.isArray(purchases) ? purchases : []).filter((m: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.item_name?.toLowerCase().includes(term) ||
      m.supplier?.toLowerCase().includes(term) ||
      m.remarks?.toLowerCase().includes(term) ||
      m.unit?.toLowerCase().includes(term)
    );
  });

  const filteredUsages = (Array.isArray(usages) ? usages : []).filter((u: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.item_name?.toLowerCase().includes(term) ||
      u.purpose?.toLowerCase().includes(term) ||
      u.remarks?.toLowerCase().includes(term)
    );
  });

  // KPI Calculations
  const totalValuation = filteredSummary.reduce((sum: number, it: any) => sum + (parseFloat(it.balance_valuation) || 0), 0);
  const totalPurchasedExpense = filteredSummary.reduce((sum: number, it: any) => sum + (parseFloat(it.total_purchased_amount) || 0), 0);
  const totalDistinctItems = filteredSummary.length;

  // Print Per-Item Detailed Report PDF
  const handlePrintPerItemPDF = (itemSummary: any) => {
    if (!itemSummary) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemName = itemSummary.item_name;
    const itemPurchases = (purchases || []).filter((p: any) => p.item_name === itemName);
    const itemUsages = (usages || []).filter((u: any) => u.item_name === itemName);

    const purchaseRows = itemPurchases.map((p: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center;">${p.purchase_date || '-'}</td>
        <td style="font-weight:bold;">${p.supplier || '-'}</td>
        <td style="text-align:center;">${p.quantity} ${p.unit || ''}</td>
        <td style="text-align:right;">₹ ${(p.price_per_unit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right; font-weight:bold; color:#c2410c;">₹ ${(p.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>${p.remarks || '-'}</td>
      </tr>
    `).join('');

    const usageRows = itemUsages.map((u: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center;">${u.usage_date || '-'}</td>
        <td style="text-align:center; color:#dc2626; font-weight:bold;">${u.quantity_used} ${u.unit || ''}</td>
        <td>${u.purpose || '-'}</td>
        <td>${u.remarks || '-'}</td>
      </tr>
    `).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${itemName} - Detailed Report</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
          .header { text-align: center; border-bottom: 2.5px solid #ea580c; padding-bottom: 8px; margin-bottom: 12px; }
          .org-title { font-size: 22px; font-weight: 800; color: #c2410c; margin: 0; }
          .sub-title { font-size: 14px; font-weight: bold; color: #334155; margin: 4px 0 0 0; }

          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi-card { border: 1px solid #fed7aa; background: #fff7ed; border-radius: 6px; padding: 8px 10px; }
          .kpi-label { font-size: 10px; color: #7c2d12; font-weight: bold; }
          .kpi-val { font-size: 14px; font-weight: 800; color: #c2410c; margin-top: 3px; }

          .section-title { font-size: 13px; font-weight: 800; color: #9a3412; margin: 14px 0 6px 0; border-bottom: 1.5px solid #fdba74; padding-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; }
          th { background-color: #ea580c; color: #fff; font-weight: bold; text-align: center; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .total-row { background: #ffedd5 !important; font-weight: bold; color: #9a3412; font-size: 10.5px; }
          .footer { display: flex; justify-content: space-between; margin-top: 20px; font-size: 9px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="org-title">વંદે માતરમ્ ગૌ હોસ્ટેલ</h1>
          <div class="sub-title">વસ્તુ વિગતવાર સ્ટોક અને ખરીદી/વપરાશ અહેવાલ</div>
          <div style="font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 4px;">${itemName} (${itemSummary.unit})</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">કુલ ખરીદી (Total Purchased)</div>
            <div class="kpi-val">${itemSummary.total_purchased_qty} ${itemSummary.unit} (₹ ${itemSummary.total_purchased_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">સરેરાશ ખરીદ ભાવ (Avg Rate)</div>
            <div class="kpi-val">₹ ${itemSummary.avg_price_per_unit.toFixed(2)} / ${itemSummary.unit}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">કુલ વપરાશ (Total Used)</div>
            <div class="kpi-val" style="color: #dc2626;">${itemSummary.total_used_qty} ${itemSummary.unit}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">હાલનો બાકી સ્ટોક (Balance Stock)</div>
            <div class="kpi-val" style="color: ${itemSummary.balance_qty <= 0 ? '#dc2626' : '#15803d'};">${itemSummary.balance_qty} ${itemSummary.unit}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">સ્ટોક મૂલ્ય (Stock Valuation)</div>
            <div class="kpi-val">₹ ${itemSummary.balance_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">છેલ્લો ખરીદ ભાવ (Last Rate)</div>
            <div class="kpi-val">₹ ${itemSummary.last_purchase_price.toFixed(2)} (${itemSummary.last_purchase_date || '-'})</div>
          </div>
        </div>

        <div class="section-title">૧. ખરીદી ઇતિહાસ (Purchase History)</div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th style="width:85px;">તારીખ</th>
              <th>વેપારી / દુકાનદાર</th>
              <th style="width:85px;">જથ્થો</th>
              <th style="width:90px;">ભાવ/નંગ</th>
              <th style="width:100px;">કુલ રકમ</th>
              <th>નોંધ / બિલ</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseRows || '<tr><td colspan="7" style="text-align:center;">કોઈ ખરીદી નોંધ નથી.</td></tr>'}
            <tr class="total-row">
              <td colspan="3" style="text-align:right;">કુલ ખરીદી સરવાળો:</td>
              <td style="text-align:center;">${itemSummary.total_purchased_qty} ${itemSummary.unit}</td>
              <td>-</td>
              <td style="text-align:right;">₹ ${itemSummary.total_purchased_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">૨. વપરાશ ઇતિહાસ (Usage / Consumption History)</div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th style="width:95px;">વપરાશ તારીખ</th>
              <th style="width:110px;">વપરાયેલ જથ્થો</th>
              <th>વપરાશનો હેતુ / કારણ</th>
              <th>નોંધ</th>
            </tr>
          </thead>
          <tbody>
            ${usageRows || '<tr><td colspan="5" style="text-align:center;">કોઈ વપરાશ નોંધ નથી.</td></tr>'}
            <tr class="total-row">
              <td colspan="2" style="text-align:right;">કુલ વપરાયેલ સરવાળો:</td>
              <td style="text-align:center; color:#dc2626;">${itemSummary.total_used_qty} ${itemSummary.unit}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>રિપોર્ટ ડાઉનલોડ તારીખ: ${dayjs().format('DD-MM-YYYY hh:mm A')}</div>
          <div>વંદે માતરમ્ ગૌ હોસ્ટેલ - ઇન્વેન્ટરી સિસ્ટમ</div>
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

  // Print Main Summary PDF
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let title = '';
    let tableHtml = '';

    if (activeTab === 0) {
      title = 'લાઇવ સ્ટોક અને ઇન્વેન્ટરી સમરી (Live Stock & Inventory Summary)';
      const rows = filteredSummary.map((it: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold; color:#0f172a;">${it.item_name || '-'}</td>
          <td style="text-align:center;">${it.total_purchased_qty} ${it.unit}</td>
          <td style="text-align:right;">₹ ${it.avg_price_per_unit.toFixed(2)}</td>
          <td style="text-align:center; color:#dc2626;">${it.total_used_qty} ${it.unit}</td>
          <td style="text-align:center; font-weight:bold; color:${it.balance_qty <= 0 ? '#dc2626' : '#15803d'};">${it.balance_qty} ${it.unit}</td>
          <td style="text-align:right; font-weight:bold; color:#c2410c;">₹ ${it.balance_valuation.toFixed(2)}</td>
          <td style="text-align:right;">₹ ${it.last_purchase_price.toFixed(2)} (${it.last_purchase_date || '-'})</td>
          <td>${(it.suppliers || []).join(', ') || '-'}</td>
        </tr>
      `).join('');

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th>વસ્તુનું નામ</th>
              <th style="width:90px;">કુલ ખરીદી</th>
              <th style="width:95px;">સરેરાશ ભાવ</th>
              <th style="width:90px;">વપરાયેલ જથ્થો</th>
              <th style="width:105px;">બાકી સ્ટોક</th>
              <th style="width:115px;">સ્ટોક મૂલ્ય</th>
              <th style="width:130px;">છેલ્લો ભાવ (તારીખ)</th>
              <th>વેપારીઓ</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="9" style="text-align:center;">કોઈ માહિતી નથી</td></tr>'}
            <tr class="total-row">
              <td colspan="6" style="text-align:right;">કુલ સ્ટોક મૂલ્ય (Total Stock Valuation):</td>
              <td style="text-align:right; color:#c2410c;">₹ ${totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (activeTab === 1) {
      title = 'સામાન ખરીદી યાદી (Material Purchases Log)';
      const grandTotalPurchases = filteredPurchases.reduce((sum: number, it: any) => sum + (parseFloat(it.total_price) || 0), 0);
      const rows = filteredPurchases.map((it: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold; color:#0f172a;">${it.item_name || '-'}</td>
          <td style="text-align:center;">${it.quantity} ${it.unit || ''}</td>
          <td style="text-align:right;">₹ ${(it.price_per_unit || 0).toFixed(2)}</td>
          <td style="text-align:right; font-weight:bold; color:#c2410c;">₹ ${(it.total_price || 0).toFixed(2)}</td>
          <td style="text-align:center;">${it.purchase_date || '-'}</td>
          <td>${it.supplier || '-'}</td>
          <td>${it.remarks || '-'}</td>
        </tr>
      `).join('');

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th>વસ્તુનું નામ</th>
              <th style="width:100px;">જથ્થો</th>
              <th style="width:110px;">નંગ દીઠ ભાવ</th>
              <th style="width:120px;">કુલ રકમ</th>
              <th style="width:90px;">તારીખ</th>
              <th style="width:140px;">વેપારી</th>
              <th>નોંધ</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align:center;">કોઈ માહિતી નથી</td></tr>'}
            <tr class="total-row">
              <td colspan="4" style="text-align:right;">કુલ સરવાળો (Grand Total):</td>
              <td style="text-align:right; color:#c2410c;">₹ ${grandTotalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (activeTab === 2) {
      title = 'સામાન વપરાશ યાદી (Material Consumption Log)';
      const rows = filteredUsages.map((it: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold; color:#0f172a;">${it.item_name || '-'}</td>
          <td style="text-align:center; color:#dc2626; font-weight:bold;">${it.quantity_used} ${it.unit || ''}</td>
          <td style="text-align:center;">${it.usage_date || '-'}</td>
          <td>${it.purpose || '-'}</td>
          <td>${it.remarks || '-'}</td>
        </tr>
      `).join('');

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width:35px;">ક્રમ</th>
              <th>વસ્તુનું નામ</th>
              <th style="width:120px;">વપરાયેલ જથ્થો</th>
              <th style="width:110px;">વપરાશ તારીખ</th>
              <th>વપરાશનો હેતુ / કારણ</th>
              <th>નોંધ</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="text-align:center;">કોઈ માહિતી નથી</td></tr>'}
          </tbody>
        </table>
      `;
    } else {
      title = 'સભાસદ ફાળો અને સામાન ભંડોળ હિસાબ (Member Funds & Balance Statement)';
      const rows = (fundSummary?.member_contributions || []).map((m: any, idx: number) => `
        <tr>
          <td style="text-align:center;">${m.member_number || (idx + 1)}</td>
          <td style="font-weight:bold; color:#0f172a;">${m.name}${m.name2 ? ' / ' + m.name2 : ''}</td>
          <td style="text-align:center;">${m.assigned_cows_count}</td>
          <td style="text-align:right; font-weight:bold; color:#059669;">₹ ${(m.total_contributed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align:center;">${m.last_contribution_date || '-'}</td>
          <td>${m.last_payment_mode || '-'}</td>
          <td>${m.last_remarks || '-'}</td>
        </tr>
      `).join('');

      tableHtml = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:12px;">
          <div style="border:1px solid #bbf7d0; background:#f0fdf4; border-radius:6px; padding:6px; text-align:center;">
            <div style="font-size:9.5px; color:#166534; font-weight:bold;">કુલ સભાસદ જમા ભંડોળ</div>
            <div style="font-size:13px; font-weight:800; color:#15803d; margin-top:2px;">₹ ${(fundSummary?.total_collected_fund || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="border:1px solid #fed7aa; background:#fff7ed; border-radius:6px; padding:6px; text-align:center;">
            <div style="font-size:9.5px; color:#9a3412; font-weight:bold;">કુલ સામાન ખરીદી ખર્ચ</div>
            <div style="font-size:13px; font-weight:800; color:#c2410c; margin-top:2px;">₹ ${(fundSummary?.total_material_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="border:1px solid #bae6fd; background:#f0f9ff; border-radius:6px; padding:6px; text-align:center;">
            <div style="font-size:9.5px; color:#0369a1; font-weight:bold;">હાથ પર બાકી વધેલું ભંડોળ</div>
            <div style="font-size:13px; font-weight:800; color:${(fundSummary?.net_fund_balance || 0) < 0 ? '#dc2626' : '#0284c7'}; margin-top:2px;">₹ ${(fundSummary?.net_fund_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:35px;">સ.નં.</th>
              <th>સભાસદનું નામ</th>
              <th style="width:55px;">ગાયો</th>
              <th style="width:120px;">કુલ જમા રકમ (₹)</th>
              <th style="width:90px;">છેલ્લી તારીખ</th>
              <th style="width:110px;">માધ્યમ</th>
              <th>નોંધ</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" style="text-align:center;">કોઈ માહિતી નથી</td></tr>'}
            <tr class="total-row">
              <td colspan="3" style="text-align:right;">કુલ જમા રકમ (Grand Total):</td>
              <td style="text-align:right; color:#15803d;">₹ ${(fundSummary?.total_collected_fund || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="3" style="text-align:center; color:#9a3412;">બાદ સામાન ખર્ચ: ₹ ${(fundSummary?.total_material_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} • બાકી ભંડોળ: ₹ ${(fundSummary?.net_fund_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 10px; }
          .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 6px; margin-bottom: 10px; }
          .org-title { font-size: 20px; font-weight: 800; color: #c2410c; margin: 0; }
          .sub-title { font-size: 13px; font-weight: bold; color: #475569; margin: 3px 0 0 0; }
          .badge { display: inline-block; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; padding: 2px 10px; border-radius: 12px; font-weight: bold; font-size: 10px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 9.5px; }
          th { background-color: #ea580c; color: #fff; font-weight: bold; text-align: center; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .total-row { background: #ffedd5 !important; font-weight: bold; color: #9a3412; font-size: 10px; }
          .footer { display: flex; justify-content: space-between; margin-top: 15px; font-size: 8.5px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="org-title">વંદે માતરમ્ ગૌ હોસ્ટેલ</h1>
          <div class="sub-title">${title}</div>
          <div class="badge">ડાઉનલોડ તારીખ: ${dayjs().format('DD-MM-YYYY hh:mm A')}</div>
        </div>
        ${tableHtml}
        <div class="footer">
          <div>વંદે માતરમ્ ગૌ હોસ્ટેલ - ઇન્વેન્ટરી અને ભંડોળ મેનેજમેન્ટ સિસ્ટમ</div>
          <div>Page 1 of 1</div>
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

  const totalCollectedFund = fundSummary?.total_collected_fund || 0;
  const totalMaterialSpent = fundSummary?.total_material_expense || totalPurchasedExpense;
  const netFundBalance = fundSummary?.net_fund_balance !== undefined ? fundSummary.net_fund_balance : (totalCollectedFund - totalMaterialSpent);

  return (
    <MainLayout title={t('materials.title', isGu ? 'સામાન અને ઇન્વેન્ટરી વ્યવસ્થાપન' : 'Material & Inventory Management')}>
      {/* Top Stat Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
        {activeTab === 3 ? (
          <>
            {/* 1. Total Member Funds Collected */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: '4px solid #059669', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {isGu ? 'કુલ સભાસદ જમા ભંડોળ' : 'Total Member Funds Collected'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                        ₹ <DisplayNumber value={totalCollectedFund.toFixed(2)} />
                      </Typography>
                    </Box>
                    <MonetizationOn sx={{ fontSize: 36, color: '#a7f3d0' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 2. Total Material Purchases Spent */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: '4px solid #ea580c', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {isGu ? 'કુલ સામાન ખરીદી ખર્ચ' : 'Total Purchases Spent'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#c2410c', mt: 0.5 }}>
                        ₹ <DisplayNumber value={totalMaterialSpent.toFixed(2)} />
                      </Typography>
                    </Box>
                    <ShoppingCart sx={{ fontSize: 36, color: '#fed7aa' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 3. Net Fund Balance */}
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: `4px solid ${netFundBalance < 0 ? '#dc2626' : '#0284c7'}`, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', bgcolor: netFundBalance < 0 ? '#fef2f2' : '#f0f9ff' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: netFundBalance < 0 ? '#b91c1c' : '#0369a1', fontWeight: 700 }}>
                        {isGu ? 'હાથ પર બાકી વધેલું ભંડોળ' : 'Net Available Fund Balance'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: netFundBalance < 0 ? '#dc2626' : '#0284c7', mt: 0.5 }}>
                        ₹ <DisplayNumber value={netFundBalance.toFixed(2)} />
                      </Typography>
                    </Box>
                    <AccountBalance sx={{ fontSize: 36, color: netFundBalance < 0 ? '#fecaca' : '#bae6fd' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: '4px solid #059669', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {isGu ? 'હાલનો સ્ટોક મૂલ્ય' : 'Current Stock Valuation'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                        ₹ <DisplayNumber value={totalValuation.toFixed(2)} />
                      </Typography>
                    </Box>
                    <AccountBalanceWallet sx={{ fontSize: 36, color: '#a7f3d0' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: '4px solid #ea580c', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {isGu ? 'કુલ ખરીદી ખર્ચ' : 'Total Purchases Cost'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#c2410c', mt: 0.5 }}>
                        ₹ <DisplayNumber value={totalPurchasedExpense.toFixed(2)} />
                      </Typography>
                    </Box>
                    <ShoppingCart sx={{ fontSize: 36, color: '#fed7aa' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ borderLeft: `4px solid ${netFundBalance < 0 ? '#dc2626' : '#0284c7'}`, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', bgcolor: netFundBalance < 0 ? '#fef2f2' : '#f0f9ff' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: netFundBalance < 0 ? '#b91c1c' : '#0369a1', fontWeight: 700 }}>
                        {isGu ? 'હાથ પર બાકી ભંડોળ' : 'Net Available Balance'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: netFundBalance < 0 ? '#dc2626' : '#0284c7', mt: 0.5 }}>
                        ₹ <DisplayNumber value={netFundBalance.toFixed(2)} />
                      </Typography>
                    </Box>
                    <AccountBalance sx={{ fontSize: 36, color: netFundBalance < 0 ? '#fecaca' : '#bae6fd' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Main Tabs Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
          <Tab label={isGu ? '📦 લાઇવ સ્ટોક સમરી' : '📦 Live Stock Summary'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
          <Tab label={isGu ? '🛒 ખરીદી ઇતિહાસ' : '🛒 Purchase History'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
          <Tab label={isGu ? '📋 વપરાશ નોંધ' : '📋 Usage Log'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
          <Tab label={isGu ? '💰 સભાસદ ફાળો અને ભંડોળ હિસાબ' : '💰 Member Fund & Balance'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1, sm: 0 }, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<Print />}
            onClick={handlePrintPDF}
            sx={{ borderRadius: 1.5 }}
          >
            {isGu ? 'PDF / પ્રિન્ટ' : 'PDF / Print'}
          </Button>

          {isAdmin && activeTab === 3 && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<GroupAdd />}
                onClick={handleOpenBulkContribModal}
                sx={{ borderRadius: 1.5, fontWeight: 700 }}
              >
                {isGu ? 'બધા માટે સમાન ફાળો જમા કરો' : 'Bulk Deposit for All Members'}
              </Button>

              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenSingleContribModal()}
                sx={{ borderRadius: 1.5 }}
              >
                {isGu ? 'વ્યક્તિગત ફાળો ઉમેરો' : 'Add Member Contribution'}
              </Button>

              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<RestartAlt />}
                onClick={() => {
                  if (window.confirm(isGu ? 'શું તમે ખરેખર બધા સભાસદોના ફાળા ૦ (રીસેટ) કરવા માંગો છો?' : 'Are you sure you want to reset all member contributions to 0?')) {
                    resetAllContributionsMutation.mutate();
                  }
                }}
                disabled={resetAllContributionsMutation.isPending || (fundSummary?.total_collected_fund || 0) <= 0}
                sx={{ borderRadius: 1.5, fontWeight: 700 }}
              >
                {isGu ? 'બધા ફાળા ૦ કરો' : 'Reset All to 0'}
              </Button>
            </>
          )}

          {isAdmin && activeTab !== 3 && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<RemoveCircleOutline />}
                onClick={() => handleOpenUsageModal()}
                sx={{ borderRadius: 1.5 }}
              >
                {isGu ? 'વપરાશ નોંધો' : 'Record Usage'}
              </Button>

              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<Add />}
                onClick={() => handleOpenPurchaseModal()}
                sx={{ borderRadius: 1.5 }}
              >
                {isGu ? 'નવી ખરીદી ઉમેરો' : 'Add Purchase'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Search & Date Filter Bar */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder={isGu ? 'વસ્તુ, વેપારી અથવા નોંધ શોધો...' : 'Search item, supplier or note...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 220, bgcolor: '#fff', borderRadius: 1 }}
        />
        {activeTab !== 0 && (
          <>
            <TextField
              size="small"
              label={isGu ? 'શરૂઆતની તારીખ' : 'Start Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ width: 145, bgcolor: '#fff', borderRadius: 1 }}
            />
            <TextField
              size="small"
              label={isGu ? 'અંતિમ તારીખ' : 'End Date'}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ width: 145, bgcolor: '#fff', borderRadius: 1 }}
            />
          </>
        )}
        {(startDate || endDate || searchTerm) && (
          <Button
            size="small"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSearchTerm('');
            }}
          >
            {isGu ? 'ફિલ્ટર સાફ કરો' : 'Clear Filters'}
          </Button>
        )}
      </Box>

      {/* TAB 0: CONSOLIDATED INVENTORY & STOCK SUMMARY */}
      {activeTab === 0 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 45, color: '#475569' }}>{isGu ? '૧. ક્રમ' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વસ્તુનું નામ' : 'Item Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'કુલ ખરીદી' : 'Total Purchased'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'right' }}>{isGu ? 'સરેરાશ ભાવ' : 'Average Rate'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#dc2626', textAlign: 'center' }}>{isGu ? 'વપરાયેલ જથ્થો' : 'Quantity Used'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#15803d', textAlign: 'center' }}>{isGu ? 'બાકી સ્ટોક' : 'Balance Stock'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#c2410c', textAlign: 'right' }}>{isGu ? 'સ્ટોક મૂલ્ય (₹)' : 'Valuation (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'છેલ્લો ભાવ & તારીખ' : 'Last Rate & Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વેપારીઓ' : 'Suppliers'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ક્રિયાઓ' : 'Actions'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSummary.map((item: any, idx: number) => {
                  const isOutOfStock = item.balance_qty <= 0;
                  return (
                    <TableRow key={item.item_name} hover sx={{ bgcolor: isOutOfStock ? '#fef2f2' : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        <DisplayNumber value={(idx + 1).toString()} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={isGu ? "આ વસ્તુનો સંપૂર્ણ રિપોર્ટ જુઓ / PDF ડાઉનલોડ કરો" : "View full report / Download PDF"}>
                          <Typography
                            component="span"
                            onClick={() => setSelectedItemForReport(item)}
                            sx={{
                              fontWeight: 800,
                              color: '#0284c7',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationColor: '#bae6fd',
                              '&:hover': { color: '#0369a1', textDecorationColor: '#0369a1' }
                            }}
                          >
                            {item.item_name}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                        <DisplayNumber value={item.total_purchased_qty} /> {item.unit}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹ <DisplayNumber value={item.avg_price_per_unit.toFixed(2)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                        <DisplayNumber value={item.total_used_qty} /> {item.unit}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          size="small"
                          icon={isOutOfStock ? <WarningAmber fontSize="small" /> : <CheckCircle fontSize="small" />}
                          label={`${item.balance_qty} ${item.unit}`}
                          color={isOutOfStock ? 'error' : 'success'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#c2410c' }}>
                        ₹ <DisplayNumber value={item.balance_valuation.toFixed(2)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                        ₹ <DisplayNumber value={item.last_purchase_price.toFixed(2)} />
                        {item.last_purchase_date && (
                          <Typography variant="caption" display="block" sx={{ color: '#94a3b8' }}>
                            <DisplayNumber value={item.last_purchase_date} />
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {(item.suppliers || []).length > 0 ? (
                          (item.suppliers || []).map((s: string) => (
                            <Chip key={s} label={s} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} />
                          ))
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title={isGu ? "આ વસ્તુનો વિગતવાર રિપોર્ટ" : "Item Detail Report"}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setSelectedItemForReport(item)}
                            sx={{ mr: 0.5 }}
                          >
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<RemoveCircleOutline />}
                            onClick={() => handleOpenUsageModal(item.item_name, item.unit)}
                            sx={{ fontSize: '0.72rem', py: 0.2, px: 1, borderRadius: 1 }}
                          >
                            {isGu ? 'વપરાશ' : 'Use'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#94a3b8', fontStyle: 'italic' }}>
                      {loadingSummary ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ ઇન્વેન્ટરી સ્ટોક નોંધાયેલ નથી.' : 'No stock recorded.')}
                    </TableCell>
                  </TableRow>
                )}

                {/* Summary Bottom Row */}
                {filteredSummary.length > 0 && (
                  <TableRow sx={{ bgcolor: '#fff7ed', borderTop: '2px solid #fed7aa' }}>
                    <TableCell colSpan={6} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'right' }}>
                      {isGu ? 'કુલ સ્ટોક મૂલ્ય:' : 'Total Available Valuation:'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#c2410c', fontSize: '1.05rem' }}>
                      ₹ <DisplayNumber value={totalValuation.toFixed(2)} />
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 1: PURCHASE HISTORY LOG */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 45, color: '#475569' }}>{isGu ? '૧. ક્રમ' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વસ્તુનું નામ' : 'Item Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'જથ્થો' : 'Quantity'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'right' }}>{isGu ? 'નંગ દીઠ ભાવ (₹)' : 'Price / Unit (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#c2410c', textAlign: 'right' }}>{isGu ? 'કુલ રકમ (₹)' : 'Total (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'ખરીદી તારીખ' : 'Purchase Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વેપારી / નોંધ' : 'Supplier / Remarks'}</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ક્રિયાઓ' : 'Actions'}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.map((item: any, index: number) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      <DisplayNumber value={(index + 1).toString()} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {item.item_name}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography component="span" sx={{ fontWeight: 700, color: '#0284c7' }}>
                        <DisplayNumber value={item.quantity?.toString() || '0'} />
                      </Typography>{' '}
                      <Typography component="span" variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹ <DisplayNumber value={(item.price_per_unit || 0).toFixed(2)} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                      ₹ <DisplayNumber value={(item.total_price || 0).toFixed(2)} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#475569' }}>
                      <DisplayNumber value={item.purchase_date || '-'} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {item.supplier && (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {item.supplier}
                          </Typography>
                        )}
                        {item.remarks && (
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {item.remarks}
                          </Typography>
                        )}
                        {!item.supplier && !item.remarks && '-'}
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <Tooltip title={isGu ? 'સુધારો' : 'Edit'}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenPurchaseModal(item)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isGu ? 'કાઢી નાખો' : 'Delete'}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (window.confirm(isGu ? 'શું તમે આ ખરીદીની એન્ટ્રી કાઢી નાખવા માંગો છો?' : 'Do you want to delete this purchase entry?')) {
                                deletePurchaseMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {filteredPurchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loadingPurchases ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ ખરીદી નોંધાયેલ નથી.' : 'No purchases recorded.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 2: USAGE / CONSUMPTION LOG */}
      {activeTab === 2 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 45, color: '#475569' }}>{isGu ? '૧. ક્રમ' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વસ્તુનું નામ' : 'Item Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#dc2626', textAlign: 'center' }}>{isGu ? 'વપરાયેલ જથ્થો' : 'Quantity Used'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'વપરાશ તારીખ' : 'Usage Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'વપરાશનો હેતુ' : 'Purpose'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'નોંધ' : 'Remarks'}</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ક્રિયાઓ' : 'Actions'}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsages.map((u: any, index: number) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      <DisplayNumber value={(index + 1).toString()} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {u.item_name}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>
                      <DisplayNumber value={u.quantity_used?.toString() || '0'} /> {u.unit}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#475569' }}>
                      <DisplayNumber value={u.usage_date || '-'} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                      {u.purpose || '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b' }}>
                      {u.remarks || '-'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <Tooltip title={isGu ? 'કાઢી નાખો' : 'Delete'}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (window.confirm(isGu ? 'શું તમે આ વપરાશ એન્ટ્રી કાઢી નાખવા માંગો છો?' : 'Do you want to delete this usage entry?')) {
                                deleteUsageMutation.mutate(u.id);
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {filteredUsages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loadingUsages ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ વપરાશ નોંધાયેલ નથી.' : 'No usage recorded.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 3: MEMBER CONTRIBUTIONS & NET FUND BALANCE */}
      {activeTab === 3 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 45, color: '#475569' }}>{isGu ? 'સ.નં.' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'સભાસદનું નામ' : 'Member Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'ફાળવેલ ગાયો' : 'Assigned Cows'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#059669', textAlign: 'right' }}>{isGu ? 'કુલ જમા રકમ (₹)' : 'Total Contributed (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'છેલ્લી તારીખ & માધ્યમ' : 'Last Date & Mode'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'છેલ્લી નોંધ' : 'Remarks'}</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ક્રિયા' : 'Action'}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(fundSummary?.member_contributions || [])
                  .filter((m: any) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const fullName = `${m.name || ''} ${m.name2 || ''} ${m.member_number || ''}`.toLowerCase();
                    return fullName.includes(term);
                  })
                  .map((m: any) => (
                    <TableRow key={m.member_id} hover sx={{ bgcolor: m.total_contributed > 0 ? '#f0fdf4' : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        <DisplayNumber value={m.member_number || m.member_id.toString()} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {m.name}
                        </Typography>
                        {m.name2 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {m.name2}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                        <DisplayNumber value={m.assigned_cows_count} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#15803d', fontSize: '0.92rem' }}>
                        ₹ <DisplayNumber value={(m.total_contributed || 0).toFixed(2)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                        {m.last_contribution_date ? (
                          <>
                            <DisplayNumber value={m.last_contribution_date} />
                            {m.last_payment_mode && (
                              <Typography variant="caption" display="block" sx={{ color: '#64748b' }}>
                                ({m.last_payment_mode})
                              </Typography>
                            )}
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                        {m.last_remarks || '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<MonetizationOn />}
                            onClick={() => handleOpenSingleContribModal(m)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderRadius: 1.5, fontWeight: 700, mr: 0.5 }}
                          >
                            {isGu ? '+ ફાળો ઉમેરો' : '+ Add Fund'}
                          </Button>
                          {m.total_contributed > 0 && (
                            <Tooltip title={isGu ? "આ સભાસદનો ફાળો ૦ (રીસેટ) કરો" : "Reset this member's contribution to 0"}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (window.confirm(isGu ? `શું તમે ${m.name} નો ફાળો ૦ (રીસેટ) કરવા માંગો છો?` : `Reset contribution for ${m.name} to 0?`)) {
                                    resetMemberContributionsMutation.mutate(m.member_id);
                                  }
                                }}
                              >
                                <RestartAlt fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                {(fundSummary?.member_contributions || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loadingFundSummary ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ સભાસદો ઉપલબ્ધ નથી.' : 'No members found.')}
                    </TableCell>
                  </TableRow>
                )}

                {/* Bottom Total Balance Calculation Row */}
                {(fundSummary?.member_contributions || []).length > 0 && (
                  <TableRow sx={{ bgcolor: '#fff7ed', borderTop: '2px solid #fed7aa' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'right' }}>
                      {isGu ? 'કુલ સરવાળો:' : 'Total Member Funds:'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#15803d', fontSize: '1rem' }}>
                      ₹ <DisplayNumber value={totalCollectedFund.toFixed(2)} />
                    </TableCell>
                    <TableCell colSpan={isAdmin ? 3 : 2} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'center', fontSize: '0.88rem' }}>
                      {isGu ? 'બાદ સામાન ખરીદી ખર્ચ: ' : 'Less Material Spent: '}₹ <DisplayNumber value={totalMaterialSpent.toFixed(2)} /> • {isGu ? 'બાકી વધેલું ભંડોળ: ' : 'Net Balance: '}<Typography component="span" sx={{ fontWeight: 900, color: netFundBalance < 0 ? '#dc2626' : '#0284c7' }}>₹ <DisplayNumber value={netFundBalance.toFixed(2)} /></Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      {/* MODAL 1: ADD / EDIT PURCHASE */}
      <Dialog open={openPurchaseModal} onClose={handleClosePurchaseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#c2410c', pb: 1 }}>
          {editingPurchaseId ? (isGu ? 'સામાન ખરીદી વિગત સુધારો' : 'Edit Purchase Details') : (isGu ? 'નવી સામાન ખરીદી ઉમેરો' : 'Add New Purchase')}
        </DialogTitle>
        <form onSubmit={handleSubmitPurchase(onSubmitPurchase)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TransliteratedAutocomplete
              name="item_name"
              control={controlPurchase}
              label={isGu ? "વસ્તુનું નામ *" : "Item Name *"}
              options={distinctItemNames}
              placeholder={isGu ? "લખો અથવા ડ્રોપડાઉનમાંથી પસંદ કરો..." : "Type or select from dropdown..."}
              required
              onOptionSelect={(selectedName) => {
                const match = (inventorySummary || []).find((it: any) => it.item_name === selectedName);
                if (match && match.unit) {
                  setValuePurchase('unit', match.unit);
                }
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="quantity"
                  control={controlPurchase}
                  label={isGu ? "કુલ જથ્થો / નંગ *" : "Total Quantity *"}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="unit"
                  control={controlPurchase}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={isGu ? "એકમ" : "Unit"}
                      value={field.value || (isGu ? 'નંગ' : 'Nos')}
                      onChange={field.onChange}
                    >
                      {unitOptions.map((u) => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="price_per_unit"
                  control={controlPurchase}
                  label={isGu ? "નંગ દીઠ ખરીદ ભાવ (₹) *" : "Price / Unit (₹) *"}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="total_price"
                  control={controlPurchase}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      size="small"
                      label={isGu ? "કુલ ખરીદ રકમ" : "Total Amount (₹)"}
                      value={field.value || 0}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 'bold' }}>₹</Typography>
                      }}
                      sx={{ bgcolor: '#f8fafc' }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label={isGu ? "ખરીદી તારીખ" : "Purchase Date"}
                  InputLabelProps={{ shrink: true }}
                  {...registerPurchase('purchase_date')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TransliteratedInput
                  name="supplier"
                  control={controlPurchase}
                  label={isGu ? "વેપારી / દુકાનદારનું નામ" : "Supplier / Shop Name"}
                />
              </Grid>
            </Grid>

            <TransliteratedInput
              name="remarks"
              control={controlPurchase}
              label={isGu ? "નોંધ / બિલ નંબર" : "Remarks / Bill Number"}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleClosePurchaseModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={purchaseMutation.isPending}>
              {editingPurchaseId ? (isGu ? 'સુધારો સાચવો' : 'Save Changes') : (isGu ? 'ખરીદી સાચવો' : 'Save Purchase')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 2: LOG ITEM USAGE / CONSUMPTION */}
      <Dialog open={openUsageModal} onClose={handleCloseUsageModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#dc2626', pb: 1 }}>
          {isGu ? 'વસ્તુ વપરાશ નોંધો' : 'Record Material Usage'}
        </DialogTitle>
        <form onSubmit={handleSubmitUsage(onSubmitUsage)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TransliteratedAutocomplete
              name="item_name"
              control={controlUsage}
              label={isGu ? "વસ્તુનું નામ *" : "Item Name *"}
              options={distinctItemNames}
              placeholder={isGu ? "લખો અથવા ડ્રોપડાઉનમાંથી પસંદ કરો..." : "Type or select from dropdown..."}
              required
              onOptionSelect={(selectedName) => {
                const match = (inventorySummary || []).find((it: any) => it.item_name === selectedName);
                if (match && match.unit) {
                  setValueUsage('unit', match.unit);
                }
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="quantity_used"
                  control={controlUsage}
                  label={isGu ? "વપરાયેલ જથ્થો *" : "Quantity Used *"}
                  inputProps={{ step: '0.01', min: '0.01' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="unit"
                  control={controlUsage}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={isGu ? "એકમ" : "Unit"}
                      value={field.value || (isGu ? 'નંગ' : 'Nos')}
                      onChange={field.onChange}
                    >
                      {unitOptions.map((u) => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="usage_date"
                  control={controlUsage}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label={isGu ? "વપરાશ તારીખ" : "Usage Date"}
                      InputLabelProps={{ shrink: true }}
                      value={field.value || dayjs().format('YYYY-MM-DD')}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TransliteratedInput
                  name="purpose"
                  control={controlUsage}
                  label={isGu ? "વપરાશનો હેતુ" : "Purpose"}
                />
              </Grid>
            </Grid>

            <TransliteratedInput
              name="remarks"
              control={controlUsage}
              label={isGu ? "નોંધ" : "Remarks"}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseUsageModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={usageMutation.isPending}>
              {isGu ? 'વપરાશ નોંધો' : 'Save Usage'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 3: PER-ITEM DETAILED REPORT MODAL */}
      <Dialog
        open={Boolean(selectedItemForReport)}
        onClose={() => setSelectedItemForReport(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedItemForReport && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#c2410c' }}>
                  {selectedItemForReport.item_name} - {isGu ? 'સંપૂર્ણ વિગતવાર અહેવાલ' : 'Detailed Report'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isGu ? 'વસ્તુવાર ખરીદી અને વપરાશ વિગતો' : 'Item Purchase & Consumption History'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<Print />}
                onClick={() => handlePrintPerItemPDF(selectedItemForReport)}
                sx={{ borderRadius: 1.5 }}
              >
                {isGu ? 'PDF ડાઉનલોડ / પ્રિન્ટ' : 'PDF Download / Print'}
              </Button>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5 }}>
              {/* Summary 4-card Grid */}
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>
                      {isGu ? 'કુલ ખરીદી' : 'Total Purchased'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#15803d', mt: 0.5 }}>
                      <DisplayNumber value={selectedItemForReport.total_purchased_qty} /> {selectedItemForReport.unit}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      (₹ <DisplayNumber value={selectedItemForReport.total_purchased_amount.toFixed(2)} />)
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 700 }}>
                      {isGu ? 'સરેરાશ ખરીદ ભાવ' : 'Average Rate'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#1d4ed8', mt: 0.5 }}>
                      ₹ <DisplayNumber value={selectedItemForReport.avg_price_per_unit.toFixed(2)} />
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      / {selectedItemForReport.unit}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 700 }}>
                      {isGu ? 'કુલ વપરાયેલ' : 'Total Used'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.5 }}>
                      <DisplayNumber value={selectedItemForReport.total_used_qty} /> {selectedItemForReport.unit}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1.5, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 700 }}>
                      {isGu ? 'હાલનો બાકી સ્ટોક' : 'Current Balance Stock'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: selectedItemForReport.balance_qty <= 0 ? '#dc2626' : '#c2410c', mt: 0.5 }}>
                      <DisplayNumber value={selectedItemForReport.balance_qty} /> {selectedItemForReport.unit}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                      ({isGu ? 'મૂલ્ય: ' : 'Valuation: '}₹ <DisplayNumber value={selectedItemForReport.balance_valuation.toFixed(2)} />)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Section 1: All Purchases of this item */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#c2410c', mb: 1 }}>
                {isGu ? '૧. આ વસ્તુની તમામ ખરીદીઓ' : '1. All Purchase History'}
              </Typography>
              <TableContainer sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'તારીખ' : 'Date'}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'વેપારી / દુકાન' : 'Supplier / Shop'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>{isGu ? 'જથ્થો' : 'Quantity'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>{isGu ? 'નંગ દીઠ ભાવ' : 'Price / Unit'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#c2410c' }}>{isGu ? 'કુલ રકમ' : 'Total (₹)'}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'નોંધ / બિલ' : 'Remarks / Bill'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(purchases || [])
                      .filter((p: any) => p.item_name === selectedItemForReport.item_name)
                      .map((p: any) => (
                        <TableRow key={p.id} hover>
                          <TableCell><DisplayNumber value={p.purchase_date || '-'} /></TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{p.supplier || '-'}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#0284c7', fontWeight: 700 }}>
                            <DisplayNumber value={p.quantity} /> {p.unit}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            ₹ <DisplayNumber value={(p.price_per_unit || 0).toFixed(2)} />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                            ₹ <DisplayNumber value={(p.total_price || 0).toFixed(2)} />
                          </TableCell>
                          <TableCell sx={{ color: '#64748b' }}>{p.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    {(purchases || []).filter((p: any) => p.item_name === selectedItemForReport.item_name).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 2, color: '#94a3b8' }}>
                          {isGu ? 'કોઈ ખરીદી નોંધ નથી.' : 'No purchases found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Section 2: All Usages of this item */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#dc2626', mb: 1 }}>
                {isGu ? '૨. આ વસ્તુનો તમામ વપરાશ' : '2. All Usage / Consumption History'}
              </Typography>
              <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'તારીખ' : 'Date'}</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>{isGu ? 'વપરાયેલ જથ્થો' : 'Quantity Used'}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'વપરાશનો હેતુ' : 'Purpose'}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{isGu ? 'નોંધ' : 'Remarks'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(usages || [])
                      .filter((u: any) => u.item_name === selectedItemForReport.item_name)
                      .map((u: any) => (
                        <TableRow key={u.id} hover>
                          <TableCell><DisplayNumber value={u.usage_date || '-'} /></TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#dc2626', fontWeight: 800 }}>
                            <DisplayNumber value={u.quantity_used} /> {u.unit}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{u.purpose || '-'}</TableCell>
                          <TableCell sx={{ color: '#64748b' }}>{u.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    {(usages || []).filter((u: any) => u.item_name === selectedItemForReport.item_name).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 2, color: '#94a3b8' }}>
                          {isGu ? 'કોઈ વપરાશ નોંધ નથી.' : 'No usage found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setSelectedItemForReport(null)} color="inherit">{isGu ? 'બંધ કરો' : 'Close'}</Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Print />}
                onClick={() => handlePrintPerItemPDF(selectedItemForReport)}
              >
                {isGu ? 'સંપૂર્ણ PDF પ્રિન્ટ' : 'Print PDF'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 3: BULK CONTRIBUTION FOR ALL MEMBERS */}
      <Dialog open={openBulkContribModal} onClose={handleCloseBulkContribModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#15803d', pb: 1 }}>
          {isGu ? 'બધા સભાસદો માટે સમાન ફાળો જમા કરો' : 'Bulk Deposit for All Members'}
        </DialogTitle>
        <form onSubmit={handleSubmitBulkContrib(onSubmitBulkContrib)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534' }}>
                {isGu
                  ? `💡 આ સુવિધા દ્વારા તમામ સક્રિય સભાસદો (${fundSummary?.total_members_count || 0} સભ્યો) ના ખાતામાં એક સાથે સમાન રકમનો ફાળો જમા થશે.`
                  : `💡 This will record an equal contribution amount for all ${fundSummary?.total_members_count || 0} active members simultaneously.`}
              </Typography>
            </Box>

            <GujaratiNumberInput
              name="amount_per_member"
              control={controlBulkContrib}
              label={isGu ? "સભાસદ દીઠ રકમ (₹) *" : "Amount per Member (₹) *"}
              inputProps={{ step: '0.01', min: '1' }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label={isGu ? "જમા તારીખ" : "Date"}
                  InputLabelProps={{ shrink: true }}
                  {...registerBulkContrib('contribution_date')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={isGu ? "ચૂકવણી માધ્યમ" : "Payment Mode"}
                  {...registerBulkContrib('payment_mode')}
                >
                  {paymentModes.map((pm) => (
                    <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <TransliteratedInput
              name="remarks"
              control={controlBulkContrib}
              label={isGu ? "નોંધ / વિગત" : "Remarks / Note"}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseBulkContribModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" color="success" disabled={bulkContributionMutation.isPending}>
              {isGu ? 'બધા માટે જમા કરો' : 'Bulk Deposit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 4: SINGLE MEMBER CONTRIBUTION */}
      <Dialog open={openSingleContribModal} onClose={handleCloseSingleContribModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#0284c7', pb: 1 }}>
          {isGu ? 'સભાસદ ફાળો જમા કરો' : 'Add Member Contribution'}
        </DialogTitle>
        <form onSubmit={handleSubmitSingleContrib(onSubmitSingleContrib)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedMemberForContrib ? (
              <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1.5, border: '1px solid #bae6fd' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0369a1' }}>
                  {selectedMemberForContrib.name} {selectedMemberForContrib.name2 ? `(${selectedMemberForContrib.name2})` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', mt: 0.5, fontWeight: 600 }}>
                  {isGu ? 'સભાસદ નં:' : 'Member #:'} {selectedMemberForContrib.member_number} • {isGu ? 'અત્યાર સુધી જમા:' : 'Total Contributed:'} ₹ {selectedMemberForContrib.total_contributed.toFixed(2)}
                </Typography>
                <input type="hidden" value={selectedMemberForContrib.member_id} {...registerSingleContrib('member_id')} />
              </Box>
            ) : (
              <Controller
                name="member_id"
                control={controlSingleContrib}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={isGu ? "સભાસદ પસંદ કરો *" : "Select Member *"}
                    value={field.value || ''}
                    onChange={field.onChange}
                  >
                    {(membersList || []).map((m: any) => (
                      <MenuItem key={m.id} value={m.id}>
                        #{m.member_number || m.id} - {m.name} {m.name2 ? `(${m.name2})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            <GujaratiNumberInput
              name="amount"
              control={controlSingleContrib}
              label={isGu ? "જમા રકમ (₹) *" : "Contributed Amount (₹) *"}
              inputProps={{ step: '0.01', min: '1' }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label={isGu ? "જમા તારીખ" : "Date"}
                  InputLabelProps={{ shrink: true }}
                  {...registerSingleContrib('contribution_date')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={isGu ? "ચૂકવણી માધ્યમ" : "Payment Mode"}
                  {...registerSingleContrib('payment_mode')}
                >
                  {paymentModes.map((pm) => (
                    <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <TransliteratedInput
              name="remarks"
              control={controlSingleContrib}
              label={isGu ? "નોંધ / રસીદ" : "Remarks / Receipt"}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseSingleContribModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" color="primary" disabled={singleContributionMutation.isPending}>
              {isGu ? 'ફાળો સાચવો' : 'Save Contribution'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </MainLayout>
  );
};

export default Materials;
