(async function() {
	var backgroundPage = await browser.runtime.getBackgroundPage();

	async function initOptions() {
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
		} ),

		$( '#popup-options-languages' ).append( languageLayout.$element );

		switchTab( 'options' );

		tabs = await browser.tabs.query({active: true, currentWindow: true});
	  	selection = await browser.tabs.sendMessage( tabs[ 0 ].id, {
			command: "signit.getSelection",
		} );
		word = backgroundPage.normalize( selection );
		files = backgroundPage.wordToFiles ( word );
		content = new SignItCoreContent();
		content.refresh( word, files );
		$( '#popup-options' ).append( content.getContainer() );
	}

	function switchTab( tab ) {
		$( '#popup-loading' ).hide();
		$( '#popup-options' ).hide();
		$( '#popup-' + tab ).show();
	}

	async function changeLanguage( item ) {
		var newLang = item.getData();
		if ( backgroundPage.language === newLang ) {
			return;
		}

		switchTab( 'loading' );
		await backgroundPage.changeLanguage( newLang );
		switchTab( 'options' );
	}

	function waitWhileLoading() {
		console.log( 'loading' );
		if ( backgroundPage.state !== 'ready' ) {
			setTimeout( waitWhileLoading, 100 );
		} else {
			initOptions();
		}
	}
	waitWhileLoading()

})();
