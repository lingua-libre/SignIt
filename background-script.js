const sparqlEndpoint = 'https://lingualibre.fr/bigdata/namespace/wdq/sparql';
const sparqlLangQuery = 'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
const sparqlVideoQuery = 'SELECT ?word ?filename ?speaker WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . ?record prop:P5 ?speakerItem . ?speakerItem rdfs:label ?speaker filter ( lang( ?speaker ) = "en" ) . }';

var state = 'up', // up / loading / ready / error
	records = {},
	languages = {},
	language = 'Q99628';

// TODO:
// - multi-videos
// - WT/Lexeme defenition
// - underline available words in the page
// - support link right click

// state: uo
// listen to event 1
// loading saved params from localstorage
// state: loading
// loading available languages
// loading vidéos urls
// create context menu
// state: ready

// change language asked from popup box
// update global var
// state: loading
// loading vidéos urls
// set local storage
// state: ready

/**
 * Functions
 */

async function getSavedLanguage() {
	var params = await browser.storage.local.get( 'language' );
	if ( params.language === undefined ) {
		return null;
	}
	return params.language;
}

async function getAllLanguages() {
	var i, language,
		languages = {},
		response = await $.post( sparqlEndpoint, { format: 'json', query: sparqlLangQuery } );

	for ( i = 0; i < response.results.bindings.length; i++ ) {
		language = response.results.bindings[ i ];
		languages[ language.id.value.split( '/' ).pop() ] = language.idLabel.value;
	}

	return languages;
}

// Loading all vidéos in a given sign language
async function getAllRecords( language ) {
	var i, record, word, response,
		records = {};

	state = 'loading';

	response = await $.post( sparqlEndpoint, { format: 'json', query: sparqlVideoQuery.replace( '$(lang)', language ) } );

	for ( i = 0; i < response.results.bindings.length; i++ ) {
		record = response.results.bindings[ i ];
		word = record.word.value.toLowerCase();
		if ( records.hasOwnProperty( word ) === false ) {
			records[ word ] = [];
		}
		records[ word ].push( { filename: record.filename.value, speaker: record.speaker.value } );
	}

	state = 'ready';

	console.log( Object.keys( records ).length + ' records loaded' );
	return records;
}

function wordToFiles( word ) {
	if ( records.hasOwnProperty( word ) === false ) {
		word = word.toLowerCase();
		if ( records.hasOwnProperty( word ) === false ) {
			return null;
		}
	}

	return records[ word ];
}

function normalize( word ) {
	word = word.trim();

	return word;
}

async function changeLanguage( newLang ) {
	language = newLang;
	records = await getAllRecords( newLang );
	await browser.storage.local.set( { 'language': newLang } );
}

/**
 * Browser interactions
 */

// Create a context menu item
browser.contextMenus.create({
  id: "signit",
  title: 'SignIt',
  contexts: ["selection"]
}, function() {return;});

// Send a message to the content script when our context menu is clicked
browser.contextMenus.onClicked.addListener(function(info, tab) {
  switch (info.menuItemId) {
    case "signit":
      browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
			var word = normalize( info.selectionText );
		    browser.tabs.sendMessage(tabs[0].id, {
		      command: "signit.sign",
		      selection: word,
			  files: wordToFiles( word ),
		    });
        });
      break;
  }
});

// Edit the header of all pages on-the-fly to bypass Content-Security-Policy
browser.webRequest.onHeadersReceived.addListener(info => {
    const headers = info.responseHeaders; // original headers
    for (let i=headers.length-1; i>=0; --i) {
        let header = headers[i].name.toLowerCase();
        if (header === "content-security-policy") { // csp header is found
            // modifying media-src; this implies that the directive is already present
            headers[i].value = headers[i].value.replace("media-src", "media-src https://commons.wikimedia.org https://upload.wikimedia.org");
        }
    }
    // return modified headers
    return {responseHeaders: headers};
}, {
    urls: [ "<all_urls>" ], // match all pages
    types: [ "main_frame" ] // to focus only the main document of a tab
}, ["blocking", "responseHeaders"]);

 /**
  * Main
  */

async function main() {
	state = 'loading';
	language = await getSavedLanguage() || language;
	languages = await getAllLanguages();
	records = await getAllRecords( language );
	state = 'ready';
}

main();
