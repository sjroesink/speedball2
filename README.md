# Speedball — Neon League

Een speelbaar browserprototype geïnspireerd op Speedball 2, met eigen industriële 3D-assets uit Blender. Three.js rendert de arena. Een Go-server draait de autoritatieve wedstrijd via WebTransport/HTTP/3/QUIC; er is geen WebSocket-fallback.

## Starten

Benodigd: Node.js 22+, Go 1.27+. De gegenereerde GLB-assets zijn inbegrepen.

```powershell
npm install
npm run server
```

Open een tweede terminal:

```powershell
npm run dev
```

Open **http://localhost:5188** in een recente Chrome of Edge. Klik op **Maak een arena**. Open een tweede tabblad op dezelfde URL en voer de kamercode in. De wedstrijd begint zodra beide spelers verbonden zijn. Met **Training** kun je zonder gameserver spelen.

De wedstrijd opent automatisch beeldvullend (met een browser-fullscreenverzoek waar ondersteund). De camera kijkt van bovenaf en volgt de bal. Via MENU keer je terug naar de lobby. Er spelen negen spelers per team, inclusief een keeper; je bestuurt automatisch de beschikbare speler het dichtst bij de bal, gemarkeerd met een ring. Teams wisselen van kant na de eerste helft van 90 seconden.

- WASD/pijltjes: bewegen en werprichting. W is omhoog in beeld.
- Spatie kort indrukken en loslaten: lage worp in je kijkrichting.
- Spatie minstens 0,24 seconde vasthouden en loslaten: hoge worp. E is een directe lob.
- Zonder bal: spatie geeft een sliding of een sprong naar een nabije hoge bal. Shift geeft een sliding/tackle, ook wanneer je mist. Een rake tackle slaat de tegenstander omver en maakt de bal los.
- Na het gooien kun je kort bijsturen (aftertouch). Een lob vliegt over staande spelers; spring om hem te vangen. De bal stuitert op de grond en tegen de muren. Een worp boven de lat telt niet als goal.

Goals geven 10 punten. Vijf stertargets per team zitten aan de zijwanden: elke nieuwe ster geeft 2 punten en alle vijf samen 10 extra. Een tegenstander kan een ster uitschakelen en punten aftrekken. De twee centrale bouncedomes geven 2 punten per botsing. De zijramps verschuiven de multiplier naar 1,5× of 2× voor de ploeg die ze activeert; de tegenstander kan die terugveroveren. Targets en multipliers resetten bij rust.

## Blender

Alle arena-, speler-, target-, dome-, ramp-, bal- en impactmodellen zijn gemaakt met `assets/build.py` in Blender 5.2. Geen gedownloade game-assets. `assets/arena.blend`, `player-cyan.blend`, `player-orange.blend`, `ball.blend` en `impact.blend` zijn afzonderlijk bewerkbare bronbestanden. De spelers bevatten native Blender-clips Slide, Jump, Throw en Hit. `assets/speedball.blend` bevat de samengestelde scène. GLB-export staat in `public/assets/`.

```powershell
npm run assets
```

Dit script gebruikt de lokale Blender-installatie op `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`. Pas het pad in package.json aan op een andere machine. Blender gebruikt zijn eigen Python; de gameserver heeft geen Python nodig. HUD, typografie en selectiering zijn browserinterface; het optionele goalsignaal wordt met Web Audio gesynthetiseerd.

## Netwerk en ontwerp

- `server/game.go`: 60 Hz simulatie, AI, tackles, balfysica, scores en tijd.
- `server/main.go`: kamercodes, origin-controle, certificaten en sessies.
- 30 Hz invoer en binaire snapshots via WebTransport-datagrams. `server/wire.go` en `src/wire.js` delen protocolversie 2. Een snapshot met 18 spelers blijft onder 600 bytes, inclusief animatiestaat, balhoogte, sterren, multipliers, spelersnamen en lobby. Volgnummers voorkomen terugspoelen; actietellers bewaren korte toetsdrukken tussen updates. Herstart de Go-server samen met de nieuwe clientversie.
- Server begrenst beweging, accepteert geen clientposities of scores en neutraliseert invoer na 300 ms stilte. Lege wachtruimtes verlopen na 10 minuten; vertrek sluit de wedstrijd voor beide spelers.
- De client interpoleert spelers; er is nog geen client prediction of lag compensation. Training heeft een aparte lokale JavaScript-simulatie.
- Lokale ontwikkeling gebruikt een nieuw ECDSA P-256-certificaat van 13 dagen bij elke serverstart. De browser valideert de SHA-256-hash uit `connection.json`; TLS-controle wordt niet uitgeschakeld. Herlaad/verbind opnieuw na serverherstart.

## Productie en spelen via internet

De game is lokaal getest en nog niet publiek gehost. Voor spelers op andere computers moet de frontend via HTTPS bereikbaar zijn en UDP 4433 rechtstreeks naar de Go-server kunnen. Een gewone HTTP reverse proxy transporteert WebTransport niet automatisch.

```powershell
npm run build
go build -o speedball-server.exe ./server
./speedball-server.exe -public-url https://arena.example.com:4433/play -origins https://play.example.com -cert /certs/fullchain.pem -key /certs/privkey.pem
```

Vervang de voorbeelddomeinen en certificaatpaden. Zet een HTTPS reverse proxy voor de HTTP-frontend op poort 8088, inclusief de dynamische `/connection.json`-route. Met `-cert` gebruikt de browser normale publieke certificaatvalidatie. `-addr` stelt de UDP-luisterpoort in; `-web-addr` stelt de HTTP-bind in. Poort 5188 is alleen voor ontwikkeling.

Er is ook een multi-stage Dockerfile. Publiceer `4433/udp` en de HTTP-frontend, mount de certificaten read-only en geef dezelfde domein/origin/certificaatvlaggen mee. De Docker-build en publieke internetverbinding zijn nog niet getest.

## Verificatie en afbakening

```powershell
go test ./server
go vet ./server
npm test
npm run build
```

Tests controleren gemiste en rake tackles, korte toetsdrukken, lage/hoge gerichte worpen, sprongvangsten, rebounds, worpen boven de lat, sterbonus en uitdoven, scoredomes, multipliers, speelhelftwissel, wedstrijdeinde en datagramgrootte. Twee browsertabbladen zijn lokaal via WebTransport verbonden en ontvangen dezelfde 9-tegen-9-wedstrijd. Dit blijft een remake in ontwikkeling: league/career, transfers, permanente blessures, power-ups, electrobounce, warpgates, ranked matchmaking, accounts, reconnect en touchbediening zijn nog niet geïmplementeerd. Toetsenbord is nodig. Voor publieke opschaling zijn onder meer sessielimieten per IP, loadtests en operationele monitoring vervolgwerk.

Bronnen: [webtransport-go](https://quic-go.net/docs/webtransport/), [browser-certificaathashes](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport/WebTransport).

Gameplayreferenties: [originele coaching manual, heruitgegeven door Retro Games](https://retrogames.biz/games/c64/speedball-2/), [Amiga-longplay, onder meer het wedstrijdfragment op 6:34](https://www.youtube.com/watch?v=ry_qLPOgIR8&t=394s). De huidige implementatie volgt de beschreven kernacties en puntentabel; attributes, tacklesucceskansen en de exacte originele veldverhoudingen zijn nog vereenvoudigd.
