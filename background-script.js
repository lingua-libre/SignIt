const sparqlEndpoint = 'https://lingualibre.fr/bigdata/namespace/wdq/sparql';
const sparqlLangQuery = 'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
const sparqlVideoQuery = 'SELECT ?word ?filename WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . }';

var state = 'up', // up / loading / ready / error
	records = {},
	languages = {},
	language = 'Q99628';

// TODO:
// - popup
//   * spinner when in loading state
//   * get all languages
//   * display language selector
//   * change language when asked
//   * save selected language in local storage
// - multi-videos
// - WT descriptions
// - underline available words in the page
// - support link right click

// state: started
// listen to event 1
// loading saved params from localstorage
// state: loading
// loading available languages
// loading vidéos urls
// create context menu
// state: ready

// Recieved events
// ===============

// Event 1: Get state (popup)
// addListener
// return state

// Event 2: Get languages (popup)
// addListener
// return language + languages

// Event 3: Switch language (popup)
// addListener
// state: loading
// getAllRecords
// state: ready
// return language + languages

// Event 4: Context menu cliqued (browser)
// addListener
// get selected text
// send message to display video of selected word

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
		languages[ language.id.value ] = language.idLabel.value;
	}

	return languages;
}

// Loading all vidéos in a given sign language
async function getAllRecords( language ) {
	var i, record, word,
		records = {},
		response = await $.post( sparqlEndpoint, { format: 'json', query: sparqlVideoQuery.replace( '$(lang)', language ) } );

	for ( i = 0; i < response.results.bindings.length; i++ ) {
		record = response.results.bindings[ i ];
		word = record.word.value.toLowerCase();
		if ( records.hasOwnProperty( word ) === false ) {
			records[ word ] = [];
		}
		records[ word ].push( record.filename.value );
	}

	return records;
}

function wordToUrls( word ) {
	word = word.toLowerCase();

	if ( records.hasOwnProperty( word ) === false ) {
		return null;
	}

	return records[ word ];
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
		    browser.tabs.sendMessage(tabs[0].id, {
		      command: "signit.sign",
		      selection: info.selectionText,
			  urls: wordToUrls( info.selectionText ),
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
