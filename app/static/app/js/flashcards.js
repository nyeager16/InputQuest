// Get all flashcard items
const flashcardItems = document.querySelectorAll('.flashcard-item');

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

// Add click event listeners to each flashcard item
flashcardItems.forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        flashcardItems.forEach(i => i.classList.remove('active'));
        // Add active class to the clicked item
        this.classList.add('active');
        // Update the textarea with the clicked word's text
        document.getElementById('wordId').value = this.dataset.id; // Set the hidden input's value
        console.log(this.dataset.definition);
        document.getElementById('definitionText').value = this.dataset.definition; // Set the definition textarea's value
    });
});

// Add event listener to Save Changes button
document.getElementById('saveButton').addEventListener('click', function (event) {
    event.preventDefault(); // Prevent form submission
    console.log('Save Changes clicked');
    const wordId = document.getElementById('wordId').value; // Word ID
    const newDefinition = document.getElementById('definitionText').value; // Updated definition

    // Ensure a word is selected and definition is provided
    if (!wordId || !newDefinition) {
        alert('Please select a word and provide a definition.');
        return;
    }

    // Make a POST request to update the definition
    fetch(`/app/update-definition/${wordId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({ new_definition: newDefinition }),
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to update the definition.');
            }
        })
        .then(data => {
            if (data.status === 'success') {

                // Update the clicked item's data-definition attribute with the new value
                const activeItem = document.querySelector('.flashcard-item.active');
                if (activeItem) {
                    activeItem.dataset.definition = newDefinition;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An unexpected error occurred.');
        });
});

document.getElementById('filterButton').addEventListener('click', function () {
    console.log('Filter button clicked');

    fetch('/app/account/flashcards', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            console.log('Filter applied, reloading page...');
            location.reload();
        } else {
            alert('Filtering failed. Try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while filtering.');
    });
});
