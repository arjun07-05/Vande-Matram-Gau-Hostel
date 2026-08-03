import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
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
import axiosClient from '../api/axiosClient';

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

interface CowChartModalProps {
  open: boolean;
  onClose: () => void;
  cowId: number | null;
  cowName: string | null;
  cowNumber: string | null;
}

const CowChartModal: React.FC<CowChartModalProps> = ({ open, onClose, cowId, cowName, cowNumber }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['cowChart', cowId],
    queryFn: async () => {
      if (!cowId) return null;
      const res = await axiosClient.get(`/cows/${cowId}/chart`);
      return res.data;
    },
    enabled: !!cowId && open,
  });

  const chartData = {
    labels: data?.dates || [],
    datasets: [
      {
        label: 'સવાર (Morning)',
        data: data?.dates.map((d: string) => data.data[d].morning) || [],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'સાંજ (Evening)',
        data: data?.dates.map((d: string) => data.data[d].evening) || [],
        borderColor: '#f57f17',
        backgroundColor: 'rgba(245, 127, 23, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      }
    ],
  };

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>દૂધનો ગ્રાફ (Milk Chart)</span>
        {cowId && <Typography variant="subtitle1" color="textSecondary">ગાય નં: {cowNumber} {cowName ? `(${cowName})` : ''}</Typography>}
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: '400px' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: '350px', width: '100%' }}>
            {data && <Line data={chartData} options={options} />}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">બંધ કરો (Close)</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CowChartModal;
