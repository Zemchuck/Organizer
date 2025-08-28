import React from 'react';

/**
 * Komponent wrapper dla responsywności
 * Automatycznie dostosowuje się do rozmiaru ekranu
 */
export default function ResponsiveWrapper({ 
  children, 
  className = "",
  mobileClass = "",
  tabletClass = "",
  desktopClass = "",
  wideClass = ""
}) {
  const [screenSize, setScreenSize] = React.useState('desktop');

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setScreenSize('mobile');
      } else if (width <= 768) {
        setScreenSize('tablet');
      } else if (width <= 1024) {
        setScreenSize('desktop');
      } else {
        setScreenSize('wide');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getResponsiveClass = () => {
    switch (screenSize) {
      case 'mobile': return mobileClass;
      case 'tablet': return tabletClass;
      case 'desktop': return desktopClass;
      case 'wide': return wideClass;
      default: return desktopClass;
    }
  };

  return (
    <div className={`responsive-wrapper ${className} ${getResponsiveClass()}`}>
      {children}
    </div>
  );
}

/**
 * Hook do wykrywania rozmiaru ekranu
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 480,
    isTablet: window.innerWidth > 480 && window.innerWidth <= 768,
    isDesktop: window.innerWidth > 768 && window.innerWidth <= 1024,
    isWide: window.innerWidth > 1024,
  });

  React.useEffect(() => {
    const updateSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 480,
        isTablet: window.innerWidth > 480 && window.innerWidth <= 768,
        isDesktop: window.innerWidth > 768 && window.innerWidth <= 1024,
        isWide: window.innerWidth > 1024,
      });
    };

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return screenSize;
}

/**
 * Hook do wykrywania preferencji użytkownika
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = React.useState({
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
  });

  React.useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    const updatePreferences = () => {
      setPreferences({
        prefersDark: darkQuery.matches,
        prefersReducedMotion: motionQuery.matches,
        prefersHighContrast: contrastQuery.matches,
      });
    };

    darkQuery.addEventListener('change', updatePreferences);
    motionQuery.addEventListener('change', updatePreferences);
    contrastQuery.addEventListener('change', updatePreferences);

    return () => {
      darkQuery.removeEventListener('change', updatePreferences);
      motionQuery.removeEventListener('change', updatePreferences);
      contrastQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  return preferences;
}
