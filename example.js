(function() {
'use strict';

	var notSupported = function() {
		window.confirm("not supported")
	};

	if(window.AudioContext || window.webkitAudioContext) {
		var audioContext = new (window.AudioContext || window.webkitAudioContext)();
	} else {
		notSupported();
		return;
	}

	navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

	var sourceMic = null;
	var sourceAudio = null;
	var myRecorder = null;
	var recording = false;
	var playing = false;
	var myAudio = document.getElementById('demoAudio');
	var noSrc = true;


	var notchFilter = audioContext.createBiquadFilter();
	notchFilter.frequency.value = 60.0;
	notchFilter.type = 'notch';
	notchFilter.Q.value = 10.0;

	var micGain = audioContext.createGain();				// for mic input mute
	var sourceMix = audioContext.createGain();				// for mixing
	var outputGain = audioContext.createGain();				// for speaker mute
	outputGain.gain.value = 1;								// mute speakers initially
	var dynComp = audioContext.createDynamicsCompressor();	// limit output

	// create a convolver node for room effects
	var convolver = audioContext.createConvolver();

	// create a biquadfilter node for filtering
	var filter = audioContext.createBiquadFilter();

	// create analyzer nodes for visualizations
	var timeAnalyser = audioContext.createAnalyser();
	timeAnalyser.minDecibels = -90;
	timeAnalyser.maxDecibels = -10;
	timeAnalyser.smoothingTimeConstant = 0.85;

	var freqAnalyser = audioContext.createAnalyser();
	freqAnalyser.minDecibels = -90;
	freqAnalyser.maxDecibels = -10;
	freqAnalyser.smoothingTimeConstant = 0.85;

	var runRecorder = function() {
		if (navigator.getUserMedia) {
			if (audioContext.state === 'suspended') {
				audioContext.resume();
			}
			navigator.getUserMedia(
				{
					'audio': true
				},
				function(stream) {

					// initialize mic source
					sourceMic = audioContext.createMediaStreamSource(stream);

					// initialize audio element source
					sourceAudio = audioContext.createMediaElementSource(myAudio);

					// mix sources
					sourceMic.connect(notchFilter);
					notchFilter.connect(micGain);
					micGain.connect(sourceMix);
					sourceAudio.connect(sourceMix);

					// connect source through filter and convolver to output
					sourceMix.connect(convolver);
					convolver.connect(filter);
					filter.connect(outputGain);
					outputGain.connect(dynComp);
					dynComp.connect(audioContext.destination);

					myRecorder = new Recorder(sourceMix);
				},
				function(err){
					notSupported();
				}
			);
		}
	};
   
	runRecorder();

	// stop both
	var stop = function() {
		console.log("")
		if(recording === true) {
			myRecorder.stop();
			myRecorder.exportWAV(function(s) {
				myAudio.src = window.URL.createObjectURL(s);
				noSrc = false;
			});
		}
		myAudio.pause();
		recording = false;
		playing = false;
		
	};

	// record
	var toggleRecord = function() {
		if(recording === false) {
			recording = true;
			myRecorder.clear();
			myRecorder.record();
			document.getElementById('recordButton').innerText="Stop recording";
		} else {
			document.getElementById('recordButton').innerText="Recording";
			stop();
		}
	};

	// play
	var togglePlay = function() {
		if(noSrc === false && playing === false && recording !== true) {
			stop();
			myAudio.play();
			playing = true;
			document.getElementById('playButton').innerText="Stop";
		} else {
			document.getElementById('playButton').innerText="Play";
			stop();
		}
	};


	// apply room effect
		var effectFile = 'sample.wav'
		var request = new XMLHttpRequest();
		request.open('GET', effectFile, true);

		request.responseType = 'arraybuffer';
		request.onload = function(){
			audioContext.decodeAudioData(request.response, function(buffer){
				console.log(request.response)
				if (!buffer){
					return;
				}
				convolver.buffer = buffer;
			});
		};
		request.send();
//// apply effect ends
	
	window.onload = function() {
		document.getElementById('recordButton').onclick = toggleRecord;
		document.getElementById('playButton').onclick = togglePlay;
	};

	return true;
}());
