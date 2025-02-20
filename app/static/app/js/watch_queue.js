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

document.getElementById("generate-questions").addEventListener("click", function() {
    let button = this;
    let container = document.getElementById("questions-container");
    let submitAnswersContainer = document.getElementById("submit-answers-container");
    let questionsForm = document.getElementById("questions-form");

    let videoId = document.getElementById("video-id").getAttribute("data-video-id");

    fetch(`/generate_questions/${videoId}/`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        button.style.display = "none"; 
        container.style.display = "block";
        submitAnswersContainer.style.display = "block";

        questionsForm.innerHTML = '';

        // Dynamically create the question inputs
        data.questions.forEach((q, index) => {
            let questionHtml = `<p>${index + 1}. ${q}</p>`;
            questionHtml += `<input type='text' name='answer_${index}' class='question-input' required>`;
            questionsForm.innerHTML += questionHtml;
        });

        container.innerHTML = html;
    })
    .catch(error => console.error("Error fetching questions:", error));
});
