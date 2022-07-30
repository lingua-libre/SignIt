(async function() {
	var ui,
		backgroundPage = await browser.runtime.getBackgroundPage();
		document.querySelector('#fetchList').innerHTML = 'Fetching the list of all videos available on Lingua Libre.';
	
	/* *********************************************************** */
	// Master
	var UI = function () {
		// Setup the main tab layout
		this.viewTab = new OO.ui.TabPanelLayout( 'view', { label: 'Consulter' } );
		this.historyTab = new OO.ui.TabPanelLayout( 'history', { label: 'Historique', classes: [ 'popup-tab-history' ] } );
		this.paramTab = new OO.ui.TabPanelLayout( 'param', { label: 'Paramètres', classes: [ 'popup-tab-param' ] } );

		this.indexLayout = new OO.ui.IndexLayout( { autoFocus: false, classes: [ 'popup-tabs' ] } );
		this.indexLayout.addTabPanels( [ this.viewTab, this.historyTab, this.paramTab ] );
		$( '#popup-loaded' ).append( this.indexLayout.$element );

		// Setup tabs
		this.initParam();
		this.initHistory();
		this.initView();

		// show the UI we have just build
		this.switchPanel( 'loaded' );
	};
	
	/* *********************************************************** */
	// Browse tab
	UI.prototype.initView = async function () {
		// Word input 2 : text field
		this.searchWidget = new SearchWidget( { placeholder: `Rechercher parmis les ${ Object.keys( backgroundPage.records ).length } signes.` } );
		this.searchWidget.setRecords( backgroundPage.records );
		var searchButton = new OO.ui.ButtonWidget( {
			icon: 'search',
			label: 'Rechercher',
			invisibleLabel: true,
			title: 'Lancer la recherche'
		} )
		var searchLayout = new OO.ui.ActionFieldLayout( this.searchWidget, searchButton, {
			align: 'top',
			label: 'Rechercher',
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
	UI.prototype.initHistory = function () {
		this.$noHistory = $( "<div>C'est vide</div>" );
		this.history = [];
		this.$history = [];
		this.historyTab.$element.append( this.$noHistory );

		var tmp = backgroundPage.params.history;
		for ( i = tmp.length-1; i >= 0 ; i-- ) {
			this.addHistory( tmp[ i ], false );
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
		/* Language picker */
		var i, languageDropdown, languageLayout,
		 	items = [];

		for ( qid in backgroundPage.languages ) {
			items.push( new OO.ui.MenuOptionWidget( {
				data: qid,
				label: backgroundPage.languages[ qid ],
			} ) );
		}

		languageDropdown = new OO.ui.DropdownWidget( { label: 'Change language', menu: { items: items }, $overlay: $( 'body' ) } );
		languageLayout = new OO.ui.FieldLayout( languageDropdown, {
			label: 'Langue :',
			align: 'top',
			help: 'Change la langue des signes utilisée dans les vidéos.',
			//helpInline: true
		} );

		/* History length chooser */
		historyWidget = new OO.ui.NumberInputWidget( {
			value: 20,
			min: 0
		} );
		historyLayout = new OO.ui.FieldLayout( historyWidget, {
			label: 'Nombre de lignes d\'historique :',
			align: 'top',
			help: 'Mettre à 0 désactive l\'historique',
		} );

		/* WP integrator */
		wpintegrationWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		wpintegrationLayout = new OO.ui.FieldLayout( wpintegrationWidget, {
			label: 'Intégration native sur Wikipédia :',
			align: 'top',
		} );

		/* Two speed playback integrator */
		twospeedWidget = new OO.ui.ToggleSwitchWidget( {
			value: true
		} );
		twospeedLayout = new OO.ui.FieldLayout( twospeedWidget, {
			label: 'Lecture double normal / lent :',
			align: 'top',
		} );

		// Populate
		languageDropdown.getMenu().selectItemByData( backgroundPage.params.language );
		historyWidget.setValue( backgroundPage.params.historylimit );
		wpintegrationWidget.setValue( backgroundPage.params.wpintegration );
		twospeedWidget.setValue( backgroundPage.params.twospeed );

		// Events
		languageDropdown.getMenu().on( 'choose', changeLanguage );
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

		this.paramTab.$element
			.append( languageLayout.$element )
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
	async function changeLanguage( item ) {
		var newLang = item.getData();
		if ( backgroundPage.params.language === newLang ) {
			return;
		}

		ui.switchPanel( 'loading' );
		await backgroundPage.changeLanguage( newLang );
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
