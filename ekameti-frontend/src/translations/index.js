import { en } from './en';
import { ur } from './ur';

export const translations = {
  en,
  ur
};

export const getTranslation = (language, key) => {
  const keys = key.split('.');
  let value = translations[language] || translations.en;
  
  for (const k of keys) {
    value = value?.[k];
    if (!value) {
      // Fallback to English if key not found
      value = translations.en;
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }
  
  return value || key;
};











