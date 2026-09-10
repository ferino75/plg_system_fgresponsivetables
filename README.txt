FG Responsive Tables — Joomla 4 / 5 / 6
========================================

Systémový plugin. Po zapnutí načíta CSS a malý JS na frontende.

Inštalácia
----------
1. Systém → Inštalácia → Rozšírenia
2. Nahrajte tento ZIP
3. Systém → Pluginy → vyhľadajte „FG Responzívne tabuľky“ → Zapnúť

Použitie v článku
-----------------
<table class="responsiv">
  <thead>
    <tr>
      <th>Služba</th>
      <th>Cena</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Konzultácia</td>
      <td>45 €</td>
    </tr>
  </tbody>
</table>

Trieda `responsiv` je povinná (pokiaľ v nastaveniach nezapnete
„Upraviť všetky tabuľky v článku“).

Atribút data-label nie je povinný — plugin ho doplní z <th>.
Ak ho chcete mať ručne:

  <td data-label="Služba">Konzultácia</td>

Tabuľku, ktorá sa nemá skladať:

  <table class="no-responsiv">...</table>

Bunku, ktorej hodnota je vždy krátka (cena, kód) a nemá sa
zalomiť ani vedľa dlhého popisku:

  <td class="rwd-nowrap" data-label="Cena">195,-€</td>

(Predvolene sa hodnota v mobilnej karte smie zalomiť — to je
bezpečnejšie pre dlhší text, napr. poznámku.)

Tabuľku, ktorej stĺpce sa nemajú pri načítaní obsahu preskakovať
(table-layout: fixed na desktope):

  <table class="responsiv responsiv-fixed">...</table>

Porovnávaciu maticu, ktorá sa nemá nikdy skladať do kariet (napr.
tabuľka s mnohými stĺpcami, kde má zmysel iba porovnanie riadku
naprieč všetkými stĺpcami naraz) — zostane skutočnou tabuľkou a
namiesto skladania bude horizontálne skrolovať:

  <table class="responsiv rwd-scroll-only">...</table>

Širokú reportovú tabuľku (napr. výpis používateľov s mnohými
stĺpcami), kde má prvý stĺpec (ID, meno) zostať viditeľný aj pri
scrolovaní doprava:

  <table class="responsiv rwd-scroll-only rwd-sticky-col">...</table>

(rwd-sticky-col sa dá použiť aj samostatne, na akejkoľvek tabuľke,
ktorá už scroluje, napr. cez nastavenie Minimálna šírka tabuľky.)

Širokú tabuľku bez akéhokoľvek horizontálneho scrollovania — každá
hodnota sa skráti na jeden riadok s "...", plná hodnota sa zobrazí
po prejdení myšou (alebo pri prechádzaní klávesnicou):

  <table class="responsiv rwd-truncate">...</table>

(Na mobile sa aj tak normálne skladá do kariet — týka sa len
nezloženého, širokého zobrazenia.)

Pomocné triedy (zachované z pôvodného CSS, len v legacy.css)
--------------------------------------------------------------
  sirka-25, sirka-30
  col-w-md-25, col-w-md-33, col-w-md-50, col-w-md-60,
  col-w-md-66, col-w-md-75, col-w-md-100
  responsive-table + day-section* + day-content + .head
    (rozvrh dní vedľa seba od 800 px)

Tieto triedy sú dosť všeobecne pomenované na to, aby mohli na inom
webe znamenať niečo úplne iné. Preto sú v samostatnom legacy.css,
ktorý sa načíta len keď je v nastaveniach pluginu (Kompatibilita)
zapnuté „Načítať legacy kompatibilné štýly“ — predvolene ÁNO (kvôli
existujúcim webom ako fnspza.sk), na nových/cudzích inštaláciách
vypnite.

table-wrapper je naopak súčasť jadra (nie legacy.css) — JS ju
aktívne rozpoznáva: ak už tabuľku obaľuje div s touto triedou,
plugin ho použije namiesto vytvárania vlastného .rwd-table-wrap.

Poznámky
--------
- Šírky stĺpcov sirka-* sú v percentách, nie vo vw, aby sa tabuľka
  nepreblikávala pri zobrazení zvislého scrollbaru.
- Skladanie reaguje na šírku obalu, takže tabuľka v úzkom module
  sa zloží aj na širokom monitore.
- Šablónový CSS (Helix, SP Page Builder, UIkit, Regular Labs Tabs)
  do tohto pluginu nepatrí — ten nechajte v custom.css šablóny.
- Príklad: ak šablóna (napr. T3 Framework) vedľa <table> vkladá
  vlastnú duplicitnú <dl class="table"> verziu, toto rieši custom.css
  konkrétnej stránky, nie tento plugin:

    table.responsiv[data-rwd-ready="1"] + dl.table {
      display: none !important;
    }
