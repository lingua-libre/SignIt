var browserType = (typeof browser !== 'undefined' && browser.runtime) ? 'firefox' :
                  (typeof chrome !== 'undefined' && chrome.runtime) ? 'chrome' :
                  'unknown';
var browser = (browserType === 'firefox') ? browser : (browserType === 'chrome') ? chrome : unknown;
(async function() {
	var ui,_backgroundPage,banana;
	// This if statement is made so that we are able to communicate with background-scripts(now sw.js/service worker) by passing messages 
	// since we cant directly do it in V3 in chrome ofc, (not complete yet but had to start somewhere) . . . while making sure that 
	// old getBackgroundPage() script works fine with firefox 
	if (browserType === "chrome") {
    // Use Chrome Extensions API,
    async function getBackgroundPage() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ command: "getBackground" }, (response) => {
          resolve(response);
        });
      });
    }
    _backgroundPage = await getBackgroundPage();
    console.log("Background Page  = ", _backgroundPage);
	} else if (browserType === 'firefox') {
		// Use Firefox WebExtensions API
		_backgroundPage = await browser.runtime.getBackgroundPage();
	}

	/* *********************************************************** */
	// Master
	var banana ={i18n:async(msg,...placeholderValue)=>{
		return await chrome.runtime.sendMessage({
			command:"bananai18n",
			arg:[msg,placeholderValue]
		})
	}}
	var UI = function () {
		(async ()=>{
			document.querySelector('#fetchVideosList').innerHTML = await banana.i18n('si-addon-preload');
			
			// Setup the main tabs
			this.viewTab = new OO.ui.TabPanelLayout( 'view', { label: await banana.i18n('si-popup-browse-title') } );
			this.historyTab = new OO.ui.TabPanelLayout( 'history', { label: await banana.i18n('si-popup-history-title'), classes: [ 'signit-popup-tab-history' ] } );
			this.paramTab = new OO.ui.TabPanelLayout( 'param', { label: await banana.i18n('si-popup-settings-title'), classes: [ 'signit-popup-tab-settings' ] } );

			// Set up the popup page layout
			this.indexLayout = new OO.ui.IndexLayout( { autoFocus: false, classes: [ 'signit-popup-tabs' ] } );
			this.indexLayout.addTabPanels( [ this.viewTab, this.historyTab, this.paramTab ] );

			// Clean up then append
			document.querySelector( '#signit-popup-loaded' ).innerHTML = "";
			$( '#signit-popup-loaded' ).append( this.indexLayout.$element );

			// Build the full tabs inner content
			this.initView();
			this.initHistory();
			this.initParam();

			// Show the UI we have just build
			this.switchPanel( 'loaded' );
		})();
	};
	
	async function sendMessageUp(msg,argument){
		const response = await browser.runtime.sendMessage({command:msg,argument});
		if (response !== undefined) return response;
	}

	/* *********************************************************** */
	// Browse tab
	UI.prototype.initView = async function () {
		// Word input 2 : text field
		// await banana.i18n accepts string value as substitutes for placeholders, hence JSON.stringify
		this.searchWidget = new SearchWidget( { placeholder: await banana.i18n("si-popup-browse-placeholder", JSON.stringify(Object.keys( _backgroundPage.records ).length) ) } );
		this.searchWidget.setRecords( _backgroundPage.records );
		var searchButton = new OO.ui.ButtonWidget( {
			icon:"search",
			label: await banana.i18n("si-popup-browse-label"),
			invisibleLabel: true,
			title: await banana.i18n("si-popup-browse-icon")
		} );
		
		var searchLayout = new OO.ui.ActionFieldLayout( this.searchWidget, searchButton, {
			align: 'top',
			label: await banana.i18n("si-popup-browse-label"),
			invisibleLabel: true,
			classes: [ 'signit-popup-tab-browse' ]
		} );

		// Add the CoreContent view

		this.coreContent = new SignItCoreContent();
		this.coreContent.init();
		this.coreContent.getContainer().hide();

		// Put all that in the tab
		this.viewTab.$element.append( searchLayout.$element ).append( this.coreContent.getContainer() );

		// Connect events to those elements

		// if the current window has a selected text, initialise the view with it
		var tabs = await browser.tabs.query({active: true, currentWindow: true});
		
		// optimizing message passing for the functions that are present in 
		// sw.js as well background-script.js

		await sendMessageUp("checkActiveTabInjections",tabs[0].id);
		var selection = await browser.tabs.sendMessage( tabs[ 0 ].id, {
			command: "signit.getSelection",
		} );
		if ( selection !== '' ) {
			this.changeView( selection );
		}

		// refresh the view each time a search is made
		searchButton.on( 'click', this.changeView.bind( this ) );
		this.searchWidget.lookupMenu.on( 'choose', this.changeView.bind( this ) );
	};

	UI.prototype.changeView = async function (text) {
    if (typeof text !== "string") {
      text = this.searchWidget.getValue();
    }
    // runs normalize function and wordToFiles in a single go and retruns an array of -word and -files

	const [_word,_files] = await sendMessageUp("normalizeWordAndReturnFiles",text);
    this.coreContent.refresh(_word, _files);
    this.searchWidget.setValue( _word );
    this.coreContent.getContainer().show();
    this.addHistory(_word);
  };
	
	/* *********************************************************** */
	// History tab 
	// .initHistory calls .addHistory which calls .cleanHistory
	UI.prototype.initHistory = async function () {
		this.$noHistory = $( `<div>${await banana.i18n("si-popup-history-empty")}</div>` );
		this.history = [];
		this.$history = [];
		this.historyTab.$element.append( this.$noHistory );

		var _tmp = _backgroundPage.params.history;
		for ( i = _tmp.length-1; i >= 0 ; i-- ) {
			this.addHistory( _tmp[ i ], false ); // weird, store always false then why define it as parameter ?
		}
	};

	UI.prototype.addHistory = function( word, store ) {
		if ( _backgroundPage.params.history === 0 ) {
			return;
		}

		this.$noHistory.hide();
		var index = this.history.indexOf( word );
		if ( index > -1 ) {
			this.history.splice( index, 1 );
			this.$history.splice( index, 1 )[ 0 ].remove();
		}

		this.history.unshift( word );
		this.$history.unshift( $( `<a class="signit-popup-tab-history-line">${ word }</a>` ) );
		this.$history[ 0 ].on( 'click', this.changeView.bind( this, word ) );
		this.$history[ 0 ].on( 'click', this.indexLayout.setTabPanel.bind( this.indexLayout, 'view' ) );
		this.historyTab.$element.prepend( this.$history[ 0 ] );

		this.cleanHistory( store );
	}

	UI.prototype.cleanHistory = async function( store ) {
		while ( this.history.length > _backgroundPage.params.historylimit ) {
			this.history.pop();
			this.$history.pop().remove();
		}

		if ( this.history.length === 0 ) {
			this.$noHistory.show();
		}

		if ( store !== false ) {
			await sendMessageUp("storeParam",['history', this.history ]);
		}
	}

	/* *********************************************************** */
	// Settings tab
	UI.prototype.initParam = async function () {
		/* Sign Language picker */
		// Data
		var items = [];
		_signLanguages = _backgroundPage.signLanguages;
		console.log("148 signLanguages", _signLanguages )
		for (var i=0;i<_signLanguages.length;i++ ) {
			lang = _signLanguages[i];
			console.log("151 lang", lang ) // #136
			items.push( new OO.ui.MenuOptionWidget( {
				data: lang.wdQid, // qid
				label: lang.labelNative, // sign language name (en)
			} ) );
		}
		// Layout
		signLanguageDropdown = new OO.ui.DropdownWidget( { 
			label: await banana.i18n("si-popup-settings-signlanguage-dropdown"), 
			menu: { items: items }, 
			$overlay: $( 'body' ) 
		} );
		signLanguageLayout = new OO.ui.FieldLayout( signLanguageDropdown, {
			label: await banana.i18n("si-popup-settings-signlanguage"),
			align: 'top',
			help: await banana.i18n("si-popup-settings-signlanguage-help"),
			//helpInline: true
		} );
		
		/* Open-ended settings options : *********************************** */
		// UI Languages picker
		// Data
		items = [];
		_uiLanguages = _backgroundPage.uiLanguages
		for (i=0;i<_uiLanguages.length;i++ ) {
			console.log('lang', _uiLanguages);
			lang = _uiLanguages[i];
			console.log('lang', lang);
			items.push( new OO.ui.MenuOptionWidget( {
				data: lang.wdQid,
				label: lang.labelNative, // name of the language
			} ) );
		}
		// Layout
		uiLanguageDropdown = new OO.ui.DropdownWidget({ 
			label: await banana.i18n("si-popup-settings-signlanguage"), 
			menu: { items: items }, 
			$overlay: $( 'body' ) 
		} );
		uiLanguageLayout = new OO.ui.FieldLayout( uiLanguageDropdown, {
			label: await banana.i18n("si-popup-settings-uilanguage"),
			align: 'top',
			help: await banana.i18n("si-popup-settings-uilanguage-help"),
			//helpInline: true
		} );

		// History-logs length
		historyWidget = new OO.ui.NumberInputWidget( {
			value: 20,
			min: 0
		} );
		historyLayout = new OO.ui.FieldLayout( historyWidget, {
			label: await banana.i18n("si-popup-settings-history"),
			align: 'top',
			help: await banana.i18n("si-popup-settings-history-help"),
		} );

		
		/* Toogle settings options : on/off ******************************** */
		// WP integrator
		wpintegrationWidget = new OO.ui.CheckboxInputWidget( {
			selected: _backgroundPage.params.wpintegration,
		} );
		wpintegrationLayout = new OO.ui.FieldLayout( wpintegrationWidget, {
			label: await banana.i18n("si-popup-settings-wpintegration"),
			align: 'inline',
		} );

		// Two speed playback integrator
		twospeedWidget = new OO.ui.CheckboxInputWidget( {
			selected: _backgroundPage.params.twospeed,
		} );
		twospeedLayout = new OO.ui.FieldLayout( twospeedWidget, {
			label: await banana.i18n("si-popup-settings-twospeed"),
			align: 'inline',
		} );
		// Hint icon shortcut
		hinticonWidget = new OO.ui.CheckboxInputWidget({
      selected: _backgroundPage.params.hinticon,
    });
    hinticonLayout = new OO.ui.FieldLayout(hinticonWidget, {
      label: await banana.i18n('si-popup-settings-hint-icon'),
      align: 'inline',
    });
    // Colored text
    coloredwordsWidget = new OO.ui.CheckboxInputWidget({
      selected: _backgroundPage.params.coloredwords,
    });
    coloredwordsLayout = new OO.ui.FieldLayout(coloredwordsWidget, {
      label: await banana.i18n('si-popup-settings-enlighten'),
      align: 'inline',
    });

		// Choose panels : both, definition, video
		var panelsOption0 = new OO.ui.ButtonOptionWidget( {
			data: 'definition',
			label: await banana.i18n("si-popup-settings-choosepanels-definition")
		} ),
		panelsOption1 = new OO.ui.ButtonOptionWidget( {
			data: 'both',
			label: await banana.i18n("si-popup-settings-choosepanels-both")
		} );
		panelsOption2 = new OO.ui.ButtonOptionWidget( {
			data: 'video',
			label:  await banana.i18n("si-popup-settings-choosepanels-video")
		} );
		choosepanelsWidget = new OO.ui.ButtonSelectWidget( {
			items: [ panelsOption0, panelsOption1, panelsOption2 ]
		} );
		// Layout
		choosepanelsLayout = new OO.ui.FieldLayout( choosepanelsWidget, {
			label:  await banana.i18n("si-popup-settings-choosepanels"),
			align: 'top',
		} );

		// Populate UI with correct up to date user's selected values
		// Select menus
		signLanguageDropdown.getMenu().selectItemByData( _backgroundPage.params.signLanguage );
		uiLanguageDropdown.getMenu().selectItemByData( _backgroundPage.params.uiLanguage );
		// Toogle buttons
		historyWidget.setValue( _backgroundPage.params.historylimit );
		wpintegrationWidget.setValue( _backgroundPage.params.wpintegration );
		twospeedWidget.setValue( _backgroundPage.params.twospeed );
		hinticonWidget.setValue( _backgroundPage.params.hinticon );
		coloredwordsWidget.setValue( _backgroundPage.params.coloredwords );

		// Tri-buttons : selectItemByData or setData
		choosepanelsWidget.setData( _backgroundPage.params.choosepanels );
		choosepanelsWidget.selectItemByData( _backgroundPage.params.choosepanels );

		// Changes events
		signLanguageDropdown.getMenu().on( 'choose', changeSignLanguage );
		uiLanguageDropdown.getMenu().on( 'choose', changeUiLanguage );
		// _backgroundPage.storeParam( 'uiLanguage', _backgroundPage.params.uiLanguage ); // uiLanguage in localStorage before first usage-change
		historyWidget.on( 'change', function( val ) {
			val = parseInt( val ) >=0 ? parseInt( val ) : 0;
			sendMessageUp("storeParam",['historylimit', val])
			this.cleanHistory();
		}.bind( this ) );
		wpintegrationWidget.on( 'change', () => sendMessageUp("storeParam",['wpintegration',!_backgroundPage.params.wpintegration]) );
		twospeedWidget.on( 'change', () => sendMessageUp("storeParam",['twospeed',!_backgroundPage.params.twospeed] ));
		// sendMessageUp("storeParam"( 'twospeed', _backgroundPage.params.twospeed ); // twospeed in localStorage before first usage-change
		hinticonWidget.on('change', () => sendMessageUp("storeParam",['hinticon',!_backgroundPage.params.hinticon]));
    coloredwordsWidget.on('change', () => sendMessageUp("storeParam",['coloredwords',!_backgroundPage.params.coloredwords]));
		// Listen for item selection events
		choosepanelsWidget.on('choose', (d)=>{ 
			sendMessageUp("storeParam",['choosepanels', d.getData()]); 
		});

		// Build Settings UI
		this.paramTab.$element
			.append( signLanguageLayout.$element )
			.append( uiLanguageLayout.$element )
			.append( historyLayout.$element )
			.append( wpintegrationLayout.$element )
			.append( twospeedLayout.$element )
			.append( hinticonLayout.$element )
			.append( coloredwordsLayout.$element )
			.append( choosepanelsLayout.$element );
	};

	/* *********************************************************** */
	// Tab switcher
	UI.prototype.switchPanel = function( tab ) {
		$( '#signit-popup-loading' ).hide();
		$( '#signit-popup-loaded' ).hide();
		$( '#signit-popup-' + tab ).show();
	};
	/* *********************************************************** */
	// Others
	async function changeSignLanguage( item ) {
		var newLanguage = item.getData(); // `item` is the oojs Select element's object.
		if ( _backgroundPage.params.signLanguage === newLanguage ) {
			return;
		}

		ui.switchPanel( 'loading' );
		await _backgroundPage.changeLanguage( newLanguage );
		ui = new UI();
		ui.switchPanel( 'loaded' );
	}
	async function changeUiLanguage( item ) {
		var newLanguage = item.getData();
		console.log("stored language:", _backgroundPage.params.uiLanguage);
		console.log('passed language:', newLanguage)
		if ( _backgroundPage.params.uiLanguage === newLanguage ) {
			return;
		}
		ui.switchPanel( 'loading' );

		await sendMessageUp("changeUiLanguage",newLanguage);
		ui = new UI();
		ui.switchPanel( 'loaded' );
	}
	if (browserType === "chrome") {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.state === "ready") {
        ui = new UI();
      }
    });
  } else {
    let state = _backgroundPage.state;
    function waitWhileLoading() {
      if (state === "ready") {
        ui = new UI();
      } else {
        setTimeout(waitWhileLoading, 100);
      }
    }
    waitWhileLoading();
  }
})();
