let selectedWordElement = null;  // To keep track of the currently selected word
let wordIdInput = document.querySelector('input[name="word_id"]'); // Find the word_id input

// Add click event listener to each word
document.querySelectorAll('.word').forEach(wordElement => {
    wordElement.addEventListener('click', () => {
        // If the clicked word is the currently selected word, unselect it
        if (selectedWordElement === wordElement) {
            selectedWordElement.classList.remove('selected');
            selectedWordElement = null;
            document.getElementById('child-words-container').style.display = 'none';  // Hide child words
            wordIdInput.value = '';  // Clear word ID input
            return;
        }

        // If there's a previously selected word, unselect it
        if (selectedWordElement) {
            selectedWordElement.classList.remove('selected');
        }

        // Select the new word
        selectedWordElement = wordElement;
        selectedWordElement.classList.add('selected');

        // Clear and update the child words container
        const childWordsContainer = document.getElementById('child-words-container');
        childWordsContainer.innerHTML = '';  // Clear previous child words

        // Get child words for the selected root word
        const rootWord = selectedWordElement.getAttribute('data-word');
        const rootWordId = selectedWordElement.getAttribute('data-word-id');
        if (rootWord && rootWord.trim() !== '') {
            // Set the "Learn" button's href to include the selected root word
            const learnUrl = learnWordUrlTemplate.replace("root_word", rootWord);
            document.getElementById('learn-button').setAttribute('href', learnUrl);
        } else {
            // If root word is empty, reset the Learn button's href to '#'
            document.getElementById('learn-button').setAttribute('href', '#');
        }

        const childWords = childWordsMapping[rootWordId] || [];

        // Update the hidden input value with the selected word ID
        wordIdInput.value = rootWordId;

        // Display the child words
        childWords.forEach(child => {
            const childWordSpan = document.createElement('span');
            childWordSpan.className = 'child-word';
            childWordSpan.textContent = child;
            childWordsContainer.appendChild(childWordSpan);
        });

        // Show the child words container
        childWordsContainer.style.display = 'block';
    });
});
