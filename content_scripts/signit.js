( function () {
	var popup, anchor, content;
	captureUserEvents();
	/**
	* Check and set a global guard variable.
	* If this content script is injected into the same page again,
	* it will do nothing next time.
	*/
	/* *********************************************************** */
	/* If already ran once: break ******************************** */
	if ( window.hasRun ) {
		return;
	}
	window.hasRun = true;


	
	/* *************************************************************** */
	/* Get selection coordinates, text ******************************* */
	function getSelectionCoords() {
		var rect,
			x = 0,
			y = 0,
			width = 0,
			height = 0,
			sel = window.getSelection(),
			range = sel.getRangeAt( 0 ).cloneRange(),
			rects = range.getClientRects(); // use ange.getBoundingClientRect() ?

		if ( rects.length > 0 ) {
			rect = rects[ 0 ];
		}
		x = rect.left + window.scrollX;
		y = rect.top + window.scrollY;
		width = rect.right - rect.left;
		height = rect.bottom - rect.top;
		return { x: x, y: y, width: width, height: height };
	}

	function getSelectionText() {
		var text = '',
			activeEl = document.activeElement,
			activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
		if ( ( activeElTagName === 'textarea' ) 
			|| ( activeElTagName === 'input' 
				&&	/^(?:text|search|password|tel|url)$/i.test( activeEl.type ) ) 
				&&	( typeof activeEl.selectionStart === 'number' )
		) {
			text = activeEl.value.slice( activeEl.selectionStart, activeEl.selectionEnd );
		} else if ( window.getSelection ) {
			text = window.getSelection().toString();
		}
		return text;
	}
	

	/* *************************************************************** */
	/* Mini icon show ************************************************ */
	var iconHintElement = function(word,iconX,iconY){ 
		return `
			<div class="signit-hint-container"
				style="left: ${iconX}px; top:${iconY}px; position: absolute;">
				<img class="signit-hint-icon" 
					title='Rechercher "${word}"' 
					src="">
				</img>
			</div>`
	}
	var iconHintCoords = function (coords,shiftX,shiftY){
		console.log(coords);
		const iconX = coords.x + coords.width + window.scrollX + shiftX;
		const iconY = coords.y + window.scrollY - shiftY;
		return { x: iconX, y: iconY }
	}

	function showHintIcon(word) {
		console.log("#74 show")
		if(word.length > 0){

			// Clean before action;
			$('.signit-hint-container').remove();
			// Position, creation, injection
			var wordCoords = getSelectionCoords(),
				hintCoords = iconHintCoords(wordCoords,0,25),
				hintElement = iconHintElement(word,hintCoords.x,hintCoords.y);
			$("body").append(hintElement);

			$(".signit-hint-container").on( "click", function(){ 
				console.log("#89");
				/* 
				var tabs = await browser.tabs.query( { active: true, currentWindow: true } );
				// word = normalize( info.selectionText );
				// await checkInjection( tabs[ 0 ].id );
				console.log("#104", tabs[0].id)
				browser.tabs.sendMessage( tabs[ 0 ].id, {
					command: "signit.hinticon",
					selection: word,
					files: wordToFiles( word ),
				} );  
				*/
			})

		}
	}
	function hideHintIcon() {
		console.log("#103 hide")
		$('.signit-hint-container').remove();
	}
	function mouseUp(e) {
		console.log("#107 mouseup",e)
		var selection = getSelectionText();
		console.log("#110 text",selection)
		if(selection && selection.toString().trim() != '') {
		// addWord(t)
		showHintIcon(selection) 
		} else hideHintIcon();
	}

	function captureUserEvents() {
		document.addEventListener("mouseup",mouseUp);
		// document.addEventListener("click", click);
		// document.addEventListener("keydown", keyDown);
	}

	/*
	 * Initialisation of the UI
	 */
	function initModalUI() {
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

	var refreshModal = function(message){
		// Hide the popup if it was still open for a previous request
		popup.toggle( false );

		// Move the anchor to the new coordinates
		var coords;
		coords = getSelectionCoords();
		anchor.css( 'top', coords.y );
		anchor.css( 'left', coords.x );
		anchor.css( 'width', coords.width );
		anchor.css( 'height', coords.height );

		content.refresh( message.selection, message.files );

		popup.toggle( true );
		popup.toggleClipping( false );
	}
	/**
	* Listen for messages from the background script.
	*/
	browser.runtime.onMessage.addListener( async function ( message ) {
		if ( message.command === 'signit.sign' || message.command === 'signit.hinticon' ) {
			if ( popup === undefined ) { initModalUI(); }
			refreshModal(message);
		} else if ( message.command === 'signit.getSelection' ) {
			return getSelectionText();
		}
	} );

}() );
