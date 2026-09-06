import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Button, TextField, Grid, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { GridOn, Print, Visibility } from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import axiosClient from '../api/axiosClient';
import * as XLSX from 'xlsx';
import DisplayNumber from '../components/DisplayNumber';
import { formatGujaratiNumber } from '../utils/formatNumber';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
const Reports = () => {
  const { t, i18n } = useTranslation();
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('members');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const formatNum = (val: string | number | null | undefined, decimals?: number) => {
    if (val === null || val === undefined || val === '') return '-';
    let formatted = '';
    if (typeof val === 'number') {
      formatted = decimals !== undefined ? val.toFixed(decimals) : val.toString();
    } else {
      formatted = val.toString();
    }
    return formatGujaratiNumber(formatted, i18n.language);
  };

  const setDateRange = (range: 'month' | 'year') => {
    setStartDate(dayjs().startOf(range).format('YYYY-MM-DD'));
    setEndDate(dayjs().endOf(range).format('YYYY-MM-DD'));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      if (reportType === 'cows-status') {
        const res = await axiosClient.get(`/reports/cows-status?_t=${Date.now()}`);
        setReportData({ type: 'cows-status', cows: res.data.cows });
        return;
      }

      const res = await axiosClient.get(`/reports/${reportType}?start_date=${startDate}&end_date=${endDate}&_t=${Date.now()}`);

      // Safety check: If the backend hasn't been restarted, it returns the old array format instead of the new grid format
      if (!res.data || !res.data.dates) {
        alert("The server is still running the old version! Please restart your Python backend server so it can load the new advanced reports. (Check console for data)");
        setReportData(null);
        return;
      }

      if (res.data.cows) {
        res.data.cows.sort((a: any, b: any) => {
          const numA = parseInt(a.tag_number);
          const numB = parseInt(b.tag_number);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.tag_number || '').toString().localeCompare((b.tag_number || '').toString());
        });
      }
      setReportData({ type: reportType, ...res.data });
    } catch (err) {
      alert("Failed to fetch report data. Please ensure the backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    let data = [];
    let fileName = '';

    if (reportData.type === 'cows-status') {
      data = reportData.cows.map((c: any) => {
        const historySummary = (c.history || []).map((h: any) => `[${h.change_date}: ${h.type || '-'} (${h.condition || '-'}) | ${h.calf_type || '-'}${h.remarks ? ' - ' + h.remarks : ''}]`).join('\n');
        const assignedNames = (c.assigned_members || []).map((m: any) => `${m.name}${m.name2 ? ' / ' + m.name2 : ''} (નં. ${m.member_number || '-'})`).join(', ');

        return {
          'ગાય નંબર (Cow No)': c.cow_number || '-',
          'નામ (Name)': c.cow_name || '-',
          'ખીલા નં. / ઓલાદ (Breed)': c.breed || '-',
          'દૂધ આપતી કે ન આપતી (Milk Producing Status)': c.type || '-',
          'હાલની સ્થિતિ (Condition)': c.condition || '-',
          'વાછરડું કે વાછરડી (Calf Type)': c.calf_type || '-',
          'ખરીદી કિંમત (₹) (Purchase Price)': c.purchase_price || '-',
          'ખરીદી તારીખ (Purchase Date)': c.purchase_date || '-',
          'જન્મ તારીખ (Birth Date)': c.birth_date || '-',
          'ફાળવેલ સભાસદો (Assigned Members)': assignedNames || '-',
          'દૂધ ઉત્પાદન અને સ્થિતિ ઇતિહાસ (Timeline)': historySummary || '-',
          'નોંધ (Remarks)': c.remarks || '-'
        };
      });
      fileName = `Cow_Status_Milk_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    } else if (reportData.type === 'cows') {
      data = reportData.cows.map((c: any) => {
        const row: any = {
          'ટેગ નં (Tag No)': c.tag_number || '-',
          'ગાયનું નામ (Cow Name)': c.name,
        };
        reportData.dates.forEach((d: string) => {
          const formattedDate = dayjs(d).format('DD/MM');
          row[`${formattedDate} સવાર`] = c.daily_data[d].morning || 0;
          row[`${formattedDate} સાંજ`] = c.daily_data[d].evening || 0;
        });
        row['કુલ સવાર (Total Morning)'] = c.total_morning;
        row['કુલ સાંજ (Total Evening)'] = c.total_evening;
        row['કુલ દૂધ (Total Milk)'] = c.total_qty;
        return row;
      });
      fileName = `Cow_Milk_Report_${startDate}_to_${endDate}.xlsx`;
    } else {
      data = reportData.members.map((m: any) => {
        const row: any = {
          'ક્રમ (No.)': m.member_number || '-',
          'નામ (Name)': m.member_name,
        };
        reportData.dates.forEach((d: string) => {
          const val = m.daily_data[d];
          row[dayjs(d).format('DD/MM')] = typeof val === 'number' ? val : (val?.total || 0);
        });
        row['કુલ દૂધ (Total Milk)'] = m.total_qty;
        return row;
      });
      fileName = `Member_Distribution_Report_${startDate}_to_${endDate}.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  };

  const printPDF = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF');
      return;
    }

    if (reportData.type === 'cows-status') {
      const rows = reportData.cows.map((c: any) => {
        const assignedNames = (c.assigned_members || []).map((m: any) => `${m.name}${m.name2 ? ' / ' + m.name2 : ''} (નં. ${m.member_number || '-'})`).join(', ') || '-';
        const historyText = (c.history || []).map((h: any) => `<div><strong>${h.change_date}</strong>: <span style="color:${h.type?.includes('ન') ? '#dc2626' : '#15803d'}; font-weight:bold;">${h.type || '-'}</span> (${h.condition || '-'})${h.remarks ? ' - ' + h.remarks : ''}</div>`).join('') || '-';

        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${formatNum(c.cow_number)}</td>
            <td style="font-weight:bold; text-align:left; padding-left:4px;">${c.cow_name || '-'}</td>
            <td style="text-align:center;">${c.breed || '-'}</td>
            <td style="text-align:center; font-weight:bold; color:${c.type?.includes('ન') ? '#dc2626' : '#15803d'};">${c.type || '-'}</td>
            <td style="text-align:center; font-weight:bold; color:#047857;">${c.condition || '-'}</td>
            <td style="text-align:center;">${c.calf_type || '-'}</td>
            <td style="text-align:center;">${c.purchase_price ? '₹ ' + formatNum(c.purchase_price) : '-'}</td>
            <td style="text-align:left; font-size:7.5px;">${assignedNames}</td>
            <td style="text-align:left; font-size:7.5px;">${historyText}</td>
          </tr>
        `;
      }).join('');

      const fullHtml = `
        <html>
        <head>
          <title>Cow Milk Status & History Report</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            @media print {
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; font-size: 8px; color: #000; background-color: #fff; }
            .header { text-align: center; margin-bottom: 8px; border-bottom: 1.5px solid #ea580c; padding-bottom: 4px; }
            h2 { margin: 0; color: #c2410c; font-size: 14px; text-transform: uppercase; }
            .subtitle { font-size: 10px; color: #ea580c; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #ea580c; }
            th, td { border: 0.8px solid #fed7aa; padding: 3px 2px; line-height: 1.2; font-size: 8px; }
            th { background-color: #f97316; color: #fff; font-weight: bold; font-size: 8px; text-align: center; }
            tbody tr:nth-child(even) { background-color: #fff7ed; }
            tbody tr:nth-child(odd) { background-color: #ffffff; }
            .footer { text-align: right; margin-top: 8px; font-size: 7.5px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>વંદે માતરમ્ ગૌ હોસ્ટેલ</h2>
            <div class="subtitle">ગાય દૂધ ઉત્પાદન સ્થિતિ અને ઇતિહાસ અહેવાલ (Cow Milk Producing Status & History Report)</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:45px;">ગાય નં.</th>
                <th style="width:75px;">નામ</th>
                <th style="width:60px;">ખીલા નં.</th>
                <th style="width:80px;">દૂધ આપતી/ન આપતી</th>
                <th style="width:70px;">હાલની સ્થિતિ</th>
                <th style="width:60px;">વાછરડું/ડી</th>
                <th style="width:60px;">ખરીદી કિંમત</th>
                <th style="width:130px;">ફાળવેલ સભાસદો</th>
                <th>દૂધ ઉત્પાદન અને સ્થિતિ ફેરફાર ઇતિહાસ (Timeline)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            રિપોર્ટ તારીખ: ${dayjs().format('DD-MM-YYYY hh:mm A')} | વંદે માતરમ્ ગૌ હોસ્ટેલ
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return;
    }

    const isCows = reportData.type === 'cows';
    const title = isCows ? 'ગાયનું દૂધ ઉત્પાદન પત્રક (Cow Milk Report)' : 'દૂધ વિતરણ પત્રક (Member Distribution Report)';

    // Group dates by month
    const monthGroups: { [key: string]: string[] } = {};
    reportData.dates.forEach((d: string) => {
      const monthKey = dayjs(d).format('MMMM YYYY');
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(d);
    });

    const monthKeys = Object.keys(monthGroups);

    let fullHtml = `
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 6mm 6mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; font-size: 7.5px; color: #000; background-color: #fff; }
          .month-section { margin-bottom: 8px; }
          .page-break { page-break-before: always; }
          .center-container { text-align: center; margin-bottom: 3px; }
          h2 { text-align: center; margin: 0 0 1px 0; color: #c2410c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
          .date-range { text-align: center; margin-bottom: 3px; color: #ea580c; font-size: 10px; font-weight: bold; border-bottom: 1px solid #fed7aa; display: inline-block; padding-bottom: 1px; }
          .part-badge { font-size: 8px; font-weight: bold; color: #9a3412; margin: 3px 0 1px 0; background: #fff7ed; padding: 1px 6px; border-left: 3px solid #f97316; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-top: 1px; margin-bottom: 6px; page-break-inside: auto; border: 1px solid #ea580c; table-layout: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 0.8px solid #fed7aa; padding: 2px 0.8px; text-align: center; color: #000; line-height: 1.15; font-size: 7.5px; }
          th { background-color: #f97316; color: #fff; font-weight: bold; font-size: 7.5px; border: 0.8px solid #ea580c; }
          th.sub-head { background-color: #ffedd5; color: #9a3412; font-size: 6.8px; border: 0.8px solid #fdba74; }
          th.total-head { background-color: #15803d; color: #fff; border: 0.8px solid #166534; font-size: 7.5px; }
          tbody tr:nth-child(even) { background-color: #fff7ed; }
          tbody tr:nth-child(odd) { background-color: #ffffff; }
          .text-left { text-align: left; padding-left: 3px; font-weight: bold; font-size: 7.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
          .nowrap { white-space: nowrap; font-size: 7px; }
          .col-total { background-color: #f0fdf4 !important; font-weight: bold; color: #166534; border-left: 1px solid #86efac; font-size: 7.5px; }
          .row-total-bottom { background-color: #ea580c !important; color: #fff !important; font-weight: bold; font-size: 8px; }
          .row-total-bottom td { color: #fff !important; border: 0.8px solid #c2410c; padding: 2.5px 0.8px; font-size: 8px; }
        </style>
      </head>
      <body>
    `;

    monthKeys.forEach((mKey, monthIndex) => {
      const allMonthDates = monthGroups[mKey];

      let monthHtml = '';
      if (monthIndex > 0) monthHtml += `<div class="page-break"></div>`;

      monthHtml += `<div class="month-section">`;
      monthHtml += `
        <div class="center-container">
          <h2>વંદે માતરમ ગૌ છાત્રાલય</h2>
          <h2>${title}</h2>
          <div class="date-range">મહિનો (Month): ${mKey}</div>
        </div>
      `;

      if (isCows) {
        // Divide month into 2 parts: Part 1 (Days 1 to 15) and Part 2 (Days 16 to end)
        const half = Math.ceil(allMonthDates.length / 2);
        const chunk1 = allMonthDates.slice(0, half);
        const chunk2 = allMonthDates.slice(half);

        const chunksToRender = [];
        if (chunk1.length > 0) chunksToRender.push({ dates: chunk1, isLast: chunk2.length === 0, partLabel: 'ભાગ ૧: તારીખ ૧ થી ૧૫ (Part 1: Day 1 to 15)' });
        if (chunk2.length > 0) chunksToRender.push({ dates: chunk2, isLast: true, partLabel: 'ભાગ ૨: તારીખ ૧૬ થી માસિક કુલ (Part 2: Day 16 to Month Total)' });

        chunksToRender.forEach((chunk) => {
          const isLastChunk = chunk.isLast;
          const dateTotals: any = {};
          chunk.dates.forEach((d: string) => dateTotals[d] = { morning: 0, evening: 0 });

          let monthGrandMorning = 0;
          let monthGrandEvening = 0;
          let monthGrandOverall = 0;

          monthHtml += `
            <div class="part-badge">${chunk.partLabel}</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 32px;">ટેગ નં<br/>Tag</th>
                  <th class="text-left" rowspan="2" style="min-width: 110px;">ગાયનું નામ<br/>Name</th>
                  ${chunk.dates.map((d: string) => `<th colspan="2" class="nowrap">${formatNum(dayjs(d).format('DD/MM'))}</th>`).join('')}
                  ${isLastChunk ? `<th colspan="3" class="total-head">મહિનાનું કુલ (Month Total)</th>` : ''}
                </tr>
                <tr>
                  ${chunk.dates.map(() => `<th class="sub-head">સવાર</th><th class="sub-head">સાંજ</th>`).join('')}
                  ${isLastChunk ? `<th class="sub-head" style="background-color: #dcfce7; color: #166534;">સવાર</th><th class="sub-head" style="background-color: #dcfce7; color: #166534;">સાંજ</th><th class="total-head">કુલ</th>` : ''}
                </tr>
              </thead>
              <tbody>
          `;

          reportData.cows.forEach((c: any) => {
            let cowMonthMorning = 0;
            let cowMonthEvening = 0;
            allMonthDates.forEach((md: string) => {
              cowMonthMorning += c.daily_data[md]?.morning || 0;
              cowMonthEvening += c.daily_data[md]?.evening || 0;
            });
            const cowMonthQty = cowMonthMorning + cowMonthEvening;

            if (isLastChunk) {
              monthGrandMorning += cowMonthMorning;
              monthGrandEvening += cowMonthEvening;
              monthGrandOverall += cowMonthQty;
            }

            monthHtml += `<tr>
              <td><strong>${formatNum(c.tag_number || '-')}</strong></td>
              <td class="text-left">${c.name}</td>
            `;

            chunk.dates.forEach((d: string) => {
              dateTotals[d].morning += c.daily_data[d]?.morning || 0;
              dateTotals[d].evening += c.daily_data[d]?.evening || 0;
              monthHtml += `
                <td>${c.daily_data[d]?.morning ? formatNum(c.daily_data[d].morning, 2) : '-'}</td>
                <td>${c.daily_data[d]?.evening ? formatNum(c.daily_data[d].evening, 2) : '-'}</td>
              `;
            });

            if (isLastChunk) {
              monthHtml += `
                <td class="col-total">${formatNum(cowMonthMorning, 2)}</td>
                <td class="col-total">${formatNum(cowMonthEvening, 2)}</td>
                <td class="col-total" style="background-color: #dcfce7 !important;">${formatNum(cowMonthQty, 2)}</td>
              `;
            }
            monthHtml += `</tr>`;
          });

          monthHtml += `<tr class="row-total-bottom">
            <td colspan="2" class="text-left" style="text-align: right; padding-right: 6px;">કુલ (Day Total)</td>
          `;
          chunk.dates.forEach((d: string) => {
            monthHtml += `
              <td>${formatNum(dateTotals[d].morning, 2)}</td>
              <td>${formatNum(dateTotals[d].evening, 2)}</td>
            `;
          });
          if (isLastChunk) {
            monthHtml += `
              <td style="background-color: #166534 !important;">${formatNum(monthGrandMorning, 2)}</td>
              <td style="background-color: #166534 !important;">${formatNum(monthGrandEvening, 2)}</td>
              <td style="background-color: #14532d !important;">${formatNum(monthGrandOverall, 2)}</td>
            `;
          }
          monthHtml += `</tr></tbody></table>`;
        });
      } else {
        // Members Report (Single clean table per month)
        let monthGrandTotal = 0;
        const dateTotals: any = {};
        allMonthDates.forEach((d: string) => dateTotals[d] = 0);

        monthHtml += `
          <table>
            <thead>
              <tr>
                <th style="width: 32px;">ક્રમ<br/>No.</th>
                <th class="text-left" style="min-width: 120px;">નામ<br/>Name</th>
                ${allMonthDates.map((d: string) => `<th class="nowrap">${formatNum(dayjs(d).format('DD/MM'))}</th>`).join('')}
                <th class="total-head">કુલ<br/>Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        reportData.members.forEach((m: any) => {
          let memberMonthTotal = 0;
          allMonthDates.forEach((md: string) => {
            const val = m.daily_data[md];
            memberMonthTotal += typeof val === 'number' ? val : (val?.total || 0);
          });

          monthGrandTotal += memberMonthTotal;

          monthHtml += `<tr>
            <td><strong>${formatNum(m.member_number || '-')}</strong></td>
            <td class="text-left">${m.member_name}</td>
          `;
          allMonthDates.forEach((d: string) => {
            const val = m.daily_data[d];
            const totalVal = typeof val === 'number' ? val : (val?.total || 0);
            dateTotals[d] += totalVal;
            monthHtml += `<td>${totalVal ? formatNum(totalVal, 3) : '-'}</td>`;
          });

          monthHtml += `<td class="col-total" style="background-color: #dcfce7 !important;">${formatNum(memberMonthTotal, 3)}</td>`;
          monthHtml += `</tr>`;
        });

        monthHtml += `<tr class="row-total-bottom">
          <td colspan="2" class="text-left" style="text-align: right; padding-right: 6px;">કુલ (Day Total)</td>
        `;
        allMonthDates.forEach((d: string) => {
          monthHtml += `<td>${formatNum(dateTotals[d], 3)}</td>`;
        });
        monthHtml += `<td style="background-color: #166534 !important;">${formatNum(monthGrandTotal, 3)}</td>`;
        monthHtml += `</tr></tbody></table>`;
      }

      monthHtml += `</div>`;
      fullHtml += monthHtml;
    });

    fullHtml += `
          <script>
            window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); }
          </script>
        </body></html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  const renderTable = () => {
    if (!reportData) return null;

    if (reportData.type === 'cows-status') {
      return (
        <Card sx={{ mt: 4, width: '100%', overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ગાય સ્થિતિ અને પ્રકાર વિગતવાર અહેવાલ (Cow Status & Type History Report)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="success" size="small" startIcon={<GridOn />} onClick={handleExportExcel} sx={{ bgcolor: 'white', color: 'success.main', fontWeight: 700, '&:hover': { bgcolor: '#f0f0f0' } }}>
                Excel
              </Button>
              <Button variant="contained" color="error" size="small" startIcon={<Print />} onClick={printPDF} sx={{ bgcolor: 'white', color: 'error.main', fontWeight: 700, '&:hover': { bgcolor: '#f0f0f0' } }}>
                PDF
              </Button>
            </Box>
          </Box>
          <TableContainer sx={{ maxHeight: 650 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>ગાય નં.</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>નામ</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>ખીલા નં.</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>દૂધ આપતી / ન આપતી</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>હાલની સ્થિતિ</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>વાછરડું/ડી</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>ખરીદી કિંમત</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>ફાળવેલ સભાસદો</TableCell>
                  <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>દૂધ ઉત્પાદન અને સ્થિતિ ઇતિહાસ (Timeline)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.cows.map((c: any) => {
                  const assignedNames = (c.assigned_members || []).map((m: any) => `${m.name}${m.name2 ? ' / ' + m.name2 : ''} (નં. ${m.member_number || '-'})`).join(', ') || '-';
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}><DisplayNumber value={c.cow_number} /></TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{c.cow_name || '-'}</TableCell>
                      <TableCell>{c.breed || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: c.type?.includes('ન') ? '#dc2626' : '#15803d' }}>
                        {c.type || '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#047857' }}>{c.condition || '-'}</TableCell>
                      <TableCell>{c.calf_type || '-'}</TableCell>
                      <TableCell>{c.purchase_price ? <>₹ <DisplayNumber value={c.purchase_price} /></> : '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{assignedNames}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#475569' }}>
                        {(c.history || []).map((h: any) => (
                          <div key={h.id} style={{ marginBottom: 2 }}>
                            <strong><DisplayNumber value={h.change_date} /></strong>: <span style={{ color: h.type?.includes('ન') ? '#dc2626' : '#15803d', fontWeight: 600 }}>{h.type || '-'}</span> ({h.condition}){h.remarks ? ` - ${h.remarks}` : ''}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      );
    }

    const isCows = reportData.type === 'cows';

    return (
      <Card sx={{ mt: 4, width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">
            {isCows ? 'ગાયનું દૂધ ઉત્પાદન પત્રક (Cow Milk Report)' : 'દૂધ વિતરણ પત્રક (Member Distribution)'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="success" size="small" startIcon={<GridOn />} onClick={handleExportExcel} sx={{ bgcolor: 'white', color: 'success.main', '&:hover': { bgcolor: '#f0f0f0' } }}>
              Excel
            </Button>
            <Button variant="contained" color="error" size="small" startIcon={<Print />} onClick={printPDF} sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: '#f0f0f0' } }}>
              PDF
            </Button>
          </Box>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader sx={{ minWidth: isCows ? 1200 : 800 }}>
            <TableHead>
              <TableRow>
                {isCows ? (
                  <>
                    <TableCell rowSpan={2} sx={{ bgcolor: 'grey.100', position: 'sticky', left: 0, zIndex: 3, borderRight: '1px solid #ddd', minWidth: 60 }}><strong>ટેગ નં</strong></TableCell>
                    <TableCell rowSpan={2} sx={{ bgcolor: 'grey.100', position: 'sticky', left: 60, zIndex: 3, borderRight: '2px solid #ccc', minWidth: 150 }}><strong>ગાયનું નામ</strong></TableCell>
                    {reportData.dates.map((d: string) => (
                      <TableCell key={d} colSpan={2} align="center" sx={{ bgcolor: 'grey.50', borderRight: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                        <strong>{dayjs(d).format('DD/MM')}</strong>
                      </TableCell>
                    ))}
                    <TableCell colSpan={3} align="center" sx={{ bgcolor: '#e3f2fd', borderLeft: '2px solid #ccc', position: 'sticky', right: 0, zIndex: 4 }}><strong>કુલ (Total)</strong></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ bgcolor: 'grey.100', position: 'sticky', left: 0, zIndex: 2, borderRight: '1px solid #ddd' }}><strong>ક્રમ</strong></TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', position: 'sticky', left: 50, zIndex: 2, borderRight: '2px solid #ccc', minWidth: 150 }}><strong>સભ્યનું નામ</strong></TableCell>
                    {reportData.dates.map((d: string) => (
                      <TableCell key={d} align="center" sx={{ bgcolor: 'grey.50', minWidth: 60, whiteSpace: 'nowrap', borderRight: '1px solid #eee' }}>
                        <strong>{dayjs(d).format('DD/MM')}</strong>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ bgcolor: '#e3f2fd', borderLeft: '2px solid #ccc', position: 'sticky', right: 0, zIndex: 2 }}><strong>કુલ (Total)</strong></TableCell>
                  </>
                )}
              </TableRow>
              {isCows && (
                <TableRow>
                  {reportData.dates.map((d: string) => (
                    <React.Fragment key={d}>
                      <TableCell align="center" sx={{ bgcolor: 'grey.50', fontSize: '0.75rem', p: 0.5, borderRight: '1px solid #eee', minWidth: 45 }}>સવાર</TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'grey.50', fontSize: '0.75rem', p: 0.5, borderRight: '1px solid #ddd', minWidth: 45 }}>સાંજ</TableCell>
                    </React.Fragment>
                  ))}
                  <TableCell align="center" sx={{ bgcolor: '#e3f2fd', fontSize: '0.75rem', p: 0.5, borderLeft: '2px solid #ccc', position: 'sticky', right: 120, zIndex: 4, minWidth: 60 }}>સવાર</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#e3f2fd', fontSize: '0.75rem', p: 0.5, position: 'sticky', right: 60, zIndex: 4, minWidth: 60 }}>સાંજ</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#bbdefb', fontSize: '0.75rem', p: 0.5, fontWeight: 'bold', position: 'sticky', right: 0, zIndex: 4, minWidth: 60 }}>કુલ</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {isCows ? (
                reportData.cows.map((c: any) => (
                  <TableRow key={c.cow_id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #ddd' }}>
                      <DisplayNumber value={c.tag_number || ''} />
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '2px solid #ccc', fontWeight: 500 }}>
                      {c.name}
                    </TableCell>
                    {reportData.dates.map((d: string) => (
                      <React.Fragment key={d}>
                        <TableCell align="center" sx={{ borderRight: '1px solid #eee', p: 0.5, fontSize: '0.85rem' }}>
                          <DisplayNumber value={c.daily_data[d]?.morning || ''} />
                        </TableCell>
                        <TableCell align="center" sx={{ borderRight: '1px solid #ddd', p: 0.5, fontSize: '0.85rem' }}>
                          <DisplayNumber value={c.daily_data[d]?.evening || ''} />
                        </TableCell>
                      </React.Fragment>
                    ))}
                    <TableCell align="center" sx={{ bgcolor: '#f5f5f5', borderLeft: '2px solid #ccc', position: 'sticky', right: 120, zIndex: 2, fontWeight: 500 }}>
                      <DisplayNumber value={c.total_morning.toFixed(3)} />
                    </TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#f5f5f5', position: 'sticky', right: 60, zIndex: 2, fontWeight: 500 }}>
                      <DisplayNumber value={c.total_evening.toFixed(3)} />
                    </TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#e3f2fd', fontWeight: 'bold', position: 'sticky', right: 0, zIndex: 2 }}>
                      <DisplayNumber value={c.total_qty.toFixed(3)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                reportData.members.map((m: any) => (
                  <TableRow key={m.member_id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #ddd' }}>
                      <DisplayNumber value={m.member_number?.toString() || ''} />
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 50, bgcolor: 'background.paper', zIndex: 1, borderRight: '2px solid #ccc', fontWeight: 500 }}>
                      {m.member_name}
                    </TableCell>
                    {reportData.dates.map((d: string) => {
                      const val = m.daily_data[d];
                      const totalVal = typeof val === 'number' ? val : (val?.total || 0);
                      return (
                        <TableCell key={d} align="center" sx={{ minWidth: 60, p: 0.5, fontSize: '0.85rem', borderRight: '1px solid #eee' }}>
                          {totalVal ? <DisplayNumber value={totalVal} /> : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ bgcolor: '#e3f2fd', fontWeight: 'bold', borderLeft: '2px solid #ccc', position: 'sticky', right: 0, zIndex: 2 }}>
                      <DisplayNumber value={m.total_qty.toFixed(3)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  const renderChart = () => {
    if (!reportData || !Array.isArray(reportData.dates) || (reportData.type !== 'cows' && reportData.type !== 'members')) {
      return null;
    }
    const isCows = reportData.type === 'cows';

    const labels = reportData.dates.map((d: string) => dayjs(d).format('DD/MM'));
    const dailyTotals = reportData.dates.map((d: string) => {
      if (isCows) {
        return reportData.cows.reduce((sum: number, c: any) => sum + (c.daily_data[d]?.total || 0), 0);
      } else {
        return reportData.members.reduce((sum: number, m: any) => {
          const val = m.daily_data[d];
          return sum + (typeof val === 'number' ? val : (val?.total || 0));
        }, 0);
      }
    });

    const chartData = {
      labels,
      datasets: [
        {
          fill: true,
          label: isCows ? 'કુલ ઉત્પાદન (Liters)' : 'કુલ વિતરણ (Liters)',
          data: dailyTotals,
          borderColor: isCows ? 'rgb(255, 152, 0)' : 'rgb(76, 175, 80)',
          backgroundColor: isCows ? 'rgba(255, 152, 0, 0.2)' : 'rgba(76, 175, 80, 0.2)',
          tension: 0.3,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `જથ્થો: ${context.parsed.y.toFixed(3)} L`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'દૂધ (લિટરમાં)' }
        },
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };

    return (
      <Card sx={{ mt: 4, width: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom align="center">
            {isCows ? 'દૈનિક કુલ દૂધ ઉત્પાદન (Daily Total Milk Production)' : 'દૈનિક કુલ દૂધ વિતરણ (Daily Total Milk Distribution)'}
          </Typography>
          <Box sx={{ height: '350px', width: '100%' }}>
            <Line data={chartData} options={options} />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout title={t('reports.title')}>
      <Card sx={{ maxWidth: '100%', mt: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>{t('reports.export')}</Typography>
          <Typography color="textSecondary" paragraph>
            {t('reports.description')}
          </Typography>

          <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 2, mb: 2, border: '1px solid #e0e0e0' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={reportType === 'cows-status' ? 6 : 3}>
                <TextField
                  select
                  fullWidth
                  label="રિપોર્ટનો પ્રકાર (Report Type)"
                  value={reportType}
                  onChange={(e) => { setReportType(e.target.value); setReportData(null); }}
                  size="small"
                >
                  <MenuItem value="cows">ગાયનું દૂધ ઉત્પાદન (Cow Milk Report)</MenuItem>
                  <MenuItem value="members">સભ્યવાર વિતરણ (Member Distribution)</MenuItem>
                  <MenuItem value="cows-status">ગાય સ્થિતિ અને પ્રકાર વિગતવાર અહેવાલ (Cow Status & History Report)</MenuItem>
                </TextField>
              </Grid>

              {reportType !== 'cows-status' && (
                <>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setReportData(null); }}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setReportData(null); }}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="outlined" size="small" onClick={() => { setDateRange('month'); setReportData(null); }}>આ મહિનો<br/>Month</Button>
                      <Button variant="outlined" size="small" onClick={() => { setDateRange('year'); setReportData(null); }}>આ વર્ષ<br/>Year</Button>
                    </Box>
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={reportType === 'cows-status' ? 6 : 2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <Visibility />}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  Generate
                </Button>
              </Grid>
            </Grid>
          </Box>

        </CardContent>
      </Card>

      {renderTable()}
      {renderChart()}

    </MainLayout>
  );
};

export default Reports;
