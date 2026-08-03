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

interface MemberChartModalProps {
  open: boolean;
  onClose: () => void;
  memberId: number | null;
  memberName: string | null;
}

const MemberChartModal: React.FC<MemberChartModalProps> = ({ open, onClose, memberId, memberName }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['memberChart', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const res = await axiosClient.get(`/members/${memberId}/chart`);
      return res.data;
    },
    enabled: !!memberId && open,
  });

  const chartData = {
    labels: data?.dates || [],
    datasets: [
      {
        label: 'કુલ વિતરણ (Total Distribution)',
        data: data?.dates.map((d: string) => {
          const val = data.data[d];
          return typeof val === 'number' ? val : (val?.total || 0);
        }) || [],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
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
      legend: { display: false },
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
        {memberId && <Typography variant="subtitle1" color="textSecondary">{memberName}</Typography>}
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

export default MemberChartModal;
