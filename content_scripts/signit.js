( function () {
	var SignItPopup, popup;

	/**
	* Check and set a global guard variable.
	* If this content script is injected into the same page again,
	* it will do nothing next time.
	*/
	if ( window.hasRun ) {
		return;
	}
	window.hasRun = true;

	function getSelectionCoords() {
		var rect,
			x = 0,
			y = 0,
			sel = window.getSelection(),
			range = sel.getRangeAt( 0 ).cloneRange(),
			rects = range.getClientRects();
		if ( rects.length > 0 ) {
			rect = rects[ 0 ];
		}
		x = rect.left + ( ( rect.right - rect.left ) / 2 ) + window.scrollX;
		y = rect.top + window.scrollY;
		return { x: x, y: y };
	}

	SignItPopup = function () {
		var contributeButton;

		this.videos = [];
		this.currentIndex = 0;

		this.$anchor = $( '<div>' ).addClass( 'signit-popup-anchor' );
		$( 'body' ).append( this.$anchor );

		this.$title = $( '<h1>' );
		this.$videoContainer = $( '<div>' );

		this.$leftPanelNoVideo = $( '<div>' ).addClass( 'signit-popup-leftpanel' ).html( 'Ce mot n\'a pas encore été enregistré.<br>Mais SignIt est un projet participatif, auquel vous pouvez participer.<br><br>' );
		contributeButton = new OO.ui.ButtonWidget( { label: 'Contribuer !', flags: [ 'primary', 'progressive' ] } );
		this.$leftPanelNoVideo.append( contributeButton.$element );

		this.$rightPanelSpinner = $( '<div class="popup-loading signit-popup-rightpanel"><img class="popup-loading-spinner" src="' + browser.extension.getURL( 'icons/Spinner_font_awesome.svg' ) + '" width="40" height="40"></div>' ).hide();
		this.$rightPanelError = $( '<div>' ).addClass( 'signit-popup-rightpanel' ).html( 'Aucune définition n\'a été trouvée.' ).hide();


		this.previousVideoButton = new OO.ui.ButtonWidget( { icon: 'previous', framed: false } );
		this.nextVideoButton = new OO.ui.ButtonWidget( { icon: 'next', framed: false } );
		this.previousVideoButton.on( 'click', function () {
			this.switchVideo( this.currentIndex - 1 );
		}.bind( this ) );
		this.nextVideoButton.on( 'click', function () {
			this.switchVideo( this.currentIndex + 1 );
		}.bind( this ) );

		this.$leftPanelContent = $( '<div>' ).addClass( 'signit-popup-leftpanel' ).addClass( 'signit-popup-leftpanel-video' ).append( this.previousVideoButton.$element ).append( this.$videoContainer ).append( this.nextVideoButton.$element );
		this.$contentSeparator = $( '<div>' ).addClass( 'signit-popup-separator' );
		this.$rightPanelContent = $( '<div>' ).addClass( 'signit-popup-rightpanel' );
		this.$content = $( '<div>' ).addClass( 'signit-popup-content' ).append( this.$leftPanelNoVideo ).append( this.$leftPanelContent ).append( this.$contentSeparator ).append( this.$rightPanelContent ).append( this.$rightPanelSpinner ).append( this.$rightPanelError );

		this.$container = $( '<div>' ).append( this.$title ).append( this.$content );
		this.$container.css( 'text-align', 'center' );

		this.popup = new OO.ui.PopupWidget( {
			$content: this.$container,
			padded: true,
			width: 850,
			$floatableContainer: this.$anchor,
			position: 'above',
			align: 'center',
			autoClose: true,
			autoFlip: true,
			hideWhenOutOfView: false,
			$container: $( 'body' ),
			classes: [ 'signit-popup' ]
		} );
		$( 'body' ).append( this.popup.$element );
	};

	SignItPopup.prototype.move = function () {
		var coords = getSelectionCoords();

		this.$anchor.css( 'top', coords.y );
		this.$anchor.css( 'left', coords.x );
	};

	SignItPopup.prototype.refresh = function ( title, files ) {
		var i;
		files = files || [];
		this.$videos = [];

		this.setWiktionaryContent( title );

		this.$title.text( title );
		this.$videoContainer.empty();

		for ( i = 0; i < files.length; i++ ) {
			this.$videos.push( $( '<div>' ).html( 'par ' + files[ i ].speaker + '<br>Vidéo ' + ( i + 1 ) + ' sur ' + files.length + ' - <a href="https://commons.wikimedia.org/wiki/File:' + files[ i ].filename.split( '/' ).pop() + '">voir sur WM Commons</a>' ).prepend( $( '<video controls="" muted="" preload="auto" width="335">' ).attr( 'src', files[ i ].filename ) ).hide() );
			this.$videoContainer.append( this.$videos[ i ] );
		}

		if ( this.$videos.length > 0 ) {
			this.$leftPanelNoVideo.hide();
			this.$leftPanelContent.show();
			this.switchVideo( 0 );
		} else {
			this.$leftPanelContent.hide();
			this.$leftPanelNoVideo.show();
		}
	};

	SignItPopup.prototype.switchVideo = function ( newIndex ) {
		this.$videos[ this.currentIndex ].hide();
		this.currentIndex = newIndex;
		this.$videos[ this.currentIndex ].show();
		this.$videos[ this.currentIndex ].children( 'video' )[ 0 ].play();

		if ( this.currentIndex === 0 ) {
			this.previousVideoButton.setDisabled( true );
		} else {
			this.previousVideoButton.setDisabled( false );
		}

		if ( this.currentIndex >= this.$videos.length - 1 ) {
			this.nextVideoButton.setDisabled( true );
		} else {
			this.nextVideoButton.setDisabled( false );
		}
	};

	SignItPopup.prototype.setWiktionaryContent = async function ( title ) {
		var content, frsection, definition, result;

		this.$rightPanelContent.hide();
		this.$rightPanelError.hide();
		this.$rightPanelSpinner.show();

		console.log( 'tty' );
		try {
			result = await $.post( 'https://fr.wiktionary.org/w/api.php', {
				"action": "parse",
				"format": "json",
				"page": title,
				"prop": "text",
				"disableeditsection": 1,
				"disabletoc": 1,
				"mobileformat": 1,
				"noimages": 1,
				"formatversion": "2"
			} );
		} catch (error) {
			result = { error: { code: error } };
		}

		// Error managment
		if ( result.error !== undefined ) {
			if ( result.error.code === 'missingtitle' && title.toLowerCase() !== title ) {
				return this.setWiktionaryContent( title.toLowerCase() );
			}

			this.$rightPanelSpinner.hide();
			this.$rightPanelError.show();
			return;
		}

		content = $( result.parse.text );
		frsection = content.find( '#Français' ).parent().next();
		definition = frsection.find( '.titredef' ).parent().parent().nextUntil( 'h2, h3, h4' ).filter( 'p, ol' );

		this.$rightPanelContent.html( definition );
		this.$rightPanelSpinner.hide();
		this.$rightPanelContent.show();
	};

	SignItPopup.prototype.toggle = function ( visible ) {
		this.popup.toggle( visible );
		if ( visible ) {
			// The clipping behaviour of the popup is not wanted, and brings strange edge-clases
			// We have to disable it each time the popup is turned on
			this.popup.toggleClipping( false );
		}
	};

	/**
	* Listen for messages from the background script.
	*/
	browser.runtime.onMessage.addListener( function ( message ) {
		if ( message.command === 'signit.sign' ) {
			if ( popup === undefined ) {
				popup = new SignItPopup();
			}

			popup.toggle( false );

			popup.move();
			popup.refresh( message.selection, message.files );

			popup.toggle( true );
		}
	} );

}() );
