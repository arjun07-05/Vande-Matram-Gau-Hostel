import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, Control } from 'react-hook-form';
import {
  ReactTransliterate,
  Language,
} from '@sarthak1407/react-transliterate';

interface TransliteratedAutocompleteProps
  extends Omit<TextFieldProps, 'name' | 'value' | 'onChange'> {
  name: string;
  control: Control<any>;
  label: string;
  options: string[];
  onOptionSelect?: (selectedName: string) => void;
  required?: boolean;
}

const TransliteratedAutocomplete: React.FC<
  TransliteratedAutocompleteProps
> = ({
  name,
  control,
  label,
  options = [],
  onOptionSelect,
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
        const currentValue = field.value || '';

        /*
         * Gujarati mode:
         *
         * ReactTransliterate provides:
         * gaay -> ગાય
         * dudh -> દૂધ
         * paani -> પાણી
         *
         * The user can select the appropriate suggestion.
         */
        if (isGujarati) {
          return (
            <ReactTransliterate
              value={currentValue}
              onChangeText={(text) => {
                field.onChange(text);

                /*
                 * If the selected/committed value exactly matches
                 * one of our existing options, notify the parent.
                 */
                const matchedOption = options.find(
                  (option) =>
                    option.trim().toLowerCase() ===
                    text.trim().toLowerCase()
                );

                if (matchedOption && onOptionSelect) {
                  onOptionSelect(matchedOption);
                }
              }}
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
        }

        /*
         * English mode remains a normal text field.
         */
        return (
          <TextField
            {...props}
            {...field}
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
            value={currentValue}
          />
        );
      }}
    />
  );
};

export default TransliteratedAutocomplete;