import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatGujaratiNumber } from '../utils/formatNumber';

interface DisplayNumberProps {
  value: string | number | null | undefined;
}

const DisplayNumber: React.FC<DisplayNumberProps> = ({ value }) => {
  const { i18n } = useTranslation();
  return <>{formatGujaratiNumber(value, i18n.language)}</>;
};

export default DisplayNumber;
