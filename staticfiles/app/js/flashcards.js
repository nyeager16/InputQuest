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
        if (this.id === 'filterButton') {
            return;
        }
        // Remove active class from all items
        flashcardItems.forEach(i => i.classList.remove('active'));
        // Add active class to the clicked item
        this.classList.add('active');
        // Update the textarea with the clicked word's text
        document.getElementById('wordId').value = this.dataset.id;
        console.log(this.dataset.definition);
        document.getElementById('definitionText').value = this.dataset.definition;

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
                                <th></th>
                                <th>Singular</th>
                                <th>Plural</th>
                            </tr>
                        `;
                        pastTableHead.innerHTML = `
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
        
                            if (!wordId || wordId === "-1" || tableType === 1) {
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
    console.log('Save Changes clicked');
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
    console.log('Filter button clicked');

    fetch('/account/flashcards', {
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
