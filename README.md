Aplikacija je osmišljena kao digitalni sustav za naručivanje u ugostiteljskom objektu, gdje gost putem mobilnog uređaja samostalno pristupa jelovniku, šalje narudžbu i prati njezin status u stvarnom vremenu, dok kuhinja istovremeno upravlja pristiglim narudžbama.

1. Početna stranica

Korisnik najprije dolazi na početni ekran aplikacije.
Na tom ekranu aplikacija služi kao ulazna točka u sustav naručivanja.

S početne stranice korisnik prelazi na funkcionalnost skeniranja QR koda.

2. Skeniranje QR koda

Na sljedećem ekranu korisnik skenira QR kod koji se nalazi na stolu u ugostiteljskom objektu.

QR kod služi za:

identifikaciju restorana ili objekta
identifikaciju stola
validaciju pristupa digitalnom jelovniku

Ako QR kod nije ispravan ili nije valjan, korisniku se prikazuje obavijest o pogrešci i proces se ne nastavlja.

Ako je QR kod valjan, aplikacija dohvaća potrebne podatke i korisnik prelazi dalje u sustav.

3. Ulazak u digitalni jelovnik

Nakon uspješnog skeniranja korisnik ulazi u ekran za odabir jela i pića.

Na tom ekranu prikazuju se:

broj stola
kategorije jela i pića
artikli dohvaćeni iz Firebase baze
ukupan broj trenutno odabranih stavki

Korisnik može:

pregledavati artikle
mijenjati kategorije
odabrati hranu ili piće
otvoriti detalje pojedinog artikla
odabrati količinu
dodati artikl u narudžbu

Svi odabrani artikli privremeno se pohranjuju lokalno, kako bi korisnik mogao slagati narudžbu prije slanja.

4. Pregled narudžbe

Kada korisnik završi odabir artikala, prelazi na ekran pregleda narudžbe.

Na tom ekranu prikazuju se:

sve odabrane stavke
količine pojedinih artikala
mogućnost uklanjanja stavki iz narudžbe
ukupni broj odabranih artikala

Korisnik ovdje može:

potvrditi narudžbu
obrisati pojedinu stavku
poništiti lokalnu narudžbu
vratiti se i dodati još proizvoda

Tek nakon potvrde narudžbe podaci se šalju u Firebase.

5. Slanje narudžbe

Kada korisnik klikne na gumb za slanje narudžbe, aplikacija:

generira jedinstveni identifikator narudžbe
sprema stavke narudžbe u Firebase Realtime Database
sprema broj stola
sprema vrijeme narudžbe
sprema status narudžbe
inicijalizira korak praćenja narudžbe

Početni status narudžbe je:

Narudžba zaprimljena

Uz status se sprema i početni napredak narudžbe, kako bi se kasnije mogao prikazati korisniku.

6. Potvrda uspješnog slanja

Nakon slanja narudžbe korisniku se prikazuje ekran potvrde.

Na tom ekranu vidi:

pregled upravo poslane narudžbe
poruku da će biti preusmjeren natrag na ekran za odabir jela i pića
informaciju da svoje narudžbe može pratiti u odjeljku aktivnih narudžbi

Nakon kratkog vremenskog intervala korisnik se automatski vraća na ekran s jelovnikom.

7. Povratak na odabir jela i pića

Nakon potvrde slanja korisnik se vraća na ekran za odabir jela i pića.

Na tom ekranu sada ima pristup dodatnoj funkcionalnosti:

pregledu aktivnih narudžbi za svoj stol

Ikona za aktivne narudžbe pojavljuje se samo ako za taj stol postoje aktivne narudžbe koje još nisu završene.

To korisniku omogućuje da:

nastavi pregledavati jelovnik
doda novu narudžbu
u bilo kojem trenutku otvori pregled svojih aktivnih narudžbi
8. Aktivne narudžbe

Klikom na ikonu aktivnih narudžbi korisnik otvara ekran koji prikazuje sve trenutno aktivne narudžbe povezane s njegovim stolom.

Na tom ekranu prikazuju se:

