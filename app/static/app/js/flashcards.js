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

const flashcardItems = document.querySelectorAll('.flashcard-item');
// Add click event listeners to each flashcard item
flashcardItems.forEach(item => {
    item.addEventListener('click', function() {
        if (this.id === 'filterButton') {
            return;
        }
        // Remove active class from all items
        flashcardItems.forEach(i => i.classList.remove('active'));
        // Add active class to the clicked item
        this.classList.add('active');
        // Update the textarea with the clicked word's text
        document.getElementById('wordId').value = this.dataset.id;
        document.getElementById('definitionText').value = this.dataset.definition;

        let rootWord = this.querySelector('.word-column').textContent;
        const learnUrl = learnWordUrlTemplate.replace("root_word", rootWord);
        document.getElementById('learn-button').setAttribute('href', learnUrl);

        // Get the ID of the selected word
        const wordId = this.dataset.id;

        fetch(`/get-conjugation-table/${wordId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrftoken,
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const conjugationTable = data.conjugation_table;
                const tableType = data.table_type;
                const tableContainer = document.getElementById('conjugationTableContainer');
                const tableBody = document.querySelector('#conjugation-table tbody');
                const tableHead = document.querySelector('#conjugation-table thead');
                const pastTableBody = document.querySelector('#past-conjugation-table tbody');
                const pastTableHead = document.querySelector('#past-conjugation-table thead');
        
                // Clear previous table content
                tableBody.innerHTML = "";
                tableHead.innerHTML = "";
                pastTableBody.innerHTML = "";
                pastTableHead.innerHTML = "";
        
                if (Object.keys(conjugationTable).length > 0) {
                    if (tableType === 0) {
                        tableHead.innerHTML = `
                            <tr>
                                <th colspan="3" style="text-align: center;">Present</th>
                            </tr>
                            <tr>
                                <th></th>
                                <th>Singular</th>
                                <th>Plural</th>
                            </tr>
                        `;
                        pastTableHead.innerHTML = `
                            <tr>
                                <th colspan="6" style="text-align: center;">Past</th>
                            </tr>
                            <tr>
                                <th></th>
                                <th>m.</th>
                                <th>f.</th>
                                <th>n.</th>
                                <th>m.pl.</th>
                                <th>other pl.</th>
                            </tr>
                        `;
        
                        const rowLabels = ["1p", "2p", "3p"];
                        let rowHTML = '';
                        let pastrowHTML = '';
                        for (let i = 0; i < 3; i++) {
                            const singular = conjugationTable[i*2];
                            const plural = conjugationTable[i*2+1];

                            const pastM = conjugationTable[i*5+6];
                            const pastF = conjugationTable[i*5+7];
                            const pastN = conjugationTable[i*5+8];
                            const pastMPL = conjugationTable[i*5+9];
                            const pastOPL = conjugationTable[i*5+10];
        
                            rowHTML += `
                                <tr>
                                    <td><strong>${rowLabels[i]}</strong></td>
                                    <td class="conjugation-cell" data-word-id="${singular[0]}" id="cell-${singular[0]}" 
                                        style="background-color: ${singular[2] ? 'lightgreen' : 'transparent'}">
                                        ${singular[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${plural[0]}" id="cell-${plural[0]}" 
                                        style="background-color: ${plural[2] ? 'lightgreen' : 'transparent'}">
                                        ${plural[1]}
                                    </td>
                                </tr>
                            `;
                            
                            pastrowHTML += `
                                <tr>
                                    <td><strong>${rowLabels[i]}</strong></td>
                                    <td class="conjugation-cell" data-word-id="${pastM[0]}" id="cell-${pastM[0]}" 
                                        style="background-color: ${pastM[2] ? 'lightgreen' : 'transparent'}">
                                        ${pastM[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${pastF[0]}" id="cell-${pastF[0]}" 
                                        style="background-color: ${pastF[2] ? 'lightgreen' : 'transparent'}">
                                        ${pastF[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${pastN[0]}" id="cell-${pastN[0]}" 
                                        style="background-color: ${pastN[2] ? 'lightgreen' : 'transparent'}">
                                        ${pastN[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${pastMPL[0]}" id="cell-${pastMPL[0]}" 
                                        style="background-color: ${pastMPL[2] ? 'lightgreen' : 'transparent'}">
                                        ${pastMPL[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${pastOPL[0]}" id="cell-${pastOPL[0]}" 
                                        style="background-color: ${pastOPL[2] ? 'lightgreen' : 'transparent'}">
                                        ${pastOPL[1]}
                                    </td>
                                </tr>
                            `;
                        }
                        tableBody.innerHTML = rowHTML;
                        pastTableBody.innerHTML = pastrowHTML;
        
                    } else if (tableType === 1) {
                        const rowLabels = ["Nom", "Gen", "Dat", "Acc", "Instr", "Loc", "Voc"];
                        tableHead.innerHTML = `
                            <tr>
                                <th></th>
                                <th>Singular</th>
                                <th>Plural</th>
                            </tr>
                        `;
        
                        let rowHTML = '';
                        for (let i = 0; i < 7; i++) {
                            const singular = conjugationTable[i];
                            const plural = conjugationTable[i + 7];
        
                            rowHTML += `
                                <tr>
                                    <td><strong>${rowLabels[i]}</strong></td>
                                    <td class="conjugation-cell" data-word-id="${singular[0]}" id="cell-${singular[0]}">
                                        ${singular[1]}
                                    </td>
                                    <td class="conjugation-cell" data-word-id="${plural[0]}" id="cell-${plural[0]}">
                                        ${plural[1]}
                                    </td>
                                </tr>
                            `;
                        }
                        tableBody.innerHTML = rowHTML;
                    } else if (tableType === 2) {
                        const rowLabels = ["Nom", "Gen", "Dat", "Acc", "Instr", "Loc", "Voc"];
                        tableHead.innerHTML = `
                            <tr>
                                <th></th>
                                <th>m.</th>
                                <th>n.</th>
                                <th>f.</th>
                                <th>m. pl.</th>
                                <th>other pl.</th>
                            </tr>
                        `;

                        let rowHTML = '';
                        for (let i = 0; i < 7; i++) {
                            const m = conjugationTable[i*5];
                            const n = conjugationTable[i*5+1];
                            const f = conjugationTable[i*5+2];
                            const mpl = conjugationTable[i*5+3];
                            const opl = conjugationTable[i*5+4];
                            
                            if (rowLabels[i] === "Nom" || rowLabels[i] === "Acc" || rowLabels[i] === "Voc") {
                                rowHTML += `
                                    <tr>
                                        <td><strong>${rowLabels[i]}</strong></td>
                                        <td class="conjugation-cell" data-word-id="${m[0]}" id="cell-${m[0]}">
                                            ${m[1]}
                                        </td>
                                        <td class="conjugation-cell" data-word-id="${n[0]}" id="cell-${n[0]}">
                                            ${n[1]}
                                        </td>
                                        <td class="conjugation-cell" data-word-id="${f[0]}" id="cell-${f[0]}">
                                            ${f[1]}
                                        </td>
                                        <td class="conjugation-cell" data-word-id="${mpl[0]}" id="cell-${mpl[0]}">
                                            ${mpl[1]}
                                        </td>
                                        <td class="conjugation-cell" data-word-id="${opl[0]}" id="cell-${mpl[0]}">
                                            ${mpl[1]}
                                        </td>
                                    </tr>
                                `;
                            } else {
                                rowHTML += `
                                    <tr>
                                        <td><strong>${rowLabels[i]}</strong></td>
                                        <td colspan="2" class="conjugation-cell" data-word-id="${m[0]}" id="cell-${m[0]}">
                                            ${m[1]}
                                        </td>
                                        <td class="conjugation-cell" data-word-id="${f[0]}" id="cell-${f[0]}">
                                            ${f[1]}
                                        </td>
                                        <td colspan="2" class="conjugation-cell" data-word-id="${opl[0]}" id="cell-${opl[0]}">
                                            ${opl[1]}
                                        </td>
                                    </tr>
                                `;
                            }
                        }
                        tableBody.innerHTML = rowHTML;
                    }
        
                    // Show the table
                    tableContainer.style.display = 'block';
        
                    // **Reattach Event Listeners for Clickable Cells**
                    document.querySelectorAll('.conjugation-cell').forEach(cell => {
                        cell.addEventListener('click', function () {
                            const cellId = this.id;
                            const wordId = this.dataset.wordId; 
        
                            if (!wordId || wordId === "-1" || tableType === 1 || tableType === 2) {
                                return;
                            }
        
                            const isSelected = this.style.backgroundColor === 'lightgreen';
        
                            if (isSelected) {
                                this.style.backgroundColor = ''; // Deselect
                            } else {
                                this.style.backgroundColor = 'lightgreen'; // Select
                            }
        
                            // Send only the clicked word ID and its new state
                            fetch('/save-selected-word/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': csrftoken,
                                },
                                body: JSON.stringify({ 
                                    word_id: wordId, 
                                    is_selected: !isSelected
                                }),
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.status !== 'success') {
                                    console.error('Error saving selection:', data.message);
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);
                            });
                        });
                    });
        
                } else {
                    tableContainer.style.display = 'none';
                }
            } else {
                alert('Failed to retrieve conjugation table.');
            }
        });
    });
});

document.getElementById('saveButton').addEventListener('click', function (event) {
    event.preventDefault(); // Prevent form submission
    const wordId = document.getElementById('wordId').value; // Word ID
    const newDefinition = document.getElementById('definitionText').value; // Updated definition

    // Ensure a word is selected and definition is provided
    if (!wordId || !newDefinition) {
        alert('Please select a word and provide a definition.');
        return;
    }

    // Make a POST request to update the definition
    fetch(`/update-definition/${wordId}/`, {
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
    fetch('/account/flashcards', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
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

const overlay = document.getElementById('addFlashcardsOverlay');
const openButton = document.getElementById('openAddFlashcards');
const cancelButton = document.getElementById('cancelButton');
const selectedWordsList = document.getElementById('selectedWordsList');
const addWordsButton = document.getElementById('addWordsButton');

const searchInput = document.getElementById('word-search');
const searchResults = document.getElementById('search-results');

const commonVocabSlider = document.getElementById('commonVocabSlider');
const commonVocabCount = document.getElementById('commonVocabCount');
const fetchCommonVocabButton = document.getElementById('fetchCommonVocabButton');

document.addEventListener('keydown', function (event) {
    const pressedKey = event.key.toLowerCase();
    if (!/^[a-z]$/.test(pressedKey)) return; // Ensure it's a letter

    if (document.activeElement === searchInput) return;
    const flashcards = document.querySelectorAll('.flashcard-item');

    if (flashcards.length < 2) return;

    // Skip filter button
    for (let i = 1; i < flashcards.length; i++) {
        const flashcard = flashcards[i];
        const wordText = flashcard.textContent.trim().toLowerCase();
        
        if (wordText.startsWith(pressedKey)) {
            // Scroll to the selected word
            flashcard.scrollIntoView({ block: 'center' });

            flashcards.forEach(item => item.classList.remove('active'));
            flashcard.classList.add('active');

            flashcard.click();
            break;
        }
    }
});

let debounceTimeout;
let focusLost = false;

let selectedWords = [];

openButton.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    searchInput.focus();
});

cancelButton.addEventListener('click', () => {
    overlay.classList.add('hidden');
    searchInput.value = '';
    searchResults.innerHTML = '';
    selectedWordsList.innerHTML = '';
    selectedWords = [];
});

searchInput.addEventListener('focus', function() {
    const query = this.value.trim();
    if (query.length > 0) {
        fetchSearch(query);
    }

    searchResults.classList.add('active');
    searchInput.classList.add('focused-border');
    focusLost = false;
});

searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    // Clear previous debounce timeout
    clearTimeout(debounceTimeout);

    if (query.length > 0) {
        debounceTimeout = setTimeout(() => {
            if (!focusLost) {
                fetchSearch(query);
            }
        }, 300);
    } else {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
});

function fetchSearch(query) {
    fetch(`/search_word_flashcard/?q=${query}`)
        .then(response => response.json())
        .then(data => {
            searchResults.innerHTML = '';
            if (data.length > 0) {
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item.word_text;
                    li.addEventListener('click', function() {
                        addWord(item);
                    });
                    searchResults.appendChild(li);
                });
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = '<li>No results found.</li>';
                searchResults.style.display = 'block';
            }
        })
        .catch(err => console.error("Error fetching data:", err));
}

function addWord(word) {
    console.log(word);
    if (selectedWords.some(w => w.id === word.id)) return; // Avoid duplicate words
    
    selectedWords.push(word);

    const flashcard = document.createElement('div');
    flashcard.classList.add('flashcard-item');
    flashcard.textContent = word.word_text;

    const removeBtn = document.createElement('span');
    removeBtn.textContent = '❌';
    removeBtn.classList.add('remove-word');
    removeBtn.addEventListener('click', () => {
        selectedWords = selectedWords.filter(w => w.id !== word.id);
        flashcard.remove();
    });

    flashcard.appendChild(removeBtn);
    selectedWordsList.appendChild(flashcard);

    // Remove word from dropdown
    const listItems = Array.from(searchResults.children);
    listItems.forEach(item => {
        if (item.textContent === word.word_text) {
            item.remove();
        }
    });
}

searchResults.addEventListener('click', function(event) {
    const target = event.target;

    // Ensure it's a list item (word) that was clicked
    if (target.tagName === 'LI') {
        event.stopPropagation();  // Prevent the document click listener from hiding the dropdown
    }
});

let isClickOnOverlay = false;

// Detect if the mousedown event is on the overlay background
overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay && selectedWords.length === 0) {
        isClickOnOverlay = true; // The click is starting on the overlay background
    }
});

document.addEventListener('click', (event) => {
    // Check if the overlay is visible and if there are no selected words
    if (!overlay.classList.contains('hidden') && selectedWords.length === 0) {
        if (isClickOnOverlay && event.target === overlay) {
            overlay.classList.add('hidden');
        }
    }
    isClickOnOverlay = false;
});

document.addEventListener('click', (event) => {
    if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
        searchResults.style.display = 'none';
    }
});

addWordsButton.addEventListener('click', () => {
    if (selectedWords.length === 0) {
        alert('Please select words to add.');
        return;
    }

    const wordIds = selectedWords.map(word => word.id);

    fetch('/add_flashcards/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ word_ids: wordIds })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            location.reload();
        } else {
            alert('Failed to add flashcards.');
        }
    });
});

commonVocabSlider.addEventListener('input', function() {
    commonVocabCount.textContent = commonVocabSlider.value;
});

// Fetch common vocab based on slider value
fetchCommonVocabButton.addEventListener('click', function() {
    const count = commonVocabSlider.value;

    fetch(`/fetch_common_vocab/${count}/`)
        .then(response => response.json())
        .then(data => {
            if (data && Array.isArray(data.words)) {
                data.words.forEach(word => {
                    addWord(word);  // Add each word as a flashcard
                });
            } else {
                alert('No words found.');
            }
        })
        .catch(err => console.error('Error fetching data:', err));
});