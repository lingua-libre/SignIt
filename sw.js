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

// can use type:"module" but it interferes with the working of extension in FF, hence using old importScripts

importScripts("./lib/banana-i18n.js");
  /* *************************************************************** */
  /* Sparql endpoints *********************************************** */
  const sparqlEndpoints = {
    lingualibre: {
      url: "https://lingualibre.org/bigdata/namespace/wdq/sparql",
      verb: "POST",
    },
    wikidata: { url: "https://query.wikidata.org/sparql", verb: "GET" },
    commons: { url: "https://commons-query.wikimedia.org/sparql", verb: "GET" },
    dictionaireFrancophone: {
      url: "https://www.dictionnairedesfrancophones.org/sparql",
      verb: "",
    },
  };
  /* *************************************************************** */
  /* Sparql ******************************************************** */
  // Lingualibre: All languages (P4) for which media type (P24) is video (Q88890)
  // TODO: NEEDS QUERY HITING ON LLQS+WDQS, FETCHING NATIVE NAME (P1705)
  const sparqlSignLanguagesQuery =
    'SELECT ?id ?idLabel WHERE { ?id prop:P2 entity:Q4 . ?id prop:P24 entity:Q88890 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }';
  // Lingualibre: Given a language (P4) with media video, fetch the list of writen word (P7), url (P3) speakers (P5)
  const sparqlSignVideosQuery =
    'SELECT ?word ?filename ?speaker WHERE { ?record prop:P2 entity:Q2 . ?record prop:P4 entity:$(lang) . ?record prop:P7 ?word . ?record prop:P3 ?filename . ?record prop:P5 ?speakerItem . ?speakerItem rdfs:label ?speaker filter ( lang( ?speaker ) = "en" ) . }';
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
}`;

  var browser = chrome;

  /* *************************************************************** */
  /* Initial state if no localStorage ********************************* */
  var 
//   state = "up", // up, loading, ready, error
  state, // up, loading, ready, error
    records = {},
    signLanguages = [],
    uiLanguages = [],
    // Default values, will be stored in localStorage as well for persistency.
    params = {
      signLanguage: "Q99628", // for videos : French Sign language
      uiLanguage: "Q150", // for interface : French
      historylimit: 6,
      history: ["lapin", "crabe", "fraise", "canard"], // Some fun
      wpintegration: true,
      twospeed: true,
      hinticon: true,
      coloredwords: true,
      choosepanels: "both", // issues/36
    };

  /* *************************************************************** */
  /* i18n context ************************************************** */
  // List of UI languages with translations on github via translatewiki
  var supportedUiLanguages = [
    {
      i18nCode: "anp",
      labelEN: "Angika",
      labelNative: "अंगिका",
      wdQid: "Q28378",
      wiki: "anp",
    },
    {
      i18nCode: "ar",
      labelEN: "Arabic",
      labelNative: "اللُّغَة العَرَبِيّة",
      wdQid: "Q13955",
      wiki: "ar",
    },
    {
      i18nCode: "bn",
      labelEN: "Bengali",
      labelNative: "বাংলা",
      wdQid: "Q9610",
      wiki: "bn",
    },
    {
      i18nCode: "blk",
      labelEN: "Pa'O",
      labelNative: "ပအိုဝ်ႏဘာႏသာႏ",
      wdQid: "",
      wiki: "Q7121294",
    },
    {
      i18nCode: "br",
      labelEN: "Breton",
      labelNative: "Brezhoneg",
      wdQid: "Q12107",
      wiki: "br",
    },
    {
      i18nCode: "ce",
      labelEN: "Chechen",
      labelNative: "Нохчийн мотт",
      wdQid: "Q33350",
      wiki: "ce",
    },
    {
      i18nCode: "de",
      labelEN: "German",
      labelNative: "Deutsch",
      wdQid: "Q188",
      wiki: "de",
    },
    {
      i18nCode: "en",
      labelEN: "English",
      labelNative: "English",
      wdQid: "Q1860",
      wiki: "en",
    },
    {
      i18nCode: "es",
      labelEN: "Spanish",
      labelNative: "Español",
      wdQid: "Q1321",
      wiki: "es",
    },
    {
      i18nCode: "fa",
      labelEN: "Persian",
      labelNative: "فارسی",
      wdQid: "Q9168",
      wiki: "fa",
    },
    {
      i18nCode: "fi",
      labelEN: "Finnish",
      labelNative: "Suomi",
      wdQid: "Q1412",
      wiki: "fi",
    },
    {
      i18nCode: "fr",
      labelEN: "French",
      labelNative: "Français",
      wdQid: "Q150",
      wiki: "fr",
    },
    {
      i18nCode: "gl",
      labelEN: "Galician",
      labelNative: "Galego",
      wdQid: "Q9307",
      wiki: "gl",
    },
    {
      i18nCode: "he",
      labelEN: "Hebrew",
      labelNative: "עברית",
      wdQid: "Q9288",
      wiki: "he",
    },
    {
      i18nCode: "hi",
      labelEN: "Hindi",
      labelNative: "हिन्दी",
      wdQid: "Q1568",
      wiki: "hi",
    },
    {
      i18nCode: "hu",
      labelEN: "Hungarian",
      labelNative: "Magyar",
      wdQid: "Q9067",
      wiki: "hu",
    },
    {
      i18nCode: "ia",
      labelEN: "Interlingua",
      labelNative: "Interlingua",
      wdQid: "Q35934",
      wiki: "ia",
    },
    {
      i18nCode: "id",
      labelEN: "Indonesian",
      labelNative: "Bahasa Indonesia",
      wdQid: "Q9240",
      wiki: "id",
    },
    {
      i18nCode: "it",
      labelEN: "Italian",
      labelNative: "Italiano",
      wdQid: "Q652",
      wiki: "it",
    },
    {
      i18nCode: "ja",
      labelEN: "Japanese",
      labelNative: "日本語",
      wdQid: "Q5287",
      wiki: "ja",
    },
    {
      i18nCode: "kk-cyrl",
      labelEN: "Kazakh",
      labelNative: "Казақша",
      wdQid: "Q9252",
      wiki: "kk",
    },
    {
      i18nCode: "ko",
      labelEN: "Korean",
      labelNative: "한국어",
      wdQid: "Q9176",
      wiki: "ko",
    },
    {
      i18nCode: "krc",
      labelEN: "Karachay-Balkar",
      labelNative: "Qaraçay-malqar",
      wdQid: "Q33714",
      wiki: "krc",
    },
    {
      i18nCode: "lmo",
      labelEN: "Lombard",
      labelNative: "Lengua lombarda",
      wdQid: "Q33754",
      wiki: "lmo",
    },
    {
      i18nCode: "mk",
      labelEN: "Macedonian",
      labelNative: "Македонски",
      wdQid: "Q9296",
      wiki: "mk",
    },
    {
      i18nCode: "mnw",
      labelEN: "Mon",
      labelNative: "ဘာသာမန်",
      wdQid: "Q13349",
      wiki: "mnw",
    },
    {
      i18nCode: "ms",
      labelEN: "Malay",
      labelNative: "Bahasa Melayu",
      wdQid: "Q9237",
      wiki: "ms",
    },
    {
      i18nCode: "nb",
      labelEN: "Bokmål",
      labelNative: "Bokmål",
      wdQid: "Q25167",
      wiki: "nb",
    },
    {
      i18nCode: "urdu",
      labelEN: "Urdu",
      labelNative: "اردو",
      wdQid: "Q1389492",
    },
    {
      i18nCode: "pt",
      labelEN: "Portuguese",
      labelNative: "Português (pt)",
      wdQid: "Q5146",
      wiki: "pt",
    },
    {
      i18nCode: "pt-br",
      labelEN: "Portuguese",
      labelNative: "Português (br)",
      wdQid: "Q5146",
      wiki: "pt",
    },
    {
      i18nCode: "ru",
      labelEN: "Russian",
      labelNative: "Русский язык",
      wdQid: "Q7737",
      wiki: "ru",
    },
    {
      i18nCode: "scn",
      labelEN: "Sicilian",
      labelNative: "Sicilianu",
      wdQid: "Q33973",
      wiki: "scn",
    },
    {
      i18nCode: "sl",
      labelEN: "Slovene",
      labelNative: "Slovenski jezik",
      wdQid: "Q9063",
      wiki: "sl",
    },
    {
      i18nCode: "sv",
      labelEN: "Swedish",
      labelNative: "Svenska",
      wdQid: "Q9027",
      wiki: "sv",
    },
    {
      i18nCode: "sw",
      labelEN: "Swahili",
      labelNative: "Kiswahili",
      wdQid: "Q7838",
      wiki: "sw",
    },
    {
      i18nCode: "tl",
      labelEN: "Tagalog",
      labelNative: "Wikang Tagalog",
      wdQid: "Q34057",
      wiki: "tl",
    },
    {
      i18nCode: "tr",
      labelEN: "Turkish",
      labelNative: "Türkçe",
      wdQid: "Q256",
      wiki: "tr",
    },
    {
      i18nCode: "uk",
      labelEN: "Ukrainian",
      labelNative: "Українська мова",
      wdQid: "Q8798",
      wiki: "uk",
    },
    // {i18nCode:"zh",labelEN: "Chinese",labelNative: "汉语",wdQid: "Q7850",wiki: "zh"}
    {
      i18nCode: "zh-hant",
      labelEN: "Traditional Chinese",
      labelNative: "中文 (繁體)",
      wdQid: "Q18130932",
      wiki: "zh",
    },
    {
      i18nCode: "zh-hans",
      labelEN: "Modern Chinese",
      labelNative: "中文 (简体)",
      wdQid: "Q13414913",
      wiki: "zh",
    },
  ];

  // Init internationalisation support with Banana-i18n.js
  var banana = new Banana("fr"); // use document browser language
  loadI18nLocalization(params.uiLanguage);
  // Add url support
  banana.registerParserPlugin("link", (nodes) => {
    return '<a href="' + nodes[0] + '">' + nodes[1] + "</a>";
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

async function setState(value) {
    // state = await browser.storage.local.set({state:"up"});
    await browser.storage.local.set({state:"up"});
    if (value) {
        await browser.storage.local.set({state:value}).then(()=>{
           console.log(`Value  = ${value}`);
        });
    }
    
    const newState = await browser.storage.local.get("state");
    return newState.state;
}

  // Loading all UI translations
  async function loadI18nLocalization(uiLanguageQid) {
    var localizedPhrases = {};

    console.log("uiLanguageQid)", uiLanguageQid);
    console.log("supportedUiLanguages", supportedUiLanguages);

    // state = "loading";
    state = await setState("loading");
    
    // Get locale code and corresponding wiktionary
    var lang = supportedUiLanguages.filter(
      (item) => item.wdQid == uiLanguageQid
    );
    var locale = lang[0].i18nCode;
    console.log("locale", locale);

    // Load i18n messages
    const res = await fetch(`i18n/${locale}.json`);
    localizedPhrases = await res.json();
    console.log("messages", localizedPhrases["si-popup-settings-title"]);
    // Load messages into localisation
    banana.load(localizedPhrases, locale); // Load localized messages (chould be conditional to empty)

    // Declare localisation
    banana.setLocale(locale); // Change to new locale
    storeParam("bananaInStore", banana);

    // state = "ready";
    state = await setState("ready");

    console.log(Object.keys(localizedPhrases).length + " i18n messages loaded");
  }
  /* *************************************************************** */
  /* Settings management : memory, updates ************************* */
  // Save parameter and value in localStorage
  async function storeParam(name, value) {
    // If value of type array, we make a copy of it to avoid dead references issues
    if (Array.isArray(value)) {
      value = Array.from(value); // copy
    }
    // else, create object { name: value }
    console.log("HERE ! Selected option: { ", name + ": " + value + " }");
    var tmp = {};
    tmp[name] = value;
    // reset params
    params[name] = value;
    return await browser.storage.local.set(tmp);
  }
  // Get stored values from init hard coded `params` or from prefered local storage
  // Also synchronize both.
  async function getStoredParam(name) {
    var tmp = await browser.storage.local.get(name);
    params[name] = tmp[name] || params[name] || null;
    // If missing from local storage, then save init values in local storage
    if (tmp.length == undefined) {
      await storeParam(name, params[name]);
    }
    return params[name];
  }

  // Get sign languages covered by Lingualibre
  // returns: [{ wdQid: "Q99628", labelNative: "langue des signes française"},{},...]

  async function getSignLanguagesWithVideos() {
    try {
      const response = await fetch(sparqlEndpoints.lingualibre.url, {
        method: "POST",
        body: JSON.stringify({
          format: "json",
          query: sparqlSignLanguagesQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // Await the parsed JSON response

      const signLanguages = [];
      for (let i = 0; i < data.results.bindings.length; i++) {
        const signLanguageRaw = data.results.bindings[i];
        const signLanguage = {
          wdQid: signLanguageRaw.id.value.split("/").pop(),
          labelNative: signLanguageRaw.idLabel.value,
        };
        signLanguages.push(signLanguage);
      }

      // Temporary filtering (assuming filterArrayBy is available)
      signLanguages = filterArrayBy(signLanguages, "wdQid", "Q99628");

      console.log(signLanguages);
      return signLanguages;
    } catch (error) {
      console.error("Error fetching or processing data:", error);
    }
  }

  // Loading all vidéos of a given sign language. Format:
  // returns format: { word: { filename: url, speaker: name }, ... };
  async function getAllRecords(signLanguage) {
    // response = await $.post( sparqlEndpoints.lingualibre.url, { format: 'json', query: sparqlSignVideosQuery.replace( '$(lang)', signLanguage ) } );
    
    // Using Fetch API since service_worker cant access DOM and hence cant use jquery

    var i,
      record,
      word,
      response,
      records = {};
    try {
    //   state = "loading";
      state = await setState("loading");

      response = await fetch(sparqlEndpoints.lingualibre.url, {
        method: "POST",
        body: JSON.stringify({
          format: "json",
          query: sparqlSignVideosQuery.replace("$(lang)", signLanguage),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // Await the parsed JSON response

      for (i = 0; i < data.results.bindings.length; i++) {
        record = data.results.bindings[i];
        word = record.word.value.toLowerCase();
        if (records.hasOwnProperty(word) === false) {
          records[word] = [];
        }
        records[word].push({
          filename: record.filename.value.replace("http://", "https://"),
          speaker: record.speaker.value,
        });
      }

    //   state = "ready";
      state = await setState("ready");


      console.log(Object.keys(records).length + " records loaded");
      return records;
    } catch (error) {
      console.error("Error fetching or processing data:", error);
    }
  }

  // Given language's Qid, reload list of available videos and records/words data
  async function changeLanguage(newLang) {
    records = await getAllRecords(newLang);
    await storeParam("signLanguage", newLang); // localStorage save
  }

  // Given language's Qid, reload available translations
  async function changeUiLanguage(newLang) {
    console.log("changeUiLanguage newLang", newLang); // => 'Q150' for french
    await loadI18nLocalization(newLang);
    await storeParam("uiLanguage", newLang); // localStorage save
  }

  /* *************************************************************** */
  /* Toolbox functions ********************************************* */
  var filterArrayBy = function (arr, key, value) {
    return arr.filter((item) => item[key] == value);
  };
  function normalize(selection) {
    // this could do more
    return selection.trim();
  }

  // Check a string with multiple words and return the word whose record is available
  function getAvailableWord(word) {
    const wordArray = word.split(" ");
    // For some reason iterating through array returns undefined so I switched to filter method

    // for ( let newWord of wordArray ) {
    // 	if( records.hasOwnProperty(newWord.toLowerCase()) ){
    // 		return newWord;
    // 	}
    // }
    wordArray.filter((e) => {
      if (records.hasOwnProperty(e.toLowerCase())) return e;
    });
    return wordArray[0];
  }

  // Given a word string, check if exist in available records data, if so return data on that word
  // returns format: { filename: url, speaker: name }
  function wordToFiles(word) {
    var fileData = records.hasOwnProperty(word)
      ? records[word]
      : records.hasOwnProperty(word.toLowerCase())
      ? records[word.toLowerCase()]
      : null;
    return fileData;
  }

  var normalizeMessage = function (msg) {
    var text = msg.selectionText || msg.iconText || msg.wpTitle;
    delete msg.selectionText; // when from background-script.js via right-click menu
    delete msg.iconText; // when from signit.js icon click
    delete msg.wpTitle; // when from wpintegration.js auto-injection
    // text = text.trim();
    const newMsg = { ...msg, text };
    // msg.list = getAllRecords() <--------- how to do
    return newMsg;
  };

  /* *************************************************************** */
  /* Dependencies, CSP ********************************************* */
  async function getActiveTabId() {
    await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0].id;
  }
  // Ping tab, if fails, then CSS, JS dependencies loaded and executed
  async function checkActiveTabInjections(tabId) {
    try {
      await browser.tabs.sendMessage(tabId, { command: "ping" });
    } catch (error) {
      // var i,
      var dependencies = browser.runtime.getManifest().content_scripts[0];
      var scripts = dependencies.js;
      var stylesheets = dependencies.css;

      // Using the scripting API as per Manifest V3

      // for( i = 0; i < scripts.length; i++ ) {
      // await browser.scripting.executeScript( tab, { file: scripts[ i ] } );
      await browser.scripting.executeScript({
        target: { tabId },
        files: [...scripts],
      });
      // }
      // for( i = 0; i < stylesheets.length; i++ ) {
      // await browser.tabs.insertCSS( tab, { file: stylesheets[ i ] } );
      await browser.scripting.insertCSS({
        target: { tabId },
        files: [...stylesheets],
      });
      // }
    }
  }

// Insecure CSP not supported in manifest V3 , so no need to for the bypass logic

  // Edit the header of all pages on-the-fly to bypass Content-Security-Policy
  // browser.webRequest.onHeadersReceived.addListener(info => {
  //     const headers = info.responseHeaders; // original headers
  //     for (let i=headers.length-1; i>=0; --i) {
  //         let header = headers[i].name.toLowerCase();
  //         if (header === "content-security-policy") { // csp header is found
  //             // modifying media-src; this implies that the directive is already present
  //             headers[i].value = headers[i].value.replace("media-src", "media-src https://commons.wikimedia.org https://upload.wikimedia.org");
  //         }
  //     }
  //     // return modified headers
  //     return {responseHeaders: headers};
  // }, {
  //     urls: [ "<all_urls>" ], // match all pages
  //     types: [ "main_frame" ] // to focus only the main document of a tab
  // }, ["blocking", "responseHeaders"]);

  /* *************************************************************** */
  /* Browser interactions ****************************************** */
  var callModal = async function (msg) {
    // Tab
    console.log("Call modal > msg", { msg });
    var tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await checkActiveTabInjections(tabs[0].id);
    console.log("Call modal > #282 > tab id", tabs[0].id);
    // Data
    var word = msg.text;
    if (word.split(" ").length > 1) {
      word = getAvailableWord(word);
    }
    var videosFiles = msg.files || wordToFiles(word) || [];
    // Send message which opens the modal
    browser.tabs.sendMessage(tabs[0].id, {
      command: "signit.sign",
      text: word,
      files: videosFiles,
      supportedWords: Object.keys(records), // <------ array for coloredwords feature
      banana: banana,
    });
    storeParam("history", [word, ...params.history]);
  };

  // Create a context menu item (right-click on text to see)
  browser.contextMenus.create(
    {
      id: "signit",
      title: "Lingua Libre SignIt",
      contexts: ["selection"],
    },
    function () {
      return;
    }
  );

  // Listen for right-click menu's signals
  browser.contextMenus.onClicked.addListener(async function (
    menuMessage,
    __tab
  ) {
    // var tab not used ? Can remove ?
    let message = normalizeMessage(menuMessage);
    callModal(message);
  });

  // Listen for other signals
  browser.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
    console.log(
      "Message heard in service_worker: ",
      message,
      "---------------------"
    );
    // keeping it above normalizeMessage() since it deletes the selecton text inside 
    // the message which renders the test undefined

    if (message.command === "normalizeWordAndReturnFiles") {
      const w  = normalize(message.text);
      const f  = wordToFiles(w);
      sendResponse([w,f]);
    }
    message = normalizeMessage(message);

    // When message 'signit.getfiles' is heard, returns relevant extract of records[]
    if (message.command === "signit.getfiles") {
      console.log("bg>signit.getfiles");
      console.log(
        records[message.text] || records[message.text.toLowerCase()] || []
      );
      return records[message.text] || records[message.text.toLowerCase()] || [];
    }
    // When message 'signit.i18nCode' is heard, returns banada object
    else if (
      message.command === "signit.getfilesb" ||
      message.command === "getBanana"
    ) {
      console.log("bg>signit.getfilesB");
      // What this does is it accesses the messageStore inside banana amd spreads the sourecMap
      // which is an instanceof Map thereby converting it into an array. This is later recreated inside popup
      sendResponse([[...banana.messageStore.sourceMap], banana.locale]);
    }

    // Start modal
    // When right click's menu "Lingua Libre SignIt" clicked, send message 'signit.sign' to the content script => opens Signit modal
    else if (message.command === "signit.hinticon") {
      callModal(message);
    } 
    else if (message.command === "checkActiveTabInjections") {
      checkActiveTabInjections(message.currentTabId);
    }
    else if (message.command === "storeParam") {
      storeParam([...message.arguments]);
    }
    else if (message.command === "changeUiLanguage") {
      await changeUiLanguage(message.newLanguage);
    }
  });

  /* *************************************************************** */
  /* Main ********************************************************** */
  async function main() {
    // state = "loading";
    state = await setState("loading");

    // Get local storage value if exist, else get default values
    // promise.all
    await getStoredParam("history");
    await getStoredParam("historylimit");
    await getStoredParam("wpintegration");
    await getStoredParam("twospeed");
    // storeParam( 'twospeed', params.twospeed ); //
    await getStoredParam("hinticon");
    await getStoredParam("coloredwords");
    await getStoredParam("choosepanels");

    let signLanguage = await getStoredParam("signLanguage");
    // signLanguages = await getSignLanguagesWithVideos();
    let uiLanguage = await getStoredParam("uiLanguage");
    console.log("supportedUiLanguages", supportedUiLanguages);
    uiLanguages = supportedUiLanguages;
    // records = await getAllRecords( signLanguage );

    // state = "ready";
    state = await setState("ready");

  }

// Run it
main();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.command === "getBackground") {
    // persisted the state inside chrome.storage.local but will get to that later
    console.log(state);
    const a = {state,params,uiLanguages};
    sendResponse(a);
	}
});