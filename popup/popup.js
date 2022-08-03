(async function() {
	var ui,
		backgroundPage = await browser.runtime.getBackgroundPage();

	/* *********************************************************** */
	// Master
	var UI = function () {
		// Make internalisations available
		banana = backgroundPage.banana;
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
		this.searchWidget = new SearchWidget( { placeholder: banana.i18n("si-popup-browse-placeholder", Object.keys( backgroundPage.records ).length ) } );
		this.searchWidget.setRecords( backgroundPage.records );
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
		await backgroundPage.checkInjection( tabs[ 0 ].id );
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
		word = backgroundPage.normalize( text );
		files = backgroundPage.wordToFiles ( word );
		this.coreContent.refresh( word, files );
		this.searchWidget.setValue( word );
		this.coreContent.getContainer().show();
		this.addHistory( word );
	}
	
	/* *********************************************************** */
	// History tab 
	// .initHistory calls .addHistory which calls .cleanHistory
	UI.prototype.initHistory = function () {
		this.$noHistory = $( `<div>${banana.i18n("si-popup-history-noHistory")}</div>` );
		this.history = [];
		this.$history = [];
		this.historyTab.$element.append( this.$noHistory );

		var tmp = backgroundPage.params.history;
		for ( i = tmp.length-1; i >= 0 ; i-- ) {
			this.addHistory( tmp[ i ], false ); // weird, store always false then why define it as parameter ?
		}
	};

	UI.prototype.addHistory = function( word, store ) {
		if ( backgroundPage.params.history === 0 ) {
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
		while ( this.history.length > backgroundPage.params.historylimit ) {
			this.history.pop();
			this.$history.pop().remove();
		}

		if ( this.history.length === 0 ) {
			this.$noHistory.show();
		}

		if ( store !== false ) {
			backgroundPage.storeParam( 'history', this.history );
		}
	}

	/* *********************************************************** */
	// Settings tab
	UI.prototype.initParam = async function () {
		/* Sign Language picker */
		// Data
		var items = [];
		for ( qid in backgroundPage.signLanguages ) {
			items.push( new OO.ui.MenuOptionWidget( {
				data: qid,
				label: backgroundPage.signLanguages[ qid ], // name of the language
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
		for ( qid in backgroundPage.uiLanguages ) {
			items.push( new OO.ui.MenuOptionWidget( {
				data: qid,
				label: backgroundPage.uiLanguages[ qid ], // name of the language
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

		// Populate
		signLanguageDropdown.getMenu().selectItemByData( backgroundPage.params.signLanguage );
		uiLanguageDropdown.getMenu().selectItemByData( backgroundPage.params.uiLanguage );
		historyWidget.setValue( backgroundPage.params.historylimit );
		wpintegrationWidget.setValue( backgroundPage.params.wpintegration );
		twospeedWidget.setValue( backgroundPage.params.twospeed );

		// Events
		signLanguageDropdown.getMenu().on( 'choose', changeSignLanguage );
		uiLanguageDropdown.getMenu().on( 'choose', changeUiLanguage );
		backgroundPage.storeParam( 'uiLanguage', backgroundPage.params.uiLanguage ); // uiLanguage in localStorage before first usage-change
		historyWidget.on( 'change', function( newLimit ) {
			newLimit = parseInt( newLimit ) || 0;
			if ( newLimit < 0 ) {
				newLimit = 0;
			}
			backgroundPage.storeParam( 'historylimit', newLimit );
			this.cleanHistory();
		}.bind( this ) );
		wpintegrationWidget.on( 'change', backgroundPage.storeParam.bind( backgroundPage, 'wpintegration' ) )
		twospeedWidget.on( 'change', backgroundPage.storeParam.bind( backgroundPage, 'twospeed' ) )
		backgroundPage.storeParam( 'twospeed', backgroundPage.params.twospeed ); // twospeed in localStorage before first usage-change

		this.paramTab.$element
			.append( signLanguageLayout.$element )
			.append( uiLanguageLayout.$element )
			.append( historyLayout.$element )
			.append( wpintegrationLayout.$element )
			.append( twospeedLayout.$element );
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
		if ( backgroundPage.params.signLanguage === newLanguage ) {
			return;
		}

		ui.switchPanel( 'loading' );
		await backgroundPage.changeLanguage( newLanguage );
		ui.switchPanel( 'loaded' );
	}
	async function changeUiLanguage( item ) {
		var newLanguage = item.getData();
		console.log("stored language:", backgroundPage.params.uiLanguage);
		console.log('passed language:', newLanguage)
		if ( backgroundPage.params.uiLanguage === newLanguage ) {
			return;
		}
		ui.switchPanel( 'loading' );
		//banana = backgroundPage.banana;
		await backgroundPage.changeUiLanguage( newLanguage ); // save in localStorage
		ui = new UI();
		ui.switchPanel( 'loaded' );
	}

	function waitWhileLoading() {
		if ( backgroundPage.state === 'ready' ) {
			ui = new UI();
		} else {
			setTimeout( waitWhileLoading, 100 );
		}
	}
	waitWhileLoading()

})();
