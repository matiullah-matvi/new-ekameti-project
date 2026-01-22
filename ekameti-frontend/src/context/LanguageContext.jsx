import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',
      location:'src/context/LanguageContext.jsx:useLanguage',
      message:'useLanguage called',
      data:{hasContext:!!context},
      timestamp:Date.now()
    })
  }).catch(()=>{});
  // #endregion
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',
      location:'src/context/LanguageContext.jsx:LanguageProvider',
      message:'LanguageProvider render start',
      data:{hasWindow:typeof window!=='undefined',hasLocalStorage:typeof localStorage!=='undefined'},
      timestamp:Date.now()
    })
  }).catch(()=>{});
  // #endregion
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to English
    try {
      const savedLanguage = localStorage.getItem('ekametiLanguage');
      return savedLanguage || 'en';
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',
          location:'src/context/LanguageContext.jsx:LanguageProvider:init',
          message:'localStorage getItem failed',
          data:{name:String(e?.name||''),message:String(e?.message||'')},
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion
      return 'en';
    }
  });

  useEffect(() => {
    // Save language preference to localStorage
    try {
      localStorage.setItem('ekametiLanguage', language);
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',
          location:'src/context/LanguageContext.jsx:LanguageProvider:effect',
          message:'localStorage setItem failed',
          data:{name:String(e?.name||''),message:String(e?.message||'')},
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion
    }
    
    // Set document direction for RTL languages
    if (language === 'ur') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ur');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

