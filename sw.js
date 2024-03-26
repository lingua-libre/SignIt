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

/* *************************************************************** */
/* Initial state if no localStorage ********************************* */
var state = "up", // up, loading, ready, error
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

// Get sign languages covered by Lingualibre
// returns: [{ wdQid: "Q99628", labelNative: "langue des signes française"},{},...]
async function getSignLanguagesWithVideos() {
  var i,
    signLanguage,
    signLanguages = [], // ?? already define in global scopte
    response = await $.post(sparqlEndpoints.lingualibre.url, {
      format: "json",
      query: sparqlSignLanguagesQuery,
    });
  // create signLanguages objects
  for (i = 0; i < response.results.bindings.length; i++) {
    var signLanguageRaw = response.results.bindings[i];
    console.log("#149", signLanguageRaw);
    signLanguage = {
      wdQid: signLanguageRaw.id.value.split("/").pop(),
      labelNative: signLanguageRaw.idLabel.value,
    };
    signLanguages[i] = signLanguage;
  }
  // TEMPORARY, WHEN ONLY LSF HAS VIDEOS
  signLanguages = filterArrayBy(signLanguages, "wdQid", "Q99628");
  console.log(signLanguages);

  return signLanguages;
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
  return await chrome.storage.local.set(tmp);
}

// Get stored values from init hard coded `params` or from prefered local storage
// Also synchronize both.
async function getStoredParam(name) {
  var tmp = await chrome.storage.local.get(name);
  params[name] = tmp[name] || params[name] || null;
  // If missing from local storage, then save init values in local storage
  if (tmp.length == undefined) {
    await storeParam(name, params[name]);
  }
  return params[name];
}

// Loading all vidéos of a given sign language. Format:
// returns format: { word: { filename: url, speaker: name }, ... };
async function getAllRecords(signLanguage) {
  var i,
    record,
    word,
    response,
    records = {};

  state = "loading";

  response = await $.post(sparqlEndpoints.lingualibre.url, {
    format: "json",
    query: sparqlSignVideosQuery.replace("$(lang)", signLanguage),
  });

  for (i = 0; i < response.results.bindings.length; i++) {
    record = response.results.bindings[i];
    word = record.word.value.toLowerCase();
    if (records.hasOwnProperty(word) === false) {
      records[word] = [];
    }
    records[word].push({
      filename: record.filename.value.replace("http://", "https://"),
      speaker: record.speaker.value,
    });
  }

  state = "ready";

  console.log(Object.keys(records).length + " records loaded");
  return records;
}

// Given language's Qid, reload list of available videos and records/words data
async function changeLanguage(newLang) {
  records = await getAllRecords(newLang);
  await storeParam("signLanguage", newLang); // localStorage save
}

function normalize(selection) {
  // this could do more
  return selection.trim();
}

function wordToFiles(word) {
  var fileData = records.hasOwnProperty(word)
    ? records[word]
    : records.hasOwnProperty(word.toLowerCase())
    ? records[word.toLowerCase()]
    : null;
  return fileData;
}

/* *************************************************************** */
/* Main ********************************************************** */
async function main() {
  state = "loading";

  // Get local storage value if exist, else get default values
  // promise.all
  // await getStoredParam( 'history' );
  // await getStoredParam( 'historylimit' );
  // await getStoredParam( 'wpintegration' );
  // await getStoredParam( 'twospeed' );
  // storeParam( 'twospeed', params.twospeed ); //
  // await getStoredParam( 'hinticon' );
  // await getStoredParam( 'coloredwords' );
  // await getStoredParam( 'choosepanels' );

  signLanguage = await getStoredParam("signLanguage");
  signLanguages = await getSignLanguagesWithVideos();
  // uiLanguage = await getStoredParam( 'uiLanguage' );
  // console.log("supportedUiLanguages",supportedUiLanguages)
  // uiLanguages = supportedUiLanguages;
  records = await getAllRecords(signLanguage);

  state = "ready";
}
// main();
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    await main(); // Call main function to populate data
    console.log("Received message:", message);
    if (message.type === "getBackground") {
      sendResponse(message); // Send appropriate response
    } else {
      sendResponse("error received");
    }
  } catch (error) {
    sendResponse("error occurred");
  }
});
