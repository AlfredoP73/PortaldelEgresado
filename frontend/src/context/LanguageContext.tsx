import '../i18n/i18n'; // Inicializa i18next
import { useTranslation as useI18nTranslation } from 'react-i18next';
import React, { type ReactNode } from 'react';

/**
 * Wrapper sobre react-i18next que mantiene la misma API
 * que usaban los componentes antes: { t, language, setLanguage }
 * 
 * PARA AGREGAR UN NUEVO IDIOMA:
 * 1. Crea un archivo JSON en src/i18n/locales/ (ej: fr.json)
 * 2. Importa el archivo en src/i18n/i18n.ts
 * 3. Agrégalo al objeto resources en i18n.ts
 * 4. ¡Listo! El idioma estará disponible automáticamente.
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  return {
    t,
    language: i18n.language as string,
    setLanguage: (lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem('app-language', lang);
    },
  };
};

// Provider minimalista — i18next se inicializa por import
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
