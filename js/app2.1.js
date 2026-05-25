(function () {
  "use strict";

  var packs = typeof window !== "undefined" && window.QUIZ_PACKS;
  if (!packs || !packs.zhenhuan || !packs.huanlesong || !packs.career) {
    var main = document.getElementById("main");
    if (main) {
      main.innerHTML =
        '<p class="panel" role="alert">内容加载失败，请刷新页面重试。</p>';
    }
    return;
  }

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
    introDisclaimer: document.getElementById("intro-disclaimer"),
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
  var answers = [];
  var lastShareText = "";

  function getPack() {
    return currentPackId ? packs[currentPackId] : null;
  }

  function isCareerPack(p) {
    return p && p.type === "career";
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
    document.body.classList.remove(
      "theme-pack--zhenhuan",
      "theme-pack--huanlesong",
      "theme-pack--career"
    );
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

  function addDimBlock(target, block) {
    if (!block) return;
    Object.keys(block).forEach(function (k) {
      target[k] = (target[k] || 0) + (block[k] || 0);
    });
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

  function computeDimensionTotals() {
    var p = getPack();
    var ids = getCharacterIds();
    var qs = getQuestions();
    var mbti = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    var holland = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    var disc = { D: 0, I: 0, S: 0, C: 0 };
    var profiles = p.DIM_PROFILE || {};

    for (var qi = 0; qi < qs.length; qi++) {
      var optIdx = answers[qi];
      if (optIdx == null) continue;
      var opt = qs[qi].options[optIdx];
      if (!opt) continue;
      if (opt.dims) {
        if (opt.dims.mbti) addDimBlock(mbti, opt.dims.mbti);
        if (opt.dims.holland) addDimBlock(holland, opt.dims.holland);
        if (opt.dims.disc) addDimBlock(disc, opt.dims.disc);
      }
      if (opt.scores) {
        for (var i = 0; i < ids.length; i++) {
          var pts = opt.scores[i] || 0;
          if (pts <= 0) continue;
          var prof = profiles[ids[i]];
          if (!prof) continue;
          if (prof.mbti) {
            Object.keys(prof.mbti).forEach(function (k) {
              mbti[k] = (mbti[k] || 0) + prof.mbti[k] * pts;
            });
          }
          if (prof.holland) {
            Object.keys(prof.holland).forEach(function (k) {
              holland[k] = (holland[k] || 0) + prof.holland[k] * pts;
            });
          }
          if (prof.disc) {
            Object.keys(prof.disc).forEach(function (k) {
              disc[k] = (disc[k] || 0) + prof.disc[k] * pts;
            });
          }
        }
      }
    }
    return { mbti: mbti, holland: holland, disc: disc };
  }

  function formatDimensionSummary(dims) {
    var m = dims.mbti;
    var h = dims.holland;
    var d = dims.disc;
    var mbtiPairs = [
      ["E", "I"],
      ["S", "N"],
      ["T", "F"],
      ["J", "P"],
    ];
    var mbtiStr = mbtiPairs
      .map(function (pair) {
        return m[pair[0]] >= m[pair[1]] ? pair[0] : pair[1];
      })
      .join("");
    var hollandOrder = [
      ["R", "现实型"],
      ["I", "研究型"],
      ["A", "艺术型"],
      ["S", "社会型"],
      ["E", "企业型"],
      ["C", "常规型"],
    ];
    var hollandSorted = hollandOrder
      .map(function (item) {
        return { code: item[0], score: h[item[0]] || 0 };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
    var hollandTop = hollandSorted
      .slice(0, 3)
      .map(function (x) {
        return x.code;
      })
      .join("");
    var discKeys = ["D", "I", "S", "C"];
    var discLabels = { D: "支配型", I: "影响型", S: "稳健型", C: "谨慎型" };
    var discWinner = discKeys[0];
    var discBest = d[discWinner] || 0;
    for (var i = 1; i < discKeys.length; i++) {
      var k = discKeys[i];
      if ((d[k] || 0) > discBest) {
        discWinner = k;
        discBest = d[k];
      }
    }
    return {
      mbtiLine: "MBTI 倾向（借鉴）：" + mbtiStr + " — 能量/信息/决策/计划四维综合",
      hollandLine: "霍兰德前三码（借鉴）：" + hollandTop,
      discLine: "DISC 主导（借鉴）：" + discLabels[discWinner],
      mbtiStr: mbtiStr,
      hollandTop: hollandTop,
      discLabel: discLabels[discWinner],
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    if (els.introDisclaimer) {
      els.introDisclaimer.textContent = isCareerPack(p)
        ? "本测试借鉴经典测评维度思路，仅供娱乐与自我探索，不构成心理或职业决策建议，非官方认证测评。"
        : "本测试仅供娱乐，不构成任何心理或职业建议。";
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

  function renderCareerPathHtml(path) {
    var keys = ["short_term", "mid_term", "long_term"];
    var html = '<div class="career-path">';
    keys.forEach(function (key) {
      var stage = path[key];
      if (!stage) return;
      html +=
        '<article class="career-path__stage">' +
        "<h3>" +
        escapeHtml(stage.title) +
        "</h3>" +
        '<p class="career-path__focus">' +
        escapeHtml(stage.focus) +
        "</p>" +
        "<ul>" +
        stage.actions
          .map(function (a) {
            return "<li>" + escapeHtml(a) + "</li>";
          })
          .join("") +
        "</ul></article>";
    });
    html += "</div>";
    return html;
  }

  function buildCareerShareText(p, r, dimSum) {
    var path = r.career_path;
    var lines = [
      p.sharePrefix,
      "我是「" + r.name + "」型 · " + r.subtitle,
      r.motto,
      "",
      "适合环境：" + r.work_env.join("；"),
      "适合角色气质：" + r.team_roles.join("、"),
      "团队协作：" + r.collaboration,
      "",
      dimSum.hollandLine,
      dimSum.mbtiLine,
      dimSum.discLine,
      "",
      "【职业成长路线】",
    ];
    ["short_term", "mid_term", "long_term"].forEach(function (k) {
      var st = path[k];
      lines.push(st.title + "：" + st.focus);
      st.actions.forEach(function (a) {
        lines.push("  · " + a);
      });
    });
    lines.push("", "仅供娱乐与自我探索，不构成职业建议。");
    return lines.join("\n");
  }

  function goResult() {
    var p = getPack();
    if (!p) return;
    var winner = computeWinner();
    var r = p.RESULTS[winner];
    if (!r) return;

    if (isCareerPack(p)) {
      var dimSum = formatDimensionSummary(computeDimensionTotals());
      lastShareText = buildCareerShareText(p, r, dimSum);
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
          r.tags
            .map(function (t) {
              return "<li>" + escapeHtml(t) + "</li>";
            })
            .join("") +
          "</ul>" +
          '<p class="result-body">' +
          escapeHtml(r.body) +
          "</p>" +
          '<div class="result-dim-summary" role="region" aria-label="维度倾向摘要">' +
          "<p><strong>倾向摘要</strong>（借鉴经典体系，非正式测评）</p>" +
          "<p>" +
          escapeHtml(dimSum.hollandLine) +
          "</p>" +
          "<p>" +
          escapeHtml(dimSum.mbtiLine) +
          "</p>" +
          "<p>" +
          escapeHtml(dimSum.discLine) +
          "</p></div>" +
          '<h2 class="result-section-title">适合的工作环境</h2>' +
          '<ul class="result-bullets">' +
          r.work_env
            .map(function (b) {
              return "<li>" + escapeHtml(b) + "</li>";
            })
            .join("") +
          "</ul>" +
          '<h2 class="result-section-title">适合的角色气质</h2>' +
          '<ul class="result-bullets">' +
          r.team_roles
            .map(function (b) {
              return "<li>" + escapeHtml(b) + "</li>";
            })
            .join("") +
          "</ul>" +
          '<h2 class="result-section-title">团队协作方式</h2>' +
          '<p class="result-body">' +
          escapeHtml(r.collaboration) +
          "</p>" +
          '<h2 class="result-section-title">职业成长路线</h2>' +
          renderCareerPathHtml(r.career_path) +
          '<p class="result-tip">' +
          escapeHtml(r.tip) +
          "</p>";
      }
    } else {
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
        "—— 来自测测小游戏站 2.1（仅供娱乐）",
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
          r.tags
            .map(function (t) {
              return "<li>" + escapeHtml(t) + "</li>";
            })
            .join("") +
          "</ul>" +
          '<p class="result-body">' +
          escapeHtml(r.body) +
          "</p>" +
          '<ul class="result-bullets">' +
          r.bullets
            .map(function (b) {
              return "<li>" + escapeHtml(b) + "</li>";
            })
            .join("") +
          "</ul>" +
          '<p class="result-tip">' +
          escapeHtml(r.tip) +
          "</p>";
      }
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
