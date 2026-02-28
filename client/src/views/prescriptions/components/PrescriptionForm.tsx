'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import type { CreatePrescriptionPayload, PrescriptionItemPayload } from '../types';

interface PrescriptionItemRow {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

const emptyItem = (): PrescriptionItemRow => ({
  medication: '',
  dosage: '',
  frequency: '',
  duration: '',
  notes: '',
});

interface PrescriptionFormProps {
  appointmentId: number;
  loading: boolean;
  onSubmit: (payload: CreatePrescriptionPayload) => Promise<void>;
}

export function PrescriptionForm({ appointmentId, loading, onSubmit }: PrescriptionFormProps) {
  const [instructions, setInstructions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<PrescriptionItemRow[]>([emptyItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const updateItem = (index: number, field: keyof PrescriptionItemRow, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validar que hay al menos 1 ítem con todos los campos requeridos
    if (items.length === 0) {
      setFormError('Debes agregar al menos un medicamento.');

      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;

      if (!item.medication.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()) {
        setFormError(`El medicamento #${i + 1} tiene campos obligatorios incompletos (medicamento, dosis, frecuencia, duración).`);

        return;
      }
    }

    const mappedItems: PrescriptionItemPayload[] = items.map((item) => ({
      medication: item.medication.trim(),
      dosage: item.dosage.trim(),
      frequency: item.frequency.trim(),
      duration: item.duration.trim(),
      ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
    }));

    const payload: CreatePrescriptionPayload = {
      appointmentId,
      ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      ...(validUntil ? { validUntil } : {}),
      items: mappedItems,
    };

    await onSubmit(payload);
  };

  return (
    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        Nueva receta
      </Typography>

      {formError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}

      <TextField
        label="Instrucciones generales"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        size="small"
        sx={{ mb: 2 }}
        disabled={loading}
      />

      <TextField
        label="Válida hasta"
        type="date"
        value={validUntil}
        onChange={(e) => setValidUntil(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 3 }}
        disabled={loading}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Medicamentos
      </Typography>

      {items.map((item, index) => (
        <Box
          key={index}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            mb: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Medicamento #{index + 1}
            </Typography>
            {items.length > 1 && (
              <IconButton
                size="small"
                color="error"
                onClick={() => removeItem(index)}
                disabled={loading}
              >
                <i className="ri-close-line" style={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>

          <TextField
            label="Medicamento *"
            value={item.medication}
            onChange={(e) => updateItem(index, 'medication', e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 1.5 }}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            <TextField
              label="Dosis *"
              value={item.dosage}
              onChange={(e) => updateItem(index, 'dosage', e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
            <TextField
              label="Frecuencia *"
              value={item.frequency}
              onChange={(e) => updateItem(index, 'frequency', e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
          </Box>

          <TextField
            label="Duración *"
            value={item.duration}
            onChange={(e) => updateItem(index, 'duration', e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 1.5 }}
            disabled={loading}
          />

          <TextField
            label="Notas (opcional)"
            value={item.notes}
            onChange={(e) => updateItem(index, 'notes', e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
          />
        </Box>
      ))}

      <Button
        variant="outlined"
        size="small"
        onClick={addItem}
        disabled={loading}
        startIcon={<i className="ri-add-line" />}
        sx={{ mb: 3 }}
      >
        Agregar medicamento
      </Button>

      <Divider sx={{ mb: 2 }} />

      <Alert severity="info" sx={{ mb: 2 }}>
        Esto completará la cita automáticamente al crear la receta.
      </Alert>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {loading ? 'Creando receta...' : 'Crear Receta'}
      </Button>
    </Box>
  );
}
