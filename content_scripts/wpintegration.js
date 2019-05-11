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
	files = await browser.runtime.sendMessage( { command: 'signit.getfiles', word: title } );
	if ( files.length === 0 ) {
		console.warn( 'no files for this page' );
		return;
	}

	videoContainer = $( '<div class="signit-inline-container">' );
	videos = [];
	for ( i = 0; i < files.length; i++ ) {
		videos.push( $( `
			<div style="display: none;">
				<video controls="" muted="" preload="auto" src="${ files[ i ].filename }" width="335"></video>
				par <a href="https://commons.wikimedia.org/wiki/File:${ files[ i ].filename.split( '/' ).pop() }">${ files[ i ].speaker }</a> – Vidéo ${ i + 1 } sur ${ files.length }
			</div>
		` ) );
		videoContainer.append( videos[ i ] );
	}
	previousVideoButton = new OO.ui.ButtonWidget( { icon: 'previous', framed: false } );
	nextVideoButton = new OO.ui.ButtonWidget( { icon: 'next', framed: false } );
	previousVideoButton.on( 'click', function () {
		switchVideo( currentIndex - 1 );
	} );
	nextVideoButton.on( 'click', function () {
		switchVideo( currentIndex + 1 );
	} );
	videoContainer.prepend( previousVideoButton.$element ).append( nextVideoButton.$element );

	function switchVideo ( newIndex ) {
		videos[ currentIndex ].hide();
		currentIndex = newIndex;
		videos[ currentIndex ].show();
		videos[ currentIndex ].children( 'video' )[ 0 ].play();

		if ( currentIndex === 0 ) {
			previousVideoButton.setDisabled( true );
		} else {
			previousVideoButton.setDisabled( false );
		}

		if ( currentIndex >= videos.length - 1 ) {
			nextVideoButton.setDisabled( true );
		} else {
			nextVideoButton.setDisabled( false );
		}
	};

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
	switchVideo ( 0 );

} );
