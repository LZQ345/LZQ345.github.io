(function () {
  "use strict";

  var packs = typeof window !== "undefined" && window.QUIZ_PACKS;
  if (!packs || !packs.zhenhuan || !packs.huanlesong) {
    var main = document.getElementById("main");
    if (main) {
      main.innerHTML =
        '<p class="panel" role="alert">内容加载失败，请刷新页面重试。</p>';
    }
    return;
  }

  /** @type {string|null} */
  var currentPackId = null;

  var views = {
    home: document.getElementById("view-home"),
    intro: document.getElementById("view-intro"),
    quiz: document.getElementById("view-quiz"),
    result: document.getElementById("view-result"),
  };

  var els = {
    introTitle: document.getElementById("intro-title"),
    introDynamic: document.getElementById("intro-dynamic"),
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

  var currentIndex = 0;
  /** @type {(number|null)[]} */
  var answers = [];
  var lastResultId = null;
  var lastShareText = "";

  function getPack() {
    return currentPackId ? packs[currentPackId] : null;
  }

  function getQuestions() {
    var p = getPack();
    return p ? p.QUESTIONS : [];
  }

  function getCharacterIds() {
    var p = getPack();
    return p ? p.CHARACTER_IDS : [];
  }

  function applyThemeForView(viewName) {
    document.body.classList.remove("theme-pack--zhenhuan", "theme-pack--huanlesong");
    if (viewName === "home") return;
    var p = getPack();
    if (p && p.themeClass) {
      document.body.classList.add(p.themeClass);
    }
  }

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      var el = views[key];
      if (!el) return;
      var active = key === name;
      el.hidden = !active;
      el.classList.toggle("view--active", active);
    });
    applyThemeForView(name);
    if (name === "home") {
      var first = document.querySelector(
        '.test-card[data-action="open-intro"][data-quiz]:not(.test-card--disabled)'
      );
      if (first) first.focus();
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
    var ids = getCharacterIds();
    var o = {};
    ids.forEach(function (id) {
      o[id] = 0;
    });
    return o;
  }

  function addScores(target, scoresArr) {
    var ids = getCharacterIds();
    for (var i = 0; i < ids.length; i++) {
      target[ids[i]] += scoresArr[i] || 0;
    }
  }

  function computeWinner() {
    var ids = getCharacterIds();
    var qs = getQuestions();
    var totals = scoresObject();
    for (var qi = 0; qi < qs.length; qi++) {
      var optIdx = answers[qi];
      if (optIdx == null) continue;
      var opt = qs[qi].options[optIdx];
      if (opt && opt.scores) addScores(totals, opt.scores);
    }
    var winner = ids[0];
    var best = totals[winner];
    for (var j = 1; j < ids.length; j++) {
      var id = ids[j];
      if (totals[id] > best) {
        winner = id;
        best = totals[id];
      }
    }
    return winner;
  }

  function renderIntro() {
    var p = getPack();
    if (!p) return;
    if (els.introTitle) els.introTitle.textContent = p.title;
    if (els.introDynamic) {
      els.introDynamic.innerHTML = p.introLines
        .map(function (line) {
          return "<p>" + line + "</p>";
        })
        .join("");
    }
  }

  function renderQuestion() {
    var qs = getQuestions();
    var q = qs[currentIndex];
    var n = qs.length;
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function goResult() {
    var p = getPack();
    if (!p) return;
    var winner = computeWinner();
    lastResultId = winner;
    var r = p.RESULTS[winner];
    if (!r) return;

    lastShareText = [
      p.sharePrefix,
      "我是「" + r.name + "」型 · " + r.subtitle,
      "",
      r.motto,
      "",
      "关键词：" + r.tags.join("、"),
      "",
      r.body,
      "",
      "—— 来自测测小游戏站 2.0（仅供娱乐）",
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
        '<ul class="result-bullets">' +
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

  function startQuiz() {
    var qs = getQuestions();
    answers = Array(qs.length).fill(null);
    currentIndex = 0;
    showView("quiz");
    renderQuestion();
  }

  function nextQuestion() {
    var qs = getQuestions();
    if (answers[currentIndex] == null) {
      showToast("请先选择一个选项");
      return;
    }
    if (currentIndex < qs.length - 1) {
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

  function openIntroFromButton(btn) {
    var id = btn.getAttribute("data-quiz");
    if (!id || !packs[id]) return;
    currentPackId = id;
    renderIntro();
    showView("intro");
  }

  document.body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "open-intro") {
      openIntroFromButton(btn);
    } else if (action === "back-home") {
      currentPackId = null;
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
