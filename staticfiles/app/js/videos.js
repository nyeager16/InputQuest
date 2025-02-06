// from: https://docs.djangoproject.com/en/5.1/howto/csrf/
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

document.addEventListener('DOMContentLoaded', function () {
    var rangeSlider = document.getElementById('range-slider');
    var minComprehensionInput = document.getElementById('min-comprehension');
    var maxComprehensionInput = document.getElementById('max-comprehension');

    var minComprehensionValue = parseFloat(minComprehensionInput.value);
    var maxComprehensionValue = parseFloat(maxComprehensionInput.value);

    // Initialize noUiSlider with two handles
    noUiSlider.create(rangeSlider, {
        start: [minComprehensionValue, maxComprehensionValue], // Initial values
        connect: true,
        range: {
            'min': 0,
            'max': 100
        },
        step: 1, // Increment step
        tooltips: true, // Show tooltips on hover
        format: {
            to: function (value) {
                return Math.round(value); // Format to integer
            },
            from: function (value) {
                return Number(value);
            }
        }
    });

    // Update the displayed values and hidden input fields when the slider is updated
    rangeSlider.noUiSlider.on('update', function(values, handle) {
        var minVal = values[0];
        var maxVal = values[1];

        // Update hidden form inputs
        minComprehensionInput.value = minVal;
        maxComprehensionInput.value = maxVal;
    });

    document.getElementById('filter-form').addEventListener('submit', function(event) {
        event.preventDefault();
        // Get the slider values
        var minVal = minComprehensionInput.value;
        var maxVal = maxComprehensionInput.value;
    
        // Send the AJAX request
        fetch(updateComprehensionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                'min_comprehension': minVal,
                'max_comprehension': maxVal
            })
        })
        .then(response => {
            if (response.ok) {
                // If the request was successful, refresh the page
                location.reload();
            } else {
                // Handle error case if necessary
                console.error('Request failed:', response.statusText);
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    });

    let page = 1;
    const videoGrid = document.getElementById('video-grid');
    let isLoading = false;

    function loadMoreVideos() {
        if (isLoading) return;
        isLoading = true;
        page++;

        // Use the global variable allVideosUrl for fetching videos
        fetch(allVideosUrl + "?page=" + page, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            data.videos.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <a href="/app/video/${video.pk}">
                        <div class="thumbnail-wrapper">
                            <img src="https://img.youtube.com/vi/${video.url}/hqdefault.jpg" alt="${video.title}">
                        </div>
                    </a>
                    <div class="video-info">
                        <div class="percentage" style="background-color: white;">
                            ${video.comprehension_percentage}
                        </div>
                        <div class="title">
                            <a href="/app/video/${video.pk}" style="color: black; text-decoration: none;">${video.title}</a>
                        </div>
                    </div>
                `;
                videoGrid.appendChild(videoItem);
            });

            if (!data.has_next) {
                window.removeEventListener('scroll', handleScroll);
            }

            isLoading = false;
        });
    }

    function handleScroll() {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
            loadMoreVideos();
        }
    }

    window.addEventListener('scroll', handleScroll);
    loadMoreVideos();
});