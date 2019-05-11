var SignItCoreContent = function () {
	this.$container = $( `
		<div class="signit-popup-container">
			<h1></h1>
			<div class="signit-popup-content">
				<h2>Médias :</h2>
				<div class="signit-popup-leftpanel signit-popup-leftpanel-novideo">
					Ce mot n'a pas encore été enregistré.<br>Mais SignIt est un projet participatif, auquel vous pouvez participer.<br><br>
				</div>
				<div class="signit-popup-leftpanel signit-popup-leftpanel-video">
				</div>
				<div class="signit-popup-separator"></div>
				<h2>Définitions :</h2>
				<div class="signit-popup-rightpanel signit-wt">
					<div class="signit-wtdef"></div>
					<div class="signit-wtsource">
						<a href="https://fr.wiktionary.org">voir sur le Wiktionnaire</a>
					</div>
				</div>
				<div class="popup-loading signit-popup-rightpanel">
					<img class="popup-loading-spinner" src="${ browser.extension.getURL( 'icons/Spinner_font_awesome.svg' ) }" width="40" height="40">
				</div>
				<div class="signit-popup-rightpanel signit-error">Aucune définition n'a été trouvée.</div>
			</div>
		</div>
	` );

	this.contributeButton = new OO.ui.ButtonWidget( { label: 'Contribuer !', flags: [ 'primary', 'progressive' ] } );

	this.$title = this.$container.children( 'h1' );
	this.$wtdef = this.$container.find( '.signit-wtdef' );
	this.$wtsource = this.$container.find( '.signit-wtsource a' );
	this.$leftPanelNoVideo = this.$container.find( '.signit-popup-leftpanel-novideo' ).append( this.contributeButton.$element );
	this.$leftPanelContent = this.$container.find( '.signit-popup-leftpanel-video' );
	this.$rightPanelContent = this.$container.find( '.signit-wt' );
	this.$rightPanelSpinner = this.$container.find( '.popup-loading' );
	this.$rightPanelError = this.$container.find( '.signit-error' );

	this.videosGallery = new SignItVideosGallery( this.$leftPanelContent );

	this.contributeButton.on( 'click', function () {
		// TODO: Do something
	}.bind( this ) );
};

SignItCoreContent.prototype.refresh = function ( title, files ) {
	var i;
	files = files || [];

	this.setWiktionaryContent( title );

	this.$title.text( title );
	this.videosGallery.refresh( files );

	if ( files.length > 0 ) {
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

	// Parse the content of the WT entry
	// TODO: No FR section error
	content = $( result.parse.text );
	frsection = content.find( '#Français' ).parent().next();
	definition = frsection.find( '.titredef' ).parent().parent().nextUntil( 'h2, h3, h4' ).filter( 'p, ol' );

	this.$wtsource.attr( 'href', `https://fr.wiktionary.org/wiki/${ title }` );

	this.$wtdef.html( definition );
	this.$rightPanelSpinner.hide();
	this.$rightPanelContent.show();
};

SignItCoreContent.prototype.getContainer = function ( visible ) {
	return this.$container;
};
