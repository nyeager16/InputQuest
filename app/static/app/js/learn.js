document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.word-section');
    let currentSection = 0;
    let isScrolling = false;

    const searchInput = document.getElementById('word-search');
    const searchResults = document.getElementById('search-results');
    
    let debounceTimeout;
    let focusLost = false;

    searchInput.setAttribute('autocomplete', 'off');
    
    // Scroll snapping logic
    window.addEventListener('wheel', function(event) {
        if (isScrolling || document.body.classList.contains('no-scroll')) return;

        event.preventDefault();

        if (event.deltaY > 0) {
            // Scroll down
            if (currentSection < sections.length - 1) {
                currentSection++;
                scrollToSection(currentSection);
            }
        } else {
            // Scroll up
            if (currentSection > 0) {
                currentSection--;
                scrollToSection(currentSection);
            }
        }

        isScrolling = true;
        setTimeout(() => isScrolling = false, 500);
    }, { passive: false });  // Use passive: false to allow preventDefault

    // Lock scroll when focusing on search input
    searchInput.addEventListener('focus', function() {
        document.body.classList.add('no-scroll');
        searchResults.classList.add('active');  // Add class when focused

        // Add class to show border when input is focused
        searchInput.classList.add('focused-border');  // This class will handle border styling

        focusLost = false;  // Reset focusLost flag when input is focused again
    });

    // Unlock scroll when clicking outside the search area
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            document.body.classList.remove('no-scroll');
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            focusLost = true;

            searchInput.classList.remove('focused-border');
        }
    });

    // Search logic with debounce
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear the previous debounce timeout
        clearTimeout(debounceTimeout);

        // If the query is not empty, wait for the user to stop typing
        if (query.length > 0) {
            debounceTimeout = setTimeout(function() {
                // Only send the request if focus is not lost
                if (!focusLost) {
                    fetchSearch(query);
                }
            }, 300);
        } else {
            searchResults.innerHTML = '';
        }
    });

    // Redirect on Enter
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstResult = searchResults.querySelector('li');
            if (firstResult) {
                window.location.href = `/learn/${firstResult.textContent}/`;
            }
        }
    });

    // Fetch function to send search request
    function fetchSearch(query) {
        fetch(`/search_word/?q=${query}`)
            .then(response => response.json())
            .then(data => {
                searchResults.innerHTML = '';
                if (data.length > 0) {
                    data.forEach(word => {  // 'word' is now just the string value
                        const li = document.createElement('li');
                        li.textContent = word;  // 'word' directly holds the word_text value
                        li.addEventListener('click', function() {
                            window.location.href = `/learn/${word}/`;  // Directly use the string word here
                        });
                        searchResults.appendChild(li);
                    });
                } else {
                    searchResults.innerHTML = '<li>No results found.</li>';
                }
            })
            .catch(err => console.error("Error fetching data:", err));
    }

    // Function to scroll to a specific section
    function scrollToSection(index) {
        sections[index].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
});
