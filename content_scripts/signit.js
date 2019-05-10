( function () {
	var popup, anchor, content;

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

	function getSelectionText() {
		var text = '',
			activeEl = document.activeElement,
			activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
		if (
			( activeElTagName === 'textarea' ) || ( activeElTagName === 'input' &&
			/^(?:text|search|password|tel|url)$/i.test( activeEl.type ) ) &&
			( typeof activeEl.selectionStart === 'number' )
		) {
			text = activeEl.value.slice( activeEl.selectionStart, activeEl.selectionEnd );
		} else if ( window.getSelection ) {
			text = window.getSelection().toString();
		}
		return text;
	}

	/*
	 * Initialisation of the UI
	 */
	function initUI() {
		content = new SignItCoreContent();

		// Setup an absolute-positionned anchor we can programatically move
		// to be able to point exactly some coords with our popup later
		anchor = $( '<div class="signit-popup-anchor">' );
		$( 'body' ).append( anchor );

		// Create and add our popup to the DOM
		popup = new OO.ui.PopupWidget( {
			$content: content.getContainer(),
			padded: true,
			width: 850,
			$floatableContainer: anchor,
			position: 'above',
			align: 'center',
			autoClose: true,
			autoFlip: true,
			hideWhenOutOfView: false,
			$container: $( 'body' ),
			classes: [ 'signit-popup' ]
		} );
		$( 'body' ).append( popup.$element );
	}

	/**
	* Listen for messages from the background script.
	*/
	browser.runtime.onMessage.addListener( async function ( message ) {
		var coords;

		if ( message.command === 'signit.sign' ) {
			if ( popup === undefined ) {
				initUI();
			}

			// Hide the popup if it was still open for a previous request
			popup.toggle( false );

			// Move the anchor to the new coordinates
			coords = getSelectionCoords();
			anchor.css( 'top', coords.y );
			anchor.css( 'left', coords.x );

			content.refresh( message.selection, message.files );

			popup.toggle( true );
			popup.toggleClipping( false );
		} else if ( message.command === 'signit.getSelection' ) {
			return getSelectionText();
		}
	} );

}() );
