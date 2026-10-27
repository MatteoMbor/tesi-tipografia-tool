#!/usr/bin/env python3
"""
Costruisce data/v2/database.json a partire dal database originale,
applicando i tagli, i ridimensionamenti, le riscritture e le aggiunte
approvati nell'audit V2.
"""
import json, os, copy

# ---- 1. Leggi database originale (chiavi pulite) ----
with open('data/database.json', encoding='utf-8') as f:
    orig = json.load(f)

# Normalizza chiavi sporche se presenti
clean = []
for rec in orig:
    clean.append({k.strip(): (v.strip() if isinstance(v, str) else v)
                  for k, v in rec.items()})

by_id = {r['id']: r for r in clean}

# ---- 2. ID dei verdetti (dall'audit) ----
TAGLIA = {'ACA-006','ACA-007','ACA-008','AI-002','AI-006','AI-009',
          'EXP-001','EXP-007','PRJ-004','REP-004'}

DECAD_A_LANDING = {'ACA-001','ACA-002','ACA-004','EPI-001','EPI-005',
                   'ETH-004','TMA-001','VID-007'}

SEC_NULL = {'EPI-003','ETH-005'}

RIDIMENSIONA_CONTESTO = {'TMA-005','TMD-001','VID-006'}

# ---- 3. Modifiche mirate ----
def apply_patches(db):
    for r in db:
        rid = r['id']
        if rid in DECAD_A_LANDING:
            r['status'] = '[V-LANDING]'
        if rid in SEC_NULL:
            r['url'] = None
            r['status'] = '[SEC]'
        if rid == 'TMA-006':
            r['status'] = '[DA VERIFICARE]'
        if rid == 'EXP-012':
            # Riscrittura manifesto Atipografia
            r['creator'] = 'Matteo Borghese'
            r['url'] = None
            r['accessibility'] = 'Archivio personale del candidato (non pubblico)'
            r['plain_summary'] = ("Il manifesto dell'Atipografia: 'Non è (testo) ma lo è'. "
                "Riduce i segni a forme essenziali e disattiva la lettura istintiva, "
                "proponendo un'alternativa di enigma e calma visiva.")
            r['why_it_matters'] = ("È il testo teorico autoriale che orienta la costruzione "
                "degli algoritmi di generazione della foundry di tesi.")
            r['affinity'] = 93.0
            r['priority'] = 'PRIMARIA'
        if rid == 'EPI-006':
            # Riscrittura Flusser allineata al lessico degli appunti
            r['plain_summary'] = ("La riflessione fondamentale sul concetto di apparato: "
                "le macchine programmano gli esseri umani che credono di usarle. L'unica "
                "libertà consiste nel lavorare con l'apparato contro l'apparato.")
            r['why_it_matters'] = ("Spina dorsale teorica per sostenere che costruire "
                "strumenti propri è un atto indispensabile di libertà progettuale.")
        if rid == 'REP-002':
            r['what_it_shows'] = ("Rappresenta il motore client-side del prototipo: "
                "permette di caricare caratteri, estrarne i percorsi vettoriali "
                "ed eseguire deformazioni geometriche istantanee senza server.")
        if rid == 'TMA-001':
            r['plain_summary'] = ("Il primo carattere digitale programmato per mutare: "
                "modificando il codice PostScript con la funzione 'freakto', ogni lettera "
                "veniva disegnata in modo unico e imprevedibile a ogni stampa.")
            r['why_it_matters'] = ("È il momento fondativo in cui il codice del programma "
                "coincide esattamente con l'espressione plastica della lettera.")
        if rid in RIDIMENSIONA_CONTESTO:
            r['priority'] = 'CONTESTO'
            r['cluster'] = 'Strumenti di consultazione'
    return db

