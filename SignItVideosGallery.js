var SignItVideosGallery = function ( container ) {
	this.videos = [];
	this.currentIndex = 0;

	this.previousVideoButton = new OO.ui.ButtonWidget( { icon: 'previousBtn', framed: false } );
	this.nextVideoButton = new OO.ui.ButtonWidget( { icon: 'nextBtn', framed: false } );
	this.$videoContainer = $( '<div class="signit-panel-videos-gallery">' );

	container.append( this.previousVideoButton.$element ).append( this.$videoContainer ).append( this.nextVideoButton.$element );

	this.previousVideoButton.on( 'click', function () {
		this.switchVideo( this.currentIndex - 1 );
	}.bind( this ) );
	this.nextVideoButton.on( 'click', function () {
		this.switchVideo( this.currentIndex + 1 );
	}.bind( this ) );
};

SignItVideosGallery.prototype.refresh = async function ( files ) {
	var BetterBanana = await browser.storage.local.get( 'bananaInStore' );
	var messageStore = await chrome.storage.local.get( 'sourceMap' ); 
	var sourceMap = new Map(messageStore.sourceMap);
	var locale = BetterBanana.bananaInStore.locale;
	var banana = {
    i18n: (msg, url, speaker,index, total) => {
		let string = sourceMap.get(locale)[msg];
		let Speaker = `<a href=${url} target="_blank">${speaker} </a>`;
		let patterns = ["{{link|$1|$2}}", "$3", "$4"];
		let replacements = [Speaker, index, total];

		patterns.forEach((pattern,index)=>{
			string = string.replace(pattern, replacements[index]);
		})

		return string;
    },
  };
	console.log("#20 files ",files )
	console.log("Expected: [{ filename: url, speaker: ... },...]")	
	var i;
	files = files || [];
	this.$videos = [];

	this.$videoContainer.empty();
	this.currentIndex = 0;

	for ( i = 0; i < files.length; i++ ) {
		filename = files[ i ].filename,
		url = `https://commons.wikimedia.org/wiki/File:${ filename.split( '/' ).pop()}`,
		speaker = files[ i ].speaker,
		total = files.length;
		this.$videos.push( $( `
			<div style="display: none;">
				<video controls="" muted="" preload="auto" src="${ files[ i ].filename }" width="250" class=""></video>
				${banana.i18n("si-panel-videos-gallery-attribution", url, speaker, i+1, total)}
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
