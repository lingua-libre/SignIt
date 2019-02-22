(function() {
	var popup, popupAnchor, popupContainer, popupNoVideo, popupContent, popupVideo, popupTitle;

	/**
	* Check and set a global guard variable.
	* If this content script is injected into the same page again,
	* it will do nothing next time.
	*/
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	/**
	*
	*/
	function getSelectionCoords() {
		var x = 0, y = 0;
		sel = window.getSelection();
		range = sel.getRangeAt(0).cloneRange();
		//range.collapse(true);
		rects = range.getClientRects();
		if (rects.length > 0) {
			rect = rects[0];
		}
		x = rect.left + ( (rect.right - rect.left) / 2 ) + window.scrollX;
		y = rect.top + window.scrollY;
		return { x: x, y: y };
	}

	function movePopup() {
		var coords = getSelectionCoords();

		popupAnchor.css( 'top', coords.y )
		popupAnchor.css( 'left', coords.x )

		popup.position();
	}

	async function getVideoUrl( word ) {
		var title,
			members,
			result = await $.post('https://commons.wikimedia.org/w/api.php', {
				"action": "query",
				"format": "json",
				"list": "categorymembers",
				"cmtitle": "Category:Videos Langue des signes française",
				"cmprop": "title",
				"cmtype": "file",
				"cmlimit": "1",
				"cmstartsortkeyprefix": word,
				"origin": "*"
			});
		console.log( result );
		members = result.query.categorymembers;
		if ( members.length === 0 ) {
			return null;
		}

		title = members[ 0 ].title.toLowerCase().replace( /_/g, ' ' );
		if ( title.lastIndexOf( word.toLowerCase(), 5) === -1 ) {
			return null;
		}

		return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + members[ 0 ].title;
	}

	function setVideoToPopup( title, url ) {
		popupTitle.text( title );
		popupVideo.attr( 'src', url );
		popupNoVideo.hide();
		popupContent.show();
		popupVideo[ 0 ].play();
	}

	function setContributeToPopup( title ) {
		popupTitle.text( title );
		popupContent.hide();
		popupNoVideo.show();
	}

	function initializePopup() {
		popupAnchor = $( '<div>' );
		popupAnchor.css( 'position', 'absolute' )
		$( 'body' ).append( popupAnchor );

		popupTitle = $( '<h1>' );
		popupTitle.css( 'margin-bottom', '0.6em' );
		popupTitle.css( 'font-size', '188%' );
		popupTitle.css( 'color', 'black' );
		popupTitle.css( 'padding-top', '0.5em' );
		popupTitle.css( 'padding-bottom', '0.17em' );
		popupTitle.css( 'border-bottom', '1px solid #a2a9b1' );

		popupVideo = $( '<video width="420" controls muted>' );
		popupContent = $( '<div>' ).append( popupVideo );

		popupNoVideo = $( '<div>' ).html( 'Ce mot n\'a pas encore été enregistré.<br>Mais SignIt est un projet participatif, auquel vous pouvez participer.<br><br>' );
		var button = new OO.ui.ButtonWidget( { label: 'Contribuer !', flags: [ 'primary', 'progressive' ] } );
		popupNoVideo.append( button.$element );

		popupContainer = $( '<div>' ).append( popupTitle ).append( popupContent ).append( popupNoVideo );
		popupContainer.css( 'text-align', 'center' );

		popup = new OO.ui.PopupWidget( {
			$content: popupContainer,
			padded: true,
			width: '450px',
			$floatableContainer: popupAnchor,
			position: 'above',
			align: 'center',
			autoClose: true,
			$container: $( 'body' )
		} );
		$( 'body' ).append( popup.$element );
	}

	/**
	* Listen for messages from the background script.
	*/
	browser.runtime.onMessage.addListener( async function (message) {
		if (message.command === "signit.sign") {
			if( popup === undefined ) {
				initializePopup();
			}
			popup.toggle( false );

			movePopup();

			console.log( message.urls );
			if( message.urls !== null ) {
				setVideoToPopup( message.selection, message.urls[ 0 ] ); //TODO: support several videos
			} else {
				setContributeToPopup( message.selection );
			}

			popup.toggle( true );
		}
	} );

})();