# ---- 4. Nuove aggiunte teoriche ----
NEW_SOURCES = [
  {
    "id": "TYP-001",
    "title": "My way to typography",
    "creator": "Wolfgang Weingart",
    "year": 2000,
    "type": "libro",
    "thread": "TIPOGRAFIA",
    "category": "C01",
    "cluster": "Teoria della leggibilità e decostruzione",
    "url": None,
    "doi_isbn": "ISBN 978-3037780015 / Lars Müller Publishers",
    "status": "[V-FULL]",
    "access_date": "2026-10-25",
    "language": "en/de",
    "accessibility": "biblioteca accademica / archivio di bottega",
    "license": "Copyright Lars Müller Publishers",
    "plain_summary": "Il volume autobiografico e metodologico in cui Weingart documenta la rottura delle regole svizzere: stampa delle parti illeggibili del piombo, spaziature estreme, manipolazione in camera oscura.",
    "what_it_shows": "La forma tipografica dà significato al contenuto; l'innovazione nasce dall'esplorazione radicale della materia fisica.",
    "description": "Weingart ripercorre il suo percorso: dai caratteri in piombo piegati alla fotocomposizione. Include il manoscritto del 1964 per Druckspiegel.",
    "tags": "Wolfgang Weingart, Scuola di Basilea, rottura delle regole, materia fisica",
    "typographic_operations": "stampa delle controforme, spaziatura esasperata, deformazione dei caratteri",
    "technical_stack": "Composizione a caratteri mobili in piombo, camera oscura e pellicole",
    "workflow_evidence": "Altissima: centinaia di provini e prove di bottega dell'autore.",
    "transferability": "Legittima la spinta verso l'astrazione e la dignità dello spazio bianco.",
    "limits_criticism": "Radicato nelle tecnologie fisiche del Novecento.",
    "quote": "La forma è quello che dà significato al contenuto. Volevo spingere la capacità della tipografia al limite.",
    "d_scores": [100, 90, 85, 95, 95],
    "affinity_motivation": "Il pilastro primario per fondare l'asse di ricerca sulla tipografia come forma autonoma.",
    "evidence_file": "tesi-research/99_META/evidence/TYP-001_weingart.md",
    "score_t": 98.0, "score_p": 91.5, "affinity": 93.5, "priority": "PRIMARIA",
    "unique_contribution": "Dimostra che la violazione consapevole dei canoni trasforma la composizione in un'orchestrazione plastica autonoma.",
    "duplicate_of": None,
    "why_it_matters": "È il testo storico che demolisce l'obbligo della pura leggibilità funzionale per affermare la tipografia come espressione artistica.",
    "how_to_use_in_thesis": "Capitolo 2 come riferimento cardine per motivare la distorsione e la visualizzazione delle parti nascoste.",
    "topic_tags": "tipografia come arte, New Wave di Basilea, materia del piombo, spazio attivo",
    "tool_tags": "letterpress, fotocomposizione"
  },
  {
    "id": "TYP-002",
    "title": "La lettera uccide",
    "creator": "Giovanni Lussu",
    "year": 1999,
    "type": "libro",
    "thread": "TIPOGRAFIA",
    "category": "C01",
    "cluster": "Teoria della leggibilità e decostruzione",
    "url": None,
    "doi_isbn": "ISBN 978-8872264881 / Stampa Alternativa",
    "status": "[V-FULL]",
    "access_date": "2026-10-25",
    "language": "it",
    "accessibility": "acquisto / biblioteca accademica",
    "license": "Copyright Stampa Alternativa / Giovanni Lussu",
    "plain_summary": "Smonta l'inganno fonocentrico: la scrittura non è trascrizione della voce, è per sua natura un'immagine bidimensionale dotata di proprie convenzioni visive.",
    "what_it_shows": "La mappa teorica della tensione tra funzione analitica (leggibilità) ed espressione sintetica (forma).",
    "description": "Lussu dimostra come rientri e a capo siano artifici puramente spaziali privi di riscontro nella lingua parlata.",
    "tags": "Giovanni Lussu, scrittura come immagine, fonocentrismo, sistemi di notazione",
    "typographic_operations": "articolazione spaziale dei segni, equilibrio tra decodificazione ed espressione",
    "technical_stack": "Storia della scrittura, sistemi di notazione, software TeX",
    "workflow_evidence": "Altissima: saggio teorico denso citato integralmente negli appunti.",
    "transferability": "Indispensabile per legittimare la ricerca sulla forma tipografica come entità visiva autonoma.",
    "limits_criticism": "Non propone software proprio, ma analizza l'impatto di TeX.",
    "quote": "Anche la scrittura è immagine, la scrittura è per definizione sempre immagine.",
    "d_scores": [100, 92, 80, 95, 95],
    "affinity_motivation": "Il riferimento teorico italiano più lucido contro il pregiudizio fonocentrico.",
    "evidence_file": "tesi-research/99_META/evidence/TYP-002_lussu.md",
    "score_t": 97.5, "score_p": 89.0, "affinity": 92.5, "priority": "PRIMARIA",
    "unique_contribution": "Formalizza la doppia natura della scrittura tra aspetto analitico-informativo e sintetico-espressivo.",
    "duplicate_of": None,
    "why_it_matters": "Base concettuale per affermare che comporre caratteri è un atto di architettura visiva prima che linguistica.",
    "how_to_use_in_thesis": "Introduzione e Capitolo 1 come fulcro teorico.",
    "topic_tags": "scrittura come immagine, semiotica tipografica, fonocentrismo, sistemi di segni",
    "tool_tags": "TeX"
  },
  {
    "id": "TYP-003",
    "title": "An Essay on Typography",
    "creator": "Eric Gill",
    "year": 1931,
    "type": "libro",
    "thread": "TIPOGRAFIA",
    "category": "C01",
    "cluster": "Teoria della leggibilità e decostruzione",
    "url": None,
    "doi_isbn": "Sheed & Ward 1931",
    "status": "[V-FULL]",
    "access_date": "2026-10-25",
    "language": "it/en",
    "accessibility": "acquisto / archivio tradotto negli appunti",
    "license": "Public Domain / Traduzione dell'autore",
    "plain_summary": "Il grande classico sulla frattura tra artigianato umano e produzione meccanizzata: la mente è l'arbitro del design, non lo strumento.",
    "what_it_shows": "Fissa il principio della responsabilità intellettuale del progettista.",
    "description": "Gill analizza la divisione del lavoro industriale e attacca la tirannia dell'uguale lunghezza delle righe.",
    "tags": "Eric Gill, responsabilità intellettuale, mente arbitro del design, Letto di Procuste",
    "typographic_operations": "spaziatura uniforme, incisione punzoni, semplificazione assoluta",
    "technical_stack": "Composizione a mano, incisione meccanica dei punzoni, fusione a caldo",
    "workflow_evidence": "Altissima: saggio integralmente riassunto negli appunti.",
    "transferability": "Base etica per rivendicare il ruolo del designer come autore responsabile.",
    "limits_criticism": "Legato alle condizioni industriali del 1931.",
    "quote": "La mente è l'arbitro delle forme delle lettere, non lo strumento o il materiale.",
    "d_scores": [98, 92, 75, 95, 95],
    "affinity_motivation": "Il testo etico fondamentale sulla responsabilità del progettista.",
    "evidence_file": "tesi-research/99_META/evidence/TYP-003_gill.md",
    "score_t": 96.5, "score_p": 88.5, "affinity": 91.5, "priority": "PRIMARIA",
    "unique_contribution": "Definisce l'artista come lavoratore intellettualmente responsabile di ciò che crea.",
    "duplicate_of": None,
    "why_it_matters": "Lo strumento non deve mai dettare la forma: è la mente umana l'unico arbitro legittimo.",
    "how_to_use_in_thesis": "Capitolo 1-2 per argomentare il primato dell'intenzione progettuale.",
    "topic_tags": "responsabilità morale, mente e strumento, incisione punzoni, critica industriale",
    "tool_tags": "pantografo, bulino"
  },
  {
    "id": "TYP-004",
    "title": "Lettera a Wolfgang Weingart sulla leggibilità e la simmetria tipografica",
    "creator": "Jan Tschichold",
    "year": 1964,
    "type": "saggio",
    "thread": "TIPOGRAFIA",
    "category": "C01",
    "cluster": "Teoria della leggibilità e decostruzione",
    "url": None,
    "doi_isbn": "Documento d'archivio citato in Weingart (2000)",
    "status": "[SEC]",
    "access_date": "2026-10-25",
    "language": "de/it",
    "accessibility": "Archivio di bottega (citato negli appunti)",
    "license": "All rights reserved / Research archive",
    "plain_summary": "La celebre missiva in cui Tschichold rimprovera Weingart: la migliore tipografia deve essere invisibile e intrinsecamente simmetrica.",
    "what_it_shows": "Incarna la voce della tradizione funzionalista.",
    "description": "Tschichold argomenta che l'essenza delle lettere è la leggibilità, non la modernità.",
    "tags": "Jan Tschichold, tipografia invisibile, ordine simmetrico, leggibilità classica",
    "typographic_operations": "composizione simmetrica, rientri di paragrafo, gerarchia logica invisibile",
    "technical_stack": "Composizione a piombo tradizionale",
    "workflow_evidence": "Alta: citazione testuale negli appunti di Weingart.",
    "transferability": "Perfetto contrappunto teorico per motivare l'Atipografia.",
    "limits_criticism": "Posizione dogmatica e conservatrice.",
    "quote": "La migliore tipografia è invisibile al lettore e serve a trasmettere i pensieri dell'autore.",
    "d_scores": [95, 75, 50, 85, 90],
    "affinity_motivation": "Il polo dialettico conservatore fondamentale.",
    "evidence_file": "tesi-research/99_META/evidence/TYP-004_tschichold.md",
    "score_t": 92.0, "score_p": 72.0, "affinity": 78.0, "priority": "SECONDARIA",
    "unique_contribution": "Sintetizza il dogma della tipografia invisibile.",
    "duplicate_of": None,
    "why_it_matters": "L'ortodossia disciplinare contro cui si misura ogni tentativo di liberazione formale.",
    "how_to_use_in_thesis": "Capitolo 2 come termine di paragone per contrastare l'Atipografia.",
    "topic_tags": "tipografia invisibile, funzionalismo, leggibilità ortodossa, polemica disciplinare",
    "tool_tags": ""
  },
  {
    "id": "TYP-009",
    "title": "Manifesto sul dovere della tipografia (Typographische Monatsblätter 5/1973)",
    "creator": "Emil Ruder",
    "year": 1967,
    "type": "saggio",
    "thread": "TIPOGRAFIA",
    "category": "C01",
    "cluster": "Teoria della leggibilità e decostruzione",
    "url": None,
    "doi_isbn": "Typographische Monatsblätter 5/1973",
    "status": "[SEC]",
    "access_date": "2026-10-25",
    "language": "de/en/it",
    "accessibility": "Archivio storico (citato negli appunti)",
    "license": "All rights reserved / Research archive",
    "plain_summary": "La dichiarazione programmatica: la tipografia ha un solo dovere — trasmettere informazioni per iscritto.",
    "what_it_shows": "Il principio modernista di precisione e buon ordine.",
    "description": "Scritto a metà degli anni Sessanta, stabilisce i confini invalicabili della professione.",
    "tags": "Emil Ruder, dovere tipografico, precisione, buon ordine, Scuola di Basilea",
    "typographic_operations": "trasmissione fedele del messaggio, rigore geometrico, controllo del bianco e nero",
    "technical_stack": "Tipografia classica a caratteri mobili",
    "workflow_evidence": "Alta: documento storico citato negli appunti.",
    "transferability": "Pilastro dell'approccio razionalista per misurare la distanza dell'Atipografia.",
    "limits_criticism": "Esclude categoricamente la dimensione artistica.",
    "quote": "Typography has one plain duty before it and that is to convey information in writing.",
    "d_scores": [95, 75, 45, 88, 92],
    "affinity_motivation": "Il canone massimo del funzionalismo tipografico moderno.",
    "evidence_file": "tesi-research/99_META/evidence/TYP-009_ruder.md",
    "score_t": 92.5, "score_p": 72.5, "affinity": 78.5, "priority": "SECONDARIA",
    "unique_contribution": "Definisce in modo perentorio la missione della tipografia.",
    "duplicate_of": None,
    "why_it_matters": "Testo canonico per il modernismo razionale svizzero.",
    "how_to_use_in_thesis": "Capitolo 2 per analizzare criticamente il dogma del dovere informativo.",
    "topic_tags": "dovere tipografico, modernismo svizzero, funzionalismo, ordine visivo",
    "tool_tags": ""
  },
  {
    "id": "TMA-008",
    "title": "Hofmann 1.0.0: Tool per celebrare il centenario di Armin Hofmann",
    "creator": "Giovanni Abbatepaolo",
    "year": 2020,
    "type": "tool",
    "thread": "TOOL",
    "category": "C03",
    "cluster": "Creative coding e disegno vettoriale web",
    "url": "https://www.frizzifrizzi.it/2020/12/11/hofmann-1-0-0-dal-giovane-designer-giovanni-abbatepaolo-un-tool-per-celebrare-il-centenario-di-armin-hofmann/",
    "doi_isbn": "Web Tool / Frizzifrizzi Archive",
    "status": "[V-FULL]",
    "access_date": "2026-10-25",
    "language": "it",
    "accessibility": "free web tool / intervista aperta",
    "license": "Open Educational Web Application",
    "plain_summary": "Applicazione web che traduce i principi di Armin Hofmann in algoritmi visivi parametrici.",
    "what_it_shows": "Un tool web dedicato può reinterpretare la storia del graphic design.",
    "description": "Sviluppato per il centenario del maestro della Scuola di Basilea, scompone e ricompone matrici geometriche attraverso cursori parametrici.",
    "tags": "Armin Hofmann, Scuola di Basilea, tool web, creative coding",
    "typographic_operations": "interpolazione modulare, partizione dello spazio, variazione parametrica della griglia",
    "technical_stack": "JavaScript, HTML5 Canvas, CSS interattivo",
    "workflow_evidence": "Alta: applicazione funzionante online con documentazione.",
    "transferability": "Ispirazione diretta per il layout del prototipo.",
    "limits_criticism": "Non esporta font OpenType completi.",
    "quote": "Il tool non replica semplicemente le forme di Hofmann, ma rende viva la logica del suo metodo.",
    "d_scores": [90, 96, 88, 92, 92],
    "affinity_motivation": "Il riferimento progettuale italiano più vicino agli appunti.",
    "evidence_file": "tesi-research/99_META/evidence/TMA-008_hofmann_tool.md",
    "score_t": 90.0, "score_p": 94.0, "affinity": 87.0, "priority": "SECONDARIA",
    "unique_contribution": "Trasforma i principi pedagogici della Scuola di Basilea in un software web parametrico.",
    "duplicate_of": None,
    "why_it_matters": "Dimostra che il tool-making è un atto di critica storica e progettuale.",
    "how_to_use_in_thesis": "Capitolo 4 come caso studio comparativo.",
    "topic_tags": "Scuola di Basilea, tool didattico, interazione web, pedagogia modernista",
    "tool_tags": "JavaScript, HTML5 Canvas"
  },
  {
    "id": "EPI-008",
    "title": "Siamo diventati strumenti degli strumenti: con l'apparato contro l'apparato",
    "creator": "Achim Mohné",
    "year": 2024,
    "type": "saggio",
    "thread": "TOOL",
    "category": "C05",
    "cluster": "Software studies e filosofia del progetto",
    "url": None,
    "doi_isbn": "Saggio critico e traduzione di bottega",
    "status": "[V-FULL]",
    "access_date": "2026-10-25",
    "language": "it",
    "accessibility": "Archivio del candidato (documento tradotto)",
    "license": "All rights reserved / Research archive",
    "plain_summary": "La società contemporanea è governata da apparati algoritmici. Resistere è possibile solo hackerando i dispositivi dall'interno.",
    "what_it_shows": "Pratiche parassitarie contro mega-macchine digitali.",
    "description": "Commenta Flusser e McLuhan alla luce dell'AI e degli smartphone. Illustra progetti di resistenza (REMOTEWORDS, 0.000672 Mega pixel).",
    "tags": "Achim Mohné, Vilém Flusser, apparato, resistenza artistica, uso improprio",
    "typographic_operations": "decostruzione dell'immagine tecnica, scomposizione modulare",
    "technical_stack": "Teoria critica dei media, installazioni analogico-digitali",
    "workflow_evidence": "Altissima: testo tradotto integralmente negli appunti.",
    "transferability": "Strategia operativa per deviare le funzioni standard dei programmi.",
    "limits_criticism": "Orientato all'arte contemporanea, da raccordare al type design.",
    "quote": "Siamo diventati strumenti degli strumenti, apparati umani all'interno di un sistema governato dalle macchine.",
    "d_scores": [88, 100, 75, 92, 98],
    "affinity_motivation": "Il commento contemporaneo più aderente agli appunti sull'apparato flusseriano.",
    "evidence_file": "tesi-research/99_META/evidence/EPI-008_mohne.md",
    "score_t": 88.5, "score_p": 95.0, "affinity": 86.2, "priority": "PRIMARIA",
    "unique_contribution": "Applica il concetto di lavoro 'contro l'apparato' alle tecnologie contemporanee.",
    "duplicate_of": None,
    "why_it_matters": "L'uso improprio delle tecnologie digitali è un dovere sociale e artistico.",
    "how_to_use_in_thesis": "Capitolo 1 per definire la posizione etica del designer.",
    "topic_tags": "apparato umano, uso improprio, critica dei media, resistenza tecnica",
    "tool_tags": ""
  }
]

