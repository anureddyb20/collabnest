import React, { createContext, useState, useEffect, useContext } from 'react';

const ViewContext = createContext();

export const ViewProvider = ({ children }) => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (!isManualOverride) {
        setIsMobileView(window.innerWidth <= 768);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isManualOverride]);

  const toggleViewMode = () => {
    setIsManualOverride(true);
    setIsMobileView(!isMobileView);
  };

  const resetToAuto = () => {
    setIsManualOverride(false);
    setIsMobileView(window.innerWidth <= 768);
  };

  return (
    <ViewContext.Provider value={{ isMobileView, toggleViewMode, resetToAuto, isManualOverride }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => useContext(ViewContext);
