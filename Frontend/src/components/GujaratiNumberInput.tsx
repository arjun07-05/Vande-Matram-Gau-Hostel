import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, Control } from 'react-hook-form';
import { formatGujaratiNumber } from '../utils/formatNumber';

const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

export const formatToEnglishNumber = (str: string | null | undefined): string => {
  if (!str) return '';
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.split(gujDigits[i]).join(englishDigits[i]);
  }
  return res;
};

interface GujaratiNumberInputProps extends Omit<TextFieldProps, 'name' | 'value' | 'onChange'> {
  name: string;
  control?: Control<any>;
  rules?: any;
  value?: string | number;
  onChangeValue?: (val: string) => void;
}

const GujaratiNumberInput: React.FC<GujaratiNumberInputProps> = ({ 
  name, 
  control, 
  rules, 
  value, 
  onChangeValue, 
  ...props 
}) => {
  const { i18n } = useTranslation();
  const isGujarati = i18n.language && i18n.language.startsWith('gu');

  const handleChange = (rawText: string, rhfOnChange?: (val: string) => void) => {
    const englishText = formatToEnglishNumber(rawText);
    if (rhfOnChange) rhfOnChange(englishText);
    if (onChangeValue) onChangeValue(englishText);
  };

  // If used with react-hook-form
  if (control) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, onBlur, value: rhfValue, ref }, fieldState: { error } }) => (
          <TextField
            {...props}
            inputProps={{ inputMode: 'decimal', ...props.inputProps }}
            error={!!error || props.error}
            helperText={error?.message || props.helperText}
            onChange={(e) => handleChange(e.target.value, onChange)}
            onBlur={onBlur}
            value={isGujarati ? formatGujaratiNumber(rhfValue, 'gu') : (rhfValue || '')}
            inputRef={ref}
          />
        )}
      />
    );
  }

  // If used as a controlled component without react-hook-form
  return (
    <TextField
      {...props}
      inputProps={{ inputMode: 'decimal', ...props.inputProps }}
      onChange={(e) => handleChange(e.target.value)}
      value={isGujarati ? formatGujaratiNumber(value, 'gu') : (value || '')}
    />
  );
};

export default GujaratiNumberInput;
