document.addEventListener("DOMContentLoaded", function () {
    const slider = document.getElementById("sliderValue");
    const count = document.getElementById("count");
    const addButton = document.getElementById("add");

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

    slider.oninput = function() {
        count.textContent = `${slider.value}`;
    };

    addButton.onclick = function() {
        const wordCount = slider.value;

        fetch(commonWords, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ 'word_count': wordCount })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = '/account';
            } else {
            alert('Error adding words');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to add words');
        });
    };
});