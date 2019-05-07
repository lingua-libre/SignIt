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
		this.$content = $( '<div>' ).addClass( 'signit-popup-content' ).append( this.$leftPanelNoVideo ).append( this.$leftPanelContent ).append( this.$contentSeparator ).append( this.$rightPanelContent );

		this.$container = $( '<div>' ).append( this.$title ).append( this.$content );
		this.$container.css( 'text-align', 'center' );

		this.popup = new OO.ui.PopupWidget( {
			$content: this.$container,
			padded: true,
			width: '800px',
			$floatableContainer: this.$anchor,
			position: 'above',
			align: 'center',
			autoClose: true,
			$container: $( 'body' ),
			classes: [ 'signit-popup' ]
		} );
		$( 'body' ).append( this.popup.$element );
	};

	SignItPopup.prototype.move = function () {
		var coords = getSelectionCoords();

		this.$anchor.css( 'top', coords.y );
		this.$anchor.css( 'left', coords.x );

		this.popup.position();
	};

	SignItPopup.prototype.refresh = function ( title, urls ) {
		var i;
		urls = urls || [];
		this.$videos = [];

		this.$title.text( title );
		this.$videoContainer.empty();

		for ( i = 0; i < urls.length; i++ ) {
			this.$videos.push( $( '<video controls="" muted="" preload="auto" width="420">' ).attr( 'src', urls[ i ] ).hide() );
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
		this.$videos[ this.currentIndex ][ 0 ].play();

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

	SignItPopup.prototype.toggle = function ( visible ) {
		this.popup.toggle( visible );
	};

	/**
	* Listen for messages from the background script.
	*/
	browser.runtime.onMessage.addListener( function ( message ) {
		if ( message.command === 'signit.sign' ) {
			console.log( message.urls );
			if ( popup === undefined ) {
				popup = new SignItPopup();
			}

			popup.toggle( false );

			popup.move();
			popup.refresh( message.selection, message.urls );

			popup.toggle( true );
		}
	} );

}() );
