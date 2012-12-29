

/**
 * The audioPlayer_controller object
 * This is used to wire up the view and model with actions
 */ 
var audioPlayer_controller = {
    /**
     * A dictionary of callback functions that are called whenever an
     * event is fired by this widget.
     */
    callbacks: {},

    init:function() {
        audioPlayer_controller.update();
    },

    /**
     * Update the display
     */
    update:function() { 
        // Is the viewport large enough for the full view?
        var viewport = audioPlayer_controller.getViewport();
        if (viewport.height <= 310  || viewport.width <= 310) {
            $.mobile.changePage($('#tile'));
        } else {
            $.mobile.changePage($('#home'));
        }
    },

   /**
    * Get the current title for this widget.
    */
    getTitle:function() {
        return "MAAVIS Audio Player";
    },

    /**
     * Get the viewport width and height.
     * returns an object with width and height properties.
     */
    getViewport:function() {
	var e = window
	, a = 'inner';
	if ( !( 'innerWidth' in window ) ) {
	    a = 'client';
	    e = document.documentElement || document.body;
	}
	return { width : e[ a + 'Width' ] , height : e[ a + 'Height' ] }
    },

    /**
     * Register a callback function. 
     *
     * type: the name of the type of event to respond to 
     *
     * widget: [optional] the name of the widget where the event must
     * occur for the callback to be executed. This allows callbacks to
     * be register so that they will only respond to events in
     * specific widgets, or to all events.
     */
    register:function(event, callback, widget) {
	if (widget === undefined) {
	    var cbks = audioPlayer_controller.callbacks[event];
	} else {
	    var cbks = audioPlayer_controller.callbacks[widget + "." + event];
	}
	if (cbks === undefined) {
	    cbks = new Array();
	}
	cbks.push(callback);
	audioPlayer_controller.callbacks[event] = cbks;
    },

    /**
     * Execute all the callbacks registered for a given event.
     *
     * The event object is passed directly to the callback function
     * and can contani any number of properties. Two properties that
     * important to the callback functionality are:
     *
     * type: the name of the type of event to respond to 
     *
     * widget: [optional] the name of the widget where the event
     * occured. This allows callbacks to be register so that they will
     * only respond to events in specific widgets, or to all events.
     */
    executeCallbacks:function(event) {
	// Execute all callbacks not restricted to a widget
	var cbks = audioPlayer_controller.callbacks[event.type];
	if (cbks === undefined) return;
	for (var i = 0; i < cbks.length; i++) {
	    cbks[i](event);
	}

	// Execute all callbacks restricted to a widget
	if (event.widget === undefined) return;
	var cbks = audioPlayer_controller.callbacks[event.widget + "." + event.type];
	if (cbks === undefined) return;
	for (var i = 0; i < cbks.length; i++) {
	    cbks[i](event);
	}
    }
};

/**
 * Provides a basic shim for opening the widget without a widget object (e.g. directly in browsers)
 */
if (!window.widget){
    window.widget = {};
}

/**
 * Adds in the "proxify" method if it isn't in the widget object, e.g. as we're opening the widget
 * directly in a browser, or using a widget runtime other than Wookie e.g. Opera, PhoneGap etc
 */
if (!window.widget.proxify){
    window.widget.proxify = function(url){ return url };
}

$('#home').live('pageshow',function(event) {
   audioPlayer_controller.init(); 
});

$('body').bind('orientationchange',function(event){
    audioPlayer_controller.update();
})

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * This provides the code for managing assets and collections of assets.
 * It provides generic functionality that is applicable to all asset types
 * and is therefore intended to be reused across all asset players.
 */
