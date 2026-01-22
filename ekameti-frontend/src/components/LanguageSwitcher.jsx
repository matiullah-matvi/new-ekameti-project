import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../translations';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center">
      <select
        value={language}
        onChange={handleLanguageChange}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ direction: 'ltr' }}
      >
        <option value="en">English</option>
        <option value="ur">اردو (Urdu)</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;











