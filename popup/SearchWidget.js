var SearchWidget = function ( config ) {
	// Parent constructor
	OO.ui.TextInputWidget.call( this, config );
	// Mixin constructors
	OO.ui.mixin.LookupElement.call( this, $.extend( { $overlay: $( 'body' ), highlightFirst: false }, config ) );

	this.records = [];
};
OO.inheritClass( SearchWidget, OO.ui.TextInputWidget );
OO.mixinClass( SearchWidget, OO.ui.mixin.LookupElement );

SearchWidget.prototype.setRecords = function ( records ) {
	this.records = Object.keys( records );
};

// Override default implementation to fix the lookup menu behaviour
SearchWidget.prototype.onLookupMenuItemChoose = function ( item ) {
	this.setLookupsDisabled( true );
	this.setValue( item.getData() );
	this.setLookupsDisabled( false );
};

SearchWidget.prototype.getLookupRequest = function () {
	var searchValue = this.getValue(),
		deferred = $.Deferred(),
		result = this.records.filter( function ( item ) {
			return item.indexOf( searchValue ) === 0 || item.indexOf( searchValue.toLowerCase() ) === 0;
		} );

	deferred.resolve( result );

	return deferred.promise( { abort: function () {} } );
};

SearchWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response || [];
};

SearchWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i,
		items = [];
	for ( i = 0; i < data.length; i++ ) {
		items.push( new OO.ui.MenuOptionWidget( {
			data: data[ i ],
			label: data[ i ]
		} ) );
	}

	return items;
};

SearchWidget.prototype.onLookupMenuItemChoose
