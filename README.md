**********RAZVOJ MOBILNE APLIKACIJE ZA NARUČIVANJE U RESTORANU UZ AI ASISTENTA**********

Diplomski rad

Autor: Martin Čikor

Mentor: izv. prof. dr. sc. Nikola Tanković

Komentor: dr. sc. Robert Šajina

**Sveučilište Jurja Dobrile u Puli, Fakultet informatike**

**Sažetak**

Cilj ovog diplomskog rada bio je razviti mobilnu aplikaciju koja gostima restorana omogućuje jednostavnije i brže naručivanje hrane i pića putem mobilnog uređaja. Aplikacija je namijenjena korištenju unutar restorana, pri čemu gost skeniranjem QR koda povezanog sa stolom dobiva pristup digitalnom jelovniku i mogućnosti izrade narudžbe.

Korisnik može pregledavati dostupna jela i pića, odabrati željene proizvode, definirati količinu i dodatne modifikacije te pregledati košaricu prije slanja narudžbe. Podaci o jelovniku i narudžbama pohranjuju se pomoću Firebase servisa, što omogućuje dinamičko dohvaćanje podataka i praćenje promjena u stvarnom vremenu.

Uz osnovne funkcionalnosti naručivanja implementiran je i AI asistent koji korisniku omogućuje komunikaciju prirodnim jezikom. Putem razgovora korisnik može zatražiti informacije o jelovniku, preporuke hrane i pića, pregledavati košaricu te dodavati proizvode u narudžbu. AI model služi za razumijevanje korisničkog zahtjeva, dok se provjera podataka i izvršavanje akcija provode na poslužiteljskoj strani kako bi se spriječilo dodavanje nepostojećih proizvoda ili izvršavanje neispravnih akcija.

**Funkcionalnosti**

**Prijava korisnika:**

anonimna autentifikacija putem Firebase Authenticationa
unos nadimka korisnika
pamćenje korisnika između pokretanja aplikacije

**QR kod i odabir stola:**

skeniranje QR koda pomoću kamere mobilnog uređaja
provjera ispravnosti QR koda
povezivanje korisnika s odgovarajućim stolom u restoranu

**Digitalni jelovnik:**

dohvaćanje aktualnog jelovnika iz Firebase Realtime Database
pregled dostupne hrane i pića
odabir proizvoda
određivanje količine proizvoda
dodavanje modifikacija i napomena uz proizvod

**Košarica i naručivanje:**

pregled odabranih proizvoda
izmjena i uklanjanje proizvoda iz košarice
slanje narudžbe osoblju restorana
pohrana narudžbe u Firebase Realtime Database

**AI asistent:**

komunikacija s korisnikom prirodnim jezikom
odgovaranje na pitanja o jelovniku
preporuka hrane i pića
dodavanje proizvoda u košaricu putem razgovora
razumijevanje različitih načina izražavanja korisničkih zahtjeva
prikaz sadržaja košarice
korištenje prethodnih poruka kao konteksta razgovora
provjera AI akcija na poslužiteljskoj strani

**Osoblje restorana:**

pregled zaprimljenih narudžbi
praćenje statusa narudžbi
ažuriranje statusa narudžbi
prikaz promjena statusa korisniku u stvarnom vremenu
Korištene tehnologije
Android / Java
Firebase Authentication
Firebase Realtime Database
Firebase Functions
Google Code Scanner API
OpenAI API
GPT-5 mini
Pokretanje aplikacije

**Za pokretanje projekta potrebno je:**

1. Klonirati repozitorij.

2. Otvoriti projekt u Android Studiju.

3. Povezati projekt s odgovarajućim Firebase projektom.

4. Dodati potrebnu Firebase konfiguraciju.

5. Konfigurirati i pokrenuti Firebase Functions za poslužiteljski dio AI asistenta.

6. Pokrenuti aplikaciju na Android uređaju ili emulatoru.

7. Za korištenje funkcionalnosti naručivanja potreban je valjani QR kod stola u formatu koji aplikacija očekuje.

**stavke pod brojem 3,4,5 su odrađene u sklopu ovog repozitorija**

**Demo**

Za demonstraciju aplikacije potrebno je pokrenuti Android aplikaciju te skenirati valjani QR kod stola. (slike se nalaze u repozitoriju)

Korisnik nakon skeniranja QR koda može pregledavati jelovnik, dodavati proizvode u košaricu, prilagođavati narudžbu te koristiti AI asistenta za komunikaciju i upravljanje narudžbom.

**Dokumentacija**

Detaljan opis arhitekture sustava, implementacije aplikacije, korištenih tehnologija, AI asistenta te provedeno testiranje dostupni su u priloženom diplomskom radu.
