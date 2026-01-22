import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../translations';

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key) => {
    return getTranslation(language, key);
  };

  return { t, language };
};











