document.addEventListener("DOMContentLoaded", function () {
    const slider = document.getElementById("comprehensibleInput");
    const percentageDisplay = document.getElementById("percentage");
    const goToQueueButton = document.getElementById("goToQueue");

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

    // Button action (e.g., redirect or trigger an action)
    slider.oninput = function() {
        percentageDisplay.textContent = `${slider.value}%`;
    };

    // Handle "Go to Queue" button click
    goToQueueButton.onclick = function() {
        const selectedPercentage = slider.value;

        // Send the updated percentage to the backend using fetch
        fetch(updateQueueUrl, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken  // Include CSRF token for POST requests in Django
            },
            body: JSON.stringify({ 'percentage': selectedPercentage })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Redirect to the queue page after the update
                window.location.href = '/watch/queue';  // Redirect to the queue page
            } else {
            alert('Error updating preference');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to update preference');
        });
    };
});