var audioPlayer_asset_controller = { 
    idx: 0, // index of current asset being displayed,
    auto: false, // indicates if we are auto playing assets
    staticDuration: 5000, // interval between auto play of static assets (e.g. photo's)
    interval: null, // the interval object that controls the auto player
    albums: null, // the albums of colelctions that can be played
    collection: null, // the collection of assets currently playing

    init:function() { 
	// register button events
	$('#next').click(function() {
	    audioPlayer_asset_controller.nextAsset();
	});

	$('#prev').click(function() {
	    audioPlayer_asset_controller.prevAsset();
	});

	$('#selectAlbum').click(function() {
            $.mobile.changePage($("#home"));
	});

	$('#playPause').click(function() {
	    if (!audioPlayer_asset_controller.auto) {
		audioPlayer_asset_controller.startAuto();
		// FIXME: this breaks layout - as it overwrides JQuery markup
		this.innerText = "Pause";
	    } else {
		audioPlayer_asset_controller.stopAuto();
		// FIXME: this breaks layout - as it overwrides JQuery markup
		this.innerText = "Play";
	    }
	});
    },

    initAlbums:function() { 
        var list = $("#albumList");
        var albums = audioPlayer_asset_controller.albums;
        if (albums) {
            list.empty();
            $.each(
                albums,
                function( intIndex, album ){
                    list.append(audioPlayer_asset_controller.getAlbumCover(album));
                    $("#" + album.title).click(function() {
                        audioPlayer_asset_controller.showAlbum(album);
                    });
                }
            );
        } else {
            list.append("Loading Albums...");
        }
    },

    getAlbumCover:function(album) {
      var html = "<li id='" + album.title + "'>";
      html = html + "<img src='" + album.preview + "' width='120' height='120'/> ";
      html = html + album.title;
      html = html + "</a></li>";
      return $(html);
    },

    showAlbum:function(album) {
	audioPlayer_asset_controller.setCollection(album);
        $.mobile.changePage("#picture");
    },

    setAlbums:function(albums) {
	audioPlayer_asset_controller.albums = albums;
        audioPlayer_asset_controller.initAlbums();
    },

    
    // Set the collection, that is the collection being shown at this time
    // to an array of assets. The "collection" should be either an array or an
    // object with an assets property which is the required array.
    //
    // The array will contain, at least, a src property which contains the src to
    // use for the HTML image.
    setCollection:function(collection){
        if (collection.assets) {
	    audioPlayer_asset_controller.collection = collection.assets;
        } else {
	    audioPlayer_asset_controller.collection = collection;
        }
        // TODO: cache images for faster slideshow. e.g. http://www.anthonymclin.com/code/7-miscellaneous/98-on-demand-image-loading-with-jquery
	audioPlayer_asset_controller.displayAsset(0);
    },

    getCollection:function() {
	return 	audioPlayer_asset_controller.collection;
    },
    
    displayAsset:function(idx) {
	var collection = audioPlayer_asset_controller.getCollection();
	$('#asset').attr("src", collection[idx].src);
    },

    nextAsset:function() {
	var collection = audioPlayer_asset_controller.getCollection();
	audioPlayer_asset_controller.idx += 1;
        if (audioPlayer_asset_controller.idx >= collection.length) { 
	    audioPlayer_asset_controller.idx = 0;
	};
	audioPlayer_asset_controller.displayAsset(audioPlayer_asset_controller.idx);
    },

    prevAsset:function() {
	var collection = audioPlayer_asset_controller.getCollection();
	audioPlayer_asset_controller.idx -= 1;
        if (audioPlayer_asset_controller.idx <0) { 
	    audioPlayer_asset_controller.idx = collection.length - 1;
	};
	audioPlayer_asset_controller.displayAsset(audioPlayer_asset_controller.idx);
    },

    startAuto:function() {
	audioPlayer_asset_controller.auto = true;
	audioPlayer_asset_controller.interval = 
	    window.setInterval(audioPlayer_asset_controller.nextAsset, 
			       audioPlayer_asset_controller.staticDuration);
    },

    stopAuto:function() {
	audioPlayer_asset_controller.auto = false;
	window.clearInterval(audioPlayer_asset_controller.interval);
    }
};

$('#picture').live('pageinit',function(event) { 
  audioPlayer_asset_controller.init(); 
});

$('#home').live('pageinit',function(event) { 
  audioPlayer_asset_controller.initAlbums(); 
});



