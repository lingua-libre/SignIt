/* *************************************************************** */
/* TODO ********************************************************** */
// [ ] multi-videos (?)
// [ ] WT/Lexeme defenition
// [ ] underline available words in the page
// [ ] support link right click

/* Phases ******************************************************** */
// state: up
// listen to event 1
// loading saved params from localstorage
// state: loading
// loading available sign languages
// loading vidéos urls
// create context menu
// state: ready

// change language asked from popup box
// update global var
// state: loading
// loading vidéos urls
// set local storage
// state: ready


/* *************************************************************** */
/* Sparql endpoints *********************************************** */
const sparqlEndpoints = {
	lingualibre: { url: "https://lingualibre.org/bigdata/namespace/wdq/sparql", verb: "POST" },
	wikidata: { url: "https://query.wikidata.org/sparql", verb: "GET" },
	commons: { url: "https://commons-query.wikimedia.org/sparql", verb: "GET" },
	dictionaireFrancophone: { url: "https://www.dictionnairedesfrancophones.org/sparql", verb: "" },
};
/* *************************************************************** */
/* Sparql ******************************************************** */
// Lingualibre: All languages (P4) for which media type (P24) is video (Q88890)
const sparqlSignLanguagesQuery = 'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
// Lingualibre: Given a language (P4) with media video, fetch the list of writen word (P7), url (P3) speakers (P5)
const sparqlSignVideosQuery = 'SELECT ?word ?filename ?speaker WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . ?record prop:P5 ?speakerItem . ?speakerItem rdfs:label ?speaker filter ( lang( ?speaker ) = "en" ) . }';
// Wikidata: All Sign languages who have a Commons lingualibre category
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
}`

/* *************************************************************** */
/* Init state if no localStorage ********************************* */
var state = 'up', // up, loading, ready, error
	records = {},
	signLanguages = [],
	uiLanguages = [],
	// Default values, will be stored in localStorage as well for persistency.
	params = {
		signLanguage: 'Q99628', // for videos : French Sign language
		uiLanguage: 'Q150', // for interface : French
		historylimit: 6,
		history: ['lapin', 'crabe', 'fraise', 'canard'], // Some fun
		wpintegration: true,
		twospeed: true,
		hinticon: true,
		coloredwords: true,
		// Preparation for issues/36
		showvideo: true;
		showdefinition: true;
	};

/* *************************************************************** */
/* i18n context ************************************************** */
	// Get UI languages with translations on github
	var supportedUiLanguages = [
		{ wdQid:"Q13955",wikimediaCode:"ar",labelFR:"Arabe",labelEN:"Arabic",nativeName:"اللُّغَة العَرَبِيّة", wikt:"" },
		{ wdQid:"Q9610",wikimediaCode:"bn",labelFR:"Bengali",labelEN:"Bengali",nativeName:"বাংলা", wikt:"#Francais" },
		{ wdQid:"Q188",wikimediaCode:"de",labelFR:"Allemand",labelEN:"German",nativeName:"Deutsch", wikt:"" },
		{ wdQid:"Q1860",wikimediaCode:"en",labelFR:"Anglais",labelEN:"English",nativeName:"English", wikt:"#English" },
		//{ wdQid:"Q9240",wikimediaCode:"id",labelFR:"indonésien",labelEN:"Indonesian",nativeName:"Bahasa Indonesia", wikt:"" },
		{ wdQid:"Q652",wikimediaCode:"it",labelFR:"Italien",labelEN:"Italian",nativeName:"Italiano", wikt:"" },
		{ wdQid:"Q1321",wikimediaCode:"es",labelFR:"Espagnol",labelEN:"Spanish",nativeName:"Español", wikt: "#Español" },
		{ wdQid:"Q150",wikimediaCode:"fr",labelFR:"Français",labelEN:"French",nativeName:"Français", wikt:"" },
		{ wdQid:"Q9288",wikimediaCode:"he",labelFR:"Hébreu",labelEN:"Hebrew",nativeName:"עברית", wikt:"" },
		{ wdQid:"Q1568",wikimediaCode:"hi",labelFR:"Hindi",labelEN:"Hindi",nativeName:"मानक हिन्दी", wikt:"" },
		//{ wdQid:"Q9067",wikimediaCode:"hu",labelFR:"hongrois",labelEN:"Hungarian",nativeName:"Magyar", wikt:"" },
		{ wdQid:"Q5287",wikimediaCode:"ja",labelFR:"Japonais",labelEN:"Japanese",nativeName:"日本語", wikt:"" },
		{ wdQid:"Q9252",wikimediaCode:"kk",labelFR:"Kazakh",labelEN:"Kazakh",nativeName:"Казақша", wikt:"" },
		{ wdQid:"Q9176",wikimediaCode:"ko",labelFR:"Coréen",labelEN:"Korean",nativeName:"한국어", wikt:"" },
		//{ wdQid: "Q7930",wikimediaCode:"mg",labelFR:"malgache",labelEN:"Malagasy",nativeName:"Fiteny Magalasy",wikt:"" },
		{ wdQid:"Q9296",wikimediaCode:"mk",labelFR:"Macédonien",labelEN:"Macedonian",nativeName:"Македонски", wikt:"" },
		{ wdQid:"Q25167",wikimediaCode:"nb",labelFR:"Bokmål",labelEN:"Bokmål",nativeName:"Bokmål", wikt:"" },
		{ wdQid:"Q5146",wikimediaCode:"pt",labelFR:"Portugais",labelEN:"Portuguese",nativeName:"Português", wikt:"" },
		{ wdQid:"Q7737",wikimediaCode:"ru",labelFR:"Russe",labelEN:"Russian",nativeName:"Русский язык", wikt:"" },
		{ wdQid:"Q33973",wikimediaCode:"scn",labelFR:"Sicilien",labelEN:"Sicilian",nativeName:"Sicilianu", wikt:"" },
		{ wdQid:"Q9027",wikimediaCode:"sv",labelFR:"Suédois",labelEN:"Swedish",nativeName:"Svenska", wikt:"" },
		//{ wdQid:"Q7838",wikimediaCode:"sw",labelFR:"swahili",labelEN:"Swahili",nativeName:"Kiswahili", wikt:"" },
		//{ wdQid:"Q9267",wikimediaCode:"tk",labelFR:"turkmène",labelEN:"Turkmen",nativeName:"Türkmençe",wikt:"" },
		{ wdQid:"Q34057",wikimediaCode:"tl",labelFR:"Tagalog",labelEN:"Tagalog",nativeName:"Wikang Tagalog", wikt:"" },
		{ wdQid:"Q256",wikimediaCode:"tr",labelFR:"Turc",labelEN:"Turkish",nativeName:"Türkçe", wikt:"" },		
		{ wdQid:"Q18130932",wikimediaCode:"zh-hant",labelFR:"Chinois traditionel",labelEN:"Traditional Chinese",nativeName:"中文 (繁體)", wikt:"" },
		{ wdQid:"Q13414913",wikimediaCode:"zh-hans",labelFR:"Chinois moderne",labelEN:"Modern Chinese",nativeName:"中文 (简体)", wikt:"" },

		//{ wdQid:"",wikimediaCode:"",labelFR:"",labelEN:"",nativeName:"", wikt:"" },
	];

	var filterArrayBy = function (arr, key, value){
		return arr.filter(item => (item[key]==value) )[0]
	};

	// Init internationalisation support with Banana-i18n.js
	banana = new Banana('fr'); // use document browser language
	loadI18nLocalization(params.uiLanguage);
	// Add url support
	banana.registerParserPlugin('link', (nodes) => {
		return '<a href="' + nodes[0] + '">' + nodes[1] + '</a>';
	});

/* *************************************************************** */
/* Toolbox functions ********************************************* */
// Save parameter and value in localStorage
async function storeParam( name, value ) {
	// If the value is an array, we make a copy of it to avoid dead references issues
	if ( Array.isArray( value ) ) {
		value = Array.from( value ); // copy
	}
	// create object { name: value }
	var tmp = {};
	tmp[ name ] = value;
	// reset params
	params[ name ] = value;
	return await browser.storage.local.set( tmp );
}
// Check if localStorage has parameter value, else use and save default value
async function getStoredParam( name ) {
	var tmp = await browser.storage.local.get( name );
	params[ name ] = tmp[ name ] || params[ name ] || null;	
	// Missing from local storage, save default values there
	if(tmp.length == undefined ) { await storeParam(name, params[name]); }
	var tmp = await browser.storage.local.get( name );
	return params[ name ];
}

// ???
async function checkInjection( tab ) {
	try {
		await browser.tabs.sendMessage( tab, { command: "ping" } );
	} catch ( error ) {
		var i,
			scripts = browser.runtime.getManifest().content_scripts[ 0 ].js, // manu a simplifier
			stylesheets = browser.runtime.getManifest().content_scripts[ 0 ].css;

		for( i = 0; i < scripts.length; i++ ) {
			await browser.tabs.executeScript( tab, { file: scripts[ i ] } );
		}
		for( i = 0; i < stylesheets.length; i++ ) {
			await browser.tabs.insertCSS( tab, { file: stylesheets[ i ] } );
		}
	}
}

// Get sign languages covered by Lingualibre
// returns: [{ wdQid: "Q99628", nativeName: "langue des signes française"},{},...]
async function getSignLanguagesWithVideos() {
	var i,
		signLanguage,
		signLanguages = [], // ?? already define in global scopte
		response = await $.post( 
			sparqlEndpoints.lingualibre.url, 
			{ format: 'json', query: sparqlSignLanguagesQuery } 
		);

	// create signLanguages objects
	for ( i = 0; i < response.results.bindings.length; i++ ) {
		var signLanguageRaw = response.results.bindings[ i ];
		console.log("#149",signLanguageRaw)
		signLanguage = { wdQid: signLanguageRaw.id.value.split( '/' ).pop(), nativeName: signLanguageRaw.idLabel.value }
		signLanguages[i] = signLanguage;
	}
	return signLanguages;
}

// Loading all vidéos of a given sign language. Format:
// returns format: { word: { filename: url, speaker: name }, ... };
async function getAllRecords( signLanguage ) {
	var i, record, word, response,
		records = {};

	state = 'loading';

	response = await $.post( sparqlEndpoints.lingualibre.url, { format: 'json', query: sparqlSignVideosQuery.replace( '$(lang)', signLanguage ) } );

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

// Given a word string, check if exist in available records data, if so return data on that word
// returns format: { filename: url, speaker: name }
function wordToFiles( word ) {
	// could use a switch for clarity
	if ( records.hasOwnProperty( word ) === false ) {
		word = word.toLowerCase();
		if ( records.hasOwnProperty( word ) === false ) {
			return null;
		}
	}
	return records[ word ];
}

function normalize( selection ) { // this could do more
	return selection.trim();
}
var normalizeMessage = function(msg){
	var text = msg.selectionText || msg.iconText || msg.wpTitle;
	delete msg.selectionText; // when from background-script.js via right-click menu
	delete msg.iconText; // when from signit.js icon click
	delete msg.wpTitle; // when from wpintegration.js auto-injection
	msg.text = text.trim();
	// msg.list = getAllRecords() <--------- how to do
	return msg
}

/* ************************************************ 
async function fetchJS(filepath) {
	try {
		const response = await fetch(`${filepath}`, {
			method: 'GET',
			credentials: 'same-origin'
		});
		const content = await response.json();
		return content;
	} catch (error) { console.error(error); }
}
 messages = await fetchJS(`i18n/${iso}.json`); */

// Loading all UI translations
async function loadI18nLocalization( uiLanguageQid ) {
	var messages = {};

	console.log("uiLanguageQid)",uiLanguageQid);
	console.log("supportedUiLanguages",supportedUiLanguages);

	state = 'loading';
	
	// Get iso code and corresponding wiktionary
	var lang = supportedUiLanguages.filter(item => (item.wdQid==uiLanguageQid) );
	iso = lang[0].wikimediaCode;
	console.log("iso",iso)

	// Load i18n messages
	const res = await fetch(`i18n/${iso}.json`)
	messages = await res.json();
	console.log("messages",messages["si-popup-settings-title"])
	// Load messages into localisation
	banana.load(messages, iso); // Load localized messages (chould be conditional to empty)

	// Declare localisation
	banana.setLocale(iso); // Change to new locale
	
	state = 'ready';

	console.log( Object.keys( messages ).length + ' i18n messages loaded' );
}

// Given language's Qid, reload list of available videos and records/words data
async function changeLanguage( newLang ) {
	records = await getAllRecords( newLang );
	await storeParam( 'signLanguage', newLang ); // localStorage save
}

// Given language's Qid, reload available translations
async function changeUiLanguage( newLang ) {
	console.log('changeUiLanguage newLang', newLang); // => 'Q150' for french
	messages = await loadI18nLocalization( newLang );
	await storeParam( 'uiLanguage', newLang ); // localStorage save
}

/* *************************************************************** */
/* Browser interactions ****************************************** */
// Create a context menu item (right-click on text to see)
browser.contextMenus.create({
  id: "signit",
  title: 'Lingua Libre SignIt',
  contexts: ["selection"]
}, function() {return;});

var callModal = async function(msg){
	// Tab
	console.log("Call modal > msg",{ msg });
	var tabs = await browser.tabs.query( { active: true, currentWindow: true } );
	await checkInjection( tabs[ 0 ].id );
	console.log("Call modal > #282 > tab id", tabs[0].id)
	// Data
	var word = msg.text,
		videosFiles = msg.files || wordToFiles( word ) || [];
	// Send message which opens the modal
	browser.tabs.sendMessage( tabs[ 0 ].id, {
		command: "signit.sign",
		text: word,
		files: videosFiles,
		supportedWords: Object.keys(records),    // <------ array for coloredwords feature
		banana : banana
	} );
	storeParam( 'history', [ word, ...params.history ] );
}

// Listen for right-click menu's signals
browser.contextMenus.onClicked.addListener( async function( menuMessage, __tab ) { // var tab not used ? Can remove ?
	message = normalizeMessage(menuMessage)
	callModal(message);
});

// Listen for other signals
browser.runtime.onMessage.addListener( async function ( message ) {
	console.log("Message heard in background-script.js: ", message, "---------------------" )
	message = normalizeMessage(message);

	// When message 'signit.getfiles' is heard, returns relevant extract of records[]
	if ( message.command === 'signit.getfiles' ) {
		console.log('bg>signit.getfiles')
		return records[ message.text ] || records[ message.text.toLowerCase() ] || [];
	}
	 // When message 'signit.i18n' is heard, returns banada object
	else if ( message.command === 'signit.getfilesb' ) {
		console.log('bg>signit.getfilesB')
		// var iso = await getStoredParam( 'uiLanguage' )
		// loadI18nLocalization(iso);
		return banana;
	}
	
	// Start modal
	// When right click's menu "Lingua Libre SignIt" clicked, send message 'signit.sign' to the content script => opens Signit modal
	else if ( message.command === 'signit.hinticon' ) {
		callModal(message);
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

/* *************************************************************** */
/* Main ********************************************************** */
async function main() {
	state = 'loading';

	// Get local storage value if exist, else get default values
	// promise.all 
	await getStoredParam( 'history' );
	await getStoredParam( 'historylimit' );
	await getStoredParam( 'wpintegration' );
	await getStoredParam( 'twospeed' );
    // storeParam( 'twospeed', params.twospeed ); //
	await getStoredParam( 'hinticon' );
	await getStoredParam( 'coloredwords' );

	signLanguage = await getStoredParam( 'signLanguage' );
	signLanguages = await getSignLanguagesWithVideos();
	uiLanguage = await getStoredParam( 'uiLanguage' );
	console.log("supportedUiLanguages",supportedUiLanguages)
	uiLanguages = supportedUiLanguages;
	records = await getAllRecords( signLanguage );

	state = 'ready';
}
// Run it
main();
