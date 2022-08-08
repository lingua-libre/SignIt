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
	console.log("#20 files ",files )
	console.log("Expected: [{ filename: url, speaker: ... },...]")	
	var i;
	files = files || [];
	this.$videos = [];

	this.$videoContainer.empty();
	this.currentIndex = 0;

	for ( i = 0; i < files.length; i++ ) {
		// filename = files[ i ].filename,
		// url = `https://commons.wikimedia.org/wiki/File:${ filename.split( '/' ).pop()}`,
		// speaker = files[ i ].speaker,
		// total = files.length;
		// ${ banana.i18n("si-videosGallery-video", url, speaker, i+1, total) }
		this.$videos.push( $( `
			<div style="display: none;">
				<video controls="" muted="" preload="auto" src="${ files[ i ].filename }" width="250" class=""></video>
				par <a href="https://commons.wikimedia.org/wiki/File:${ files[ i ].filename.split( '/' ).pop() }">${ files[ i ].speaker }</a> – Vidéo ${ i + 1 } sur ${ files.length }
			</div>
		` ) );
		this.$videoContainer.append( this.$videos[ i ] );
	}
	this.switchVideo( 0 );
};

SignItVideosGallery.prototype.switchVideo = function ( newIndex ) {
	var speedNormal = 1, speedSlow = 0.5;

	this.$videos[ this.currentIndex ].hide();
	this.currentIndex = newIndex;
	this.$videos[ this.currentIndex ].show();
	$currentVideo = this.$videos[ this.currentIndex ].children( 'video' )[ 0 ];

	$( async function () {
		param = await browser.storage.local.get( 'twospeed' );
		if ( param.twospeed === false ) {
			console.warn( 'twospeed disabled' );
			return;
		}
		// addClass(), removeClass(), and toggleClass()
		if ( param.twospeed === true ) {
			$currentVideo.addEventListener('ended', function(event) {
				// Normal speed just played
				if (!this.classList.contains('slow')) {
					this.classList.add('slow');
					this.playbackRate = speedSlow || 0.75;
					this.play();
				}
				// Slow speed just played
				else {
					this.classList.remove('slow');
					this.playbackRate = speedNormal || 1;
					this.pause();
				}
			})
		}
	})

	// After switching, play
	$currentVideo.play();

	// Arrows disables when on edges
	this.currentIndex === 0 ?
		this.previousVideoButton.setDisabled( true )
		:this.previousVideoButton.setDisabled( false );
	this.currentIndex >= this.$videos.length - 1 ?
		this.nextVideoButton.setDisabled( true )
		:this.nextVideoButton.setDisabled( false );
};
