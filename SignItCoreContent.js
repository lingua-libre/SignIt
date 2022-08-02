var SignItCoreContent = function () {
	this.$container = $( `
		<div class="signit-popup-container">
			<h1></h1>
			<div class="signit-popup-content">
				<h2>${ banana.i18n("si-overlay-coreContent-left-title") }</h2>
				<div class="signit-popup-leftpanel signit-popup-leftpanel-novideo">
					${ banana.i18n("si-overlay-coreContent-left-novideo") }<br><br>
				</div>
				<div class="signit-popup-leftpanel signit-popup-leftpanel-video"></div>
				<div class="signit-popup-separator"></div>
				<h2>${ banana.i18n("si-overlay-coreContent-right-title") }</h2>
				<div class="signit-popup-rightpanel signit-wt">
					<div class="signit-wtdef"></div>
					<div class="signit-wtsource">
						<a href="https://${ banana.i18n("si-overlay-coreContent-right-wikt-iso") }.wiktionary.org">${ banana.i18n("si-overlay-coreContent-right-wikt-pointer") }</a>
					</div>
				</div>
				<div class="popup-loading signit-popup-rightpanel">
					<img class="popup-loading-spinner" src="${ browser.runtime.getURL( 'icons/Spinner_font_awesome.svg') }" width="40" height="40">
				</div>
				<div class="signit-popup-rightpanel signit-error">${ banana.i18n("si-overlay-coreContent-right-error") }</div>
			</div>
		</div>
	`);
	var optionsContribute = { 
		flags: [ 'primary', 'progressive' ], 
		label: banana.i18n("si-overlay-coreContent-left-contribute-label"),
		href: 'https://lingualibre.org/wiki/Special:RecordWizard'
	};
	this.contributeButton = new OO.ui.ButtonWidget( optionsContribute );

	this.$title = this.$container.children( 'h1' );
	this.$wtdef = this.$container.find( '.signit-wtdef' );
	this.$wtsource = this.$container.find( '.signit-wtsource a' );
	this.$leftPanelNoVideo = this.$container.find( '.signit-popup-leftpanel-novideo' ).append( this.contributeButton.$element );
	this.$leftPanelContent = this.$container.find( '.signit-popup-leftpanel-video' );
	this.$rightPanelContent = this.$container.find( '.signit-wt' );
	this.$rightPanelSpinner = this.$container.find( '.popup-loading' );
	this.$rightPanelError = this.$container.find( '.signit-error' );

	this.videosGallery = new SignItVideosGallery( this.$leftPanelContent );

	// this.contributeButton.on( 'click', function () {
	//	// TODO: Do something
	// }.bind( this ) );
};

SignItCoreContent.prototype.refresh = function ( title, files ) {
	var i;
	files = files || [];

	this.setWiktionaryContent( title );

	this.$title.text( title );

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
	var content, frsection, definition, result, wtsource;

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
	frsection = content.find( banana.i18n("si-overlay-coreContent-right-wikt-section-id") ).parent().next();
	definition = frsection.find( '.titredef' ).parent().parent().nextUntil( 'h2, h3, h4' ).filter( 'p, ol' );

	this.$wtsource.attr( 'href', `https://${banana.i18n("si-overlay-coreContent-right-wikt-iso")}.wiktionary.org/wiki/${ title }` );

	this.$wtdef.html( definition );
	this.$rightPanelSpinner.hide();
	this.$rightPanelContent.show();
};

SignItCoreContent.prototype.getContainer = function ( visible ) {
	return this.$container;
};
