# Przewodnik po Responsywności - Organizer

## Przegląd

Aplikacja Organizer została zaprojektowana z myślą o pełnej responsywności i obsłudze różnych motywów. Ten dokument opisuje jak używać systemu responsywności w aplikacji.

## Breakpointy

Aplikacja używa następujących breakpointów:

```css
--mobile: 480px;    /* Telefony */
--tablet: 768px;    /* Tablety */
--desktop: 1024px;  /* Laptopy */
--wide: 1200px;     /* Duże ekrany */
```

## Motywy

### Dostępne motywy:
1. **Dark** (domyślny) - Ciemny motyw
2. **Light** - Jasny motyw  
3. **Neon** - Neonowy motyw

### Używanie motywów:

```jsx
import ThemeToggle from './components/ThemeToggle';

// W komponencie
<ThemeToggle />
```

### Zmienne CSS dla motywów:

```css
:root {
  --bg: #0d0f14;           /* Tło */
  --panel: #151922;        /* Panele */
  --text: #ffffff;         /* Tekst */
  --turquoise: #40e0d0;    /* Akcent */
  --border: rgba(255, 255, 255, .12); /* Ramki */
}
```

## Responsywność

### 1. CSS Media Queries

```css
/* Mobile */
@media (max-width: 480px) {
  .component {
    font-size: 14px;
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .component {
    font-size: 15px;
  }
}

/* Desktop */
@media (min-width: 769px) and (max-width: 1024px) {
  .component {
    font-size: 16px;
  }
}
```

### 2. ResponsiveWrapper Component

```jsx
import ResponsiveWrapper from './components/ResponsiveWrapper';

<ResponsiveWrapper
  mobileClass="mobile-styles"
  tabletClass="tablet-styles"
  desktopClass="desktop-styles"
  wideClass="wide-styles"
>
  <div>Treść</div>
</ResponsiveWrapper>
```

### 3. useScreenSize Hook

```jsx
import { useScreenSize } from './components/ResponsiveWrapper';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, isWide, width, height } = useScreenSize();
  
  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
      {isWide && <WideView />}
    </div>
  );
}
```

### 4. useUserPreferences Hook

```jsx
import { useUserPreferences } from './components/ResponsiveWrapper';

function MyComponent() {
  const { prefersDark, prefersReducedMotion, prefersHighContrast } = useUserPreferences();
  
  return (
    <div className={prefersDark ? 'dark' : 'light'}>
      Treść
    </div>
  );
}
```

## Kalendarz - Responsywność

Kalendarz automatycznie dostosowuje się do różnych rozmiarów ekranów:

### Mobile (≤480px):
- Szerokość kolumn: 80px
- Wysokość godzin: 25px
- Mniejsze fonty
- Poziome przewijanie

### Tablet (481px-768px):
- Szerokość kolumn: 100px  
- Wysokość godzin: 28px
- Średnie fonty
- Poziome przewijanie

### Desktop (769px-1024px):
- Szerokość kolumn: 110px
- Wysokość godzin: 30px
- Standardowe fonty
- Maksymalna szerokość: 900px

### Wide (≥1025px):
- Szerokość kolumn: 120px+
- Wysokość godzin: 30px
- Standardowe fonty
- Maksymalna szerokość: 960px

## Popover Responsywność

Na urządzeniach mobilnych (≤768px) popovery są wyświetlane jako modalne okna:

```css
@media (max-width: 768px) {
  .event-pop {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: min(90vw, 320px) !important;
  }
}
```

## Dostępność

### Touch-friendly:
- Minimalny rozmiar przycisków: 44x44px
- Większe odstępy między elementami
- Zoptymalizowane dla dotyku

### High Contrast:
- Automatyczne wykrywanie preferencji
- Zwiększone kontrasty ramek
- Lepsze rozróżnienie elementów

### Reduced Motion:
- Automatyczne wykrywanie preferencji
- Wyłączenie animacji
- Szybsze przejścia

## Najlepsze praktyki

1. **Używaj zmiennych CSS** zamiast hardkodowanych wartości
2. **Testuj na różnych urządzeniach** - nie tylko w DevTools
3. **Uwzględnij orientację** - landscape na mobile
4. **Dostosuj rozmiary dotyku** - minimum 44px
5. **Używaj semantycznego HTML** dla lepszej dostępności
6. **Testuj z różnymi preferencjami** użytkownika

## Debugowanie

### DevTools:
1. Otwórz DevTools (F12)
2. Przełącz na widok mobilny
3. Testuj różne rozmiary ekranów
4. Sprawdź orientację landscape/portrait

### Console:
```javascript
// Sprawdź rozmiar ekranu
console.log(window.innerWidth, window.innerHeight);

// Sprawdź preferencje
console.log(window.matchMedia('(prefers-color-scheme: dark)').matches);
console.log(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
```

## Przyszłe ulepszenia

- Container Queries (gdy będą szeroko wspierane)
- CSS Grid Subgrid
- Logical Properties
- Viewport Units (dvh, lvh, svh)
