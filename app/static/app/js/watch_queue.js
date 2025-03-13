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
    let start = document.getElementById("start").getAttribute("data-start");
    let end = document.getElementById("end").getAttribute("data-end");

    fetch(`/generate_questions/${videoId}/${start}/${end}/`, {
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

    let videoId = document.getElementById("video-id").getAttribute("data-video-id");
    let start = document.getElementById("start").getAttribute("data-start");
    let end = document.getElementById("end").getAttribute("data-end");
    let answers = {}

    document.querySelectorAll(".question-wrapper").forEach((wrapper) => {
        let questionId = wrapper.querySelector("input[name='question_id']").value;
        let answer = wrapper.querySelector(".question-input").value;
        answers[questionId] = answer;
    });

    fetch(`/submit_answers/${videoId}/${start}/${end}/`, {
        method: "POST",
        body: JSON.stringify(answers),
        headers: {
            'X-CSRFToken': csrftoken,
        }
    })
    .then(response => response.json())
    .then(data => {
        Object.keys(data.feedback).forEach(questionId => {
            let feedbackElement = document.getElementById(`feedback_${questionId}`);
            if (feedbackElement) {
                feedbackElement.textContent = data.feedback[questionId];
                feedbackElement.style.display = "block";
            }
        });
    })
    .catch(error => console.error("Error submitting answers:", error));
});