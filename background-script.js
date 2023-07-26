/* *************************************************************** */
/* TODO ********************************************************** */
// See https://github.com/lingua-libre/SignIt/issues

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
/* Initial state if no localStorage ********************************* */
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
		showvideo: true,
		showdefinition: true,
	};

/* *************************************************************** */
/* i18n context ************************************************** */
// List of UI languages with translations on github via translatewiki
var supportedUiLanguages = [
  {i18nCode: "anp",labelEN: "Angika",labelNative: "अंगिका",wdQid: "Q28378",wiki: "anp"},
  {i18nCode: "ar",labelEN: "Arabic",labelNative: "اللُّغَة العَرَبِيّة",wdQid: "Q13955",wiki: "ar"},
  {i18nCode: "bn",labelEN: "Bengali",labelNative: "বাংলা",wdQid: "Q9610",wiki: "bn"},
  {i18nCode: "br",labelEN: "Breton",labelNative: "Brezhoneg",wdQid: "Q12107",wiki: "br"},
  {i18nCode: "de",labelEN: "German",labelNative: "Deutsch",wdQid: "Q188",wiki: "de"},
  {i18nCode: "en",labelEN: "English",labelNative: "English",wdQid: "Q1860",wiki: "en"},
  {i18nCode: "es",labelEN: "Spanish",labelNative: "Español",wdQid: "Q1321",wiki: "es"},
  {i18nCode: "fa",labelEN: "Persian",labelNative: "فارسی",wdQid: "Q9168",wiki: "fa"},
  {i18nCode: "fi",labelEN: "Finnish",labelNative: "Suomi",wdQid: "Q1412",wiki: "fi"},
  {i18nCode: "fr",labelEN: "French",labelNative: "Français",wdQid: "Q150",wiki: "fr"},
  {i18nCode: "he",labelEN: "Hebrew",labelNative: "עברית",wdQid: "Q9288",wiki: "he"},
  {i18nCode: "hi",labelEN: "Hindi",labelNative: "हिन्दी",wdQid: "Q1568",wiki: "hi"},
  {i18nCode: "hu",labelEN: "Hungarian",labelNative: "Magyar",wdQid: "Q9067",wiki: "hu"},
  {i18nCode: "ia",labelEN: "Interlingua",labelNative: "Interlingua",wdQid: "Q35934",wiki: "ia"},
  {i18nCode: "id",labelEN: "Indonesian",labelNative: "Bahasa Indonesia",wdQid: "Q9240",wiki: "id"},
  {i18nCode: "it",labelEN: "Italian",labelNative: "Italiano",wdQid: "Q652",wiki: "it"},
  {i18nCode: "ja",labelEN: "Japanese",labelNative: "日本語",wdQid: "Q5287",wiki: "ja"},
    {i18nCode: "kk-cyrl",labelEN: "Kazakh",labelNative: "Казақша",wdQid: "Q9252",wiki: "kk"},
  {i18nCode: "ko",labelEN: "Korean",labelNative: "한국어",wdQid: "Q9176",wiki: "ko"},
  {i18nCode: "krc",labelEN: "Karachay-Balkar",labelNative: "Qaraçay-malqar",wdQid: "Q33714",wiki: "krc"},
  {i18nCode: "lmo",labelEN: "Lombard",labelNative: "Lengua lombarda",wdQid: "Q33754",wiki: "lmo"},
  {i18nCode: "mk",labelEN: "Macedonian",labelNative: "Македонски",wdQid: "Q9296",wiki: "mk"},
  {i18nCode: "mnw",labelEN: "Mon",labelNative: "ဘာသာမန်",wdQid: "Q13349",wiki: "mnw"},
  {i18nCode: "ms",labelEN: "Malay",labelNative: "Bahasa Melayu",wdQid: "Q9237",wiki: "ms"},
  {i18nCode: "nb",labelEN: "Bokmål",labelNative: "Bokmål",wdQid: "Q25167",wiki: "nb"},
  {i18nCode: "pnb",labelEN: "Western Punjabi",labelNative: "ਪੰਜਾਬੀ",wdQid: "Q1389492"},
    {i18nCode: "pt",labelEN: "Portuguese",labelNative: "Português (pt)",wdQid: "Q5146",wiki: "pt"},
    {i18nCode: "pt-br",labelEN: "Portuguese",labelNative: "Português (br)" wdQid: "Q5146",wiki: "pt"},
  {i18nCode: "ru",labelEN: "Russian",labelNative: "Русский язык",wdQid: "Q7737",wiki: "ru"},
  {i18nCode: "scn",labelEN: "Sicilian",labelNative: "Sicilianu",wdQid: "Q33973",wiki: "scn"},
  {i18nCode: "sl",labelEN: "Slovene",labelNative: "Slovenski jezik",wdQid: "Q9063",wiki: "sl"},
  {i18nCode: "sv",labelEN: "Swedish",labelNative: "Svenska",wdQid: "Q9027",wiki: "sv"},
  {i18nCode: "sw",labelEN: "Swahili",labelNative: "Kiswahili",wdQid: "Q7838",wiki: "sw"},
  {i18nCode: "tl",labelEN: "Tagalog",labelNative: "Wikang Tagalog",wdQid: "Q34057",wiki: "tl"},
  {i18nCode: "tr",labelEN: "Turkish",labelNative: "Türkçe",wdQid: "Q256",wiki: "tr"},
  {i18nCode: "uk",labelEN: "Ukrainian",labelNative: "Українська мова",wdQid: "Q8798",wiki: "uk"},
 // {i18nCode:"zh",labelEN: "Chinese",labelNative: "汉语",wdQid: "Q7850",wiki: "zh"}
    {i18nCode: "zh-hant",labelEN: "Traditional Chinese",labelNative: "中文 (繁體)",wdQid: "Q18130932",wiki: "zh"},
    {i18nCode: "zh-hans",labelEN: "Modern Chinese",labelNative: "中文 (简体)",wdQid: "Q13414913",wiki: "zh"},
]

