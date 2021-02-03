const sparqlEndpoint = 'https://lingualibre.org/bigdata/namespace/wdq/sparql';
const sparqlLangQuery = 'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
const sparqlVideoQuery = 'SELECT ?word ?filename ?speaker WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . ?record prop:P5 ?speakerItem . ?speakerItem rdfs:label ?speaker filter ( lang( ?speaker ) = "en" ) . }';

var state = 'up', // up / loading / ready / error
	records = {},
	languages = {},
	params = {
		language: 'Q99628',
		historylimit: 10,
		wpintegration: true,
		history: []
	};

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

async function getStoredParam( name ) {
	var tmp = await browser.storage.local.get( name );

	params[ name ] = tmp[ name ] || params[ name ] || null;

	return params[ name ];
}

async function storeParam( name, value ) {
	var tmp = {};

	// If the value is an array, we make a copy of it to avoid dead references issues
	if ( Array.isArray( value ) ) {
		value = Array.from( value );
	}

	tmp[ name ] = value;

	params[ name ] = value;
	return await browser.storage.local.set( tmp );
}

async function checkInjection( tab ) {
	try {
		await browser.tabs.sendMessage( tab, { command: "ping" } );
	} catch ( error ) {
		var i, scripts = browser.runtime.getManifest().content_scripts[ 0 ].js,
			stylesheets = browser.runtime.getManifest().content_scripts[ 0 ].css;

		for( i = 0; i < scripts.length; i++ ) {
			await browser.tabs.executeScript( tab, { file: scripts[ i ] } );
		}
		for( i = 0; i < stylesheets.length; i++ ) {
			await browser.tabs.insertCSS( tab, { file: stylesheets[ i ] } );
		}
	}
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
		records[ word ].push( { filename: record.filename.value.replace( 'http://', 'https://' ), speaker: record.speaker.value } );
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
	records = await getAllRecords( newLang );
	await storeParam( 'language', newLang );
}

/**
 * Browser interactions
 */

// Create a context menu item
browser.contextMenus.create({
  id: "signit",
  title: 'Lingua Libre SignIt',
  contexts: ["selection"]
}, function() {return;});

// Send a message to the content script when our context menu is clicked
browser.contextMenus.onClicked.addListener( async function( info, tab ) {
	switch (info.menuItemId) {
		case "signit":
			var tabs = await browser.tabs.query( { active: true, currentWindow: true } ),
				word = normalize( info.selectionText );

			await checkInjection( tabs[ 0 ].id );
			browser.tabs.sendMessage( tabs[ 0 ].id, {
				command: "signit.sign",
				selection: word,
				files: wordToFiles( word ),
			} );
			storeParam( 'history', [ word, ...params.history ] );
			break;
	}
});

//
browser.runtime.onMessage.addListener( async function ( message ) {
	var coords;

	if ( message.command === 'signit.getfiles' ) {
		return records[ message.word ] || records[ message.word.toLowerCase() ] || [];
	}
} );

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
	await getStoredParam( 'history' );
	await getStoredParam( 'historylimit' );
	await getStoredParam( 'wpintegration' );
	language = await getStoredParam( 'language' );
	languages = await getAllLanguages();
	records = await getAllRecords( language );
	state = 'ready';
}

main();
