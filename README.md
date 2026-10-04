# Road to 270 — symulator wyborów prezydenckich USA

Przeglądarkowa gra strategiczna (desktop): tworzysz 2–3 kandydatów, prowadzisz kampanię przez wszystkie 50 stanów + DC, a wynik rozstrzyga Kolegium Elektorów.

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # wersja produkcyjna w dist/ (npm run preview, aby ją podejrzeć)
npm test           # testy silnika (vitest)
npm run simulate   # raport balansu: kilkadziesiąt pełnych kampanii AI vs AI i gracz na autopilocie
```

Gra działa w całości lokalnie (bez serwera i kluczy API). Czcionki i dane mapy są dołączone przez npm.

## Stack

| Warstwa | Wybór | Dlaczego |
| --- | --- | --- |
| Build / dev | **Vite** | natychmiastowy HMR, szybki build |
| UI | **React 19 + TypeScript** | komponentowy UI, ścisłe typy w całym projekcie |
| Stan | **Zustand** | minimalny store; silnik pracuje na klonie stanu, UI subskrybuje niemutowalne dane |
| Mapa | **us-atlas + topojson-client + d3-geo** | prawdziwe granice stanów (Albers USA) renderowane jako SVG |
| Wykresy | własne lekkie komponenty SVG | pełna kontrola nad wyglądem, zero ciężkich zależności |
| Styl | CSS z tokenami (ciemny motyw w stylu studia wyborczego), Inter + Barlow Condensed | |

## Architektura

```
src/
  data/       statyczne dane: stany (EV, demografia, lean, frekwencja, godziny zamknięcia lokali),
              partie, profile kandydatów, tematy, banki tekstów programów, wydarzenia, pytania debat
  engine/     czysta logika gry w TypeScript — bez Reacta, w pełni testowalna w Node
    types.ts        model danych (cały stan gry to zwykły JSON → zapis/odczyt, klonowanie)
    config.ts       wszystkie pokrętła balansu w jednym miejscu
    voterModel.ts   model wyborców (użyteczność → softmax → poparcie w każdym stanie)
    simulation.ts   pętla dnia: AI → harmonogramy → reklamy → finanse → zanik efektów → gospodarka
                    → wydarzenia → debaty → głosowanie wcześniejsze → sondaże → prognoza
    actions.ts      działania kampanii (wiece, spotkania, zbiórki, przemówienia, wywiady, reklamy, biura)
    ai.ts           sztaby przeciwników (wybór celów wg EV × wyrównania, budżet reklam, biura)
    events.ts / effects.ts   losowe wydarzenia + deklaratywny język efektów
    debate.ts       mini-gra debat
    polls.ts        pracownie sondażowe z „house effects” i błędem próby
    forecast.ts     prognoza Monte Carlo (skorelowane wstrząsy krajowe/regionalne/stanowe)
    election.ts     dzień wyborów: frekwencja, głosy oddane wcześniej, Maine/Nebraska, Izba Reprezentantów
    analysis.ts     „dlaczego wygrał”: dekompozycja przewagi w kluczowych stanach na czynniki
    platform.ts     „AI” programów: generator programu i analiza tekstu wpisanego przez gracza
  store/      Zustand: ekran, aktualny stan gry, snapshot, prędkość, akcje UI, zapis w localStorage
  ui/         ekrany (menu, kreator wyborów, kampania, wieczór wyborczy, wyniki), mapa, wykresy, modale
