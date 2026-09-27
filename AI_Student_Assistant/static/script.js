/**
 * StudyMate AI frontend
 * Talks to Flask routes only. The OpenAI key never leaves the server.
 */

const featureCards = document.querySelectorAll(".feature-card");
const panels = document.querySelectorAll("[data-panel]");
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

const resultCard = document.getElementById("resultCard");
const resultBody = document.getElementById("resultBody");
const loadingState = document.getElementById("loadingState");
const errorBanner = document.getElementById("errorBanner");
const copyBtn = document.getElementById("copyBtn");
const clearResultBtn = document.getElementById("clearResultBtn");

const summarizeNotes = document.getElementById("summarizeNotes");
const explainTopic = document.getElementById("explainTopic");
const quizTopic = document.getElementById("quizTopic");

const summarizeBtn = document.getElementById("summarizeBtn");
const explainBtn = document.getElementById("explainBtn");
const quizBtn = document.getElementById("quizBtn");

let lastPlainText = "";

function setActiveTool(toolName) {
  featureCards.forEach((card) => {
    const isActive = card.dataset.tool === toolName;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-selected", String(isActive));
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== toolName);
  });
}

featureCards.forEach((card) => {
  card.addEventListener("click", () => setActiveTool(card.dataset.tool));
});

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => mainNav.classList.remove("is-open"));
});

function updateCounter(field) {
  const counter = document.querySelector(`.char-count[data-for="${field.id}"]`);
  if (!counter) return;
  const max = field.getAttribute("maxlength") || "";
  counter.textContent = `${field.value.length} / ${max}`;
}

[summarizeNotes, explainTopic, quizTopic].forEach((field) => {
  field.addEventListener("input", () => updateCounter(field));
  updateCounter(field);
});

document.querySelectorAll("[data-clear]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = document.getElementById(button.dataset.clear);
    if (!field) return;
    field.value = "";
    updateCounter(field);
    field.focus();
  });
});

function showResultCard() {
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setLoading(isLoading, button) {
  loadingState.hidden = !isLoading;
  if (isLoading) {
    errorBanner.hidden = true;
    resultBody.innerHTML = "";
    lastPlainText = "";
  }
  if (button) button.disabled = isLoading;
}

function showError(message) {
  errorBanner.hidden = false;
  errorBanner.textContent = message;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStudyText(text) {
  const lines = text.split("\n");
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const heading = trimmed.match(/^#{1,3}\s+(.+)/) || trimmed.match(/^([A-Z][A-Za-z0-9 /&-]{2,40}):$/);

    if (isBullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(trimmed.replace(/^[-*•]\s+/, ""))}</li>`);
      return;
    }

    closeList();
    if (!trimmed) {
      html.push("<br />");
      return;
    }
    if (heading) {
      html.push(`<h4>${escapeHtml(heading[1])}</h4>`);
      return;
    }
    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  });

  closeList();
  return html.join("");
}

function optionLabel(index) {
  return String.fromCharCode(65 + index);
}

function renderQuiz(questions) {
  lastPlainText = questions
    .map((item, index) => {
      const options = (item.options || []).map((opt, i) => `${optionLabel(i)}. ${opt}`).join("\n");
      return `Q${index + 1}. ${item.question}\n${options}\nCorrect: ${item.correct}\nExplanation: ${item.explanation}`;
    })
    .join("\n\n");

  resultBody.innerHTML = questions
    .map((item, index) => {
      const options = (item.options || [])
        .map((opt, i) => `<li>${escapeHtml(`${optionLabel(i)}. ${opt}`)}</li>`)
        .join("");
      return `
        <article class="quiz-item">
          <h4>Question ${index + 1}</h4>
          <p>${escapeHtml(item.question || "")}</p>
          <ol>${options}</ol>
          <p class="answer">Correct answer: ${escapeHtml(String(item.correct || ""))}</p>
          <p>${escapeHtml(item.explanation || "")}</p>
        </article>
      `;
    })
    .join("");
}

async function requestAI(url, body, button) {
  showResultCard();
  setLoading(true, button);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!data.success) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    if (data.quiz && Array.isArray(data.quiz)) {
      renderQuiz(data.quiz);
      return;
    }

    lastPlainText = data.result || "";
    resultBody.innerHTML = formatStudyText(lastPlainText);
  } catch (error) {
    showError("Could not connect to the server. Make sure Flask is running.");
  } finally {
    setLoading(false, button);
  }
}

summarizeBtn.addEventListener("click", () => {
  const notes = summarizeNotes.value.trim();
  if (!notes) {
    showResultCard();
    resultBody.innerHTML = "";
    setLoading(false, summarizeBtn);
    showError("Please paste your study notes before summarizing.");
    return;
  }
  requestAI("/api/summarize", { notes }, summarizeBtn);
});

explainBtn.addEventListener("click", () => {
  const topic = explainTopic.value.trim();
  if (!topic) {
    showResultCard();
    setLoading(false, explainBtn);
    showError("Please enter a topic to explain.");
    return;
  }
  requestAI("/api/explain", { topic }, explainBtn);
});

quizBtn.addEventListener("click", () => {
  const topic = quizTopic.value.trim();
  if (!topic) {
    showResultCard();
    setLoading(false, quizBtn);
    showError("Please enter a topic for the quiz.");
    return;
  }
  requestAI(
    "/api/quiz",
    {
      topic,
      number: Number(document.getElementById("quizNumber").value),
      difficulty: document.getElementById("quizDifficulty").value,
    },
    quizBtn
  );
});

copyBtn.addEventListener("click", async () => {
  if (!lastPlainText) return;
  try {
    await navigator.clipboard.writeText(lastPlainText);
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1500);
  } catch (error) {
    showError("Could not copy to clipboard. You can select the text instead.");
  }
});

clearResultBtn.addEventListener("click", () => {
  resultBody.innerHTML = "";
  lastPlainText = "";
  errorBanner.hidden = true;
  loadingState.hidden = true;
});

// Ctrl + Enter (or Cmd + Enter) submits the active tool.
document.addEventListener("keydown", (event) => {
  if (!(event.key === "Enter" && (event.ctrlKey || event.metaKey))) return;
  const activePanel = document.querySelector("[data-panel]:not(.is-hidden)");
  if (!activePanel) return;
  if (activePanel.dataset.panel === "summarize") summarizeBtn.click();
  if (activePanel.dataset.panel === "explain") explainBtn.click();
  if (activePanel.dataset.panel === "quiz") quizBtn.click();
});

quizTopic.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    quizBtn.click();
  }
});
