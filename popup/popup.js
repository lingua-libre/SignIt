(async function() {
	var backgroundPage = await browser.runtime.getBackgroundPage();

	function initOptions() {
		/* Language picker */
		var i, languageDropdown,
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

		$( '#popup-options-languages' ).append( languageDropdown.$element );

		switchTab( 'options' );
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
