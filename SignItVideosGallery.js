var SignItVideosGallery = function ( container ) {
	this.videos = [];
	this.currentIndex = 0;

	this.previousVideoButton = new OO.ui.ButtonWidget( { icon: 'previous', framed: false } );
	this.nextVideoButton = new OO.ui.ButtonWidget( { icon: 'next', framed: false } );
	this.$videoContainer = $( '<div class="signit-videogallery">' );

	container.append( this.previousVideoButton.$element ).append( this.$videoContainer ).append( this.nextVideoButton.$element );

	this.previousVideoButton.on( 'click', function () {
		this.switchVideo( this.currentIndex - 1 );
	}.bind( this ) );
	this.nextVideoButton.on( 'click', function () {
		this.switchVideo( this.currentIndex + 1 );
	}.bind( this ) );
};

SignItVideosGallery.prototype.refresh = function ( files ) {
	var i;
	files = files || [];
	this.$videos = [];

	this.$videoContainer.empty();
	this.currentIndex = 0;

	for ( i = 0; i < files.length; i++ ) {
		this.$videos.push( $( `
			<div style="display: none;">
				<video controls="" muted="" preload="auto" src="${ files[ i ].filename }" width="250"></video>
				par <a href="https://commons.wikimedia.org/wiki/File:${ files[ i ].filename.split( '/' ).pop() }">${ files[ i ].speaker }</a> – Vidéo ${ i + 1 } sur ${ files.length }
			</div>
		` ) );
		this.$videoContainer.append( this.$videos[ i ] );
	}
	this.switchVideo( 0 );
};

SignItVideosGallery.prototype.switchVideo = function ( newIndex ) {
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
