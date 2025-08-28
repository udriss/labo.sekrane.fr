'use client';

import React from 'react';
import DatePicker, { DatePickerProps, registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './FrenchDatePicker.module.css';

// Enregistrer la locale française
registerLocale('fr', fr);

// Styles personnalisés pour surcharger les contraintes de taille
const customStyles = `
  .react-datepicker-wrapper {
    width: 100% !important;
    max-width: none !important;
  }
  
  .react-datepicker__input-container {
    width: 100% !important;
    max-width: none !important;
  }
  
  .react-datepicker__input-container input {
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
  }
  
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
`;

// Injecter les styles personnalisés une seule fois
if (typeof document !== 'undefined' && !document.getElementById('french-datepicker-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'french-datepicker-styles';
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

interface FrenchDatePickerProps extends Omit<DatePickerProps, 'locale'> {
  /**
   * Si true, affiche seulement la date (pas l'heure)
   * @default true
   */
  dateOnly?: boolean;
  /**
   * Si true, affiche seulement l'heure (pas la date)
   * @default false
   */
  timeOnly?: boolean;
}

export default function FrenchDatePicker({
  dateOnly = true,
  timeOnly = false,
  dateFormat,
  showTimeSelect,
  showTimeSelectOnly,
  timeFormat,
  timeIntervals = 15,
  timeCaption = 'Heure',
  placeholderText,
  ...props
}: FrenchDatePickerProps) {
  // Configuration automatique basée sur les props
  const config = React.useMemo(() => {
    if (timeOnly) {
      return {
        showTimeSelect: true,
        showTimeSelectOnly: true,
        dateFormat: timeFormat || 'HH:mm',
        timeFormat: timeFormat || 'HH:mm',
        timeIntervals,
        timeCaption,
        placeholderText: placeholderText || 'HH:mm',
      };
    } else if (dateOnly) {
      return {
        showTimeSelect: false,
        showTimeSelectOnly: false,
        dateFormat: dateFormat || 'dd/MM/yyyy',
        placeholderText: placeholderText || 'jj/mm/aaaa',
      };
    } else {
      return {
        showTimeSelect: true,
        showTimeSelectOnly: false,
        dateFormat: dateFormat || 'dd/MM/yyyy HH:mm',
        timeFormat: timeFormat || 'HH:mm',
        timeIntervals,
        timeCaption,
        placeholderText: placeholderText || 'jj/mm/aaaa HH:mm',
      };
    }
  }, [dateOnly, timeOnly, dateFormat, timeFormat, timeIntervals, timeCaption, placeholderText]);

  return (
    <div className={styles['datepicker-wrapper']} style={{ width: '100%', maxWidth: 'none' }}>
      <DatePicker
        {...(props as any)}
        locale="fr"
        {...config}
        showTimeSelect={showTimeSelect ?? config.showTimeSelect}
        showTimeSelectOnly={showTimeSelectOnly ?? config.showTimeSelectOnly}
        wrapperClassName="w-full"
        className="w-full"
      />
    </div>
  );
}

// Export des composants spécialisés pour une utilisation plus claire
export const FrenchDateOnly = (props: Omit<FrenchDatePickerProps, 'dateOnly' | 'timeOnly'>) => (
  <FrenchDatePicker {...props} dateOnly={true} timeOnly={false} />
);

export const FrenchTimeOnly = (props: Omit<FrenchDatePickerProps, 'dateOnly' | 'timeOnly'>) => (
  <FrenchDatePicker {...props} dateOnly={false} timeOnly={true} />
);

export const FrenchDateTime = (props: Omit<FrenchDatePickerProps, 'dateOnly' | 'timeOnly'>) => (
  <FrenchDatePicker {...props} dateOnly={false} timeOnly={false} />
);
