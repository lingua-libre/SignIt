$( async function () {
	var popup, anchor, content,
		currentIndex = 0;

	/**
	* Check and set a global guard variable.
	* If this content script is injected into the same page again,
	* it will do nothing next time.
	*/
	/*if ( window.hasRun ) {
		return;
	}
	window.hasRun = true;
*/

	param = await browser.storage.local.get( 'wpintegration' );
	if ( param.wpintegration === false ) {
		console.warn( 'wpintegration disabled' );
		return;
	}

	if ( $( 'body' ).hasClass( 'ns-0' ) !== true ) {
		console.warn( 'not in main namespace' );
		return;
	}

	title = $( 'h1.firstHeading' ).text();
	files = await browser.runtime.sendMessage({ 
		command: 'signit.getfiles', 
		wpTitle: title 
	});
	if ( files.length === 0 ) {
		console.warn( 'no files for this page' );
		return;
	}

	videoContainer = $( '<div class="signit-inline-container">' );
	videosGallery = new SignItVideosGallery( videoContainer );
	videosGallery.refresh( files );

	infobox = $( '.infobox, .infobox_v2, .infobox_v3' ).eq( 0 );
	if ( infobox.length === 0 ) {
		console.info( 'no infobox found' );
		$( '.mw-parser-output' ).eq( 0 ).prepend( videoContainer.addClass( 'thumb tright thumbinner' ) );
	} else if ( infobox.prop( 'tagName' ) === 'TABLE' ) { // enwiki infoboxes or frwiki infobox_v2
		console.info( 'table infobox' );
		infobox.find( 'tr' ).eq( 0 ).after( $( '<tr>' ).append( $( '<td colspan="2">' ).append( videoContainer ) ) );
	} else { // frwiki infobox_v3
		console.info( 'div infobox' );
		infobox.children( 'div' ).eq( 0 ).after( videoContainer );
	}

} );
