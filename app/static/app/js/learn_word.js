var player;
var currentIndex = 0;

// Function to initialize YouTube player when API is ready
function onYouTubeIframeAPIReady() {
    if (!document.getElementById('player')) {
        console.error("YouTube iframe element not found.");
        return;
    }

    player = new YT.Player('player', {
        events: {
            'onReady': onPlayerReady
        }
    });
}

// Ensure YouTube API script is loaded before initialization
function loadYouTubeAPI() {
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
        script.onload = function () {
            console.log("YouTube API script loaded.");
        };
    }
}

// Function to skip to the current timestamp
function skipToCurrent() {
    if (player && player.seekTo) {
        player.seekTo(timestamps[currentIndex].time, true);
    }
}

// Function to go to the previous timestamp
function previousTimestamp() {
    if (currentIndex > 0) {
        currentIndex--;
        updateButtonLabel();
        skipToCurrent();
    }
}

// Function to go to the next timestamp
function nextTimestamp() {
    if (currentIndex < timestamps.length - 1) {
        currentIndex++;
        updateButtonLabel();
        skipToCurrent();
    }
}

// Update button label with the current word
function updateButtonLabel() {
    const button = document.querySelector('.nav-button:nth-child(2)');
    if (button && timestamps[currentIndex]) {
        button.innerText = `Skip to "${timestamps[currentIndex].word}"`;
    }
}

// Initialize YouTube Player on DOM content loaded
document.addEventListener('DOMContentLoaded', function () {
    loadYouTubeAPI();
    updateButtonLabel();
});
