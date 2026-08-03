import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Button, TextField, Grid, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { GridOn, Print, Visibility } from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import axiosClient from '../api/axiosClient';
import * as XLSX from 'xlsx';
import DisplayNumber from '../components/DisplayNumber';
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
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('members');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const setDateRange = (range: 'month' | 'year') => {
    setStartDate(dayjs().startOf(range).format('YYYY-MM-DD'));
    setEndDate(dayjs().endOf(range).format('YYYY-MM-DD'));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
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

    if (reportData.type === 'cows') {
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

    const isCows = reportData.type === 'cows';
    const title = isCows ? 'ગાયનું દૂધ ઉત્પાદન પત્રક (Cow Milk Report)' : 'દૂધ વિતરણ પત્રક (Member Distribution Report)';
    const landscape = '@page { size: landscape; }';
    
    // Group dates by month
    const monthGroups: { [key: string]: string[] } = {};
    reportData.dates.forEach((d: string) => {
      const monthKey = dayjs(d).format('MMMM YYYY'); 
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(d);
    });

    const pageChunks: { monthTitle: string, dates: string[], isLastOfMonth: boolean }[] = [];
    const monthKeys = Object.keys(monthGroups);
    
    monthKeys.forEach((mKey) => {
      const mDates = monthGroups[mKey];
      
      if (isCows) {
        // Cows need 2 horizontal pages per month because of Morning/Evening columns (max 16 days = ~35 columns)
        const chunks = [];
        const half = Math.ceil(mDates.length / 2);
        if (mDates.slice(0, half).length > 0) chunks.push(mDates.slice(0, half));
        if (mDates.slice(half).length > 0) chunks.push(mDates.slice(half));

        chunks.forEach((chunkDates, index) => {
          pageChunks.push({
            monthTitle: mKey,
            dates: chunkDates,
            isLastOfMonth: index === chunks.length - 1
          });
        });
      } else {
        // Members fit on 1 horizontal page per month (31 days + Name + Total = ~34 columns)
        // With compact CSS, this easily fits on A4 Landscape.
        pageChunks.push({
          monthTitle: mKey,
          dates: mDates,
          isLastOfMonth: true
        });
      }
    });

    let fullHtml = `
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; font-size: 9px; color: #000; background-color: #fff; }
          h2 { text-align: center; margin: 0 0 2px 0; color: #e65100; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .date-range { text-align: center; margin-bottom: 8px; color: #ff9800; font-size: 12px; font-weight: bold; border-bottom: 2px solid #ffcc80; display: inline-block; padding-bottom: 2px; }
          .center-container { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; page-break-inside: auto; border: 1.5px solid #e65100; table-layout: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { border: 1px solid #ffcc80; padding: 2px 1px; text-align: center; color: #000; line-height: 1.2; }
          th { background-color: #f57c00; color: #fff; font-weight: bold; font-size: 9px; border: 1px solid #e65100; }
          th.sub-head { background-color: #ffe0b2; color: #e65100; font-size: 8px; border: 1px solid #ffb74d; }
          th.total-head { background-color: #388e3c; color: #fff; border: 1px solid #2e7d32; font-size: 9px; }
          tbody tr:nth-child(even) { background-color: #fff3e0; }
          tbody tr:nth-child(odd) { background-color: #ffffff; }
          .text-left { text-align: left; padding-left: 4px; font-weight: bold; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
          .nowrap { white-space: nowrap; font-size: 8px; }
          .page-break { page-break-before: always; }
          .col-total { background-color: #e8f5e9 !important; font-weight: bold; color: #2e7d32; border-left: 1.5px solid #81c784; }
          .row-total-bottom { background-color: #e65100 !important; color: #fff !important; font-weight: bold; font-size: 10px; }
          .row-total-bottom td { color: #fff !important; border: 1px solid #bf360c; padding: 4px 1px; }
        </style>
      </head>
      <body>
    `;

    pageChunks.forEach((chunk, chunkIndex) => {
      const isLastChunk = chunk.isLastOfMonth;
      const allMonthDates = monthGroups[chunk.monthTitle];
      
      let tableHtml = '';
      if (chunkIndex > 0) tableHtml += `<div class="page-break"></div>`;
      
      tableHtml += `
        <div class="center-container">
          <h2>વંદે માતરમ ગૌ છાત્રાલય</h2>
          <h2>${title}</h2>
          <div class="date-range">મહિનો (Month): ${chunk.monthTitle}</div>
        </div>
        <table>
          <thead>
            <tr>
              ${isCows 
                ? `<th rowspan="2">ટેગ નં<br/>Tag</th><th class="text-left" rowspan="2" style="min-width: 150px;">ગાયનું નામ<br/>Name</th>`
                : `<th>ક્રમ<br/>No.</th><th class="text-left" style="min-width: 150px;">નામ<br/>Name</th>`
              }
              ${chunk.dates.map((d: string) => isCows ? `<th colspan="2" class="nowrap">${dayjs(d).format('DD/MM')}</th>` : `<th class="nowrap">${dayjs(d).format('DD/MM')}</th>`).join('')}
              ${isLastChunk ? (
                isCows 
                  ? `<th colspan="3" class="total-head">મહિનાનું કુલ (Month Total)</th>` 
                  : `<th rowspan="${isCows ? 2 : 1}" class="total-head">કુલ<br/>Total</th>`
              ) : ''}
            </tr>
            ${isCows ? `
              <tr>
                ${chunk.dates.map(() => `<th class="sub-head">સવાર</th><th class="sub-head">સાંજ</th>`).join('')}
                ${isLastChunk ? `<th class="sub-head" style="background-color: #c8e6c9; color: #2e7d32;">સવાર</th><th class="sub-head" style="background-color: #c8e6c9; color: #2e7d32;">સાંજ</th><th class="total-head">કુલ</th>` : ''}
              </tr>
            ` : ''}
          </thead>
          <tbody>
      `;

      if (isCows) {
        let monthGrandMorning = 0;
        let monthGrandEvening = 0;
        let monthGrandOverall = 0;
        const dateTotals: any = {};
        chunk.dates.forEach((d: string) => dateTotals[d] = { morning: 0, evening: 0 });

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

          tableHtml += `<tr>
            <td><strong>${c.tag_number || '-'}</strong></td>
            <td class="text-left">${c.name}</td>
          `;
          chunk.dates.forEach((d: string) => {
            dateTotals[d].morning += c.daily_data[d]?.morning || 0;
            dateTotals[d].evening += c.daily_data[d]?.evening || 0;
            tableHtml += `
              <td>${c.daily_data[d]?.morning ? c.daily_data[d].morning.toFixed(2) : '-'}</td>
              <td>${c.daily_data[d]?.evening ? c.daily_data[d].evening.toFixed(2) : '-'}</td>
            `;
          });
          
          if (isLastChunk) {
            tableHtml += `
              <td class="col-total">${cowMonthMorning.toFixed(2)}</td>
              <td class="col-total">${cowMonthEvening.toFixed(2)}</td>
              <td class="col-total" style="background-color: #c8e6c9 !important;">${cowMonthQty.toFixed(2)}</td>
            `;
          }
          tableHtml += `</tr>`;
        });

        tableHtml += `<tr class="row-total-bottom">
          <td colspan="2" class="text-left" style="text-align: right; padding-right: 10px;">કુલ (Day Total)</td>
        `;
        chunk.dates.forEach((d: string) => {
          tableHtml += `
            <td>${dateTotals[d].morning.toFixed(2)}</td>
            <td>${dateTotals[d].evening.toFixed(2)}</td>
          `;
        });
        if (isLastChunk) {
          tableHtml += `
            <td style="background-color: #2e7d32 !important;">${monthGrandMorning.toFixed(2)}</td>
            <td style="background-color: #2e7d32 !important;">${monthGrandEvening.toFixed(2)}</td>
            <td style="background-color: #1b5e20 !important;">${monthGrandOverall.toFixed(2)}</td>
          `;
        }
        tableHtml += `</tr>`;
      } else {
        let monthGrandTotal = 0;
        const dateTotals: any = {};
        chunk.dates.forEach((d: string) => dateTotals[d] = 0);

        reportData.members.forEach((m: any) => {
          let memberMonthTotal = 0;
          allMonthDates.forEach((md: string) => {
            const val = m.daily_data[md];
            memberMonthTotal += typeof val === 'number' ? val : (val?.total || 0);
          });

          if (isLastChunk) {
            monthGrandTotal += memberMonthTotal;
          }
          
          tableHtml += `<tr>
            <td><strong>${m.member_number || '-'}</strong></td>
            <td class="text-left">${m.member_name}</td>
          `;
          chunk.dates.forEach((d: string) => {
            const val = m.daily_data[d];
            const totalVal = typeof val === 'number' ? val : (val?.total || 0);
            dateTotals[d] += totalVal;
            tableHtml += `<td>${totalVal ? totalVal.toFixed(3) : '-'}</td>`;
          });
          
          if (isLastChunk) {
            tableHtml += `<td class="col-total" style="background-color: #c8e6c9 !important;">${memberMonthTotal.toFixed(3)}</td>`;
          }
          tableHtml += `</tr>`;
        });

        tableHtml += `<tr class="row-total-bottom">
          <td colspan="2" class="text-left" style="text-align: right; padding-right: 10px;">કુલ (Day Total)</td>
        `;
        chunk.dates.forEach((d: string) => {
          tableHtml += `<td>${dateTotals[d].toFixed(3)}</td>`;
        });
        if (isLastChunk) {
          tableHtml += `<td style="background-color: #2e7d32 !important;">${monthGrandTotal.toFixed(3)}</td>`;
        }
        tableHtml += `</tr>`;
      }

      tableHtml += `
            </tbody>
          </table>
      `;
      
      fullHtml += tableHtml;
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
                    <React.Fragment key={`sub-${d}`}>
                      <TableCell align="center" sx={{ bgcolor: 'grey.50', fontSize: '0.75rem', p: 0.5, borderRight: '1px dotted #ccc', top: 37, position: 'sticky', zIndex: 2 }}>સવાર</TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'grey.50', fontSize: '0.75rem', p: 0.5, borderRight: '1px solid #ddd', top: 37, position: 'sticky', zIndex: 2 }}>સાંજ</TableCell>
                    </React.Fragment>
                  ))}
                  <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#e3f2fd', fontSize: '0.8rem', borderLeft: '2px solid #ccc', top: 37, position: 'sticky', right: 150, zIndex: 4 }}><strong>સવાર</strong></TableCell>
                  <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#e3f2fd', fontSize: '0.8rem', top: 37, position: 'sticky', right: 75, zIndex: 4 }}><strong>સાંજ</strong></TableCell>
                  <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#bbdefb', fontSize: '0.8rem', top: 37, position: 'sticky', right: 0, zIndex: 4 }}><strong>કુલ</strong></TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {isCows ? (
                reportData.cows.map((c: any, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #ddd' }}>{c.tag_number}</TableCell>
                    <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '2px solid #ccc', whiteSpace: 'nowrap' }}>{c.name}</TableCell>
                    {reportData.dates.map((d: string) => (
                      <React.Fragment key={`data-${d}`}>
                        <TableCell align="center" sx={{ borderRight: '1px dotted #ccc', color: c.daily_data[d].morning ? 'inherit' : 'text.disabled' }}>
                          <DisplayNumber value={c.daily_data[d].morning ? c.daily_data[d].morning.toFixed(2) : '-'} />
                        </TableCell>
                        <TableCell align="center" sx={{ borderRight: '1px solid #ddd', color: c.daily_data[d].evening ? 'inherit' : 'text.disabled' }}>
                          <DisplayNumber value={c.daily_data[d].evening ? c.daily_data[d].evening.toFixed(2) : '-'} />
                        </TableCell>
                      </React.Fragment>
                    ))}
                    <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#f5f5f5', borderLeft: '2px solid #ccc', position: 'sticky', right: 150, zIndex: 1 }}><strong><DisplayNumber value={c.total_morning.toFixed(2)} /></strong></TableCell>
                    <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#f5f5f5', position: 'sticky', right: 75, zIndex: 1 }}><strong><DisplayNumber value={c.total_evening.toFixed(2)} /></strong></TableCell>
                    <TableCell align="center" sx={{ width: 75, minWidth: 75, bgcolor: '#e3f2fd', position: 'sticky', right: 0, zIndex: 1 }}><strong><DisplayNumber value={c.total_qty.toFixed(2)} /></strong></TableCell>
                  </TableRow>
                ))
              ) : (
                reportData.members.map((m: any, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #ddd' }}>{m.member_number}</TableCell>
                    <TableCell sx={{ position: 'sticky', left: 50, bgcolor: 'background.paper', zIndex: 1, borderRight: '2px solid #ccc', whiteSpace: 'nowrap' }}>{m.member_name}</TableCell>
                    {reportData.dates.map((d: string) => {
                      const val = m.daily_data[d];
                      const totalVal = typeof val === 'number' ? val : (val?.total || 0);
                      return (
                        <TableCell key={d} align="center" sx={{ borderRight: '1px solid #eee', color: totalVal ? 'inherit' : 'text.disabled' }}>
                          <DisplayNumber value={totalVal ? totalVal.toFixed(3) : '-'} />
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ bgcolor: '#e3f2fd', borderLeft: '2px solid #ccc', position: 'sticky', right: 0, zIndex: 1 }}>
                      <strong><DisplayNumber value={m.total_qty.toFixed(3)} /></strong>
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
    if (!reportData) return null;

    const isCows = reportData.type === 'cows';
    const dates = reportData.dates;
    let chartData: any;

    if (isCows) {
      const morningTotals = dates.map((d: string) => 
        reportData.cows.reduce((sum: number, c: any) => sum + (c.daily_data[d]?.morning || 0), 0)
      );
      const eveningTotals = dates.map((d: string) => 
        reportData.cows.reduce((sum: number, c: any) => sum + (c.daily_data[d]?.evening || 0), 0)
      );

      chartData = {
        labels: dates,
        datasets: [
          {
            label: 'કુલ સવાર (Total Morning)',
            data: morningTotals,
            borderColor: '#2e7d32',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'કુલ સાંજ (Total Evening)',
            data: eveningTotals,
            borderColor: '#f57f17',
            backgroundColor: 'rgba(245, 127, 23, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          }
        ],
      };
    } else {
      const morningTotals = dates.map((d: string) => {
        let sum = 0;
        let count = 0;
        reportData.members.forEach((m: any) => {
          const val = m.daily_data[d]?.morning || 0;
          if (val > 0) {
            sum += val;
            count++;
          }
        });
        return count > 0 ? Number((sum / count).toFixed(3)) : 0;
      });

      const eveningTotals = dates.map((d: string) => {
        let sum = 0;
        let count = 0;
        reportData.members.forEach((m: any) => {
          const val = m.daily_data[d]?.evening || 0;
          if (val > 0) {
            sum += val;
            count++;
          }
        });
        return count > 0 ? Number((sum / count).toFixed(3)) : 0;
      });

      chartData = {
        labels: dates,
        datasets: [
          {
            label: 'સવારના ભાગનું સભ્ય દીઠ દૂધ (Morning Milk Per Member)',
            data: morningTotals,
            borderColor: '#2e7d32',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'સાંજના ભાગનું સભ્ય દીઠ દૂધ (Evening Milk Per Member)',
            data: eveningTotals,
            borderColor: '#f57f17',
            backgroundColor: 'rgba(245, 127, 23, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          }
        ],
      };
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const },
        tooltip: { mode: 'index' as const, intersect: false },
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
              <Grid item xs={12} md={3}>
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
                </TextField>
              </Grid>
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
              <Grid item xs={12} md={2}>
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
