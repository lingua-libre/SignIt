// const { default: backgroundPage } = require("./background-script"); // to try

var SignItCoreContent = function () {
	console.log("SignItCoreContent.js")
	// console.log("banana",banana) // -> Uncaught (in promise) Error: banana is not defined
	// background.js not accessible natively
	// HOW TO IMPORT background.js and its banana i18n ?
	// See issue #21

	this.$container = $( `
		<div class="signit-popup-container">
			<h1></h1>
			<div class="signit-popup-content">
				<h2>Media:`+/* ${ banana.i18n("si-overlay-coreContent-left-title") } */`</h2>
				<div class="signit-panel-videos signit-novideo">
					Pas de video disponible.`+/* ${ banana.i18n("si-overlay-coreContent-left-novideo") } */`<br><br>
				</div>
				<div class="signit-panel-videos signit-video"></div>
				<div class="signit-panel-separator"></div>
				<h2>Definition:`+/* ${ banana.i18n("si-overlay-coreContent-right-title") } */`</h2>
				<div class="signit-panel-definition signit-definition">
					<div class="signit-definition-text"></div>
					<div class="signit-definition-source">
						<a href="https://fr`+/* ${ banana.i18n("si-overlay-coreContent-right-wikt-iso") } */`.wiktionary.org">voir sur Wiktionaire`+/* ${ banana.i18n("si-overlay-coreContent-right-wikt-pointer") } */`</a>
					</div>
				</div>
				<div class="signit-panel-definition signit-loading">
					<img class="signit-loading-spinner" src="${ browser.runtime.getURL( 'icons/Spinner_font_awesome.svg') }" width="40" height="40">
				</div>
				<div class="signit-panel-definition signit-error">Pas définition disponible.`+/* ${ banana.i18n("si-overlay-coreContent-right-error") } */`</div>
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

	this.$videosPanelNoVideo = this.$container.find( '.signit-novideo' ).append( this.contributeButton.$element );
	this.$videosPanelContent = this.$container.find( '.signit-video' );
	this.$videosPanelGallery = new SignItVideosGallery( this.$videosPanelContent );

	this.$definitionPanelContent = this.$container.find( '.signit-definition' );
	this.$definitionPanelText = this.$container.find( '.signit-definition-text' );
	this.$definitionPanelSource = this.$container.find( '.signit-definition-source a' );
	this.$definitionPanelSpinner = this.$container.find( '.signit-loading' );
	this.$definitionPanelError = this.$container.find( '.signit-error' );

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
		this.$videosPanelGallery.refresh( files );
		this.$videosPanelNoVideo.hide();
		this.$videosPanelContent.show();
	} else {
		this.$videosPanelContent.hide();
		this.$videosPanelNoVideo.show();
	}
};

SignItCoreContent.prototype.setWiktionaryContent = async function ( title ) {
	var content, $wiktSection, definition, result;//, definitionSource;

	this.$definitionPanelContent.hide();
	this.$definitionPanelError.hide();
	this.$definitionPanelSpinner.show();

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

		this.$definitionPanelSpinner.hide();
		this.$definitionPanelError.show();
		return;
	}

	// Parse the content of the WT entry
	// TODO: No FR section error
	content = $( result.parse.text );
	$wiktSection = content.find( "#Français" /* banana.i18n("si-overlay-coreContent-right-wikt-section-id") */ ).parent().next();
	definition = $wiktSection.find( '.titredef' ).parent().parent().nextUntil( 'h2, h3, h4' ).filter( 'p, ol' );

	this.$definitionPanelSource.attr( 'href', `https://fr.wiktionary.org/wiki/${ title }` );

	this.$definitionPanelText.html( definition );
	this.$definitionPanelSpinner.hide();
	this.$definitionPanelContent.show();
};

SignItCoreContent.prototype.getContainer = function () {
	return this.$container;
};