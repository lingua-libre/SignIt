(async function() {
	var ui,
		backgroundPage = await browser.runtime.getBackgroundPage();

	var UI = function () {
		// Setup the main tab layout
		this.viewTab = new OO.ui.TabPanelLayout( 'view', { label: 'Consulter' } );
		this.historyTab = new OO.ui.TabPanelLayout( 'history', { label: 'Historique', classes: [ 'popup-tab-history' ] } );
		this.paramTab = new OO.ui.TabPanelLayout( 'param', { label: 'Paramètres', classes: [ 'popup-tab-param' ] } );

		this.indexLayout = new OO.ui.IndexLayout( { autoFocus: false, classes: [ 'popup-tabs' ] } );
		this.indexLayout.addTabPanels( [ this.viewTab, this.historyTab, this.paramTab ] );
		$( '#popup-loaded' ).append( this.indexLayout.$element );

		// Setup the param tab
		this.initParam();

		// Setup the history tab
		this.initHistory();

		// Setup the view tab
		this.initView();

		// show the UI we have just build
		this.switchPanel( 'loaded' );
	};

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

	UI.prototype.initHistory = function () {
		this.$noHistory = $( '<div>C\'est vide</div>' );
		this.history = [];
		this.$history = [];
		this.historyTab.$element.append( this.$noHistory );

		var tmp = backgroundPage.getStoredParam( 'history' );
		for ( i = tmp.length-1; i >= 0 ; i-- ) {
			this.addHistory( tmp[ i ], false );
		}
	};

	UI.prototype.addHistory = function( word, store ) {
		if ( this.params.history === 0 ) {
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
		if ( store !== false ) {
			backgroundPage.storeParam( 'history', this.history );
		}

		if ( this.history.length > this.params.history ) {
			this.history.pop();
			this.$history.pop().remove();
		}
	}

	UI.prototype.initParam = function () {
		this.params = {};
		this.params.history = 6;

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
		languageDropdown.getMenu().selectItemByData( backgroundPage.language );
		languageDropdown.getMenu().on( 'choose', changeLanguage );

		languageLayout = new OO.ui.FieldLayout( languageDropdown, {
			label: 'Langue :',
			align: 'top',
			help: 'Change la langue des signes utilisée dans les vidéos.',
			//helpInline: true
		} );

		this.paramTab.$element.append( languageLayout.$element );
	};

	UI.prototype.switchPanel = function( tab ) {
		$( '#popup-loading' ).hide();
		$( '#popup-loaded' ).hide();
		$( '#popup-' + tab ).show();
	};

	async function changeLanguage( item ) {
		var newLang = item.getData();
		if ( backgroundPage.language === newLang ) {
			return;
		}

		ui.switchPanel( 'loading' );
		await backgroundPage.changeLanguage( newLang );
		ui.switchPanel( 'loaded' );
	}

	function waitWhileLoading() {
		console.log( 'loading' );
		if ( backgroundPage.state === 'ready' ) {
			ui = new UI();
		} else {
			setTimeout( waitWhileLoading, 100 );
		}
	}
	waitWhileLoading()

})();
