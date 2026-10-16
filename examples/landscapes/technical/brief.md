# Fra bestilling til kvittering

Målgruppe: lesere som vil forstå når en digital bestilling kan bekreftes. Kilde `brief`, 13. oktober 2026: følgende illustrative driftsregler.

## Miljøvalg

`technical`: dataoverføring mellom logiske funksjoner er forklaringen. Arbeidsflatene, kortene og displayene er en skjematisk representasjon av inndata, kontroll, lagring og kvittering. Komposisjonen viser ikke et faktisk serverrom. Ingen mennesker eller kjøretøy trengs i denne reisen.

Valideringen får størst flate fordi både obligatoriske felt og kapasitet avgjør utfallet. Komponentene forbindes gjennom navngitte porter og et delt datanett. Plasseringene følger prosessen; fysisk avstand har ingen betydning.

## Regler og historier

- Inndata inneholder kontakt, valgt tid og bestilling.
- Validering sjekker obligatoriske felt og ledig kapasitet.
- En godkjent bestilling lagres med et unikt nummer.
- Bekreftet lagring utløser kvittering med nummer og avtalt tid.
- Manglende kontaktopplysninger returneres til avsenderen med beskjed om hva som må rettes. Denne bestillingen lagres ikke.

Begge historiene følger data, med konkrete delmarkeringer for kontroll, lagring og output. Hele mekanismen er synlig på dette nivået; ytterligere fordypning gir ingen ny forklaring i dette materialet.