tests/        testy silnika i raport balansu
```

Zasada: **silnik nie wie nic o UI**. Store klonuje stan (`structuredClone`), wywołuje funkcję silnika i podmienia stan, a po każdej zmianie przelicza `Snapshot` (poparcie we wszystkich stanach). Dzięki temu dodanie nowego systemu zwykle oznacza: nowe pole w `types.ts`, krok w `simulation.ts` i panel w `ui/`.

### Model wyborców

Dla każdego stanu i kandydata liczona jest użyteczność:

- **lojalność partyjna** — `atanh(lean stanu) × oś partii × siła identyfikacji`,
- **program** — ważona istotnością tematów odległość stanowisk kandydata od mediany wyborców stanu (mediana zależy od lean i demografii: Latynosi, wykształcenie, religijność, seniorzy, regiony energetyczne, Pas Rdzy…),
- **jakość kandydata** (charyzma, doświadczenie), **wizerunek** (favorability), **momentum**,
- **gospodarka** — nagroda/kara dla partii rządzącej,
- **wysiłek kampanii** w stanie (wiece, reklamy, biura terenowe; malejące przychody), reklamy negatywne rywali,
- **stan rodzinny**, **wydarzenia lokalne**, **bariera trzeciej partii**.

Udziały liczy wielomianowy logit (softmax). Gracz widzi tylko sondaże, a te mają ukryty, skorelowany błąd systematyczny, który ujawnia się dopiero w wieczór wyborczy.

## Mechaniki

- **Kreator wyborów**: 2 lub 3 kandydatów, imiona, partia (DEM/REP/LIB/GRN/niezależny), profil (gubernator, senator, przedsiębiorca, generał, aktywista, celebryta, burmistrz), stan rodzinny, program na 11 tematach (suwaki i własne teksty), manifest pisany własnymi słowami z analizą tekstu albo program wygenerowany przez „AI” w stylu umiarkowanym, głównego nurtu lub radykalnym. Do tego partia rządząca, długość kampanii, poziom trudności i tryb obserwatora.
- **Kampania w czasie rzeczywistym** z pauzą i trzema prędkościami (spacja, klawisze 1–3). Gra sama się zatrzymuje, gdy trzeba podjąć decyzję.
- **Harmonogram kandydata** (do 7 dni naprzód) i **kondycja**: zmęczenie obniża skuteczność i zwiększa ryzyko gaf. Jest też **autopilot sztabu** na puste dni.
- **Reklamy** pozytywne, negatywne i tematyczne (stanowe lub ogólnokrajowe) oraz **biura terenowe** (trwała obecność i mobilizacja w dniu wyborów).
- **Agenda medialna**: istotność tematów zmienia się pod wpływem gospodarki, wydarzeń i przemówień, więc opłaca się mówić o tym, w czym ma się przewagę.
- **Gospodarka**: PKB, inflacja, bezrobocie, ceny benzyny, comiesięczne raporty o rynku pracy i CPI.
- **Sondaże** ośmiu fikcyjnych pracowni (próba, margines błędu, house effect, ocena jakości), średnia sondaży i **prognoza Monte Carlo** szans na wygraną oraz rozkładu EV.
- **Debaty** (3, próg 15% jak w Komisji Debat Prezydenckich): 4 rundy, cztery style odpowiedzi, z których każdy kontruje jeden inny. Liczą się przygotowanie i przewaga tematyczna. Na koniec błyskawiczny sondaż.
- **23 rodzaje wydarzeń losowych** (plus comiesięczne raporty gospodarcze): skandale, gafy, huragany, pożary, kryzysy międzynarodowe, kryzys na granicy, krach giełdowy, strajki, wyrok Sądu Najwyższego, poparcia, Super PAC, deepfake, October Surprise. Wiele z nich wymaga decyzji z ryzykiem.
- **Głosowanie przedterminowe**: przez ostatnie 4 tygodnie głosy są „bankowane” po bieżącym poparciu.
- **Dzień wyborów**: frekwencja (entuzjazm, wyrównanie wyścigu, pogoda), podział głosów w **Maine i Nebrasce** według okręgów, a przy braku 270 głosów **wybór przez Izbę Reprezentantów**.
- **Wieczór wyborczy**: lokale zamykane według stref czasowych, liczenie głosów w różnym tempie w każdym stanie, ogłaszanie projekcji i wejście zwycięzcy na 270.
- **Podsumowanie**: głosowanie powszechne, Kolegium Elektorów, frekwencja, wyniki i mapa wszystkich stanów (tabela z sortowaniem), wykresy poparcia, szans i EV w czasie, najważniejsze wydarzenia, analiza przyczyn zwycięstwa z wykresem czynników i stanem decydującym (tipping point).
- **Zapis gry** w localStorage (automatycznie co 5 dni oraz ręcznie).

## Jak rozwijać

- **Nowe wydarzenie**: dopisz obiekt do `src/data/eventTemplates.ts` (tytuł, opis, waga, warunki, efekty lub wybory). Kod silnika się nie zmienia.
- **Nowy typ efektu**: dodaj wariant w `Effect` i obsługę w `applyEffects` (`engine/effects.ts`).
- **Nowe działanie kampanii**: wpis w `SCHEDULE_META` i gałąź w `executeAction` (`engine/actions.ts`). Przycisk w UI pojawi się przez `ScheduleButton`.
- **Nowy czynnik w modelu wyborców**: dodaj klucz w `FactorKey`/`FACTOR_LABEL` i składnik w `candidateComponents`. Automatycznie trafi do analizy wyników.
- **Balans**: `engine/config.ts`, potem `npm run simulate`.

Pomysły na kolejne wersje: kandydaci na wiceprezydenta, okręgi kongresowe i wybory do Senatu, prawybory, sztab z doradcami (perki), mapy hrabstw w wieczór wyborczy, tryb wieloosobowy hot-seat.
