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

	var selectionToHintIconCoords = function (coords,shiftX,shiftY,positionData){
		console.log(coords);
		console.log(positionData);
		const iconX = coords.x + coords.width + shiftX;
		const iconY = coords.y - shiftY ;
		var HintShift=0
		if(positionData=='bottom'){
			HintShift=32
		}
		return { x: iconX, y: iconY + HintShift }
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
		var positiondata= await browser.storage.local.get('position')
		var selection = getSelectionText();
		$anchorHintIcon = $(".signit-hint-icon");
		if(isActive && selection && selection.toString().trim() != '') {
			// Update title, position, display
			$anchorHintIcon.attr("title", `Rechercher "${selection}"`);
			$anchorHintIcon.attr("text", selection);
             console.log('Function toggle Hint icon executed',positiondata.position);
			var selectionCoords = getSelectionCoords(),
				hintCoords = selectionToHintIconCoords(selectionCoords,0,25,positiondata.position);
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
	async function showPanels() {
		var activePanels = await browser.storage.local.get( 'choosepanels' ); 
		activepanels = Object.values( activePanels)[0];
		console.log('toggle: ', activePanels, activepanels )
		$(".signit-modal-content > *").hide();
		$(".signit-modal-content > .signit-panel-videos").toggle(activepanels == 'definition'?false:true);
		$(".signit-modal-content > .signit-panel-separator").toggle(activepanels == 'both'?true:false);
		$(".signit-modal-content > .signit-panel-definitions").toggle(activepanels == 'video'? false:true);
	}

	/* *************************************************************** */
	/* Modal: init helped by SignItCoreContent *********************** */
	async function initModalUI() {

		// Banana test, search `bananaInStore` in files for more
		console.log("before")
		content = new SignItCoreContent();
		content.init();

		// Setup an absolute-positionned $anchorModal we can programatically move
		// to be able to point exactly some coords with our popup later
		$anchorModal = $( '<div class="signit-modal-anchor">' );
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
			classes: [ 'signit-modal' ]
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
		$selector.css( 'width', coords.width  );
		$selector.css( 'height', coords.height );
	}
	// SignIt modal width depends on number of active panels
	var signItModalWidth  = async function(){
		var activepanels = Object.values( await browser.storage.local.get( 'choosepanels' ) )[0];
		var numberOfPanels = activepanels == 'both' ? 2:1;
		return numberOfPanels==2? 850:450;
	}

	var refreshModal = function(message){
		// Hide the popup if still open from a previous request
		popup.toggle( false );
		// refresh with new content, panels check, width.
		content.refresh( message.text, message.files );
		showPanels();
		$( 'signit-modal').css( 'width', signItModalWidth() );
		// Show again
		popup.toggle( true );
		popup.toggleClipping( false );
	}

	/* *************************************************************** */
	/* Listen for messages from the background script. *************** */
	browser.runtime.onMessage.addListener( async function ( message ) {
		console.log("Message heard in signit.js: ", message, "---------------------" )

		// Modal generation or refresh
		if ( message.command === 'signit.sign' || message.command === 'signit.hinticon') {
			// initialising modal everytime not only when popup is undefined ,
			// by this we won't have to reload the web page everytime 
			initModalUI(); 
			
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
			var iconText = getSelectionText();
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
