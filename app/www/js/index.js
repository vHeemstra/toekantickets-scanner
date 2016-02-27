/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
	// Application Constructor
	initialize: function() {
		this.bindEvents();
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function() {
		//document.getElementById('startCameraButton').addEventListener('mousedown', this.onStartCamera, false);
		document.addEventListener('deviceready', this.onDeviceReady, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicitly call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		app.receivedEvent('deviceready');


	},
	// Update DOM on a Received Event
	receivedEvent: function(id) {
		var parentElement = document.getElementById(id);
		var listeningElement = parentElement.querySelector('.listening');
		var receivedElement = parentElement.querySelector('.received');

		listeningElement.setAttribute('style', 'display:none;');
		receivedElement.setAttribute('style', 'display:block;');

		console.log('Received Event: ' + id);

		//$.support.cors = true;
		//$.mobile.allowCrossDomainPages = true;

		setTimeout(function(){
			alert('Started 3!');
		}, 0);
		
		qr.scanner = $('#scanner').addClass('inactive');
		qr.recpause = $('#recpause').addClass('pause');
		qr.max_width = 500;
		qr.max_height = 500;
		qr.capture_interval = 500;
		qr.failed_scans = 0;

		qr.init();

	},

};



var qr = {
	scanner: null,
	recpause: null,
	max_width: 500,
	max_height: 500,
	capture_interval: 500,
	failed_scans: 0,

	isCanvasSupported: function() {
		var elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	},

	get_sources: function( sourceInfos ) {
		for ( var i = 0; i !== sourceInfos.length; ++i ) {
			var sourceInfo = sourceInfos[ i ];
			var option = document.createElement('option');
			option.value = sourceInfo.id;
			if ( sourceInfo.kind === 'audio' ) {
				// option.text = sourceInfo.label || 'Microphone ' + ( qr.audio_select.length + 1 );
				// qr.audio_select.appendChild( option );
			} else if ( sourceInfo.kind === 'video' ) {
				option.text = sourceInfo.label || 'Camera ' + ( qr.video_select.length + 1 );
				qr.video_select.appendChild( option );
			} else {
				// console.log('Some other kind of source: ', sourceInfo);
			}
		}
	},

	init: function() {
		//navigator.mediaDevices.getUserMedia
		qr.has_gum = ( navigator.getMedia ) ? true : false;
		qr.has_canvas = qr.isCanvasSupported();
		qr.go = ( qr.has_gum && qr.has_canvas );
		qr.is_streaming = false;

		qr.video_select = $('#qr_video_source').get(0);
		//qr.video_select.onchange = qr.start;

		qr.cnv = $('#qr_canvas').get(0);
		qr.ctx = qr.cnv.getContext("2d");

		if ( typeof MediaStreamTrack === 'undefined' || typeof MediaStreamTrack.getSources === 'undefined' ) {
		
			qr.select_source = false;
			//alert('This browser does not support MediaStreamTrack.\n\nPlease try Chrome browser.');
		
		} else {
		
			qr.select_source = true;
			MediaStreamTrack.getSources( qr.get_sources );
		
		}

		qr.recpause.click(function(event) {
			event.preventDefault();
			event.stopImmediatePropagation();

			$( this ).toggleClass('pause' );
			if ( $( this ).hasClass('pause') ) {
				qr.stop();
			} else {
				qr.start();
			}
		});

		//qr.start();
	},

	start: function() {
		if ( ! qr.go ) {

			qr.recpause.addClass('pause');
			alert("Canvas or getUserMedia is not available.\n\nPlease try Chrome browser.");

		} else {

			qr.recpause.removeClass('pause');
			
			if ( qr.select_source ) {
				var options = { timeout: 15000, source_id: qr.video_select.value };
			} else {
				var options = { timeout: 15000 };
			}

			GumHelper.startVideoStreaming( function callback( err, stream, videoElement, width, height ) {
				if ( err ) {
					//TODO
					qr.stop();
					alert( err );
					// Error!
					// This can fail for many reasons, even if the user doesn't accept the
					// prompt for using the webcam (we set a timeout for detecting this, configure it
					// with the options parameter-explained a bit below)
				} else {
					// Success!
					// stream: the video stream
					// videoElement: an HTML5 <video> element
					// width, height: the original dimensions of the video stream

					// You can append the video element to the current DOM,
					// if you want to show the unprocessed stream:
					qr.scanner.removeClass('inactive');
					qr.is_streaming = true;
					qr.video_stream = stream;
					qr.video_element = videoElement;
					qr.video_width = width;
					qr.video_height = height;

					qr.video_element.muted = true;
					var $video = $( qr.video_element ).attr('id', 'qr_video');
					$('#qr_video').replaceWith( $video );
					$( qr.video_element ).addClass('show');

					qr.cnv.width = qr.max_width = $( qr.video_element ).width();
					qr.cnv.height = qr.max_height = $( qr.video_element ).height();


					/* === Calculate source-XYWH & destination-XYWH === */
					var max_ratio = ( qr.max_width / qr.max_height );
					var video_ratio = ( qr.video_width / qr.video_height );
					var over_width = ( qr.video_width > qr.max_width );
					var over_height = ( qr.video_height > qr.max_height );

					var over_both = ( over_width && over_height );
					var over_one = ( over_width || over_height );

					qr.sx = 0;
					qr.sy = 0;
					qr.x = 0;
					qr.y = 0;

					if ( video_ratio > max_ratio ) {
						if ( over_both ) {
							qr.sh = qr.video_height;
							qr.sw = ( max_ratio * qr.sh );
							qr.sx = ( ( qr.video_width / 2 ) - ( qr.sw / 2 ) );
							qr.sy = ( ( qr.video_height / 2 ) - ( qr.sh / 2 ) );

							qr.w = qr.max_width;
							qr.h = qr.max_height;
						} else if ( over_one ) {
							qr.sw = qr.max_width;
							qr.sh = qr.video_height;
							qr.sx = ( ( qr.video_width / 2 ) - ( qr.sw / 2 ) );

							qr.w = qr.sw;
							qr.h = qr.sh;
							qr.y = ( ( qr.max_height / 2 ) - ( qr.sh / 2 ) );
						} else {
							qr.sw = qr.video_width;
							qr.sh = qr.video_height;

							qr.w = qr.sw;
							qr.h = qr.sh;
							qr.x = ( ( qr.max_width / 2 ) - ( qr.sw / 2 ) );
							qr.y = ( ( qr.max_height / 2 ) - ( qr.sh / 2 ) );
						}
					} else {
						if ( over_both ) {
							qr.sw = qr.video_width;
							qr.sh = ( qr.sw / max_ratio );
							qr.sx = ( ( qr.video_width / 2 ) - ( qr.sw / 2 ) );
							qr.sy = ( ( qr.video_height / 2 ) - ( qr.sh / 2 ) );

							qr.w = qr.max_width;
							qr.h = qr.max_height;
						} else if ( over_one ) {
							qr.sw = qr.video_width;
							qr.sh = qr.max_height;
							qr.sy = ( ( qr.video_height / 2 ) - ( qr.sh / 2 ) );

							qr.w = qr.sw;
							qr.h = qr.sh;
							qr.x = ( ( qr.max_width / 2 ) - ( qr.sw / 2 ) );
						} else {
							qr.sw = qr.video_width;
							qr.sh = qr.video_height;

							qr.w = qr.sw;
							qr.h = qr.sh;
							qr.x = ( ( qr.max_width / 2 ) - ( qr.sw / 2 ) );
							qr.y = ( ( qr.max_height / 2 ) - ( qr.sh / 2 ) );
						}
					}

					setTimeout( qr.capture, qr.capture_interval );
				}
			}, options );

		}
	},

	stop: function() {
		//$( qr.video_element ).removeClass('show');
		GumHelper.stopVideoStreaming();
		qr.is_streaming = false;
		qr.scanner.removeClass('error success fail processing').addClass('inactive');
		qr.recpause.addClass('pause');
	},

	resume: function() {
		qr.scanner.removeClass('error success fail');
		$( qr.cnv ).removeClass('show');
		setTimeout( qr.capture, qr.capture_interval );
	},

	capture: function() {
		if ( qr.is_streaming ) {
			qr.scanner.addClass('processing');
			try {
				qr.ctx.clearRect( 0, 0, qr.cnv.width, qr.cnv.height );
				$( qr.cnv ).addClass('show');
				qr.ctx.drawImage( qr.video_element, qr.sx, qr.sy, qr.sw, qr.sh, qr.x, qr.y, qr.w, qr.h );
				try {
					var dataURL = qr.cnv.toDataURL();
					qrcode.decode( dataURL );
				}
				catch ( e ) {       
					console.log( e );
					setTimeout( qr.capture, qr.capture_interval );
				};
			}
			catch ( e ) {       
					console.log( e );
					setTimeout( qr.capture, qr.capture_interval );
			};
		}
	},
};

/*

qrcode.callback = function( data ) {
	// alert( data );
	// $('#qr_status').html( data );

	if ( 0 == data.indexOf('error') ) {

		qr.failed_scans++;
		qr.scanner.removeClass('processing').addClass('error');
		$( qr.cnv ).addClass('show');
		// flash after 3x wrong since last ok
		// ? feedback "Oops, please scan again"
		setTimeout( function() {
			qr.resume();
		}, qr.capture_interval);

	} else {

		qr.failed_scans = 0;

		//TODO: send data and get ok/error
		
		var isOk = true;
		qr.scanner.removeClass('processing');
		if ( isOk ) {
			qr.scanner.addClass('success');
			// feedback ""
			//show dialog with qr.resume() button
		} else {
			qr.scanner.addClass('fail');
			// feedback ""
			//show dialog with qr.resume() button
		}
	//TODELETE:
		setTimeout( function() {
			qr.resume();
		}, 5000);

	}
}

*/

app.initialize();