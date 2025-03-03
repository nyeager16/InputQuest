document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("save-btn").addEventListener("click", saveChanges);
    document.getElementById('redirect-btn-vocab').addEventListener('click', function() {
        window.location.href = 'flashcards';
    });
    document.getElementById('redirect-btn-history').addEventListener('click', function() {
        window.location.href = 'watch-history/';
    });
});

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

function saveChanges() {
    const notifications = document.getElementById("notifications").checked;
    const retentionRate = document.getElementById("retention-rate").value;
    
    const selectedOption = document.querySelector('input[name="options"]:checked').value;
    const fsrs = selectedOption && selectedOption.value === 'option1';

    fetch('/save-account-settings/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
            notifications: notifications,
            fsrs: selectedOption,
            retention_rate: retentionRate
        })
    }).then(response => response.json())
        .catch(error => console.error('Error:', error));
}