# ---- 5. Assemblaggio ----
os.makedirs('data/v2', exist_ok=True)

v2 = [r for r in clean if r['id'] not in TAGLIA]
v2 = apply_patches(v2)
v2.extend(NEW_SOURCES)
v2.sort(key=lambda r: r['id'])

# Controlli finali (autoccheck D7)
total = len(v2)
tool_type_count = sum(1 for r in v2 if r.get('type') == 'tool')
tool_pct = (tool_type_count / total) * 100 if total else 0
sec_404 = sum(1 for r in v2 if r.get('url') and '404' in str(r.get('status','')))
thread_tool = sum(1 for r in v2 if r.get('thread') == 'TOOL')
thread_tipo = sum(1 for r in v2 if r.get('thread') == 'TIPOGRAFIA')
thread_both = sum(1 for r in v2 if r.get('thread') == 'ENTRAMBI')
primaria = sum(1 for r in v2 if r.get('priority') == 'PRIMARIA')

with open('data/v2/database.json', 'w', encoding='utf-8') as f:
    json.dump(v2, f, ensure_ascii=False, indent=2)

print(f"✅ V2 generato: data/v2/database.json")
print(f"   Record totali: {total}")
print(f"   Percentuale type=tool: {tool_pct:.1f}%")
print(f"   URL 404 attivi: {sec_404}")
print(f"   Thread TOOL: {thread_tool} | TIPOGRAFIA: {thread_tipo} | ENTRAMBI: {thread_both}")
print(f"   Fonti PRIMARIA: {primaria}")