import React from 'react';
import { TextField } from '@mui/material';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import { useTranslation } from 'react-i18next';
import { Controller, Control } from 'react-hook-form';

interface TransliteratedInputProps {
  name: string;
  control: Control<any>;
  label: string;
  fullWidth?: boolean;
  margin?: "none" | "dense" | "normal";
  required?: boolean;
}

const TransliteratedInput: React.FC<TransliteratedInputProps> = ({ 
  name, 
  control, 
  label, 
  fullWidth = true,
  margin = "normal",
  required = false
}) => {
  const { i18n } = useTranslation();

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: required ? `${label} is required` : false }}
      render={({ field: { onChange, onBlur, value, ref: rhfRef }, fieldState: { error } }) => {
        if (i18n.language && i18n.language.startsWith('gu')) {
          return (
            <ReactTransliterate
              renderComponent={(props) => {
                const { ref: transliterateRef, ...rest } = props as any;
                return (
                  <TextField
                    {...rest}
                    label={label}
                    fullWidth={fullWidth}
                    margin={margin}
                    error={!!error}
                    helperText={error?.message}
                    required={required}
                    inputRef={(node) => {
                      if (typeof transliterateRef === 'function') {
                        transliterateRef(node);
                      } else if (transliterateRef && 'current' in transliterateRef) {
                        (transliterateRef as any).current = node;
                      }
                      if (typeof rhfRef === 'function') {
                        rhfRef(node);
                      } else if (rhfRef && 'current' in rhfRef) {
                        (rhfRef as any).current = node;
                      }
                    }}
                  />
                );
              }}
              value={value || ""}
              onChangeText={(text) => {
                onChange(text);
              }}
              onBlur={onBlur}
              lang="gu"
            />
          );
        }

        return (
          <TextField
            label={label}
            fullWidth={fullWidth}
            margin={margin}
            required={required}
            error={!!error}
            helperText={error?.message}
            onChange={onChange}
            onBlur={onBlur}
            value={value || ""}
            inputRef={rhfRef}
          />
        );
      }}
    />
  );
};

export default TransliteratedInput;
