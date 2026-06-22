import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTheme } from './ThemeContext';

const ActionContext = createContext();

export const useAction = () => useContext(ActionContext);

export const ActionProvider = ({ children }) => {
  const [hasAdd, setHasAdd] = useState(false);
  const addRef = useRef(null);
  const importRef = useRef(null);
  const [hasImport, setHasImport] = useState(false);
  const [hasDownload, setHasDownload] = useState(false);
  const downloadRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Theme is now fully managed by ThemeContext — pull it in
  const { theme, toggleTheme } = useTheme();

  const registerAddAction = useCallback((fn) => {
    addRef.current = fn;
    setHasAdd(!!fn);
    return () => {
      addRef.current = null;
      setHasAdd(false);
    };
  }, []);

  const registerImportAction = useCallback((fn) => {
    importRef.current = fn;
    setHasImport(!!fn);
    return () => {
      importRef.current = null;
      setHasImport(false);
    };
  }, []);

  const registerDownloadAction = useCallback((fn) => {
    downloadRef.current = fn;
    setHasDownload(!!fn);
    return () => {
      downloadRef.current = null;
      setHasDownload(false);
    };
  }, []);

  const handleAdd = useCallback(() => {
    if (addRef.current) addRef.current();
  }, []);

  const handleImport = useCallback(() => {
    if (importRef.current) importRef.current();
  }, []);

  const handleDownload = useCallback(() => {
    if (downloadRef.current) downloadRef.current();
  }, []);

  const toggleFilter = useCallback(() => {
    setIsFilterOpen(prev => !prev);
    if (isFilterOpen) setSearchQuery('');
  }, [isFilterOpen]);

  return (
    <ActionContext.Provider
      value={{
        onAdd: hasAdd ? handleAdd : null,
        registerAddAction,
        onImport: hasImport ? handleImport : null,
        registerImportAction,
        onDownload: hasDownload ? handleDownload : null,
        registerDownloadAction,
        searchQuery,
        setSearchQuery,
        isFilterOpen,
        toggleFilter,
        theme,
        toggleTheme,
        dateFilter,
        setDateFilter,
      }}
    >
      {children}
    </ActionContext.Provider>
  );
};
