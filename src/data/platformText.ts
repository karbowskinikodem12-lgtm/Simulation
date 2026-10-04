import type { IssueId } from '../engine/types';

/** Phrase banks for the procedural platform writer. Buckets: very left, left, centre, right, very right. */
export const PLATFORM_PHRASES: Record<IssueId, [string[], string[], string[], string[], string[]]> = {
  economy: [
    ['Nowy Zielony Ład dla gospodarki: państwo jako główny inwestor i gwarant miejsc pracy.', 'Rozbicie monopoli Big Tech i korporacji, które dławią konkurencję.'],
    ['Inwestycje publiczne w infrastrukturę i przemysł przyszłości.', 'Gospodarka budowana od środka — od klasy średniej, nie od góry.'],
    ['Rozsądna równowaga między rynkiem a państwem, wsparcie dla małych firm.', 'Odpowiedzialny budżet i inwestycje tam, gdzie się zwracają.'],
    ['Deregulacja i mniej biurokracji, by firmy mogły rosnąć.', 'Wzrost gospodarczy napędzany przez sektor prywatny, nie urzędników.'],
    ['Likwidacja zbędnych agencji federalnych i radykalne cięcie regulacji.', 'Wolny rynek bez ingerencji Waszyngtonu.'],
  ],
  inflation: [
    ['Federalna kontrola cen żywności, czynszów i leków.', 'Podatek od nadmiarowych zysków koncernów windujących ceny.'],
    ['Walka z „chciwflacją”: kary za zmowy cenowe i dopłaty do czynszów.', 'Ulgi dla rodzin na koszty opieki nad dziećmi i energii.'],
    ['Obniżanie kosztów życia poprzez zwiększenie podaży mieszkań i energii.', 'Współpraca z Fed na rzecz stabilnych cen.'],
    ['Koniec z rozrzutnymi wydatkami, które napędzają inflację.', 'Tańsza energia z krajowych źródeł = niższe ceny w sklepach.'],
    ['Zrównoważony budżet zapisany w Konstytucji.', 'Drastyczne cięcie wydatków federalnych, by zdusić inflację.'],
  ],
  jobs: [
    ['Federalna gwarancja zatrudnienia i płaca minimalna 20 dolarów.', 'Pełne prawo do zrzeszania się w związkach zawodowych.'],
    ['Płaca minimalna 17 dolarów i wsparcie dla związków zawodowych.', 'Miejsca pracy w zielonej energii i przemyśle krajowym.'],
    ['Programy przekwalifikowania pracowników i ulgi dla firm zatrudniających lokalnie.', 'Ochrona amerykańskiego przemysłu przed nieuczciwą konkurencją.'],
    ['Ulgi podatkowe dla firm tworzących miejsca pracy w USA.', 'Ograniczenie przepisów, które utrudniają zatrudnianie.'],
    ['Prawo do pracy bez przymusu związkowego w całym kraju.', 'Likwidacja płacy minimalnej na poziomie federalnym.'],
  ],
  immigration: [
    ['Obywatelstwo dla wszystkich nieudokumentowanych imigrantów i likwidacja ICE.', 'Otwarte, humanitarne podejście do uchodźców.'],
    ['Ścieżka do obywatelstwa dla „Dreamersów” i rodzin imigrantów.', 'Humanitarna reforma systemu azylowego.'],
    ['Kompleksowa reforma: bezpieczna granica i legalna droga dla pracowników.', 'Więcej sędziów imigracyjnych, szybsze procedury.'],
    ['Uszczelnienie granicy i dokończenie zapór.', 'Imigracja oparta na zasługach i potrzebach gospodarki.'],
    ['Masowe deportacje i koniec obywatelstwa z urodzenia.', 'Moratorium na imigrację do czasu pełnego zabezpieczenia granicy.'],
  ],
  taxes: [
    ['Podatek majątkowy od miliarderów i 70% stawka dla najbogatszych.', 'Koniec z rajami podatkowymi korporacji.'],
    ['Wyższe podatki dla zarabiających ponad 400 tys. dolarów rocznie.', 'Minimalny podatek od korporacji, by każdy płacił swoją część.'],
    ['Prostszy system podatkowy i ulgi dla klasy średniej.', 'Brak podwyżek podatków dla rodzin zarabiających poniżej 400 tys.'],
    ['Trwałe obniżki podatków dla rodzin i firm.', 'Niższy podatek od zysków kapitałowych, by pobudzić inwestycje.'],
    ['Podatek liniowy i likwidacja federalnego podatku od spadków.', 'Radykalne obniżenie wszystkich podatków federalnych.'],
  ],
  healthcare: [
    ['Medicare for All — jednolity publiczny system zdrowia.', 'Darmowe leki na receptę dla wszystkich.'],
    ['Publiczna opcja ubezpieczenia i limit cen insuliny.', 'Rozszerzenie Obamacare i Medicaid.'],
    ['Naprawa Obamacare zamiast jej likwidacji, przejrzystość cen w szpitalach.', 'Obniżanie cen leków poprzez negocjacje.'],
    ['Więcej konkurencji wśród ubezpieczycieli i konta oszczędnościowe na zdrowie.', 'Zastąpienie Obamacare rozwiązaniami rynkowymi.'],
    ['Całkowite uchylenie Obamacare i deregulacja rynku zdrowia.', 'Opieka zdrowotna jako sprawa prywatna, nie federalna.'],
  ],
  security: [
    ['Przekierowanie funduszy policji na usługi społeczne.', 'Koniec masowego więzienictwa i wojny z narkotykami.'],
    ['Reforma policji, kamery na mundurach i powszechne sprawdzanie przeszłości przy zakupie broni.', 'Inwestycje w prewencję przemocy.'],
    ['Więcej funduszy dla policji połączone z odpowiedzialnością.', 'Bezpieczne ulice i sprawiedliwy wymiar sprawiedliwości.'],
    ['Pełne wsparcie dla policji i surowsze kary dla przestępców.', 'Obrona Drugiej Poprawki.'],
    ['Federalna ofensywa przeciw przestępczości i kartelom, z użyciem Gwardii Narodowej.', 'Brak jakichkolwiek ograniczeń w dostępie do broni.'],
  ],
  foreign: [
    ['Cięcie budżetu Pentagonu o połowę i koniec wojen za granicą.', 'Polityka zagraniczna oparta na prawach człowieka.'],
    ['Odbudowa sojuszy i przywództwo przez dyplomację.', 'Wspieranie demokracji we współpracy z partnerami z NATO.'],
    ['Silna armia i silne sojusze — pokój przez siłę i dyplomację.', 'Twarda, ale pragmatyczna postawa wobec Chin.'],
    ['Pokój przez siłę: modernizacja armii i twarde stanowisko wobec rywali.', 'America First w handlu i dyplomacji.'],
    ['Wycofanie się z organizacji międzynarodowych i cła na wszystkich rywali.', 'Rekordowy budżet obronny i dominacja militarna.'],
  ],
  climate: [
    ['Zakaz szczelinowania i 100% czystej energii do 2035 r.', 'Klimatyczny stan wyjątkowy na poziomie federalnym.'],
    ['Ambitne cele klimatyczne i ulgi na pojazdy elektryczne.', 'Powrót do porozumienia paryskiego i inwestycje w OZE.'],
    ['„Wszystkie powyższe”: gaz, atom i odnawialne źródła energii.', 'Stopniowa transformacja bez uderzania w miejsca pracy.'],
    ['Niezależność energetyczna: „drill, baby, drill”.', 'Koniec z regulacjami klimatycznymi duszącymi przemysł.'],
    ['Wyjście z porozumień klimatycznych i likwidacja EPA.', 'Pełne wsparcie dla węgla, ropy i gazu.'],
  ],
  social: [
    ['Kodyfikacja praw reprodukcyjnych i pełna ochrona osób LGBTQ+.', 'Reparacje i walka z systemowym rasizmem.'],
    ['Ochrona prawa do aborcji i równości małżeńskiej.', 'Walka z dyskryminacją w każdej formie.'],
    ['Szacunek dla różnych przekonań i umiarkowane podejście do sporów kulturowych.', 'Decyzje w sprawach sumienia pozostawione stanom.'],
    ['Obrona wolności religijnej i wartości rodzinnych.', 'Ograniczenie aborcji i ochrona praw rodziców.'],
    ['Federalny zakaz aborcji i ochrona tradycyjnego modelu rodziny.', 'Koniec z ideologią „woke” w instytucjach publicznych.'],
  ],
  education: [
    ['Darmowe studia publiczne i umorzenie wszystkich kredytów studenckich.', 'Powszechne przedszkola finansowane federalnie.'],
    ['Częściowe umorzenie długów studenckich i podwyżki dla nauczycieli.', 'Więcej funduszy dla szkół publicznych.'],
    ['Lepsze szkoły publiczne i rozwój szkolnictwa zawodowego.', 'Tańsze studia bez obciążania podatników.'],
    ['Wybór szkoły dla rodziców i rozwój szkół czarterowych.', 'Więcej kontroli lokalnej nad programem nauczania.'],
    ['Likwidacja Departamentu Edukacji i powszechne bony edukacyjne.', 'Pełna kontrola rodziców nad edukacją.'],
  ],
};