identifikator narudžbe
status narudžbe
vrijeme slanja
stavke koje pripadaju narudžbi

Ako korisnik tijekom boravka u objektu pošalje više od jedne narudžbe, sve aktivne narudžbe prikazuju se na tom ekranu.

Na taj način sustav podržava scenarij u kojem gost nakon prve narudžbe želi naručiti dodatne artikle, primjerice još jedno piće ili dodatni prilog.

9. Praćenje pojedine narudžbe

Klikom na jednu aktivnu narudžbu korisnik otvara detaljan ekran za praćenje narudžbe.

Na tom ekranu prikazuju se:

ID narudžbe
trenutni status
korak napretka narudžbe
progress bar
stavke unutar narudžbe

Podaci se čitaju iz Firebase Realtime Database u stvarnom vremenu, što znači da korisnik ne mora ručno osvježavati ekran.

Čim kuhinja promijeni status narudžbe, korisnički ekran se automatski ažurira.

10. Statusi narudžbe

Narudžba kroz sustav prolazi kroz više faza.
Primjeri statusa su:

Narudžba zaprimljena
Krenulo u izradu
Priprema se
Uskoro stiže na vaš stol
Dostavljeno

Korisniku se prikazuje jasan napredak pripreme narudžbe, što povećava transparentnost procesa i poboljšava korisničko iskustvo.

11. Dodatna narudžba

Sustav omogućuje da gost nakon prve narudžbe ponovno koristi jelovnik i pošalje novu narudžbu.

Nova narudžba se:

ne dodaje na staru narudžbu
nego se sprema kao zasebna nova narudžba

Time se postiže:

jasna evidencija svih poslanih narudžbi
jednostavnije upravljanje u kuhinji
pregledniji prikaz za gosta

Sve dodatne narudžbe ostaju povezane s istim stolom, pa ih korisnik može pratiti kroz odjeljak aktivnih narudžbi.

12. Kuhinjski / admin pristup

Aplikacija sadrži i skriveni pristup kuhinjskom dijelu sustava.

Na početnom ekranu postoji vizualni element koji služi kao ulaz u admin dio aplikacije.
Nakon interakcije s tim elementom otvara se forma za unos administratorskog koda.

Ako je kod ispravan:

otvara se kuhinjski ekran

Ako kod nije ispravan:

pristup se odbija

Na taj način kuhinjski dio nije dostupan običnim korisnicima.

13. Kuhinjski ekran

Kuhinja ima poseban ekran na kojem vidi sve aktivne narudžbe.

Na kuhinjskom ekranu prikazuju se:

broj narudžbe
broj stola
stavke narudžbe
trenutni status

Kuhinja može otvoriti pojedinu narudžbu i ažurirati njezin status.

Kada kuhinja promijeni status:

promjena se odmah zapisuje u Firebase
korisnik tu promjenu vidi u stvarnom vremenu na svom ekranu za praćenje narudžbe

Time se ostvaruje dvosmjerna komunikacija između gosta i kuhinje preko centralne baze podataka.

14. Završetak narudžbe

Kada narudžba dođe u završnu fazu i status postane:

Dostavljeno

ona više ne spada u aktivne narudžbe.

Takva narudžba:

nestaje iz prikaza aktivnih narudžbi kod gosta
nestaje iz kuhinjskog popisa aktivnih narudžbi
ostaje evidentirana u bazi kao završena narudžba

Na taj način sustav održava preglednost i odvaja aktivne procese od završenih.

Sažetak rada sustava

Cijeli sustav funkcionira po sljedećem principu:

gost skenira QR kod
otvara digitalni jelovnik
odabire artikle
šalje narudžbu
narudžba se sprema u Firebase
gost može pratiti sve svoje aktivne narudžbe
kuhinja preko admin dijela vidi aktivne narudžbe
kuhinja ažurira status narudžbe
gost u stvarnom vremenu vidi napredak pripreme

Na taj način aplikacija digitalizira proces naručivanja u ugostiteljstvu i uvodi transparentnije, brže i modernije korisničko iskustvo.
