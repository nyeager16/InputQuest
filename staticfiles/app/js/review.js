document.addEventListener('DOMContentLoaded', function() {
    let currentWordIndex = 0;
    let answerRevealed = false;

    const wordDisplay = document.getElementById('wordDisplay');
    const editFlashcardBtn = document.getElementById('editFlashcardBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const answerDisplay = document.getElementById('answerDisplay');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const ratingsContainer = document.getElementById('ratingsContainer');

    if (words.length === 0) {
        showAnswerBtn.style.display = 'none';  // Hide "Show Answer" button
        return;
    }

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

    // Function to update the word display
    function updateWord() {
        if (currentWordIndex < words.length) {
            const word = words[currentWordIndex];
            const definition = definitions[currentWordIndex];
            wordDisplay.innerHTML = word.word__word_text;
            answerDisplay.innerHTML = definition;
            answerDisplay.style.display = 'none'; // Hide answer
            showAnswerBtn.style.display = 'block'; // Show "Show Answer" button
            ratingsContainer.style.display = 'none'; // Hide rating buttons
            editFlashcardBtn.style.display = 'none';
            deleteFlashcardBtn.style.display = 'none';
            saveChangesBtn.style.display = 'none';
            answerRevealed = false;
        } else {
            wordDisplay.innerHTML = 'All done! No more words to review.';
            answerDisplay.style.display = 'none';
            showAnswerBtn.style.display = 'none';
            ratingsContainer.style.display = 'none';
            editFlashcardBtn.style.display = 'none';
            deleteFlashcardBtn.style.display = 'none';
        }
    }

    // Function to handle "Show Answer" click
    function toggleAnswer() {
        if (answerDisplay.style.display === 'none') {
            answerDisplay.style.display = 'block'; // Show answer
            showAnswerBtn.style.display = 'none'; // Hide "Show Answer" button
            ratingsContainer.style.display = 'block'; // Show rating buttons
            answerRevealed = true;

            // Show the edit and delete buttons
            editFlashcardBtn.style.display = 'inline';
            deleteFlashcardBtn.style.display = 'inline';
        }
    }

    function editDefinition() {
        // Get the current definition text
        const definitionText = answerDisplay.innerHTML;
        
        // Convert the definition text to a multi-line textarea
        answerDisplay.innerHTML = `<textarea id="definitionInput" rows="4" style="width: 100%;">${definitionText}</textarea>`;
        
        // Hide the edit button and show the save button
        editFlashcardBtn.style.display = 'none';
        saveChangesBtn.style.display = 'inline';
    }

    function saveChanges() {
        const definitionInput = document.getElementById('definitionInput');
        const newDefinition = definitionInput.value;
        const wordId = words[currentWordIndex].word_id;

        // Update the display with the new definition and remove the input field
        answerDisplay.innerHTML = newDefinition;
        
        // Reset button visibility
        saveChangesBtn.style.display = 'none';
        editFlashcardBtn.style.display = 'inline';

        // Make the AJAX POST request to send the new definition to the server
        fetch(`/app/update-definition/${wordId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ new_definition: newDefinition })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Failed to update definition.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function submitRating(wordId, rating) {
        // Make the AJAX POST request using the Fetch API
        fetch(`${wordId}/submit/${rating}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            }
        })
        .then(response => {
            if (response.ok) {
                currentWordIndex++;
                updateWord();
            } else {
                console.error('Failed to submit rating.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Event listener for the "Show Answer" button
    showAnswerBtn.addEventListener('click', toggleAnswer);
    editFlashcardBtn.addEventListener('click', editDefinition);
    saveChangesBtn.addEventListener('click', saveChanges);

    // Event listeners for rating buttons
    const ratingButtons = document.querySelectorAll('.rating-btn');
    ratingButtons.forEach(button => {
        button.addEventListener('click', function() {
            const rating = this.getAttribute('data-rating');
            answerRevealed = false;
            const word = words[currentWordIndex];
            submitRating(word.id, rating);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Space bar to show answer
        if (event.code === 'Space') {
            if (answerRevealed === false) {
                event.preventDefault();
                toggleAnswer();
            }
        }

        // Numbers 1-4 to select rating
        if (answerRevealed === true && event.key >= '1' && event.key <= '4') {
            const rating = event.key;
            answerRevealed = false;
            const word = words[currentWordIndex];
            submitRating(word.id, rating);
        }
    });

    // Initial word setup
    updateWord();
});