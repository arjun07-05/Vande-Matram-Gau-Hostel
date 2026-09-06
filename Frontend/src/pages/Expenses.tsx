import React, { useState, useMemo } from 'react';
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
  Paper,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Print,
  AccountBalanceWallet,
  Business,
  People,
  CheckCircle,
  HourglassEmpty,
  Payment,
  Search,
  NavigateBefore,
  NavigateNext,
  MonetizationOn,
  PendingActions
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
  'મહિનો',
  'દિવસ',
  'કલાક',
  'કિલો',
  'લિટર',
  'ગાડી / ટ્રિપ',
  'પેકેટ',
  'અન્ય'
];

const UNIT_OPTIONS_EN = [
  'Nos',
  'Month',
  'Day',
  'Hour',
  'Kg',
  'Liter',
  'Vehicle / Trip',
  'Packet',
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

const GUJARATI_MONTHS = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

const Expenses = () => {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language && i18n.language.startsWith('gu');

  const unitOptions = isGu ? UNIT_OPTIONS_GU : UNIT_OPTIONS_EN;
  const paymentModes = isGu ? PAYMENT_MODES_GU : PAYMENT_MODES_EN;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  // Tabs: 0 -> Operating Expenses, 1 -> Member Cost Sharing
  const [activeTab, setActiveTab] = useState(0);

  // Current selected month-year (defaults to current month, e.g. "2026-09")
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(dayjs().format('YYYY-MM'));

  // Modals
  const [openExpenseModal, setOpenExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<any | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Expense Form
  const {
    register: registerExpense,
    handleSubmit: handleSubmitExpense,
    reset: resetExpense,
    control: controlExpense,
    setValue: setValueExpense,
    watch: watchExpense
  } = useForm<any>({
    defaultValues: {
      title: '',
      quantity: 1,
      unit: isGu ? 'મહિનો' : 'Month',
      price_per_unit: '',
      amount: '',
      expense_date: dayjs().format('YYYY-MM-DD'),
      month_year: selectedMonthYear,
      payment_mode: isGu ? 'રોકડ' : 'Cash',
      paid_to: '',
      remarks: ''
    }
  });

  const watchExpenseQty = watchExpense('quantity');
  const watchExpenseRate = watchExpense('price_per_unit');

  // Auto-calculate Total Amount live when Qty or Rate changes
  React.useEffect(() => {
    const rawQ = typeof watchExpenseQty === 'string' ? formatToEnglishNumber(watchExpenseQty) : watchExpenseQty;
    const rawR = typeof watchExpenseRate === 'string' ? formatToEnglishNumber(watchExpenseRate) : watchExpenseRate;
    const q = parseFloat(rawQ as any) || 0;
    const r = parseFloat(rawR as any) || 0;
    if (r > 0) {
      setValueExpense('amount', parseFloat((q * r).toFixed(2)));
    }
  }, [watchExpenseQty, watchExpenseRate, setValueExpense]);

  // Payment Form
  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPayment,
    control: controlPayment
  } = useForm<any>({
    defaultValues: {
      amount_paid: '',
      status: 'Paid',
      payment_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: isGu ? 'રોકડ' : 'Cash',
      remarks: ''
    }
  });

  // Query: Monthly Cost Summary & Breakdown
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['monthlyExpenseSummary', selectedMonthYear],
    queryFn: async () => {
      const res = await axiosClient.get(`/expenses/monthly-summary?month_year=${selectedMonthYear}`);
      return res.data;
    }
  });

  // Suggestions for autocomplete titles
  const distinctTitles = useMemo(() => {
    const baseSuggestions = isGu
      ? ['જગ્યાનું ભાડું', 'ગોવાળ પગાર', 'વીજળી બિલ', 'પાણી બિલ', 'દવા / ઇન્જેક્શન', 'ડૉક્ટર ફી', 'પંખા રીપેરિંગ', 'શેડ મેન્ટેનન્સ', 'ઘાસચારો / ખોરાક', 'ટ્રાન્સપોર્ટ ભાડું', 'પરચૂરણ ખર્ચ']
      : ['Monthly Rent', 'Gowal Salary', 'Electricity Bill', 'Water Bill', 'Medicines', 'Doctor Fees', 'Repairs & Maintenance', 'Shed Maintenance', 'Fodder / Feed', 'Transport Cost', 'Sundry Expense'];
    const existing = (summaryData?.expenses || []).map((e: any) => e.title).filter(Boolean);
    return Array.from(new Set([...baseSuggestions, ...existing]));
  }, [summaryData, isGu]);

  // Suggestions for autocomplete units (default options + any custom entered units)
  const distinctUnits = useMemo(() => {
    const baseUnits = isGu
      ? ['નંગ', 'મહિનો', 'દિવસ', 'કલાક', 'કિલો', 'લિટર', 'ગાડી / ટ્રિપ', 'પેકેટ', 'બોરી / થેલી', 'ટન', 'અન્ય']
      : ['Nos', 'Month', 'Day', 'Hour', 'Kg', 'Liter', 'Vehicle / Trip', 'Packet', 'Bag', 'Ton', 'Other'];
    const existingUnits = (summaryData?.expenses || []).map((e: any) => e.unit).filter(Boolean);
    return Array.from(new Set([...baseUnits, ...existingUnits]));
  }, [summaryData, isGu]);

  // Mutations
  const expenseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingExpenseId) {
        return axiosClient.put(`/expenses/${editingExpenseId}`, data);
      }
      return axiosClient.post('/expenses/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyExpenseSummary'] });
      handleCloseExpenseModal();
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to save expense entry'))
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthlyExpenseSummary'] }),
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to delete expense entry'))
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosClient.post('/expenses/member-payment', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyExpenseSummary'] });
      handleClosePaymentModal();
    },
    onError: (err: any) => alert(getErrorMessage(err, 'Failed to record member payment'))
  });

  // Month Navigation
  const handlePrevMonth = () => {
    const prev = dayjs(selectedMonthYear + '-01').subtract(1, 'month').format('YYYY-MM');
    setSelectedMonthYear(prev);
  };

  const handleNextMonth = () => {
    const next = dayjs(selectedMonthYear + '-01').add(1, 'month').format('YYYY-MM');
    setSelectedMonthYear(next);
  };

  const getFormattedMonthGujarati = (ym: string) => {
    const [y, m] = ym.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const mName = GUJARATI_MONTHS[mIdx] || m;
    return `${mName} - ${y}`;
  };

  // Handlers for Modals
  const handleOpenExpenseModal = (item?: any) => {
    if (item) {
      setEditingExpenseId(item.id);
      resetExpense({
        title: item.title || '',
        quantity: item.quantity || 1,
        unit: item.unit || (isGu ? 'મહિનો' : 'Month'),
        price_per_unit: item.price_per_unit || '',
        amount: item.amount || '',
        expense_date: item.expense_date || dayjs().format('YYYY-MM-DD'),
        month_year: item.month_year || selectedMonthYear,
        payment_mode: item.payment_mode || (isGu ? 'રોકડ' : 'Cash'),
        paid_to: item.paid_to || '',
        remarks: item.remarks || ''
      });
    } else {
      setEditingExpenseId(null);
      resetExpense({
        title: '',
        quantity: 1,
        unit: isGu ? 'મહિનો' : 'Month',
        price_per_unit: '',
        amount: '',
        expense_date: dayjs().format('YYYY-MM-DD'),
        month_year: selectedMonthYear,
        payment_mode: isGu ? 'રોકડ' : 'Cash',
        paid_to: '',
        remarks: ''
      });
    }
    setOpenExpenseModal(true);
  };

  const handleCloseExpenseModal = () => {
    setOpenExpenseModal(false);
    setEditingExpenseId(null);
  };

  const handleOpenPaymentModal = (memberShare: any) => {
    setSelectedMemberForPayment(memberShare);
    resetPayment({
      amount_paid: memberShare.amount_paid > 0 ? memberShare.amount_paid : (summaryData?.per_member_cost || ''),
      status: memberShare.status || 'Paid',
      payment_date: memberShare.payment_date || dayjs().format('YYYY-MM-DD'),
      payment_mode: memberShare.payment_mode || (isGu ? 'રોકડ' : 'Cash'),
      remarks: memberShare.remarks || ''
    });
    setOpenPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setOpenPaymentModal(false);
    setSelectedMemberForPayment(null);
  };

  const onSubmitExpense = (data: any) => {
    const rawQ = typeof data.quantity === 'string' ? formatToEnglishNumber(data.quantity) : data.quantity;
    const rawR = typeof data.price_per_unit === 'string' ? formatToEnglishNumber(data.price_per_unit) : data.price_per_unit;
    const rawA = typeof data.amount === 'string' ? formatToEnglishNumber(data.amount) : data.amount;

    const qty = parseFloat(rawQ as any) || 1;
    const rate = parseFloat(rawR as any) || 0;
    let amt = parseFloat(rawA as any) || 0;

    if (amt <= 0 && rate > 0) {
      amt = parseFloat((qty * rate).toFixed(2));
    }

    if (amt <= 0) {
      alert(isGu ? 'કૃપા કરીને માન્ય ખર્ચ રકમ દાખલ કરો' : 'Please enter a valid expense amount');
      return;
    }

    const payload = {
      ...data,
      quantity: qty,
      price_per_unit: rate,
      amount: amt,
      category: 'સામાન્ય',
      month_year: data.expense_date ? data.expense_date.substring(0, 7) : selectedMonthYear
    };
    expenseMutation.mutate(payload);
  };

  const onSubmitPayment = (data: any) => {
    if (!selectedMemberForPayment) return;
    const rawA = typeof data.amount_paid === 'string' ? formatToEnglishNumber(data.amount_paid) : data.amount_paid;
    const amt = parseFloat(rawA as any) || 0;
    const payload = {
      member_id: selectedMemberForPayment.member_id,
      month_year: selectedMonthYear,
      amount_paid: amt,
      status: data.status,
      payment_date: data.payment_date || dayjs().format('YYYY-MM-DD'),
      payment_mode: data.payment_mode,
      remarks: data.remarks
    };
    paymentMutation.mutate(payload);
  };

  // Filtered members & expenses
  const filteredMemberShares = (summaryData?.members_shares || []).filter((m: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${m.name || ''} ${m.name2 || ''} ${m.member_number || ''}`.toLowerCase();
    return fullName.includes(term);
  });

  const filteredExpenses = (summaryData?.expenses || []).filter((e: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.title?.toLowerCase().includes(term) ||
      e.paid_to?.toLowerCase().includes(term) ||
      e.remarks?.toLowerCase().includes(term)
    );
  });

  // KPI Calculations
  const totalMonthlyCost = summaryData?.total_monthly_cost || summaryData?.total_operational_expense || 0;
  const perMemberShare = summaryData?.per_member_cost || 0;
  const totalMembersCount = summaryData?.total_members_count || 0;

  const totalCollectedAmount = (summaryData?.members_shares || []).reduce((sum: number, m: any) => sum + (parseFloat(m.amount_paid) || 0), 0);
  const totalPendingAmount = Math.max(0, totalMonthlyCost - totalCollectedAmount);

  // Print / Export A4 PDF Monthly Statement Bill
  const handlePrintPDF = () => {
    if (!summaryData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const monthLabel = isGu ? getFormattedMonthGujarati(selectedMonthYear) : dayjs(selectedMonthYear + '-01').format('MMMM YYYY');

    const expenseRows = (summaryData.expenses || []).map((e: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:bold;">${e.title || '-'}</td>
        <td style="text-align:center;">${e.quantity || 1} ${e.unit || ''}</td>
        <td style="text-align:right;">₹ ${(e.price_per_unit || 0).toFixed(2)}</td>
        <td style="text-align:right; font-weight:bold; color:#c2410c;">₹ ${(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:center;">${e.expense_date || '-'}</td>
        <td>${e.paid_to || '-'} (${e.payment_mode || '-'})</td>
        <td>${e.remarks || '-'}</td>
      </tr>
    `).join('');

    const memberRows = (summaryData.members_shares || []).map((m: any, idx: number) => `
      <tr>
        <td style="text-align:center;">${m.member_number || (idx + 1)}</td>
        <td style="font-weight:bold;">${m.name}${m.name2 ? ' / ' + m.name2 : ''}</td>
        <td style="text-align:center;">${m.assigned_cows_count}</td>
        <td style="text-align:right; font-weight:bold;">₹ ${(m.calculated_share || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right; color:#15803d; font-weight:bold;">₹ ${(m.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:center; font-weight:bold; color:${m.status === 'Paid' ? '#15803d' : '#dc2626'};">${m.status === 'Paid' ? (isGu ? 'ચૂકવેલ' : 'Paid') : (isGu ? 'બાકી' : 'Pending')}</td>
        <td style="text-align:center;">${m.payment_date || '-'}</td>
      </tr>
    `).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Expense & Cost Sharing Statement - ${selectedMonthYear}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 10.5px; }
          .header { text-align: center; border-bottom: 2.5px solid #ea580c; padding-bottom: 6px; margin-bottom: 10px; }
          .org-title { font-size: 21px; font-weight: 800; color: #c2410c; margin: 0; }
          .sub-title { font-size: 13px; font-weight: bold; color: #334155; margin: 3px 0 0 0; }
          .badge { display: inline-block; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; padding: 3px 12px; border-radius: 12px; font-weight: bold; font-size: 11px; margin-top: 4px; }

          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
          .kpi-card { border: 1px solid #fed7aa; background: #fff7ed; border-radius: 6px; padding: 6px 8px; text-align: center; }
          .kpi-label { font-size: 9.5px; color: #7c2d12; font-weight: bold; }
          .kpi-val { font-size: 13px; font-weight: 800; color: #c2410c; margin-top: 2px; }

          .section-title { font-size: 11.5px; font-weight: 800; color: #9a3412; margin: 10px 0 4px 0; border-left: 3px solid #ea580c; padding-left: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4.5px 6px; font-size: 9.5px; }
          th { background-color: #ea580c; color: #fff; font-weight: bold; text-align: center; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .total-row { background: #ffedd5 !important; font-weight: bold; color: #9a3412; font-size: 10px; }
          .footer { display: flex; justify-content: space-between; margin-top: 15px; font-size: 8.5px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="org-title">વંદે માતરમ્ ગૌ હોસ્ટેલ</h1>
          <div class="sub-title">${isGu ? 'માસિક ઓપરેટિંગ ખર્ચ અને સભાસદવાર વહેંચણી અહેવાલ' : 'Monthly Operating Expense & Member Sharing Statement'}</div>
          <div class="badge">${isGu ? 'માસ / વર્ષ' : 'Month / Year'}: ${monthLabel} (${selectedMonthYear})</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isGu ? 'કુલ ઓપરેટિંગ ખર્ચ' : 'Total Operating Expenses'}</div>
            <div class="kpi-val">₹ ${totalMonthlyCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="background:#ecfdf5; border-color:#a7f3d0;">
            <div class="kpi-label" style="color:#065f46;">${isGu ? `સભાસદ દીઠ હિસ્સો (${totalMembersCount} સભ્યો)` : `Per Member Share (${totalMembersCount} Members)`}</div>
            <div class="kpi-val" style="color:#047857;">₹ ${perMemberShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="background:#f0fdf4; border-color:#bbf7d0;">
            <div class="kpi-label" style="color:#166534;">${isGu ? 'કુલ જમા થયેલ રકમ' : 'Total Collected Amount'}</div>
            <div class="kpi-val" style="color:#15803d;">₹ ${totalCollectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="background:#fef2f2; border-color:#fecaca;">
            <div class="kpi-label" style="color:#991b1b;">${isGu ? 'બાકી વસૂલાત રકમ' : 'Remaining Pending'}</div>
            <div class="kpi-val" style="color:#dc2626;">₹ ${totalPendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="section-title">૧. ${isGu ? 'ઓપરેટિંગ અને સ્થિર ખર્ચાઓની વિગત' : 'Operating & Fixed Expense Details'}</div>
        <table>
          <thead>
            <tr>
              <th style="width:30px;">${isGu ? 'ક્રમ' : 'No.'}</th>
              <th>${isGu ? 'ખર્ચ વિગત' : 'Expense Title'}</th>
              <th style="width:85px;">${isGu ? 'જથ્થો & એકમ' : 'Qty & Unit'}</th>
              <th style="width:80px;">${isGu ? 'ભાવ (₹)' : 'Rate (₹)'}</th>
              <th style="width:95px;">${isGu ? 'રકમ (₹)' : 'Amount (₹)'}</th>
              <th style="width:80px;">${isGu ? 'તારીખ' : 'Date'}</th>
              <th>${isGu ? 'ચૂકવણી વિગત' : 'Paid To'}</th>
              <th>${isGu ? 'નોંધ' : 'Remarks'}</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows || `<tr><td colspan="8" style="text-align:center;">${isGu ? 'કોઈ ઓપરેટિંગ ખર્ચ નોંધાયેલ નથી.' : 'No expenses recorded.'}</td></tr>`}
            <tr class="total-row">
              <td colspan="4" style="text-align:right;">${isGu ? 'કુલ ઓપરેટિંગ ખર્ચ સરવાળો:' : 'Total Operating Expenses:'}</td>
              <td style="text-align:right; font-weight:bold; color:#c2410c;">₹ ${totalMonthlyCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">૨. ${isGu ? 'માસિક સભાસદવાર વહેંચણી અને ચૂકવણી હિસાબ' : 'Member Share Allocation & Settlement Statement'}</div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">${isGu ? 'સ.નં.' : 'No.'}</th>
              <th>${isGu ? 'સભાસદનું નામ' : 'Member Name'}</th>
              <th style="width:55px;">${isGu ? 'ગાયો' : 'Cows'}</th>
              <th style="width:105px;">${isGu ? 'માસિક હિસ્સો (₹)' : 'Monthly Share (₹)'}</th>
              <th style="width:105px;">${isGu ? 'ચૂકવેલ રકમ (₹)' : 'Amount Paid (₹)'}</th>
              <th style="width:75px;">${isGu ? 'સ્થિતિ' : 'Status'}</th>
              <th style="width:85px;">${isGu ? 'તારીખ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || `<tr><td colspan="7" style="text-align:center;">${isGu ? 'કોઈ માહિતી નથી' : 'No data found'}</td></tr>`}
            <tr class="total-row">
              <td colspan="3" style="text-align:right;">${isGu ? 'કુલ સરવાળો:' : 'Grand Total:'}</td>
              <td style="text-align:right;">₹ ${totalMonthlyCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; color:#15803d;">₹ ${totalCollectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2" style="text-align:center; color:#9a3412;">${isGu ? 'બાકી રકમ: ' : 'Pending: '}₹ ${totalPendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>${isGu ? 'રિપોર્ટ ડાઉનલોડ તારીખ:' : 'Generated on:'} ${dayjs().format('DD-MM-YYYY hh:mm A')}</div>
          <div>વંદે માતરમ્ ગૌ હોસ્ટેલ મેનેજમેન્ટ સિસ્ટમ</div>
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

  return (
    <MainLayout title={t('expenses.title', isGu ? 'ઓપરેટિંગ ખર્ચ અને સભાસદ વહેંચણી' : 'Operating Expenses & Member Sharing')}>
      {/* Top Header & Month Selector Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        {/* Month Picker & Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#ffffff', p: 0.8, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <IconButton size="small" onClick={handlePrevMonth} sx={{ color: 'primary.main' }}>
            <NavigateBefore />
          </IconButton>

          <Box sx={{ textAlign: 'center', minWidth: 160 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#c2410c' }}>
              {isGu ? getFormattedMonthGujarati(selectedMonthYear) : dayjs(selectedMonthYear + '-01').format('MMMM YYYY')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              ({selectedMonthYear})
            </Typography>
          </Box>

          <IconButton size="small" onClick={handleNextMonth} sx={{ color: 'primary.main' }}>
            <NavigateNext />
          </IconButton>

          <TextField
            type="month"
            size="small"
            value={selectedMonthYear}
            onChange={(e) => {
              if (e.target.value) setSelectedMonthYear(e.target.value);
            }}
            sx={{ width: 130, ml: 1, '& input': { fontSize: '0.8rem', py: 0.5 } }}
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<Print />}
            onClick={handlePrintPDF}
            sx={{ borderRadius: 1.5 }}
          >
            {isGu ? 'માસિક બિલ PDF' : 'Monthly Bill PDF'}
          </Button>

          {isAdmin && activeTab === 0 && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Add />}
              onClick={() => handleOpenExpenseModal()}
              sx={{ borderRadius: 1.5 }}
            >
              {isGu ? 'નવો ખર્ચ ઉમેરો' : 'Add Expense'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Top 4 KPI Stat Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
        {/* 1. Total Operating Cost */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ea580c', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {isGu ? 'કુલ ઓપરેટિંગ ખર્ચ' : 'Total Operating Expenses'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#c2410c', mt: 0.5 }}>
                    ₹ <DisplayNumber value={totalMonthlyCost.toFixed(2)} />
                  </Typography>
                </Box>
                <Business sx={{ fontSize: 36, color: '#fed7aa' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Per Member Share */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #0284c7', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {isGu ? `સભાસદ દીઠ હિસ્સો (${totalMembersCount} સભ્યો)` : `Per Member Share (${totalMembersCount} Members)`}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7', mt: 0.5 }}>
                    ₹ <DisplayNumber value={perMemberShare.toFixed(2)} />
                  </Typography>
                </Box>
                <People sx={{ fontSize: 36, color: '#bae6fd' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Total Collected Amount */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #059669', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', bgcolor: '#f0fdf4' }}>
            <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 800 }}>
                    {isGu ? 'કુલ જમા થયેલ રકમ' : 'Total Collected Amount'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d', mt: 0.5 }}>
                    ₹ <DisplayNumber value={totalCollectedAmount.toFixed(2)} />
                  </Typography>
                </Box>
                <MonetizationOn sx={{ fontSize: 36, color: '#a7f3d0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Total Pending Amount */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${totalPendingAmount > 0 ? '#dc2626' : '#64748b'}`, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', bgcolor: totalPendingAmount > 0 ? '#fef2f2' : '#f8fafc' }}>
            <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: totalPendingAmount > 0 ? '#991b1b' : 'text.secondary', fontWeight: 800 }}>
                    {isGu ? 'બાકી વસૂલાત રકમ' : 'Remaining Pending'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: totalPendingAmount > 0 ? '#dc2626' : '#64748b', mt: 0.5 }}>
                    ₹ <DisplayNumber value={totalPendingAmount.toFixed(2)} />
                  </Typography>
                </Box>
                <PendingActions sx={{ fontSize: 36, color: totalPendingAmount > 0 ? '#fecaca' : '#cbd5e1' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
          <Tab label={isGu ? '💸 ૧. ઓપરેટિંગ ખર્ચાઓ' : '💸 1. Operating Expenses'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
          <Tab label={isGu ? '👥 ૨. સભાસદવાર વહેંચણી અને હિસાબ' : '👥 2. Member Cost Sharing'} sx={{ fontWeight: 700, fontSize: '0.88rem' }} />
        </Tabs>

        {/* Search Filter */}
        <TextField
          size="small"
          placeholder={isGu ? 'શોધો...' : 'Search...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 200, bgcolor: '#fff', borderRadius: 1 }}
        />
      </Box>

      {/* TAB 0: OPERATING & FIXED EXPENSES LOG (Adjusted layout, Category removed) */}
      {activeTab === 0 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 50, color: '#475569' }}>{isGu ? '૧. ક્રમ' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ખર્ચ વિગત' : 'Expense Title'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center', width: 120 }}>{isGu ? 'જથ્થો & એકમ' : 'Quantity & Unit'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'right', width: 110 }}>{isGu ? 'ભાવ (₹)' : 'Rate (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#c2410c', textAlign: 'right', width: 130 }}>{isGu ? 'કુલ રકમ (₹)' : 'Total (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center', width: 110 }}>{isGu ? 'તારીખ' : 'Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ચૂકવણી / વેપારી' : 'Paid To / Mode'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'નોંધ' : 'Remarks'}</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', width: 90 }}>{isGu ? 'ક્રિયાઓ' : 'Actions'}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.map((exp: any, index: number) => (
                  <TableRow key={exp.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      <DisplayNumber value={(index + 1).toString()} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {exp.title}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography component="span" sx={{ fontWeight: 700, color: '#0284c7' }}>
                        <DisplayNumber value={exp.quantity?.toString() || '1'} />
                      </Typography>{' '}
                      <Typography component="span" variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {exp.unit || (isGu ? 'નંગ' : 'Nos')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {exp.price_per_unit > 0 ? (
                        <>₹ <DisplayNumber value={(exp.price_per_unit || 0).toFixed(2)} /></>
                      ) : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                      ₹ <DisplayNumber value={(exp.amount || 0).toFixed(2)} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#475569' }}>
                      <DisplayNumber value={exp.expense_date || '-'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{exp.paid_to || '-'}</Typography>
                      {exp.payment_mode && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ({exp.payment_mode})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b' }}>
                      {exp.remarks || '-'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title={isGu ? 'સુધારો' : 'Edit'}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenExpenseModal(exp)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isGu ? 'કાઢી નાખો' : 'Delete'}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (window.confirm(isGu ? 'શું તમે આ ખર્ચની એન્ટ્રી કાઢી નાખવા માંગો છો?' : 'Do you want to delete this expense?')) {
                                deleteExpenseMutation.mutate(exp.id);
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

                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loadingSummary ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ ઓપરેટિંગ ખર્ચ નોંધાયેલ નથી.' : 'No expenses recorded.')}
                    </TableCell>
                  </TableRow>
                )}

                {filteredExpenses.length > 0 && (
                  <TableRow sx={{ bgcolor: '#fff7ed', borderTop: '2px solid #fed7aa' }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'right' }}>
                      {isGu ? 'કુલ ઓપરેટિંગ ખર્ચ સરવાળો:' : 'Total Operating Expenses:'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#c2410c', fontSize: '1rem' }}>
                      ₹ <DisplayNumber value={totalMonthlyCost.toFixed(2)} />
                    </TableCell>
                    <TableCell colSpan={isAdmin ? 4 : 3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 1: MEMBER COST ALLOCATION & PAYMENT STATUS LEDGER */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, sm: 1.5 }, py: 1.2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, width: 45, color: '#475569' }}>{isGu ? 'સ.નં.' : 'No.'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'સભાસદનું નામ' : 'Member Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'ફાળવેલ ગાયો' : 'Assigned Cows'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'right' }}>{isGu ? 'માસિક હિસ્સો (₹)' : 'Monthly Share (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#15803d', textAlign: 'right' }}>{isGu ? 'ચૂકવેલ રકમ (₹)' : 'Amount Paid (₹)'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'સ્થિતિ' : 'Status'}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', textAlign: 'center' }}>{isGu ? 'ચૂકવણી તારીખ & માધ્યમ' : 'Payment Date & Mode'}</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 800, color: '#475569' }}>{isGu ? 'ક્રિયા' : 'Action'}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMemberShares.map((m: any) => {
                  const isPaid = m.status === 'Paid';
                  return (
                    <TableRow key={m.member_id} hover sx={{ bgcolor: isPaid ? '#f0fdf4' : 'inherit' }}>
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
                      <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#c2410c' }}>
                        ₹ <DisplayNumber value={(m.calculated_share || 0).toFixed(2)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                        ₹ <DisplayNumber value={(m.amount_paid || 0).toFixed(2)} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          size="small"
                          icon={isPaid ? <CheckCircle fontSize="small" /> : <HourglassEmpty fontSize="small" />}
                          label={isPaid ? (isGu ? 'ચૂકવેલ' : 'Paid') : (isGu ? 'બાકી' : 'Pending')}
                          color={isPaid ? 'success' : 'warning'}
                          sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>
                        {m.payment_date ? (
                          <>
                            <DisplayNumber value={m.payment_date} />
                            {m.payment_mode && (
                              <Typography variant="caption" display="block" sx={{ color: '#64748b' }}>
                                {m.payment_mode}
                              </Typography>
                            )}
                          </>
                        ) : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            color={isPaid ? 'primary' : 'success'}
                            startIcon={<Payment />}
                            onClick={() => handleOpenPaymentModal(m)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderRadius: 1.5, fontWeight: 700 }}
                          >
                            {isPaid ? (isGu ? 'સુધારો' : 'Edit') : (isGu ? 'ચૂકવણી નોંધો' : 'Record Payment')}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}

                {filteredMemberShares.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loadingSummary ? (isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading...') : (isGu ? 'કોઈ સભાસદો ઉપલબ્ધ નથી.' : 'No members found.')}
                    </TableCell>
                  </TableRow>
                )}

                {/* Bottom Summary Totals */}
                {filteredMemberShares.length > 0 && (
                  <TableRow sx={{ bgcolor: '#fff7ed', borderTop: '2px solid #fed7aa' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'right' }}>
                      {isGu ? 'કુલ સરવાળો:' : 'Grand Total:'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#c2410c', fontSize: '0.95rem' }}>
                      ₹ <DisplayNumber value={totalMonthlyCost.toFixed(2)} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 900, color: '#15803d', fontSize: '0.95rem' }}>
                      ₹ <DisplayNumber value={totalCollectedAmount.toFixed(2)} />
                    </TableCell>
                    <TableCell colSpan={isAdmin ? 3 : 2} sx={{ fontWeight: 800, color: '#9a3412', textAlign: 'center' }}>
                      {isGu ? 'બાકી રકમ: ' : 'Remaining: '}₹ <DisplayNumber value={totalPendingAmount.toFixed(2)} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* MODAL 1: ADD / EDIT OPERATING EXPENSE (Clean Layout without Category) */}
      <Dialog open={openExpenseModal} onClose={handleCloseExpenseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#c2410c', pb: 1 }}>
          {editingExpenseId ? (isGu ? 'ખર્ચ વિગત સુધારો' : 'Edit Expense Details') : (isGu ? 'નવો ઓપરેટિંગ ખર્ચ ઉમેરો' : 'Add Operating Expense')}
        </DialogTitle>
        <form onSubmit={handleSubmitExpense(onSubmitExpense)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TransliteratedAutocomplete
              name="title"
              control={controlExpense}
              label={isGu ? "ખર્ચનું નામ / વિગત *" : "Expense Title *"}
              options={distinctTitles}
              placeholder={isGu ? "લખો અથવા ડ્રોપડાઉનમાંથી પસંદ કરો..." : "Type or select from dropdown..."}
              required
              onOptionSelect={(selectedTitle) => {
                const match = (summaryData?.expenses || []).find((e: any) => e.title === selectedTitle);
                if (match) {
                  if (match.unit) setValueExpense('unit', match.unit);
                  if (match.price_per_unit) setValueExpense('price_per_unit', match.price_per_unit);
                }
              }}
            />

            {/* Row 1: Quantity and Unit */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="quantity"
                  control={controlExpense}
                  label={isGu ? "જથ્થો / એકમ સંખ્યા" : "Quantity"}
                  inputProps={{ step: '0.01', min: '0.01' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TransliteratedAutocomplete
                  name="unit"
                  control={controlExpense}
                  label={isGu ? "એકમ *" : "Unit *"}
                  options={distinctUnits}
                  placeholder={isGu ? "પસંદ કરો અથવા નવો એકમ લખો..." : "Select or type unit..."}
                />
              </Grid>
            </Grid>

            {/* Row 2: Price per unit and Total Amount */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="price_per_unit"
                  control={controlExpense}
                  label={isGu ? "નંગ / એકમ દીઠ ભાવ (₹)" : "Price / Unit Rate (₹)"}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <GujaratiNumberInput
                  name="amount"
                  control={controlExpense}
                  label={isGu ? "કુલ ખર્ચ રકમ (₹) *" : "Total Amount (₹) *"}
                  inputProps={{ step: '0.01', min: '0.01' }}
                />
              </Grid>
            </Grid>

            {/* Row 3: Expense Date and Payment Mode */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label={isGu ? "ખર્ચ તારીખ" : "Expense Date"}
                  InputLabelProps={{ shrink: true }}
                  {...registerExpense('expense_date')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={isGu ? "ચૂકવણી માધ્યમ" : "Payment Mode"}
                  {...registerExpense('payment_mode')}
                >
                  {paymentModes.map((pm) => (
                    <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Row 4: Paid To and Remarks */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TransliteratedInput
                  name="paid_to"
                  control={controlExpense}
                  label={isGu ? "કોને ચૂકવ્યા / દુકાન / વ્યક્તિ" : "Paid To / Shop / Person"}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TransliteratedInput
                  name="remarks"
                  control={controlExpense}
                  label={isGu ? "નોંધ / બિલ નંબર" : "Remarks / Bill Number"}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseExpenseModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" disabled={expenseMutation.isPending}>
              {editingExpenseId ? (isGu ? 'સુધારો સાચવો' : 'Save Changes') : (isGu ? 'ખર્ચ સાચવો' : 'Save Expense')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 2: RECORD MEMBER PAYMENT */}
      <Dialog open={openPaymentModal} onClose={handleClosePaymentModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#15803d', pb: 1 }}>
          {isGu ? 'સભાસદ ચૂકવણી નોંધ' : 'Record Member Payment'}
        </DialogTitle>
        <form onSubmit={handleSubmitPayment(onSubmitPayment)}>
          <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedMemberForPayment && (
              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534' }}>
                  {selectedMemberForPayment.name} {selectedMemberForPayment.name2 ? `(${selectedMemberForPayment.name2})` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', display: 'block', mt: 0.5, fontWeight: 600 }}>
                  {isGu ? 'સભાસદ નં:' : 'Member #:'} {selectedMemberForPayment.member_number} • {isGu ? 'માસિક હિસ્સો:' : 'Monthly Share:'} ₹ {selectedMemberForPayment.calculated_share.toFixed(2)}
                </Typography>
              </Box>
            )}

            <GujaratiNumberInput
              name="amount_paid"
              control={controlPayment}
              label={isGu ? "ચૂકવેલ રકમ (₹) *" : "Amount Paid (₹) *"}
              inputProps={{ step: '0.01', min: '0' }}
            />

            <TextField
              select
              fullWidth
              size="small"
              label={isGu ? "સ્થિતિ" : "Status"}
              {...registerPayment('status')}
            >
              <MenuItem value="Paid">{isGu ? 'ચૂકવેલ' : 'Paid'}</MenuItem>
              <MenuItem value="Partial">{isGu ? 'આંશિક' : 'Partial'}</MenuItem>
              <MenuItem value="Pending">{isGu ? 'બાકી' : 'Pending'}</MenuItem>
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label={isGu ? "ચૂકવણી તારીખ" : "Payment Date"}
                  InputLabelProps={{ shrink: true }}
                  {...registerPayment('payment_date')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={isGu ? "ચૂકવણી માધ્યમ" : "Payment Mode"}
                  {...registerPayment('payment_mode')}
                >
                  {paymentModes.map((pm) => (
                    <MenuItem key={pm} value={pm}>{pm}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <TransliteratedInput
              name="remarks"
              control={controlPayment}
              label={isGu ? "નોંધ / રસીદ નંબર" : "Remarks / Receipt Number"}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleClosePaymentModal} color="inherit">{isGu ? 'રદ કરો' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" color="success" disabled={paymentMutation.isPending}>
              {isGu ? 'ચૂકવણી સાચવો' : 'Save Payment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </MainLayout>
  );
};

export default Expenses;