// Init internationalisation support with Banana-i18n.js
banana = new Banana('fr'); // use document browser language
loadI18nLocalization(params.uiLanguage);
// Add url support
banana.registerParserPlugin('link', (nodes) => {
	return '<a href="' + nodes[0] + '">' + nodes[1] + '</a>';
});

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
messages = await fetchJS(`i18n/${locale}.json`); */

// Loading all UI translations
async function loadI18nLocalization( uiLanguageQid ) {
	var localizedPhrases = {};

	console.log("uiLanguageQid)",uiLanguageQid);
	console.log("supportedUiLanguages",supportedUiLanguages);

	state = 'loading';
	
	// Get locale code and corresponding wiktionary
	var lang = supportedUiLanguages.filter(item => (item.wdQid==uiLanguageQid) );
	locale = lang[0].i18nCode;
	console.log("locale",locale)

	// Load i18n messages
	const res = await fetch(`i18n/${locale}.json`)
	localizedPhrases = await res.json();
	console.log("messages",localizedPhrases["si-popup-settings-title"])
	// Load messages into localisation
	banana.load(localizedPhrases, locale); // Load localized messages (chould be conditional to empty)

	// Declare localisation
	banana.setLocale(locale); // Change to new locale
	
	state = 'ready';

	console.log( Object.keys( localizedPhrases ).length + ' i18n messages loaded' );
}

/* *************************************************************** */
/* Settings management : memory, updates ************************* */
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


// Get sign languages covered by Lingualibre
// returns: [{ wdQid: "Q99628", labelNative: "langue des signes française"},{},...]
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
		signLanguage = { wdQid: signLanguageRaw.id.value.split( '/' ).pop(), labelNative: signLanguageRaw.idLabel.value }
		signLanguages[i] = signLanguage;
	}
	// TEMPORARY, WHEN ONLY LSF HAS VIDEOS
	signLanguages = filterArrayBy(signLanguages,"wdQid", "Q99628");
	console.log(signLanguages)

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
/* Toolbox functions ********************************************* */
var filterArrayBy = function (arr, key, value){
	return arr.filter(item => (item[key]==value) )
};
function normalize( selection ) { // this could do more
	return selection.trim();
}

// Given a word string, check if exist in available records data, if so return data on that word
// returns format: { filename: url, speaker: name }
function wordToFiles( word ) {
	var fileData =
		records.hasOwnProperty( word ) ? records[ word ]
		:records.hasOwnProperty( word.toLowerCase() )? records[ word.toLowerCase() ]
		:null;
	return fileData;
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

/* *************************************************************** */
/* Dependencies, CSP ********************************************* */
async function getActiveTabId () {
	await browser.tabs.query({active: true, currentWindow: true});
	return tabs[ 0 ].id;
}
// Ping tab, if fails, then CSS, JS dependencies loaded and executed
async function checkActiveTabInjections( tab ) {
	try {
		await browser.tabs.sendMessage( tab, { command: "ping" } );
	} catch ( error ) {
		var i,
			dependencies = browser.runtime.getManifest().content_scripts[ 0 ];
			scripts = dependencies.js,
			stylesheets = dependencies.css;

		for( i = 0; i < scripts.length; i++ ) {
			await browser.tabs.executeScript( tab, { file: scripts[ i ] } );
		}
		for( i = 0; i < stylesheets.length; i++ ) {
			await browser.tabs.insertCSS( tab, { file: stylesheets[ i ] } );
		}
	}
}

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
/* Browser interactions ****************************************** */
var callModal = async function(msg){
	// Tab
	console.log("Call modal > msg",{ msg });
	var tabs = await browser.tabs.query({active: true, currentWindow: true});
	await checkActiveTabInjections( tabs[ 0 ].id );
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

// Create a context menu item (right-click on text to see)
browser.contextMenus.create({
	id: "signit",
	title: 'Lingua Libre SignIt',
	contexts: ["selection"]
  }, function() {return;});
  
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
	 // When message 'signit.i18nCode' is heard, returns banada object
	else if ( message.command === 'signit.getfilesb' ) {
		console.log('bg>signit.getfilesB')
		// var locale = await getStoredParam( 'uiLanguage' )
		// loadI18nLocalization(locale);
		return banana;
	}
	
	// Start modal
	// When right click's menu "Lingua Libre SignIt" clicked, send message 'signit.sign' to the content script => opens Signit modal
	else if ( message.command === 'signit.hinticon' ) {
		callModal(message);
	}
});

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
