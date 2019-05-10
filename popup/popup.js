(async function() {
	var ui,
		backgroundPage = await browser.runtime.getBackgroundPage();

	var UI = function () {
		// Setup the main tab layout
		this.viewTab = new OO.ui.TabPanelLayout( 'view', { label: 'Consulter' } );
		this.historyTab = new OO.ui.TabPanelLayout( 'history', { label: 'Historique' } );
		this.paramTab = new OO.ui.TabPanelLayout( 'param', { label: 'Paramètres', classes: [ 'popup-tab-param' ] } );

		this.indexLayout = new OO.ui.IndexLayout( { autoFocus: false, classes: [ 'popup-tabs' ] } );
		this.indexLayout.addTabPanels( [ this.viewTab, this.historyTab, this.paramTab ] );
		$( '#popup-loaded' ).append( this.indexLayout.$element );

		// Setup the view tab
		this.initView();

		// Setup the history tab
		this.initHistory();

		// Setup the param tab
		this.initParam();

		// show the UI we have just build
		this.switchPanel( 'loaded' );
	};

	UI.prototype.initView = async function () {
		tabs = await browser.tabs.query({active: true, currentWindow: true});
	  	selection = await browser.tabs.sendMessage( tabs[ 0 ].id, {
			command: "signit.getSelection",
		} );
		word = backgroundPage.normalize( selection );
		files = backgroundPage.wordToFiles ( word );
		content = new SignItCoreContent();
		content.refresh( word, files );
		this.viewTab.$element.append( content.getContainer() );
	};

	UI.prototype.initHistory = function () {

	};

	UI.prototype.initParam = function () {
		/* Language picker */
		var i, languageDropdown, languageLayout,
		 	items = [];

		for ( qid in backgroundPage.languages ) {
			items.push( new OO.ui.MenuOptionWidget( {
				data: qid,
				label: backgroundPage.languages[ qid ],
			} ) );
		}
		languageDropdown = new OO.ui.DropdownWidget( { label: 'Change language', menu: { items: items } } );
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
