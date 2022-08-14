var browser = browser || chrome;
(async function() {
	var ui,
		_backgroundPage = await browser.runtime.getBackgroundPage();

	/* *********************************************************** */
	// Master
	var UI = function () {
		// Make internalisations available
		banana = _backgroundPage.banana;
		// Placeholder while fetching data
		document.querySelector('#fetchVideosList').innerHTML = banana.i18n('si-addon-preload');

		// Setup the main tabs
		this.viewTab = new OO.ui.TabPanelLayout( 'view', { label: banana.i18n('si-popup-browse-title') } );
		this.historyTab = new OO.ui.TabPanelLayout( 'history', { label: banana.i18n('si-popup-history-title'), classes: [ 'popup-tab-history' ] } );
		this.paramTab = new OO.ui.TabPanelLayout( 'param', { label: banana.i18n('si-popup-settings-title'), classes: [ 'popup-tab-param' ] } );

		// Set up the popup page layout
		this.indexLayout = new OO.ui.IndexLayout( { autoFocus: false, classes: [ 'popup-tabs' ] } );
		this.indexLayout.addTabPanels( [ this.viewTab, this.historyTab, this.paramTab ] );

		// Clean up then append
		document.querySelector( '#popup-loaded' ).innerHTML = "";
		$( '#popup-loaded' ).append( this.indexLayout.$element );

		// Build the full tabs inner content
		this.initView();
		this.initHistory();
		this.initParam();

		// Show the UI we have just build
		this.switchPanel( 'loaded' );
	};
	
	/* *********************************************************** */
	// Browse tab
	UI.prototype.initView = async function () {
		// Word input 2 : text field
		this.searchWidget = new SearchWidget( { placeholder: banana.i18n("si-popup-browse-placeholder", Object.keys( _backgroundPage.records ).length ) } );
		this.searchWidget.setRecords( _backgroundPage.records );
		var searchButton = new OO.ui.ButtonWidget( {
			icon: 'search',
			label: banana.i18n("si-popup-browse-label"),
			invisibleLabel: true,
			title: banana.i18n("si-popup-browse-icon")
		} )
		var searchLayout = new OO.ui.ActionFieldLayout( this.searchWidget, searchButton, {
			align: 'top',
			label: banana.i18n("si-popup-browse-label"),
			invisibleLabel: true,
			classes: [ 'popup-tab-view-search' ]
		} );

		// Add the CoreContent view
		this.coreContent = new SignItCoreContent();
		this.coreContent.getContainer().hide();

		// Put all that in the tab
		this.viewTab.$element.append( searchLayout.$element ).append( this.coreContent.getContainer() );

		// Connect events to those elements

		// if the current window has a selected text, initialise the view with it
		var tabs = await browser.tabs.query({active: true, currentWindow: true});
		await _backgroundPage.checkInjection( tabs[ 0 ].id );
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

	UI.prototype.changeView = function( text ) {
		if ( typeof text !== 'string' ) {
			text = this.searchWidget.getValue();
		}
		_word = _backgroundPage.normalize( text );
		_files = _backgroundPage.wordToFiles ( _word );
		this.coreContent.refresh( _word, _files );
		this.searchWidget.setValue( _word );
		this.coreContent.getContainer().show();
		this.addHistory( _word );
	}
	
	/* *********************************************************** */
	// History tab 
	// .initHistory calls .addHistory which calls .cleanHistory
	UI.prototype.initHistory = function () {
		this.$noHistory = $( `<div>${banana.i18n("si-popup-history-noHistory")}</div>` );
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
		this.$history.unshift( $( `<a class="popup-historyline">${ word }</a>` ) );
		this.$history[ 0 ].on( 'click', this.changeView.bind( this, word ) );
		this.$history[ 0 ].on( 'click', this.indexLayout.setTabPanel.bind( this.indexLayout, 'view' ) );
		this.historyTab.$element.prepend( this.$history[ 0 ] );

		this.cleanHistory( store );
	}

	UI.prototype.cleanHistory = function( store ) {
		while ( this.history.length > _backgroundPage.params.historylimit ) {
			this.history.pop();
			this.$history.pop().remove();
		}

		if ( this.history.length === 0 ) {
			this.$noHistory.show();
		}

		if ( store !== false ) {
			_backgroundPage.storeParam( 'history', this.history );
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
				label: lang.nativeName, // sign language name (en)
			} ) );
		}
		// Layout
		signLanguageDropdown = new OO.ui.DropdownWidget( { 
			label: banana.i18n("si-popup-settings-signlanguage-dropdown"), 
			menu: { items: items }, 
			$overlay: $( 'body' ) 
		} );
		signLanguageLayout = new OO.ui.FieldLayout( signLanguageDropdown, {
			label: banana.i18n("si-popup-settings-signlanguage"),
			align: 'top',
			help: banana.i18n("si-popup-settings-signlanguage-help"),
			//helpInline: true
		} );
		
		/* UI Languages picker */		
		// Data
		items = [];
		_uiLanguages = _backgroundPage.uiLanguages
		for (i=0;i<_uiLanguages.length;i++ ) {
			console.log('lang', _uiLanguages);
			lang = _uiLanguages[i];
			console.log('lang', lang);
			items.push( new OO.ui.MenuOptionWidget( {
				data: lang.wdQid,
				label: lang.nativeName, // name of the language
			} ) );
		}
		// Layout
		uiLanguageDropdown = new OO.ui.DropdownWidget({ 
			label: banana.i18n("si-popup-settings-signlanguage"), 
			menu: { items: items }, 
			$overlay: $( 'body' ) 
		} );
		uiLanguageLayout = new OO.ui.FieldLayout( uiLanguageDropdown, {
			label: banana.i18n("si-popup-settings-uilanguage"),
			align: 'top',
			help: banana.i18n("si-popup-settings-uilanguage-help"),
			//helpInline: true
		} );

		/* History length chooser */
		historyWidget = new OO.ui.NumberInputWidget( {
			value: 20,
			min: 0
		} );
		historyLayout = new OO.ui.FieldLayout( historyWidget, {
			label: banana.i18n("si-popup-settings-history"),
			align: 'top',
			help: banana.i18n("si-popup-settings-history-help"),
		} );

		/* WP integrator */
		wpintegrationWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		wpintegrationLayout = new OO.ui.FieldLayout( wpintegrationWidget, {
			label: banana.i18n("si-popup-settings-wpintegration"),
			align: 'top',
		} );

		/* Two speed playback integrator */
		twospeedWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		twospeedLayout = new OO.ui.FieldLayout( twospeedWidget, {
			label: banana.i18n("si-popup-settings-twospeed"),
			align: 'top',
		} );
		/* Hint icon shortcut */
		hinticonWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		hinticonLayout = new OO.ui.FieldLayout( hinticonWidget, {
			label: banana.i18n("si-popup-settings-hint-icon"),
			align: 'top',
		} );
		/* Colored text */
		coloredwordsWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		coloredwordsLayout = new OO.ui.FieldLayout( coloredwordsWidget, {
			label: banana.i18n("si-popup-settings-enlighten"),
			align: 'top',
		} );


		// Populate UI with correct values
		signLanguageDropdown.getMenu().selectItemByData( _backgroundPage.params.signLanguage );
		uiLanguageDropdown.getMenu().selectItemByData( _backgroundPage.params.uiLanguage );
		historyWidget.setValue( _backgroundPage.params.historylimit );
		wpintegrationWidget.setValue( _backgroundPage.params.wpintegration );
		twospeedWidget.setValue( _backgroundPage.params.twospeed );
		hinticonWidget.setValue( _backgroundPage.params.hinticon );
		coloredwordsWidget.setValue( _backgroundPage.params.coloredwords );

		// Changes events
		signLanguageDropdown.getMenu().on( 'choose', changeSignLanguage );
		uiLanguageDropdown.getMenu().on( 'choose', changeUiLanguage );
		// _backgroundPage.storeParam( 'uiLanguage', _backgroundPage.params.uiLanguage ); // uiLanguage in localStorage before first usage-change
		historyWidget.on( 'change', function( newLimit ) {
			newLimit = parseInt( newLimit ) || 0;
			if ( newLimit < 0 ) { newLimit = 0; }
			_backgroundPage.storeParam( 'historylimit', newLimit );
			this.cleanHistory();
		}.bind( this ) );
		wpintegrationWidget.on( 'change', _backgroundPage.storeParam.bind( _backgroundPage, 'wpintegration' ) )
		twospeedWidget.on( 'change', _backgroundPage.storeParam.bind( _backgroundPage, 'twospeed' ) )
		// _backgroundPage.storeParam( 'twospeed', _backgroundPage.params.twospeed ); // twospeed in localStorage before first usage-change
		hinticonWidget.on( 'change', _backgroundPage.storeParam.bind( _backgroundPage, 'hinticon' ) )
		coloredwordsWidget.on( 'change', _backgroundPage.storeParam.bind( _backgroundPage, 'coloredwords' ) )


		// Build Settings UI
		this.paramTab.$element
			.append( signLanguageLayout.$element )
			.append( uiLanguageLayout.$element )
			.append( historyLayout.$element )
			.append( wpintegrationLayout.$element )
			.append( twospeedLayout.$element )
			.append( hinticonLayout.$element );
			.append( coloredwordsLayout.$element );
	};

	/* *********************************************************** */
	// Tab switcher
	UI.prototype.switchPanel = function( tab ) {
		$( '#popup-loading' ).hide();
		$( '#popup-loaded' ).hide();
		$( '#popup-' + tab ).show();
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
		//banana = _backgroundPage.banana;
		await _backgroundPage.changeUiLanguage( newLanguage ); // save in localStorage
		ui = new UI();
		ui.switchPanel( 'loaded' );
	}

	function waitWhileLoading() {
		if ( _backgroundPage.state === 'ready' ) {
			ui = new UI();
		} else {
			setTimeout( waitWhileLoading, 100 );
		}
	}
	waitWhileLoading()

})();
