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
    let loadingIndicator = document.getElementById("loading-indicator");

    let videoId = document.getElementById("video-id").getAttribute("data-video-id");
    let start = document.getElementById("start").getAttribute("data-start");
    let end = document.getElementById("end").getAttribute("data-end");

    loadingIndicator.style.display = "block";
    button.style.display = "none";

    fetch(`/generate_questions/${videoId}/${start}/${end}/`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        loadingIndicator.style.display = "none";
        
        container.style.display = "block";
        submitAnswersContainer.style.display = "block";

        questionsForm.innerHTML = '';

        // Create the question inputs
        data.questions.forEach((q, index) => {
            let questionWrapper = document.createElement("div");
            questionWrapper.classList.add("question-wrapper");

            let questionHtml = `
                <p>${index + 1}. ${q.text}</p>
                <input type="hidden" name="question_id" value="${q.id}">
                <textarea name="answer_${index}" class="question-input" rows="2" required></textarea>
                <p class="answer-feedback" id="feedback_${q.id}" style="color: green; display: none;"></p>
            `;

            questionWrapper.innerHTML = questionHtml;
            questionsForm.appendChild(questionWrapper);
        });

        container.appendChild(questionsForm);
    })
    .catch(error => console.error("Error fetching questions:", error));
});

document.querySelector("#submit-answers-container form").addEventListener("submit", function(event) {
    event.preventDefault();

    let submitButton = this.querySelector("button[type='submit']");
    let submitLoadingIndicator = document.getElementById("submit-loading-indicator");

    let videoId = document.getElementById("video-id").getAttribute("data-video-id");
    let start = document.getElementById("start").getAttribute("data-start");
    let end = document.getElementById("end").getAttribute("data-end");
    let answers = {}

    // Show loading indicator and hide the submit button
    submitLoadingIndicator.style.display = "block";
    submitButton.style.display = "none";

    // Collect answers
    document.querySelectorAll(".question-wrapper").forEach((wrapper) => {
        let questionId = wrapper.querySelector("input[name='question_id']").value;
        let answer = wrapper.querySelector(".question-input").value;
        answers[questionId] = answer;
    });

    // Clear old feedback
    document.querySelectorAll(".answer-feedback").forEach((feedbackElement) => {
        feedbackElement.style.display = "none";
        feedbackElement.innerHTML = "";
    });

    submitLoadingIndicator.style.display = "block";
    submitButton.style.display = "none";

    fetch(`/submit_answers/${videoId}/${start}/${end}/`, {
        method: "POST",
        body: JSON.stringify(answers),
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        submitLoadingIndicator.style.display = "none";
        submitButton.style.display = "block";

        Object.keys(data.feedback).forEach(questionId => {
            let feedbackElement = document.getElementById(`feedback_${questionId}`);
            if (feedbackElement) {
                const feedbackText = data.feedback[questionId].replace(/\n/g, "<br>"); // New lines
                feedbackElement.innerHTML = feedbackText;
                feedbackElement.style.display = "block";
            }
        });
    })
    .catch(error => {
        console.error("Error submitting answers:", error);
        submitLoadingIndicator.innerHTML = "<p style='color: red;'>Submission failed. Try again.</p>";
    });
});