const CodeTrackerApp = {
  // 1. STATE: All dynamic data of the application
  state: {
    resources: [],
    achievementsData: [],
    timerInterval: null,
    timeLeft: 1500,
    isTimerRunning: false,
    totalStudyTime: 0,
    tasks: [],
    completedTasksCount: 0,
    streak: 0,
    pomodoroCount: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    theme: "light",
    progressChart: null,
    audioContext: new (window.AudioContext || window.webkitAudioContext)(),
    conversationHistory: [],
  },

  // 2. CONFIG: Static configuration
  config: {
    GEMINI_API_KEY: "AIzaSyDTUji4owAfbQ5AXdogAuGYq9eXwQoJ83E",
  },

  // 3. STORAGE: Handles localStorage
  storage: {
    save(key, value) {
      localStorage.setItem(`codeTracker.${key}`, JSON.stringify(value));
    },
    load(key, defaultValue = null) {
      const item = localStorage.getItem(`codeTracker.${key}`);
      return item ? JSON.parse(item) : defaultValue;
    },
  },

  // 4. UI: Functions that manipulate the DOM
  ui: {
    updateTimerDisplay() {
      const minutes = Math.floor(CodeTrackerApp.state.timeLeft / 60);
      const seconds = CodeTrackerApp.state.timeLeft % 60;
      document.getElementById("timerDisplay").textContent = `${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    },

    renderTasks() {
      const container = document.getElementById("taskList");
      const tasks = CodeTrackerApp.state.tasks;
      if (tasks.length === 0) {
        container.innerHTML =
          '<p style="text-align: center; color: var(--gray); padding: 20px;">Nenhuma tarefa ainda. Adicione sua primeira!</p>';
        return;
      }
      container.innerHTML = tasks
        .map(
          (task) => `
            <div class="task-item ${task.completed ? "completed" : ""}">
                <input type="checkbox" ${task.completed ? "checked" : ""} 
                       onchange="CodeTrackerApp.handlers.toggleTask(${
                         task.id
                       })">
                <div class="task-text">${task.text}</div>
                <div class="task-actions">
                    <button class="icon-btn" onclick="CodeTrackerApp.handlers.deleteTask(${
                      task.id
                    })" title="Deletar"><i class="fas fa-trash-alt" style="color: var(--gray);"></i></button>
                </div>
            </div>
        `
        )
        .join("");
    },

    renderResources() {
      const container = document.getElementById("resourcesList");
      container.innerHTML = CodeTrackerApp.state.resources
        .map(
          (resource) => `
            <div class="resource-item" onclick="window.open('${
              resource.link
            }', '_blank')">
                <div class="resource-title">${resource.title}</div>
                <div class="resource-desc">${resource.desc}</div>
                <div class="resource-tags">
                    ${resource.tags
                      .map((tag) => `<span class="tag">${tag}</span>`)
                      .join("")}
                </div>
            </div>
        `
        )
        .join("");
    },

    renderAchievements() {
      const container = document.getElementById("achievementGrid");
      const achievements = CodeTrackerApp.state.achievementsData;
      container.innerHTML = achievements
        .map(
          (achievement) => `
            <div class="achievement ${
              achievement.unlocked ? "unlocked" : ""
            }" title="${achievement.desc}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
            </div>
        `
        )
        .join("");

      const unlockedCount = achievements.filter((a) => a.unlocked).length;
      document.getElementById("achievements").textContent = unlockedCount;
      const progress = (unlockedCount / achievements.length) * 100;
      document.getElementById(
        "achievementsProgress"
      ).style.width = `${progress}%`;
    },

    updateAllStats() {
      const state = CodeTrackerApp.state;
      document.getElementById("totalHours").textContent = Math.floor(
        state.totalStudyTime / 60
      );
      document.getElementById("completedTasks").textContent =
        state.completedTasksCount;
      document.getElementById("currentStreak").textContent = state.streak;
      document.getElementById("pomodoroCount").textContent =
        state.pomodoroCount;

      const hoursProgress = Math.min((state.totalStudyTime / 600) * 100, 100);
      document.getElementById(
        "hoursProgress"
      ).style.width = `${hoursProgress}%`;

      const tasksProgress = Math.min(
        (state.completedTasksCount / 50) * 100,
        100
      );
      document.getElementById(
        "tasksProgress"
      ).style.width = `${tasksProgress}%`;

      const streakProgress = Math.min((state.streak / 30) * 100, 100);
      document.getElementById(
        "streakProgress"
      ).style.width = `${streakProgress}%`;

      CodeTrackerApp.logic.updateLevel();
    },

    initChart() {
      const ctx = document.getElementById("progressChart").getContext("2d");
      const isDark = document.body.classList.contains("dark-mode");

      CodeTrackerApp.state.progressChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
          datasets: [
            {
              label: "Horas de Estudo",
              data: CodeTrackerApp.state.weeklyData,
              borderColor: "#6366f1",
              backgroundColor: "rgba(99, 102, 241, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: isDark ? "#f1f5f9" : "#1e293b" } },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: isDark ? "#cbd5e1" : "#64748b" },
              grid: {
                color: isDark
                  ? "rgba(203, 213, 225, 0.1)"
                  : "rgba(100, 116, 139, 0.1)",
              },
            },
            x: {
              ticks: { color: isDark ? "#cbd5e1" : "#64748b" },
              grid: {
                color: isDark
                  ? "rgba(203, 213, 225, 0.1)"
                  : "rgba(100, 116, 139, 0.1)",
              },
            },
          },
        },
      });
    },

    updateChart() {
      const state = CodeTrackerApp.state;
      const today = new Date().getDay();
      state.weeklyData[today] =
        Math.round((state.totalStudyTime / 60) * 10) / 10;
      CodeTrackerApp.storage.save("weeklyData", state.weeklyData);
      if (state.progressChart) {
        state.progressChart.data.datasets[0].data = state.weeklyData;
        state.progressChart.update();
      }
    },

    showNotification(message) {
      const notification = document.getElementById("notification");
      document.getElementById("notificationText").textContent = message;
      notification.classList.add("show");
      setTimeout(() => notification.classList.remove("show"), 4000);
    },

    showAchievementModal(name, icon) {
      document.getElementById(
        "achievementMessage"
      ).innerHTML = `<div style="font-size: 48px; margin: 20px 0;">${icon}</div>Você desbloqueou: <strong>${name}</strong>!`;
      document.getElementById("achievementModal").classList.add("active");
    },

    closeModal() {
      document
        .querySelectorAll(".modal.active")
        .forEach((modal) => modal.classList.remove("active"));
      CodeTrackerApp.ui.renderTasks();
    },

    setButtonLoading(button, isLoading, text = "Gerar com IA") {
      if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<div class="loading" style="width: 16px; height: 16px; border-width: 2px;"></div> Gerando...`;
      } else {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-magic"></i> ${text}`;
      }
    },

    adjustMainPadding() {
      if (window.innerWidth <= 968) {
        const headerHeight = document.querySelector(".header").offsetHeight;
        document.querySelector("main").style.paddingTop = `${
          headerHeight + 20
        }px`;
      } else {
        document.querySelector("main").style.paddingTop = "0px";
      }
    },

    addMessageToChat(sender, text) {
      const messagesContainer = document.getElementById("chatMessages");
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("chat-message", `${sender}-message`);
      messageDiv.textContent = text;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll
    },
  },

  // 5. LOGIC: Core business logic
  logic: {
    playSound(frequency = 800, duration = 200) {
      const { audioContext } = CodeTrackerApp.state;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    },

    completePomodoro() {
      const { handlers, state, storage, ui, logic } = CodeTrackerApp;
      handlers.pauseTimer();
      state.pomodoroCount++;
      state.totalStudyTime += 25;

      storage.save("totalStudyTime", state.totalStudyTime);
      storage.save("pomodoroCount", state.pomodoroCount);

      ui.updateAllStats();
      ui.updateChart();
      logic.checkAchievements();

      logic.playSound(880, 200);
      setTimeout(() => logic.playSound(1000, 300), 300);

      ui.showNotification(
        "🎉 Pomodoro concluído! Faça uma pausa de 5 minutos."
      );
      handlers.setTimer(5);
    },

    completeTask(taskId) {
      const { state, storage, ui, logic } = CodeTrackerApp;
      const task = state.tasks.find((t) => t.id === taskId);
      if (task && !task.completed) {
        task.completed = true;
        state.completedTasksCount++;
        logic.playSound(600, 100);
        logic.updateStreak();
        logic.updateStatsAndSave();
      }
    },

    updateStatsAndSave() {
      const { state, storage, ui, logic } = CodeTrackerApp;
      storage.save("tasks", state.tasks);
      storage.save("completedTasksCount", state.completedTasksCount);
      ui.updateAllStats();
      logic.checkAchievements();
    },

    updateStreak() {
      const { state, storage } = CodeTrackerApp;
      const lastActivity = storage.load("lastActivity", null);
      const today = new Date().toDateString();

      if (lastActivity !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        state.streak =
          lastActivity === yesterday.toDateString() ? state.streak + 1 : 1;
        storage.save("lastActivity", today);
        storage.save("streak", state.streak);
      }
    },

    checkAchievements() {
      const { state, logic } = CodeTrackerApp;
      if (!state.achievementsData || state.achievementsData.length === 0)
        return;

      const check = (id, condition) => {
        if (condition && !state.achievementsData[id - 1].unlocked) {
          logic.unlockAchievement(id);
        }
      };

      check(1, state.tasks.length > 0);
      check(2, state.totalStudyTime >= 60);
      check(3, state.streak >= 3);
      check(4, state.completedTasksCount >= 10);
      check(5, new Date().getHours() < 8);
      check(6, state.pomodoroCount >= 5);
    },

    unlockAchievement(id) {
      const { state, storage, ui, logic } = CodeTrackerApp;
      const achievement = state.achievementsData.find((a) => a.id === id);
      if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
        storage.save("achievements", state.achievementsData);
        ui.showAchievementModal(achievement.name, achievement.icon);
        ui.renderAchievements();
        logic.playSound(1200, 300);
      }
    },

    updateLevel() {
      const { totalStudyTime, completedTasksCount, streak } =
        CodeTrackerApp.state;
      const totalPoints =
        totalStudyTime / 60 + completedTasksCount + streak * 2;
      let level = "Aprendiz";
      if (totalPoints >= 100) level = "Expert";
      else if (totalPoints >= 50) level = "Avançado";
      else if (totalPoints >= 20) level = "Intermediário";
      document.getElementById("userLevel").textContent = level;
    },
  },

  // 6. API: Functions for external API calls
  api: {
    async generateTasksWithAI() {
      const { config, ui, state, storage } = CodeTrackerApp;
      const input = document.getElementById("taskInput");
      const topic = input.value.trim();
      const generateBtn = document.querySelector(
        'button[onclick*="generateTasksWithAI"]'
      );

      if (!config.GEMINI_API_KEY)
        return ui.showNotification(
          "⚠️ Configure sua chave de API nas configurações."
        );
      if (!topic)
        return ui.showNotification(
          "⚠️ Digite um tópico para a IA gerar as tarefas."
        );

      ui.setButtonLoading(generateBtn, true);

      try {
        const prompt = `Crie uma lista de 5 tarefas práticas e concisas para um desenvolvedor estudar o tópico "${topic}". Retorne APENAS um array JSON válido de strings, sem nenhum texto adicional, explicação ou formatação markdown. Exemplo: ["Tarefa 1", "Tarefa 2", "Tarefa 3"]`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": config.GEMINI_API_KEY,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Erro desconhecido na API."
          );
        }

        const data = await response.json();
        if (
          !data.candidates ||
          data.candidates.length === 0 ||
          !data.candidates[0].content
        ) {
          throw new Error("Resposta inválida da API");
        }

        let responseText = data.candidates[0].content.parts[0].text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Formato de resposta inválido");

        const generatedTasks = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(generatedTasks) || generatedTasks.length === 0)
          throw new Error("Nenhuma tarefa foi gerada");

        generatedTasks.forEach((taskText) => {
          state.tasks.push({
            id: Date.now() + Math.random(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
          });
        });

        storage.save("tasks", state.tasks);
        ui.renderTasks();
        input.value = "";
        ui.showNotification(
          `✅ ${generatedTasks.length} tarefas para "${topic}" geradas com sucesso!`
        );
      } catch (error) {
        console.error("Erro ao gerar tarefas com IA:", error);
        ui.showNotification(`❌ Erro: ${error.message}`);
      } finally {
        ui.setButtonLoading(generateBtn, false);
      }
    },

    async startQuizForTask(task) {
      const { config, ui, logic } = CodeTrackerApp;
      const modal = document.getElementById("quizModal");
      const quizContent = document.getElementById("quizContent");
      const quizResult = document.getElementById("quizResult");

      quizContent.innerHTML = `<div class="loading" style="margin: 20px auto;"></div><p style="color: var(--gray);">Gerando pergunta...</p>`;
      quizResult.innerHTML = "";
      modal.classList.add("active");

      if (!config.GEMINI_API_KEY) {
        quizContent.innerHTML = `<p style="color: var(--danger);">❌ Chave de API não configurada.</p>`;
        setTimeout(ui.closeModal, 3000);
        return;
      }

      try {
        const prompt = `Crie uma pergunta de múltipla escolha sobre "${task.text}" para nível iniciante/intermediário. Retorne APENAS um objeto JSON válido sem formatação markdown com: "question" (string), "options" (array com 4 strings) e "answer" (string, texto exato de uma opção). Exemplo: {"question":"Qual...?","options":["A","B","C","D"],"answer":"A"}`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": config.GEMINI_API_KEY,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Erro desconhecido na API."
          );
        }

        const data = await response.json();
        if (
          !data.candidates ||
          data.candidates.length === 0 ||
          !data.candidates[0].content
        ) {
          throw new Error("Resposta inválida da API do quiz");
        }

        let responseText = data.candidates[0].content.parts[0].text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Formato de resposta do quiz inválido");

        const quizData = JSON.parse(jsonMatch[0]);
        if (!quizData.question || !quizData.options || !quizData.answer)
          throw new Error("Dados do quiz incompletos");

        quizContent.innerHTML = `
          <p style="font-size: 18px; margin-bottom: 20px;">${
            quizData.question
          }</p>
          <div class="quiz-options">
            ${quizData.options
              .map(
                (option) =>
                  `<button class="btn btn-light" style="width: 100%; margin-bottom: 10px; justify-content: flex-start;" 
                       onclick="CodeTrackerApp.handlers.checkQuizAnswer(this, '${btoa(
                         option
                       )}', '${btoa(quizData.answer)}', ${task.id})">
                ${option}
              </button>`
              )
              .join("")}
          </div>`;
      } catch (error) {
        console.error("Erro ao gerar quiz:", error);
        quizContent.innerHTML = `<p style="color: var(--danger);">❌ Erro: ${error.message}</p>`;
        setTimeout(ui.closeModal, 2000);
      }
    },

    async getChatResponse() {
      const { config, ui, state } = CodeTrackerApp;
      if (!config.GEMINI_API_KEY) {
        ui.addMessageToChat(
          "ai",
          "Por favor, configure sua chave de API nas configurações para que eu possa ajudar."
        );
        return;
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": config.GEMINI_API_KEY,
            },
            body: JSON.stringify({ contents: state.conversationHistory }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Erro desconhecido na API."
          );
        }

        const data = await response.json();
        if (
          !data.candidates ||
          data.candidates.length === 0 ||
          !data.candidates[0].content
        ) {
          throw new Error("Não consegui gerar uma resposta.");
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        state.conversationHistory.push({
          role: "model",
          parts: [{ text: aiResponse }],
        });
        ui.addMessageToChat("ai", aiResponse);
      } catch (error) {
        console.error("Erro na resposta do chat:", error);
        ui.addMessageToChat(
          "ai",
          `Desculpe, ocorreu um erro: ${error.message}`
        );
      }
    },

    async loadGitHubRepos() {
      const { ui, logic } = CodeTrackerApp;
      const username = document.getElementById("githubUsername").value.trim();
      const container = document.getElementById("repoContainer");

      if (!username)
        return ui.showNotification("⚠️ Digite um username do GitHub!");

      container.innerHTML =
        '<div style="text-align: center; padding: 40px;"><div class="loading"></div><p style="margin-top: 20px; color: var(--gray);">Carregando...</p></div>';

      try {
        const response = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`
        );
        if (!response.ok) throw new Error("Usuário não encontrado");

        const repos = await response.json();
        if (repos.length === 0) {
          container.innerHTML =
            '<p style="text-align: center; color: var(--gray); padding: 40px;">Nenhum repositório encontrado.</p>';
          return;
        }

        container.innerHTML = repos
          .map(
            (repo) => `
          <div class="repo-card">
              <div class="repo-name">${repo.name}</div>
              <div class="repo-desc">${
                repo.description || "Sem descrição"
              }</div>
              <div class="repo-stats">
                  <span>⭐ ${repo.stargazers_count}</span>
                  <span>🍴 ${repo.forks_count}</span>
                  <span>${repo.language || "N/A"}</span>
              </div>
              <div style="margin-top: 15px;">
                  <a href="${
                    repo.html_url
                  }" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600;">Ver no GitHub →</a>
              </div>
          </div>`
          )
          .join("");

        logic.playSound(700, 150);
        ui.showNotification(`✅ ${repos.length} repositórios carregados!`);
      } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">❌ ${error.message}</p>`;
        ui.showNotification("❌ Erro ao carregar repositórios!");
      }
    },

    async loadInitialData() {
      const { state, storage, ui } = CodeTrackerApp;
      try {
        const response = await fetch("data.json");
        const data = await response.json();
        state.resources = data.resources;
        state.achievementsData = data.achievementsData;

        const savedAchievements = storage.load("achievements", null);
        if (savedAchievements) {
          savedAchievements.forEach((saved) => {
            const achievement = state.achievementsData.find(
              (a) => a.id === saved.id
            );
            if (achievement) achievement.unlocked = saved.unlocked;
          });
        }
        ui.renderResources();
        ui.renderAchievements();
      } catch (error) {
        console.error("Failed to load initial data:", error);
        document.getElementById("resourcesList").innerHTML =
          "<p>Erro ao carregar recursos.</p>";
        document.getElementById("achievementGrid").innerHTML =
          "<p>Erro ao carregar conquistas.</p>";
      }
    },
  },

  // 7. HANDLERS: Functions that handle user events
  handlers: {
    toggleTheme() {
      const { state, storage, ui } = CodeTrackerApp;
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      const themeIcon = document.getElementById("themeIcon");
      themeIcon.classList.remove(isDark ? "fa-moon" : "fa-sun");
      themeIcon.classList.add(isDark ? "fa-sun" : "fa-moon");
      storage.save("theme", isDark ? "dark" : "light");
      if (state.progressChart) {
        state.progressChart.destroy();
        ui.initChart();
      }
    },

    startTimer() {
      const { state, ui, logic } = CodeTrackerApp;
      if (!state.isTimerRunning) {
        state.isTimerRunning = true;
        state.timerInterval = setInterval(() => {
          if (state.timeLeft > 0) {
            state.timeLeft--;
            ui.updateTimerDisplay();
          } else {
            logic.completePomodoro();
          }
        }, 1000);
      }
    },

    pauseTimer() {
      const { state } = CodeTrackerApp;
      state.isTimerRunning = false;
      clearInterval(state.timerInterval);
    },

    resetTimer() {
      CodeTrackerApp.handlers.pauseTimer();
      CodeTrackerApp.state.timeLeft = 1500;
      CodeTrackerApp.ui.updateTimerDisplay();
    },

    setTimer(minutes) {
      CodeTrackerApp.handlers.pauseTimer();
      CodeTrackerApp.state.timeLeft = minutes * 60;
      CodeTrackerApp.ui.updateTimerDisplay();
    },

    addTask() {
      const { state, storage, ui, logic } = CodeTrackerApp;
      const input = document.getElementById("taskInput");
      const taskText = input.value.trim();
      if (taskText) {
        state.tasks.push({
          id: Date.now(),
          text: taskText,
          completed: false,
          createdAt: new Date().toISOString(),
        });
        input.value = "";
        storage.save("tasks", state.tasks);
        ui.renderTasks();
        logic.checkAchievements();
      }
    },

    handleTaskEnter(event) {
      if (event.key === "Enter") {
        CodeTrackerApp.handlers.addTask();
      }
    },

    toggleTask(id) {
      const { state, logic, api } = CodeTrackerApp;
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;

      if (task.completed) {
        task.completed = false;
        state.completedTasksCount--;
        logic.updateStatsAndSave();
      } else {
        api.startQuizForTask(task);
      }
    },

    checkQuizAnswer(
      button,
      selectedOptionEncoded,
      correctOptionEncoded,
      taskId
    ) {
      const { ui, logic } = CodeTrackerApp;
      const selectedOption = atob(selectedOptionEncoded);
      const correctOption = atob(correctOptionEncoded);
      const quizResult = document.getElementById("quizResult");

      document
        .querySelectorAll(".quiz-options button")
        .forEach((btn) => (btn.disabled = true));

      if (selectedOption === correctOption) {
        button.style.background = "var(--success)";
        button.style.color = "white";
        quizResult.innerHTML = `<p style="color: var(--success); font-weight: 600; margin-top: 20px;">✅ Resposta Correta! Tarefa concluída!</p>`;
        logic.completeTask(taskId);
        setTimeout(ui.closeModal, 2000);
      } else {
        button.style.background = "var(--danger)";
        button.style.color = "white";
        quizResult.innerHTML = `<p style="color: var(--danger); font-weight: 600; margin-top: 20px;">❌ Resposta Incorreta. Estude um pouco mais!</p>`;
        setTimeout(ui.closeModal, 2500);
      }
    },

    deleteTask(id) {
      const { state, storage, ui } = CodeTrackerApp;
      state.tasks = state.tasks.filter((t) => t.id !== id);
      storage.save("tasks", state.tasks);
      ui.renderTasks();
    },

    openSettingsModal() {
      document.getElementById("apiKeyInput").value =
        CodeTrackerApp.config.GEMINI_API_KEY;
      document.getElementById("settingsModal").classList.add("active");
    },

    saveSettings() {
      const { config, storage, ui } = CodeTrackerApp;
      config.GEMINI_API_KEY = document
        .getElementById("apiKeyInput")
        .value.trim();
      storage.save("GEMINI_API_KEY", config.GEMINI_API_KEY);
      ui.showNotification("✅ Configurações salvas com sucesso!");
      ui.closeModal();
    },

    openChatModal() {
      const { ui, state } = CodeTrackerApp;
      const chatModal = document.getElementById("chatModal");
      chatModal.classList.add("active");
      if (state.conversationHistory.length === 0) {
        const firstMessage =
          "Olá! Sou seu assistente de estudos. Como posso ajudar você a programar melhor hoje?";
        state.conversationHistory.push({
          role: "model",
          parts: [{ text: firstMessage }],
        });
        ui.addMessageToChat("ai", firstMessage);
      }
      document.getElementById("chatInput").focus();
    },

    sendMessage() {
      const { state, ui, api } = CodeTrackerApp;
      const chatInput = document.getElementById("chatInput");
      const userMessage = chatInput.value.trim();

      if (!userMessage) return;

      ui.addMessageToChat("user", userMessage);
      state.conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }],
      });
      chatInput.value = "";

      // Adiciona um "digitando..." falso para melhor UX
      setTimeout(() => {
        const loadingMessage = ui.addMessageToChat("ai", "...");
        api.getChatResponse().then(() => {
          loadingMessage.remove(); // Remove o "digitando..."
        });
      }, 500);
    },
  },

  // 8. INIT: The starting point of the application
  async init() {
    // Load data from localStorage
    this.state.totalStudyTime = this.storage.load("totalStudyTime", 0);
    this.state.tasks = this.storage.load("tasks", []);
    this.state.completedTasksCount = this.storage.load(
      "completedTasksCount",
      0
    );
    this.state.streak = this.storage.load("streak", 0);
    this.state.pomodoroCount = this.storage.load("pomodoroCount", 0);
    this.state.weeklyData = this.storage.load(
      "weeklyData",
      [0, 0, 0, 0, 0, 0, 0]
    );
    this.state.theme = this.storage.load("theme", "light");
    // Carrega a chave do localStorage. Se não houver, mantém a chave do código.
    const savedApiKey = this.storage.load("GEMINI_API_KEY");
    if (savedApiKey) {
      this.config.GEMINI_API_KEY = savedApiKey;
    }

    // Set initial theme
    if (this.state.theme === "dark") {
      document.body.classList.add("dark-mode");
      const themeIcon = document.getElementById("themeIcon");
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    }

    // Load data from data.json
    await this.api.loadInitialData();

    // Initial UI setup
    this.ui.updateTimerDisplay();
    this.ui.renderTasks();
    this.ui.initChart();
    this.ui.updateAllStats();

    // Auto-load GitHub repos if username is set
    const savedUsername = document.getElementById("githubUsername").value;
    if (savedUsername) {
      this.api.loadGitHubRepos();
    }

    // Adjust main padding for fixed header on mobile
    this.ui.adjustMainPadding();
    window.addEventListener("resize", this.ui.adjustMainPadding);

    // Add event listener for chat input
    document
      .getElementById("chatInput")
      .addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.handlers.sendMessage();
        }
      });

    // Make handlers available globally for inline HTML onclicks
    window.toggleTheme = this.handlers.toggleTheme;
    window.openSettingsModal = this.handlers.openSettingsModal;
    window.startTimer = this.handlers.startTimer;
    window.pauseTimer = this.handlers.pauseTimer;
    window.resetTimer = this.handlers.resetTimer;
    window.setTimer = this.handlers.setTimer;
    window.addTask = this.handlers.addTask;
    window.generateTasksWithAI = this.api.generateTasksWithAI;
    window.handleTaskEnter = this.handlers.handleTaskEnter;
    window.loadGitHubRepos = this.api.loadGitHubRepos;
    window.saveSettings = this.handlers.saveSettings;
    window.closeModal = this.ui.closeModal;
    window.openChatModal = this.handlers.openChatModal;
    window.sendMessage = this.handlers.sendMessage;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  CodeTrackerApp.init();
});