/**
 * The @widget.shortname@_scanning_controller object This is used to
 * allow users using a switch device to interact efficiently with a
 * widget.
 */ 
var audioPlayer_scanning_controller = {
    scanning: false, // indicates if we are currently scanning
    delay: 1000, // time in milliseconds between focus change
    interval: null, // The interval object controlling the scan
    scanElements: null, // The elements to scan over
    currentElementIdx: 0, // The index of the currently scanning element

    init:function() {
        audioPlayer_scanning_controller.scanElements = $('[data-scanOrder]');
        if (audioPlayer_scanning_controller.scanning) {
	    audioPlayer_scanning_controller.startScanning();
        };
    },

    /**
     * Action to take when switch is released.
     * The event contains details supplied by the switch.
     */
    switchUp:function(event) {
	if (event.keyCode === 32) {
	    audioPlayer_scanning_controller.scanElements[audioPlayer_scanning_controller.currentElementIdx].click();
	}
    },

    nextElement:function() {
	var idx = audioPlayer_scanning_controller.currentElementIdx;
	var elements = audioPlayer_scanning_controller.scanElements;

	var oldElement = $(elements[idx]);
	oldElement.fadeIn('slow', function() {
	    // Animation complete.
	});

	idx += 1;
	if (idx >= elements.length) {
	    idx = 0
	};

	var newElement = $(elements[idx]);
	newElement.fadeOut('slow', function() {
	    // Animation complete.
	});
	newElement.fadeIn('slow', function() {
	    // Animation complete.
	});
	audioPlayer_scanning_controller.currentElementIdx = idx;
    },

    startScanning:function() {
	audioPlayer_scanning_controller.scanning = true;
	audioPlayer_scanning_controller.interval = 
	    window.setInterval(audioPlayer_scanning_controller.nextElement, 
			       audioPlayer_scanning_controller.delay);
	$(document).keyup(audioPlayer_scanning_controller.switchUp);
    },

    stopScanning:function() {
	audioPlayer_scanning_controller.scanning = false;
	window.clearInterval(audioPlayer_scanning_controller.interval);
    }

};

$('#home').live('pageshow',function(event) {
    audioPlayer_scanning_controller.init(); 
});



var audioPlayer_twoColumn_controller = {
    init:function() {
      audioPlayer_twoColumn_controller.update();
    },

    /**
     * Update the display
     */
    update:function() {
	// expand the search box on screens that are either wide enough (alongside results) or tall enough
	if ($.mobile.media("only screen and (min-width : 801px)")) {
	    $('#content-secondary .ui-collapsible').each(
		function() {
		    $(this).trigger('expand');
		});
	} else if ($.mobile.media("only screen and (min-width : 641px) and (max-width : 1024px)") || $.mobile.media("only screen and (min-width : 1801px)")) {
	    $('#content-secondary .ui-collapsible').each(
		function() {
		    $(this).trigger('expand');
		});
	} else {
	    $('#content-secondary .ui-collapsible').each(
		function() {
		    $(this).trigger('collapse');
		});
	}
    },

}

$('#home').live('pageinit',function(event) {
   audioPlayer_twoColumn_controller.init();
})

var audioPlayer_audio_controller = { 
    init:function() { 
	// FIXME: album should be created by reading a directory
        var albums = {
            "classical": {
                "title": "Classical",
                "preview": null,
                "assets": [
                    {
	                "src":"assets/Blind_Blake-Diddie_Wa_Diddie.mp3"
	            },
                    {
                        "src":"assets/I.Allegro.mp3"
                    }

                ]
            },
            "soundtrack": {
                "title": "Soundtrack",
                "preview": null,
                "assets": [
                    {
	                "src":"assets/ScottJoplin-TheEntertainer1902.mp3"
	            }
                ]
            }
        }
	audioPlayer_asset_controller.setAlbums(albums);
	audioPlayer_scanning_controller.scanElements = $('[data-scanOrder]');
    },    
};

$('#home').live('pageinit',function(event) { 
  audioPlayer_audio_controller.init(); 
});

