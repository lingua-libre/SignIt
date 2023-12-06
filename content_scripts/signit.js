( function () {
	var popup, $anchorModal, content;
	var hintIcon, $anchorHintIcon;
	//captureUserEvents();

	/* *********************************************************** */
	/* Global guard variable, prevents multi-runs **************** */
	if ( window.hasRun ) { return; }
	window.hasRun = true;
	
	/* *************************************************************** */
	/* BASE:Get selection text, coordinates, hintIcon coordinates **** */
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
		return text.trim();
	}

	function getSelectionCoords() {
		var rect,
			x = 0,
			y = 0,
			width = 0,
			height = 0,
			sel = window.getSelection(),
			range = sel.getRangeAt( 0 ).cloneRange(),
			rects = range.getClientRects(); // use range.getBoundingClientRect() ?

		if ( rects.length > 0 ) {
			rect = rects[ 0 ];
		}
		x = rect.left + window.scrollX;
		y = rect.top + window.scrollY;
		width = rect.right - rect.left;
		height = rect.bottom - rect.top;
		return { x: x, y: y, width: width, height: height };
	}

	var selectionToHintIconCoords = function (coords,shiftX,shiftY){
		console.log(coords);
		const iconX = coords.x + coords.width + shiftX;
		const iconY = coords.y - shiftY;
		return { x: iconX, y: iconY }
	}

	/* *************************************************************** */
	/* HintIcon: init, coords, toggle ******************************** */
	var hintIconElement = function(iconX=0,iconY=0){ 
		return `<img class="signit-hint-container signit-hint-icon" 
					style="left: ${iconX}px; top:${iconY}px; position: absolute; display:none;"
					title=""
					text="no b"
					src=${browser.runtime.getURL( 'icons/Lingualibre_SignIt-logo-no-text.svg')}
					></img>`
	}

	function initHintIconUI(word) {
		console.log("#73 initHintIconUI")
		if($('.signit-hint-container')[0]){ return; } // if element exists, don't create
		// If word exists: create, append, hide
		if(word.length > 0){
			var hintElement = hintIconElement(32,32); // top left corner, hidden via "display:none"
			$("body").append(hintElement);
		}
	}

	async function toggleHintIcon() {
		var isActive = Object.values( await browser.storage.local.get( 'hinticon' ) )[0]
		var selection = getSelectionText();
		$anchorHintIcon = $(".signit-hint-icon");
		if(isActive && selection && selection.toString().trim() != '') {
			// Update title, position, display
			$anchorHintIcon.attr("title", `Rechercher "${selection}"`);
			$anchorHintIcon.attr("text", selection);

			var selectionCoords = getSelectionCoords(),
				hintCoords = selectionToHintIconCoords(selectionCoords,0,25);
			repositionElement($anchorHintIcon,hintCoords);

			$anchorHintIcon.show();
		} else {
			$anchorHintIcon.hide();
		}
	}
	// Create hintIcon element
	initHintIconUI("_");
	// Add behavior to toggle hintIcon into appearing / disapearing
	//function captureUserEvents() {
		document.addEventListener("mouseup",toggleHintIcon);
		// document.addEventListener("click", click);
		// document.addEventListener("keydown", keyDown);
	//}

	/* *************************************************************** */
	/* Text coloring for available word-video pairs ****************** */
	var colorThoseWords = function(arr){
		words = arr.join('|');
		// Regex lookareound: https://regular-expressions.info/lookaround.html
		// Regex `negative lookbehind` and `negative lookahead`
		// Run it: https://regex101.com/r/NZ5LQZ/1
		var s = `(?<![<=#"'\`:;,./({[-])\\b(${words})\\b(?![>=#"'\`:)\]}-])`,
			r = new RegExp(s,'gi');
		console.log({r})
	
		$("p,li,h2,h3,a").each(function(){
			var text = $(this).html();
			$(this).html(text.replace(r, "<si class='signit-colored'>$1</si>"));
		});
	};
	var uncolorWords = function(){
		$(".signit-colored").each(function(){
			var $text = $(this).text();
			$(this).replaceWith($text);
		});
	};
	async function toggleColoredText(arr) {
		var coloredwords = await browser.storage.local.get( 'coloredwords'),
			isActive = Object.values( coloredwords  )[0],
			noColoredWords = $('.signit-colored').length == 0;
		console.log("toggleColoredText: ", isActive, noColoredWords, arr.length)
		if(isActive && noColoredWords && arr.length>0) {
			console.log("No colored text! Tag relevant words.")
			colorThoseWords(arr);
		}else if (!isActive && !noColoredWords) {
			uncolorWords();
		}
	}

	/* *************************************************************** */
	/* Toggle video panel ******************************************** */
	async function toggleVideoPanel(arr) {
		// @hugolpz's toggle video solution :
		console.log("before")
		var showvideoStatus = await browser.storage.local.get( 'showvideo' ); 
		showvideo = Object.values( showvideoStatus  )[0]
		console.log("after: showvideoStatus = ", showvideo)
		if(!showvideo) {
			$(".signit-panel-videos").toggle(showvideo);
		}
	}	

	/* *************************************************************** */
	/* Modal: init helped by SignItCoreContent *********************** */
	async function initModalUI() {
		console.log("before")
		var BetterBanana = await browser.storage.local.get( 'bananaInStore' );
		console.log("after: BetterBanana = ", BetterBanana.bananaInStore)

		content = new SignItCoreContent(BetterBanana.bananaInStore);

		// Setup an absolute-positionned $anchorModal we can programatically move
		// to be able to point exactly some coords with our popup later
		$anchorModal = $( '<div class="signit-popup-anchor">' );
		$( 'body' ).append( $anchorModal );

		// Create and add our popup to the DOM
		popup = new OO.ui.PopupWidget( {
			$content: content.getContainer(),
			padded: true,
			width: 850,
			$floatableContainer: $anchorModal,
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

	/* *************************************************************** */
	/* Refreshers: position, size, content *************************** */
	var repositionElement = function ($selector, coords ){
		// Move the element to the new coordinates
		$selector.css( 'top', coords.y );
		$selector.css( 'left', coords.x );
	}

	var resizeElement = function ($selector, coords ){
		$selector.css( 'width', coords.width );
		$selector.css( 'height', coords.height );
	}

	var refreshModal = function(message){
		// Hide the popup if it was still open for a previous request
		popup.toggle( false );
		content.refresh( message.text, message.files );
		toggleVideoPanel();
		popup.toggle( true );
		popup.toggleClipping( false );
	}

	/* *************************************************************** */
	/* Listen for messages from the background script. *************** */
	browser.runtime.onMessage.addListener( async function ( message ) {
		console.log("Message heard in signit.js: ", message, "---------------------" )

		// Modal generation or refresh
		if ( message.command === 'signit.sign' || message.command === 'signit.hinticon') {
			if ( popup === undefined ) { initModalUI(); }
			var coords = getSelectionCoords();
			repositionElement($anchorModal,coords);
			resizeElement($anchorModal,coords);
			refreshModal(message);
			toggleColoredText(message.supportedWords);
		} else if ( message.command === 'signit.getSelection' ) {
			return getSelectionText();
		}
	} );

	// Hint icon clicked sends message to the content script.
	var addHintIconEmit = function(){
		if(!$('.signit-hint-container')[0]){ console.log("No hintIcon element! Create one.") } 
		$(".signit-hint-container").on( "click", async function(){ 
			iconText = getSelectionText();
			// var tabs = await browser.tabs.query({active: true, currentWindow: true});
			// await checkActiveTabInjections( tabs[ 0 ].id );
			browser.runtime.sendMessage({
				command: "signit.hinticon",
				iconText: iconText
			});
		console.log("Message > Emited: hintIcon clicked ! --------------------------- ")
		})
	}

	addHintIconEmit();
}() );
