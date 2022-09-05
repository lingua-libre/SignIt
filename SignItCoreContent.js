// const { default: backgroundPage } = require("./background-script"); // to try

var SignItCoreContent = function () {
	console.log("SignItCore 1")
	// console.log("banana",banana) // -> Uncaught (in promise) Error: banana is not defined
	// background.js not accessible natively
	// HOW TO IMPORT background.js and its banana i18n ?
	// See issue #21

	this.$container = $( `
		<div class="signit-popup-container">
			<h1></h1>
			<div class="signit-popup-content">
				<h2>Media:`+/* ${ banana.i18n("si-overlay-coreContent-left-title") } */`</h2>
				<div class="signit-popup-leftpanel signit-novideo">
					Pas de video disponible.`+/* ${ banana.i18n("si-overlay-coreContent-left-novideo") } */`<br><br>
				</div>
				<div class="signit-popup-leftpanel signit-video"></div>
				<div class="signit-popup-separator"></div>
				<h2>Definition:`+/* ${ banana.i18n("si-overlay-coreContent-right-title") } */`</h2>
				<div class="signit-popup-rightpanel signit-definition">
					<div class="signit-definition-text"></div>
					<div class="signit-definition-source">
						<a href="https://fr`+/* ${ banana.i18n("si-overlay-coreContent-right-wikt-iso") } */`.wiktionary.org">voir sur Wiktionaire`+/* ${ banana.i18n("si-overlay-coreContent-right-wikt-pointer") } */`</a>
					</div>
				</div>
				<div class="signit-popup-rightpanel signit-loading">
					<img class="signit-loading-spinner" src="${ browser.runtime.getURL( 'icons/Spinner_font_awesome.svg') }" width="40" height="40">
				</div>
				<div class="signit-popup-rightpanel signit-error">Pas définition disponible.`+/* ${ banana.i18n("si-overlay-coreContent-right-error") } */`</div>
			</div>
		</div>
	`);
	var optionsContribute = { 
		flags: [ 'primary', 'progressive' ], 
		label: "Contributer en LSF" /* banana.i18n("si-overlay-coreContent-left-contribute-label") */,
		href: 'https://lingualibre.org/wiki/Special:RecordWizard'
	};
	this.contributeButton = new OO.ui.ButtonWidget( optionsContribute );

	this.$title = this.$container.children( 'h1' );
	this.$wtdef = this.$container.find( '.signit-definition-text' );
	this.$wtsource = this.$container.find( '.signit-definition-source a' );
	this.$leftPanelNoVideo = this.$container.find( '.signit-novideo' ).append( this.contributeButton.$element );
	this.$leftPanelContent = this.$container.find( '.signit-video' );
	this.$rightPanelContent = this.$container.find( '.signit-definition' );
	this.$rightPanelSpinner = this.$container.find( '.signit-loading' );
	this.$rightPanelError = this.$container.find( '.signit-error' );

	this.videosGallery = new SignItVideosGallery( this.$leftPanelContent );

	// this.contributeButton.on( 'click', function () {
	//	// TODO: Do something
	// }.bind( this ) );
};

SignItCoreContent.prototype.refresh = function ( title, files ) {
	files = files || [];
	this.$title.text( title );
	// Definition panel
	this.setWiktionaryContent( title );
	// Media panel
	if ( files.length > 0 ) {
		this.videosGallery.refresh( files );
		this.$leftPanelNoVideo.hide();
		this.$leftPanelContent.show();
	} else {
		this.$leftPanelContent.hide();
		this.$leftPanelNoVideo.show();
	}
};

SignItCoreContent.prototype.setWiktionaryContent = async function ( title ) {
	var content, $wiktSection, definition, result;//, wtsource;

	this.$rightPanelContent.hide();
	this.$rightPanelError.hide();
	this.$rightPanelSpinner.show();

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

	// Parse the content of the WT entry
	// TODO: No FR section error
	content = $( result.parse.text );
	$wiktSection = content.find( "#Français" /* banana.i18n("si-overlay-coreContent-right-wikt-section-id") */ ).parent().next();
	definition = $wiktSection.find( '.titredef' ).parent().parent().nextUntil( 'h2, h3, h4' ).filter( 'p, ol' );

	this.$wtsource.attr( 'href', `https://fr.wiktionary.org/wiki/${ title }` );

	this.$wtdef.html( definition );
	this.$rightPanelSpinner.hide();
	this.$rightPanelContent.show();
};

SignItCoreContent.prototype.getContainer = function () {
	return this.$container;
};