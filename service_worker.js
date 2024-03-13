// importScripts('lib/browser-polyfill.min.js');
// importScripts('lib/jquery.min.js');
// importScripts('lib/banana-i18n.js');
// importScripts('background-script.js');

// Define Sparql endpoints
const sparqlEndpoints = {
    lingualibre: { url: "https://lingualibre.org/bigdata/namespace/wdq/sparql", verb: "POST" },
    wikidata: { url: "https://query.wikidata.org/sparql", verb: "GET" },
    commons: { url: "https://commons-query.wikimedia.org/sparql", verb: "GET" },
    dictionaireFrancophone: { url: "https://www.dictionnairedesfrancophones.org/sparql", verb: "" },
};

// Sparql queries
const sparqlSignLanguagesQuery = 'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
const sparqlSignVideosQuery = 'SELECT ?word ?filename ?speaker WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . ?record prop:P5 ?speakerItem . ?speakerItem rdfs:label ?speaker filter ( lang( ?speaker ) = "en" ) . }';
const sparqlFilesInCategoryQuery = `SELECT ?file ?url ?title
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "Generator" ;
                    wikibase:endpoint "commons.wikimedia.org" ;
                    mwapi:gcmtitle "Category:Videos Langue des signes française" ;
                    mwapi:generator "categorymembers" ;
                    mwapi:gcmtype "file" ;
                    mwapi:gcmlimit "max" .
    ?title wikibase:apiOutput mwapi:title .
    ?pageid wikibase:apiOutput "@pageid" .
  }
  BIND (URI(CONCAT('https://commons.wikimedia.org/entity/M', ?pageid)) AS ?file)
  BIND (URI(CONCAT('https://commons.wikimedia.org/wiki/', ?title)) AS ?url)
}`;

// Initial state
let state = 'up';
let records = {};
let signLanguages = [];
let uiLanguages = [];
const params = {
    signLanguage: 'Q99628',
    uiLanguage: 'Q150',
    historylimit: 6,
    history: ['lapin', 'crabe', 'fraise', 'canard'],
    wpintegration: true,
    twospeed: true,
    hinticon: true,
    coloredwords: true,
    choosepanels: 'both',
};

// Fetch data from Sparql endpoint
async function fetchSparqlData(endpoint, query) {
    try {
        const response = await fetch(endpoint.url, {
            method: endpoint.verb,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ query }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to fetch data from SPARQL endpoint');
    }
}

// Get sign languages with videos
async function getSignLanguagesWithVideos() {
    try {
        const response = await fetchSparqlData(sparqlEndpoints.lingualibre, sparqlSignLanguagesQuery);
        const signLanguages = response.results.bindings.map(item => ({
            wdQid: item.id.value.split('/').pop(),
            labelNative: item.idLabel.value,
        }));
        return signLanguages.filter(language => language.wdQid === 'Q99628'); // Temporary filter
    } catch (error) {
        console.error(error);
        throw new Error('Failed to fetch sign languages with videos');
    }
}

// Get all records for a sign language
async function getAllRecords(signLanguage) {
    try {
        const query = sparqlSignVideosQuery.replace('$(lang)', signLanguage);
        const response = await fetchSparqlData(sparqlEndpoints.lingualibre, query);
        const records = {};
        response.results.bindings.forEach(record => {
            const word = record.word.value.toLowerCase();
            if (!records[word]) {
                records[word] = [];
            }
            records[word].push({
                filename: record.filename.value.replace('http://', 'https://'),
                speaker: record.speaker.value,
            });
        });
        return records;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to fetch all records');
    }
}

// Handle messages from clients (e.g., pages or other workers)
self.addEventListener('message', async event => {
    const { command, payload } = event.data;
    switch (command) {
        case 'getSignLanguages':
            try {
                const signLanguages = await getSignLanguagesWithVideos();
                self.postMessage({ command: 'signLanguages', payload: signLanguages });
            } catch (error) {
                console.error(error);
                self.postMessage({ command: 'error', payload: 'Failed to fetch sign languages' });
            }
            break;
        case 'getAllRecords':
            try {
                const records = await getAllRecords(payload.signLanguage);
                self.postMessage({ command: 'records', payload: records });
            } catch (error) {
                console.error(error);
                self.postMessage({ command: 'error', payload: 'Failed to fetch records' });
            }
            break;
        // Add more cases for other commands
        default:
            break;
    }
});

// Install event listener to initialize the service worker
self.addEventListener('install', event => {
    console.log('Service worker installed');
    // Perform any initial setup here
});

// Activate event listener to activate the service worker
self.addEventListener('activate', event => {
    console.log('Service worker activated');
    // Perform any necessary cleanup here
});

// Fetch event listener to handle incoming fetch requests
self.addEventListener('fetch', event => {
    console.log('Service worker fetching:', event.request.url);
    // Handle fetch requests here
});
