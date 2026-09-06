import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, Control } from 'react-hook-form';
import {
  ReactTransliterate,
  Language,
} from '@sarthak1407/react-transliterate';

interface TransliteratedInputProps
  extends Omit<TextFieldProps, 'name' | 'value' | 'onChange'> {
  name: string;
  control: Control<any>;
  label: string;
  required?: boolean;
}

const TransliteratedInput: React.FC<TransliteratedInputProps> = ({
  name,
  control,
  label,
  fullWidth = true,
  size = 'small',
  margin = 'none',
  required = false,
  ...props
}) => {
  const { i18n } = useTranslation();

  const isGujarati =
    !i18n.language || i18n.language.startsWith('gu');

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? `${label} is required` : false,
      }}
      render={({ field, fieldState: { error } }) => {
        if (!isGujarati) {
          return (
            <TextField
              {...props}
              {...field}
              label={label}
              fullWidth={fullWidth}
              size={size}
              margin={margin}
              InputLabelProps={{
                shrink: true,
                ...props.InputLabelProps,
              }}
              error={!!error || props.error}
              helperText={error?.message || props.helperText}
              required={required}
              value={field.value || ''}
            />
          );
        }

        return (
          <ReactTransliterate
            value={field.value || ''}
            onChangeText={field.onChange}
            lang={'gu' as Language}
            renderComponent={(inputProps: any) => {
              const { ref, ...rest } = inputProps;

              return (
                <TextField
                  {...props}
                  {...rest}
                  label={label}
                  fullWidth={fullWidth}
                  size={size}
                  margin={margin}
                  required={required}
                  error={!!error || props.error}
                  helperText={error?.message || props.helperText}
                  InputLabelProps={{
                    shrink: true,
                    ...props.InputLabelProps,
                  }}
                  inputRef={ref}
                />
              );
            }}
          />
        );
      }}
    />
  );
};

export default TransliteratedInput;