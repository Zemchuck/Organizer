# Changelog - Organizer

## [2.2.0] - 2024-01-XX

### Dodano ✨
- **Google Calendar Style**: WeekView teraz wygląda dokładnie jak Google Calendar
- **Czyste linie siatki**: Proste linie poziome przez całą szerokość
- **Etykiety na lewej krawędzi**: Etykiety godzin są na lewej krawędzi kolumny
- **Uproszczony design**: Bardziej minimalistyczny wygląd eventów
- **Lepsze proporcje**: Zoptymalizowane szerokości kolumn
- **Widoczne linie godzin**: Zwiększona widoczność linii pełnych godzin
- **Ulepszone popovery**: Lepsze cienie, kolory i pozycjonowanie

### Zmieniono 🔄
- **Struktura siatki**: Każda kolumna ma swoje wiersze godzin z liniami
- **Design eventów**: Bardziej płaskie, podobne do Google Calendar
- **Nagłówek**: Uproszczona typografia i kolory
- **Linia "teraz"**: Czerwona linia z lepszymi efektami
- **Layout**: Flexbox zamiast grid dla lepszej kontroli
- **Widoczność linii**: Zwiększona opacity linii z 0.6 do 0.8

### Poprawiono 🐛
- **Responsywność**: Lepsze skalowanie na różnych ekranach
- **Wizualna spójność**: Jednolity wygląd z Google Calendar
- **Performance**: Uproszczona struktura CSS
- **Popovery**: Naprawiono style i widoczność popoverów
- **Nawyki**: Przekreślone paski działają poprawnie
- **Linie siatki**: Lepsza widoczność linii pełnych godzin

## [2.0.0] - 2024-01-XX

### Dodano ✨
- **Pełna obsługa motywów**: Ciemny, Jasny i Neon
- **Responsywność**: Obsługa wszystkich rozmiarów ekranów (mobile, tablet, desktop, wide)
- **Komponent ThemeToggle**: Zaawansowany przełącznik motywów z zapisywaniem preferencji
- **ResponsiveWrapper**: Komponent do łatwego zarządzania responsywnością
- **Hooks responsywności**: useScreenSize i useUserPreferences
- **Dostępność**: Wsparcie dla preferencji użytkownika (reduced motion, high contrast)
- **Touch-friendly**: Zoptymalizowane dla urządzeń dotykowych
- **Print styles**: Style do drukowania

### Zmieniono 🔄
- **App.jsx**: Używa teraz komponentu ThemeToggle zamiast prostego selektora
- **CSS Variables**: Rozszerzone o motyw jasny i lepszą responsywność
- **Kalendarz**: Automatyczne dostosowanie do rozmiaru ekranu
- **Popovery**: Modalne wyświetlanie na urządzeniach mobilnych
- **Header**: Responsywny layout z lepszym układem na mobile

### Poprawiono 🐛
- **Vite config**: Dodano polyfill dla crypto (Node.js 16 compatibility)
- **CSS**: Usunięto wymuszenie ciemnego motywu
- **Responsywność**: Lepsze skalowanie elementów na różnych ekranach
- **Dostępność**: Lepsze focus indicators i kontrasty

### Usunięto 🗑️
- **Wymuszenie ciemnego motywu**: Aplikacja teraz obsługuje wszystkie motywy
- **Ukryte opcje**: Wszystkie motywy są teraz dostępne
- **Inline styles**: Zastąpione klasami CSS

## Szczegóły techniczne

### Motywy
- **Dark**: `#0d0f14` background, `#151922` panels
- **Light**: `#f8fafc` background, `#ffffff` panels  
- **Neon**: `#04040a` background, `#0b0c16` panels

### Breakpointy
- **Mobile**: ≤480px
- **Tablet**: 481px-768px
- **Desktop**: 769px-1024px
- **Wide**: ≥1025px

### Nowe pliki
- `frontend/src/styles/responsive.css` - Responsywne utility
- `frontend/src/components/ResponsiveWrapper.jsx` - Komponent wrapper
- `frontend/RESPONSIVE_GUIDE.md` - Dokumentacja dla deweloperów
- `CHANGELOG.md` - Ten plik

### Zmodyfikowane pliki
- `frontend/src/styles/variables.css` - Dodano motyw jasny i breakpointy
- `frontend/src/index.css` - Responsywne style i usunięto wymuszenie ciemnego motywu
- `frontend/src/App.jsx` - Używa ThemeToggle i responsywnego layoutu
- `frontend/src/components/Calendar/WeekView.css` - Responsywność kalendarza
- `frontend/vite.config.js` - Polyfill dla crypto
- `README.md` - Zaktualizowana dokumentacja

## Kompatybilność
- **Node.js**: ≥16.0.0
- **React**: 19.x
- **Przeglądarki**: Wszystkie nowoczesne (ES2020+)
- **Urządzenia**: Mobile, tablet, desktop, wide screens
