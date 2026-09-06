import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Autocomplete,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar
} from '@mui/material';
import {
  Close,
  Pets,
  Delete,
  Person,
  Check
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import DisplayNumber from './DisplayNumber';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../utils/formatError';

interface MemberCowModalProps {
  open: boolean;
  onClose: () => void;
  member: any;
  isAdmin: boolean;
}

const MemberCowModal: React.FC<MemberCowModalProps> = ({ open, onClose, member, isAdmin }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedCows, setSelectedCows] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all cows in the system
  const { data: cows, isLoading: cowsLoading } = useQuery({
    queryKey: ['cows'],
    queryFn: async () => {
      const res = await axiosClient.get('/cows/');
      return res.data;
    },
    enabled: open
  });

  // Sync selected cows when modal opens
  useEffect(() => {
    if (open && member) {
      setErrorMessage(null);
      setSuccessMessage(null);

      let initialCows: any[] = [];
      if (Array.isArray(member.assigned_cows) && member.assigned_cows.length > 0) {
        initialCows = member.assigned_cows;
      } else if (member.assigned_cow) {
        initialCows = [member.assigned_cow];
      } else if (member.cow_id && Array.isArray(cows)) {
        const found = cows.find((c: any) => c.id === member.cow_id);
        if (found) initialCows = [found];
      }
      setSelectedCows(initialCows);
    }
  }, [open, member, cows]);

  // Mutation to save assignments
  const assignMutation = useMutation({
    mutationFn: async (cowIds: number[]) => {
      const res = await axiosClient.put(`/members/${member.id}/assign-cow`, { cow_ids: cowIds });
      return res.data;
    },
    onSuccess: (updatedMember) => {
      const newCows = updatedMember.assigned_cows || (updatedMember.assigned_cow ? [updatedMember.assigned_cow] : []);
      setSelectedCows(newCows);
      setSuccessMessage('ગાયની ફાળવણી સફળતાપૂર્વક સાચવવામાં આવી!');
      setErrorMessage(null);

      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
    },
    onError: (err: any) => {
      setErrorMessage(getErrorMessage(err, 'ગાય સાચવવામાં ભૂલ આવી.'));
    }
  });

  const handleSave = () => {
    const ids = selectedCows.map((c) => c.id);
    assignMutation.mutate(ids);
  };

  const handleRemoveCow = (cowId: number) => {
    const updated = selectedCows.filter((c) => c.id !== cowId);
    setSelectedCows(updated);
  };

  const getDisplayType = (type: string) => {
    if (!type) return '-';
    const t_lower = type.trim().toLowerCase();
    if (t_lower === 'milk' || type === 'દૂધ આપતી') return 'દૂધ આપતી';
    if (t_lower === 'without milk' || type === 'દૂધ વગરની' || type === 'દૂધ ન આપતી') return 'દૂધ વગરની';
    return type;
  };

  const allCowsSorted = Array.isArray(cows)
    ? cows.slice().sort((a: any, b: any) => (parseInt(a.cow_number) || 0) - (parseInt(b.cow_number) || 0))
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Pets />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {isAdmin ? 'ગાય ફાળવણી (Assign Cow)' : 'સભ્યની ગાય (Assigned Cow)'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Member Info Header */}
        <Box
          sx={{
            p: 1.5,
            mb: 2.5,
            bgcolor: '#f8fafc',
            borderRadius: 1.5,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={member?.photo ? `/${member.photo.replace(/\\/g, '/')}` : undefined}
              sx={{ width: 42, height: 42, bgcolor: '#ffedd5', color: 'primary.main', fontWeight: 'bold' }}
            >
              <Person />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
                {member?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                સભ્ય ક્રમ: <DisplayNumber value={member?.member_number?.toString() || '-'} /> | ફોન: <DisplayNumber value={member?.mobile || '-'} />
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={`કુલ ગાય: ${selectedCows.length}`}
            color={selectedCows.length > 0 ? 'success' : 'default'}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Admin: Simple Dropdown to Select / Add Cows */}
        {isAdmin && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>
              ગાય પસંદ કરો (Select One or More Cows):
            </Typography>
            {cowsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={allCowsSorted}
                getOptionLabel={(option: any) =>
                  `ગાય નં. ${option.cow_number} - ${option.cow_name || ''} (${option.breed || 'ખીલા નં. -'})`
                }
                value={selectedCows}
                onChange={(_, newValue) => setSelectedCows(newValue)}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="ગાય નંબર અથવા નામ શોધો..."
                    size="small"
                    fullWidth
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={`ગાય નં. ${option.cow_number}`}
                      size="small"
                      color="primary"
                    />
                  ))
                }
              />
            )}
          </Box>
        )}

        {/* Selected / Assigned Cows Table */}
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>
          ફાળવેલ ગાયોની યાદી:
        </Typography>

        {selectedCows.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>ગાય નં.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>નામ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>ખીલા નં.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>પ્રકાર</TableCell>
                  {isAdmin && <TableCell align="right" sx={{ fontWeight: 'bold' }}>ક્રિયા</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCows.map((cow) => (
                  <TableRow key={cow.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <DisplayNumber value={cow.cow_number} />
                    </TableCell>
                    <TableCell>{cow.cow_name || '-'}</TableCell>
                    <TableCell>{cow.breed || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getDisplayType(cow.type)}
                        color={cow.type === 'without milk' ? 'default' : 'success'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveCow(cow.id)}
                          title="કાઢી નાખો"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{
              py: 3,
              textAlign: 'center',
              bgcolor: '#f8fafc',
              borderRadius: 1.5,
              border: '1px dashed #cbd5e1'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              હાલમાં કોઈ ગાય ફાળવેલ નથી. {isAdmin && 'ઉપરથી ગાય પસંદ કરી સાચવો.'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          બંધ કરો (Close)
        </Button>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={assignMutation.isPending}
            startIcon={assignMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Check />}
          >
            સાચવો (Save)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MemberCowModal;
