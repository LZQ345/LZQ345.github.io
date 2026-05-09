(function () {
  "use strict";

  const data = typeof window !== "undefined" && window.QUIZ_DATA;
  if (!data || !data.QUESTIONS || !data.RESULTS) {
    var main = document.getElementById("main");
    if (main) {
      main.innerHTML =
        '<p class="panel" role="alert">内容加载失败，请刷新页面重试。</p>';
    }
    return;
  }

  const { CHARACTER_IDS, QUESTIONS, RESULTS } = data;

  const views = {
    home: document.getElementById("view-home"),
    intro: document.getElementById("view-intro"),
    quiz: document.getElementById("view-quiz"),
    result: document.getElementById("view-result"),
  };

  const els = {
    quizProgress: document.getElementById("quiz-progress"),
    quizProgressbar: document.getElementById("quiz-progressbar"),
    quizProgressFill: document.getElementById("quiz-progress-fill"),
    questionScene: document.getElementById("question-scene"),
    questionTitle: document.getElementById("question-title"),
    questionOptions: document.getElementById("question-options"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    toast: document.getElementById("toast"),
    resultPanel: document.getElementById("result-panel"),
    btnCopy: document.getElementById("btn-copy"),
  };

  let currentIndex = 0;
  /** @type {(number|null)[]} */
  let answers = Array(QUESTIONS.length).fill(null);
  let lastResultId = null;
  let lastShareText = "";

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      var el = views[key];
      if (!el) return;
      var active = key === name;
      el.hidden = !active;
      el.classList.toggle("view--active", active);
    });
    if (name === "home") {
      var openBtn = document.getElementById("btn-open-zhenhuan");
      if (openBtn) openBtn.focus();
    }
  }

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      els.toast.textContent = "";
      els.toast.hidden = true;
    }, 2200);
  }

  function scoresObject() {
    var o = {};
    CHARACTER_IDS.forEach(function (id) {
      o[id] = 0;
    });
    return o;
  }

  function addScores(target, scoresArr) {
    for (var i = 0; i < CHARACTER_IDS.length; i++) {
      target[CHARACTER_IDS[i]] += scoresArr[i] || 0;
    }
  }

  function computeWinner() {
    var totals = scoresObject();
    for (var qi = 0; qi < QUESTIONS.length; qi++) {
      var optIdx = answers[qi];
      if (optIdx == null) continue;
      var opt = QUESTIONS[qi].options[optIdx];
      if (opt && opt.scores) addScores(totals, opt.scores);
    }
    var winner = CHARACTER_IDS[0];
    var best = totals[winner];
    for (var j = 1; j < CHARACTER_IDS.length; j++) {
      var id = CHARACTER_IDS[j];
      if (totals[id] > best) {
        winner = id;
        best = totals[id];
      }
    }
    return winner;
  }

  function renderQuestion() {
    var q = QUESTIONS[currentIndex];
    var n = QUESTIONS.length;
    var step = currentIndex + 1;

    if (els.quizProgress) {
      els.quizProgress.textContent = "第 " + step + " / " + n + " 题";
    }
    if (els.quizProgressbar) {
      els.quizProgressbar.setAttribute("aria-valuenow", String(step));
      els.quizProgressbar.setAttribute("aria-valuemax", String(n));
    }
    if (els.quizProgressFill) {
      els.quizProgressFill.style.width = (step / n) * 100 + "%";
    }

    if (els.questionScene) els.questionScene.textContent = q.scene;
    if (els.questionTitle) els.questionTitle.textContent = q.text;

    if (els.questionOptions) {
      els.questionOptions.innerHTML =
        '<legend class="visually-hidden">请选择一项</legend>';
      var selected = answers[currentIndex];
      q.options.forEach(function (opt, idx) {
        var id = "q" + q.id + "-opt-" + idx;
        var label = document.createElement("label");
        label.className = "option";
        label.setAttribute("for", id);
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "quiz-option";
        input.id = id;
        input.value = String(idx);
        input.checked = selected === idx;
        var badge = document.createElement("span");
        badge.className = "option__badge";
        badge.textContent = opt.key;
        var span = document.createElement("span");
        span.className = "option__label";
        span.textContent = opt.text;
        label.appendChild(input);
        label.appendChild(badge);
        label.appendChild(span);
        els.questionOptions.appendChild(label);
      });
      els.questionOptions.onchange = function (e) {
        var t = e.target;
        if (t && t.name === "quiz-option") {
          answers[currentIndex] = parseInt(t.value, 10);
        }
      };
    }

    if (els.btnPrev) {
      els.btnPrev.disabled = currentIndex === 0;
    }
    if (els.btnNext) {
      els.btnNext.textContent = currentIndex === n - 1 ? "查看结果" : "下一题";
    }
  }

  function goResult() {
    var winner = computeWinner();
    lastResultId = winner;
    var r = RESULTS[winner];
    if (!r) return;

    lastShareText = [
      "【测测你是甄嬛传里的谁】",
      "我是「" + r.name + "」型 · " + r.subtitle,
      "",
      r.motto,
      "",
      "关键词：" + r.tags.join("、"),
      "",
      r.body,
      "",
      "—— 来自测测小游戏站（仅供娱乐）",
    ].join("\n");

    if (els.resultPanel) {
      els.resultPanel.innerHTML =
        '<p class="result-role">你是「' +
        escapeHtml(r.name) +
        "」型 · " +
        escapeHtml(r.subtitle) +
        "</p>" +
        '<p class="result-motto">' +
        escapeHtml(r.motto) +
        "</p>" +
        '<ul class="result-tags" role="list">' +
        r.tags.map(function (t) {
          return "<li>" + escapeHtml(t) + "</li>";
        }).join("") +
        "</ul>" +
        '<p class="result-body">' +
        escapeHtml(r.body) +
        "</p>" +
        "<ul class=\"result-bullets\">" +
        r.bullets.map(function (b) {
          return "<li>" + escapeHtml(b) + "</li>";
        }).join("") +
        "</ul>" +
        '<p class="result-tip">' +
        escapeHtml(r.tip) +
        "</p>";
    }
    showView("result");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function startQuiz() {
    answers = Array(QUESTIONS.length).fill(null);
    currentIndex = 0;
    showView("quiz");
    renderQuestion();
  }

  function nextQuestion() {
    if (answers[currentIndex] == null) {
      showToast("请先选择一个选项");
      return;
    }
    if (currentIndex < QUESTIONS.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else {
      goResult();
    }
  }

  function prevQuestion() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      renderQuestion();
    }
  }

  document.body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "open-intro") {
      showView("intro");
    } else if (action === "back-home") {
      showView("home");
    } else if (action === "start-quiz") {
      startQuiz();
    } else if (action === "restart-quiz") {
      startQuiz();
    } else if (action === "next-question") {
      nextQuestion();
    } else if (action === "prev-question") {
      prevQuestion();
    }
  });

  if (els.btnCopy) {
    els.btnCopy.addEventListener("click", function () {
      if (!lastShareText) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastShareText).then(
          function () {
            showToast("已复制到剪贴板");
          },
          function () {
            fallbackCopy();
          }
        );
      } else {
        fallbackCopy();
      }
    });
  }

  function fallbackCopy() {
    try {
      var ta = document.createElement("textarea");
      ta.value = lastShareText;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("已复制到剪贴板");
    } catch (err) {
      showToast("复制失败，请手动长按选择文案");
    }
  }

  showView("home");
})();
