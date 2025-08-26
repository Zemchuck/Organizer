# Organizer - Aplikacja do zarządzania czasem

Aplikacja do zarządzania kalendarzem, projektami, celami i nawykami z pełną obsługą responsywności i motywów.

## Funkcje

### 🎨 Motywy
- **Ciemny** - Domyślny motyw z ciemnymi kolorami
- **Jasny** - Jasny motyw z jasnymi kolorami
- **Neon** - Neonowy motyw z jaskrawymi kolorami

### 📱 Responsywność
- **Mobile** (≤480px) - Zoptymalizowane dla telefonów
- **Tablet** (481px-768px) - Zoptymalizowane dla tabletów  
- **Desktop** (769px-1024px) - Zoptymalizowane dla laptopów
- **Wide** (≥1025px) - Zoptymalizowane dla dużych ekranów

### 📅 Kalendarz
- Widok tygodniowy z responsywnym designem
- Obsługa zadań i nawyków
- Poziome przewijanie na małych ekranach
- Popover z informacjami o zdarzeniach

## Uruchomienie

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
# Uruchom backend zgodnie z instrukcjami
```

## Technologie

- **Frontend**: React 19, Vite, CSS Variables
- **Backend**: Python (FastAPI)
- **Responsywność**: CSS Media Queries
- **Motywy**: CSS Custom Properties

## Struktura motywów

Aplikacja używa systemu zmiennych CSS do obsługi motywów:

```css
:root {
  --bg: #0d0f14;           /* Tło */
  --panel: #151922;        /* Panele */
  --text: #ffffff;         /* Tekst */
  --turquoise: #40e0d0;    /* Akcent */
  /* ... więcej zmiennych */
}
```

Każdy motyw definiuje własne wartości tych zmiennych.

## Responsywność

Aplikacja automatycznie dostosowuje się do różnych rozmiarów ekranów:

- **Mobile**: Mniejsze fonty, kompaktowy layout
- **Tablet**: Średnie rozmiary, zoptymalizowane dotyki
- **Desktop**: Pełne funkcje, standardowe rozmiary
- **Wide**: Maksymalne wykorzystanie przestrzeni