export const SLOGAN_PARTS = {
  open: ['Ameryka', 'Razem', 'Naprzód', 'Nowy', 'Silna', 'Wolna', 'Odważnie', 'Prawdziwa'],
  left: ['dla wszystkich', 'sprawiedliwa', 'przyszłości', 'ludzi pracy', 'bez wykluczonych', 'nadziei'],
  center: ['zjednoczona', 'ponad podziałami', 'zdrowego rozsądku', 'która działa', 'odnowiona'],
  right: ['bezpieczna', 'wolności', 'silna i dumna', 'zasad', 'na pierwszym miejscu', 'bez kompromisów'],
};

/**
 * Keyword lexicon used to infer issue positions from free text written by the player.
 * Patterns are matched against lowercase text (Polish stems + common English phrases).
 */
export const LEXICON: Record<IssueId, { re: RegExp; dir: number }[]> = {
  economy: [
    { re: /deregulac|wolny rynek|wolnego rynku|mniej biurokrac|free market|deregulat/, dir: 60 },
    { re: /inwestycj\w* publiczn|interwenc|rozbi\w* monopol|nacjonaliz|socjal|public invest/, dir: -60 },
  ],
  inflation: [
    { re: /kontrol\w* cen|zamrożeni\w* cen|chciwflac|price control/, dir: -65 },
    { re: /ci[ęe]ci\w* wydatk|zrównoważon\w* budżet|balanced budget|spending cut/, dir: 60 },
  ],
  jobs: [
    { re: /płac\w* minimaln|związk\w* zawodow|union|minimum wage|gwarancj\w* zatrudni/, dir: -60 },
    { re: /prawo do pracy|right to work|ulg\w* dla firm|elastyczn\w* rynek/, dir: 55 },
  ],
  immigration: [
    { re: /deportac|mur\b|muru|zamkni\w* granic|uszczelni\w* granic|wall|deport/, dir: 75 },
    { re: /obywatelstw\w* dla|amnesti|dreamers|ścieżk\w* do obywatelstwa|uchodźc|path to citizenship/, dir: -65 },
  ],
  taxes: [
    { re: /obniż\w* podat|niższe podatki|niskie podatki|cięci\w* podatk|tax cut|cut taxes|podatek liniowy/, dir: 70 },
    { re: /podat\w* (?:dla|od) (?:bogat|miliarder|najbogat|korporac)|podatek majątkowy|wyższe podatki|tax the rich|wealth tax/, dir: -70 },
  ],
  healthcare: [
    { re: /medicare for all|publiczn\w* (?:system|ubezpiecz|opiek)|powszechn\w* opiek|single payer|darmow\w* (?:leczen|opiek)/, dir: -75 },
    { re: /uchyl\w* obamacare|prywatn\w* ubezpiecz|repeal|rynkow\w* rozwiązan/, dir: 65 },
  ],
  security: [
    { re: /prawo i porządek|wsparci\w* (?:dla )?policji|surowsz\w* kar|druga poprawka|second amendment|law and order|back the blue/, dir: 65 },
    { re: /reform\w* policji|defund|ograniczeni\w* dostępu do broni|kontrol\w* broni|gun control/, dir: -60 },
  ],
  foreign: [
    { re: /america first|pokój przez siłę|silna armia|budżet obronn|peace through strength|cła/, dir: 55 },
    { re: /dyplomac|sojusz|nato|pokojow|wycofani\w* wojsk|prawa człowieka/, dir: -45 },
  ],
  climate: [
    { re: /zielon\w* (?:energi|transform|ład)|odnawialn|oze|neutralność klimat|green new deal|renewable|zakaz szczelin/, dir: -70 },
    { re: /drill|wydobyci\w*|ropa|węgiel|paliw\w* kopaln|niezależność energetyczn|fracking/, dir: 60 },
  ],
  social: [
    { re: /prawo do aborcji|prawa reprodukcyjn|lgbt|równość małżeńsk|pro-choice|prawa kobiet/, dir: -70 },
    { re: /wartości rodzinn|tradycyjn\w* wartości|zakaz aborcji|pro-life|ochron\w* życia|wolność religijn/, dir: 70 },
  ],
  education: [
    { re: /darmow\w* studi|umorzeni\w* (?:długów|kredyt)|student debt|szkoł\w* publiczn|free college/, dir: -65 },
    { re: /bon\w* edukacyjn|wybór szkoły|school choice|czarterow|prawa rodziców/, dir: 65 },
  ],
};

export const ISSUE_MENTION: Record<IssueId, RegExp> = {
  economy: /gospodark|economy|wzrost|biznes/,
  inflation: /inflac|ceny|koszt\w* życia|drożyzn/,
  jobs: /prac[ay]|bezroboci|zatrudni|jobs|płac/,
  immigration: /imigra|granic|migran|border/,
  taxes: /podat|tax/,
  healthcare: /zdrow|szpital|ubezpiecz|leki|health/,
  security: /bezpiecze|przestęp|policj|broń|broni|crime/,
  foreign: /zagraniczn|chin|rosj|nato|armi|wojsk|foreign/,
  climate: /klimat|energi|ekolog|climate/,
  social: /aborc|rodzin|religi|lgbt|wartości/,
  education: /eduk|szkoł|studi|nauczyc/,
};
