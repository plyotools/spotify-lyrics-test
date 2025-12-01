# Last inn Chrome-utvidelsen

## Viktig: Last inn fra `dist`-mappen!

Feilen "Manifestfilen mangler eller kan ikke leses" oppstår hvis du prøver å laste inn fra feil mappe.

## Steg-for-steg:

1. **Bygg utvidelsen først** (hvis du ikke allerede har gjort det):
   ```bash
   npm run build:extension
   ```

2. **Åpne Chrome Extensions**:
   - Gå til `chrome://extensions/`
   - Eller: Chrome meny → Mer verktøy → Utvidelser

3. **Aktiver Developer Mode**:
   - Slå på "Utviklermodus" (Developer mode) i øvre høyre hjørne

4. **Last inn utvidelsen**:
   - Klikk "Last inn pakket ut" (Load unpacked)
   - **VIKTIG**: Naviger til og velg **`dist`-mappen**, IKKE rotmappen
   - Full sti skal være: `/Users/pre/Spotify Lyrics Player/dist`

5. **Verifiser**:
   - Utvidelsen skal nå vises i listen
   - Klikk på utvidelsesikonet i Chrome-verktøylinjen for å åpne appen

## Feilsøking:

Hvis du fortsatt får feil:
- Sjekk at `dist/manifest.json` eksisterer
- Sjekk at `dist/background.js` eksisterer
- Sjekk at `dist/icons/` mappen inneholder icon16.png, icon48.png, icon128.png
- Kjør `npm run build:extension` på nytt

