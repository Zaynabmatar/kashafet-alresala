// Sidebar click handling
{
    document.addEventListener("click", function (event) {
      const sidebar = document.getElementById("adminSidebar");
      const menuButton = document.querySelector(".menu-button");

      if (!sidebar || !sidebar.classList.contains("open")) {
        return;
      }

      if (
        !sidebar.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    });
}

// Admin profile
{
    async function loadAdminName() {
      try {
        const { data, error } = await AppDb.getAdminSummary();

        if (error) {
          console.error("Error loading admin:", error);
          return;
        }

        const userName = document.getElementById("userName");

        if (userName && data && data.full_name) {
          userName.textContent = data.full_name;
        }
      } catch (error) {
        console.error("Admin loading error:", error);
      }
    }
    Object.assign(window, { loadAdminName });
}

// Leader birth date input
{
    function setupDateSelectors() {
      const dayInput = document.getElementById("birthDay");
      const monthInput = document.getElementById("birthMonth");
      const yearInput = document.getElementById("birthYear");
      const birthDateInput = document.getElementById("birthDateInput");

      if (!dayInput || !monthInput || !yearInput || !birthDateInput) {
        return;
      }

      function normalizeArabicDigits(value) {
        return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, function (digit) {
          return String(digit.charCodeAt(0) <= 0x0669
            ? digit.charCodeAt(0) - 0x0660
            : digit.charCodeAt(0) - 0x06F0);
        });
      }

      function normalizeMonth(value) {
        const text = normalizeArabicDigits(value).trim();

        const months = {
          "كانون الثاني": 1,
          "شباط": 2,
          "آذار": 3,
          "نيسان": 4,
          "أيار": 5,
          "حزيران": 6,
          "تموز": 7,
          "آب": 8,
          "أيلول": 9,
          "تشرين الأول": 10,
          "تشرين الثاني": 11,
          "كانون الأول": 12,

          "january": 1,
          "jan": 1,
          "february": 2,
          "feb": 2,
          "march": 3,
          "mar": 3,
          "april": 4,
          "apr": 4,
          "may": 5,
          "june": 6,
          "jun": 6,
          "july": 7,
          "jul": 7,
          "august": 8,
          "aug": 8,
          "september": 9,
          "sep": 9,
          "sept": 9,
          "october": 10,
          "oct": 10,
          "november": 11,
          "nov": 11,
          "december": 12,
          "dec": 12
        };

        if (months[text]) {
          return months[text];
        }

        const numericMonth = parseInt(text, 10);
        return numericMonth >= 1 && numericMonth <= 12
          ? numericMonth
          : null;
      }

      function updateBirthDate() {
        const dayText = normalizeArabicDigits(dayInput.value).trim();
        const yearText = normalizeArabicDigits(yearInput.value).trim();
        const month = normalizeMonth(monthInput.value);

        const day = parseInt(dayText, 10);
        const year = parseInt(yearText, 10);

        if (!dayText || !yearText || !month || !day || !year) {
          birthDateInput.value = "";
          return;
        }

        const date = new Date(year, month - 1, day);

        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          birthDateInput.value = "";
          return;
        }

        const formattedMonth = String(month).padStart(2, "0");
        const formattedDay = String(day).padStart(2, "0");

        birthDateInput.value =
          year + "-" + formattedMonth + "-" + formattedDay;
      }

      function getNormalizedBirthDate() {
        updateBirthDate();
        return birthDateInput.value || null;
      }

      function allowNumbersOnly(event) {
        const value = normalizeArabicDigits(event.target.value);
        event.target.value = value.replace(/[^0-9]/g, "");
        updateBirthDate();
      }

      dayInput.addEventListener("input", allowNumbersOnly);
      monthInput.addEventListener("input", allowNumbersOnly);
      yearInput.addEventListener("input", allowNumbersOnly);
      dayInput.addEventListener("input", updateBirthDate);
      monthInput.addEventListener("input", updateBirthDate);
      yearInput.addEventListener("input", updateBirthDate);
      window.getNormalizedLeaderBirthDate = getNormalizedBirthDate;
    }
    Object.assign(window, { setupDateSelectors });
    setupDateSelectors();
}

// Leader modal
{
    function openAddLeaderForm() {
      const modal = document.getElementById("leaderModal");

      if (modal) {
        modal.classList.add("active");
      }
    }

    function closeAddLeaderForm() {
      const modal = document.getElementById("leaderModal");

      if (modal) {
        modal.classList.remove("active");
      }
    }
    Object.assign(window, { openAddLeaderForm, closeAddLeaderForm });
}

// Age formatting
{
    function calculateAge(birthDate) {
      if (!birthDate) {
        return "غير محدد";
      }

      const birth = new Date(birthDate);

      if (isNaN(birth.getTime())) {
        return "غير محدد";
      }

      const today = new Date();

      let age = today.getFullYear() - birth.getFullYear();

      const monthDifference = today.getMonth() - birth.getMonth();

      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }

      if (age < 0) {
        return "غير محدد";
      }

      const arabicAge = String(age).replace(/\d/g, function (digit) {
        return "٠١٢٣٤٥٦٧٨٩"[digit];
      });

      if (age === 1) {
        return "سنة واحدة";
      }

      if (age === 2) {
        return "سنتان";
      }

      if (age >= 3 && age <= 10) {
        return arabicAge + " سنوات";
      }

      return arabicAge + " سنة";
    }
    Object.assign(window, { calculateAge });
}

// Leader list and attendance
{
    async function loadLeaders() {
      const table = document.getElementById("leadersTable");
      const emptyState = document.getElementById("emptyState");

      if (!table || !emptyState) {
        return false;
      }

      try {
        const { data, error } = await AppDb.listActiveLeaders();

        if (error) {
          throw error;
        }

        table.innerHTML = "";

        const leadersCount = document.getElementById("leadersCount");

        const missingUniformCount = document.getElementById(
          "missingUniformCount",
        );

        if (leadersCount) {
          leadersCount.textContent = data ? data.length : 0;
        }

        if (missingUniformCount) {
          missingUniformCount.textContent = data
            ? data.filter(function (leader) {
                return leader.has_uniform === false;
              }).length
            : 0;
        }

        if (!data || data.length === 0) {
          table.style.display = "none";
          emptyState.style.display = "block";
          return true;
        }

        emptyState.style.display = "none";
        table.style.display = "flex";

        /*
         * Get the tasks used by the active leaders.
         * has_team tells us whether this leader should have
         * activities/members on the system.
         */
        const taskIds = [
          ...new Set(
            data
              .map(function (leader) {
                return leader.task_id;
              })
              .filter(Boolean)
              .map(String),
          ),
        ];

        const tasksById = {};

        if (taskIds.length > 0) {
          const taskResult = await supabaseClient
            .from("tasks")
            .select("id, has_team")
            .in("id", taskIds);

          if (taskResult.error) {
            throw taskResult.error;
          }

          (taskResult.data || []).forEach(function (task) {
            tasksById[String(task.id)] = task.has_team === true;
          });
        }

        /*
         * Get real activity counts for these leaders.
         */
        const leaderIds = data
          .map(function (leader) {
            return leader.id;
          })
          .filter(Boolean)
          .map(String);

        const activityCountsByLeader = {};

        if (leaderIds.length > 0) {
          const activityResult = await supabaseClient
            .from("activities")
            .select("id, leader_id")
            .in("leader_id", leaderIds);

          if (activityResult.error) {
            throw activityResult.error;
          }

          (activityResult.data || []).forEach(function (activity) {
            const leaderId = String(activity.leader_id);

            activityCountsByLeader[leaderId] =
              (activityCountsByLeader[leaderId] || 0) + 1;
          });
        }

        // ===== CURRENT YEAR MEETING ATTENDANCE =====
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const nextYearStart = `${currentYear + 1}-01-01`;

        const { data: currentYearMeetings = [], error: meetingsError } =
          await supabaseClient
            .from("meetings")
            .select("id, meeting_date")
            .gte("meeting_date", yearStart)
            .lt("meeting_date", nextYearStart);

        if (meetingsError) {
          throw meetingsError;
        }

        const meetingIds = currentYearMeetings.map(function (meeting) {
          return meeting.id;
        });

        let attendanceRows = [];

        if (meetingIds.length > 0) {
          const { data: attendanceData, error: attendanceError } =
            await supabaseClient
              .from("meeting_attendance")
              .select("meeting_id, leader_id, status")
              .in("meeting_id", meetingIds);

          if (attendanceError) {
            throw attendanceError;
          }

          attendanceRows = attendanceData || [];
        }

        const attendanceCountsByLeader = {};

        attendanceRows.forEach(function (row) {
          if (row.status === "present") {
            const leaderId = String(row.leader_id);

            attendanceCountsByLeader[leaderId] =
              (attendanceCountsByLeader[leaderId] || 0) + 1;
          }
        });

        const attendanceTotal = currentYearMeetings.length;

        // ===== END CURRENT YEAR MEETING ATTENDANCE =====

        data.forEach(function (leader) {
          const hasTeam = leader.task_id
            ? tasksById[String(leader.task_id)] === true
            : false;

          const activityCount = hasTeam
            ? activityCountsByLeader[String(leader.id)] || 0
            : 0;

          addLeaderToTable({
            id: leader.id,
            name: leader.full_name,
            assistants: leader.assistants,
            phone: leader.phone,
            birthDate: leader.birth_date,
            branch: leader.branch,
            uniform: leader.has_uniform,
            hasTeam: hasTeam,
            activities: activityCount,
            attendancePresent:
              attendanceCountsByLeader[String(leader.id)] || 0,
            attendanceTotal: attendanceTotal,
          });
        });

        return true;
      } catch (error) {
        console.error("Error loading leaders:", error);

        table.innerHTML = "";
        table.style.display = "none";
        emptyState.style.display = "block";

        return false;
      }
    }
    Object.assign(window, { loadLeaders });
}

// Create leader
{
    const leaderForm = document.getElementById("leaderForm");

    if (leaderForm) {
      leaderForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("leaderName").value.trim();

        const assistants = document
          .getElementById("leaderAssistants")
          .value.trim();

        const phone = document.getElementById("leaderPhone").value.trim();

        const birthDate = window.getNormalizedLeaderBirthDate
          ? window.getNormalizedLeaderBirthDate()
          : document.getElementById("birthDateInput").value || null;

        const taskInput = document.getElementById("leaderBranch");

        const branch = taskInput.value.trim();

        const selectedTaskId = taskInput.dataset.selectedTaskId || null;

        const selectedTaskName = taskInput.dataset.selectedTask
          ? taskInput.dataset.selectedTask.trim()
          : "";

        const uniformInput = document.querySelector(
          'input[name="hasUniform"]:checked',
        );

        const uniform = uniformInput ? uniformInput.value === "true" : false;

        // VALIDATION

        if (!name) {
          alert("يرجى إدخال اسم القائد.");
          return;
        }

        if (!branch) {
          alert("يرجى اختيار المهمة.");
          return;
        }

        if (!selectedTaskId) {
          alert("يرجى اختيار مهمة موجودة من القائمة.");
          return;
        }

        // LOAD SELECTED TASK

        let selectedTask = null;

        try {
          const { data, error } = await AppDb.getTaskById(selectedTaskId);

          if (error) {
            console.error("Could not load selected task:", error);

            alert("تعذّر التحقق من المهمة. لم يتم حفظ القائد.");

            return;
          }

          selectedTask = data;
        } catch (error) {
          console.error("Selected task loading error:", error);

          alert("تعذّر التحقق من المهمة. لم يتم حفظ القائد.");

          return;
        }

        if (!selectedTask) {
          alert("المهمة المحددة غير موجودة.");
          return;
        }

        // VERIFY SELECTED TASK

        if (
          selectedTaskName &&
          selectedTask.name.trim() !== selectedTaskName
        ) {
          alert("يرجى اختيار المهمة من القائمة من جديد.");

          return;
        }

        const { data: activeLeaders, error: activeLeadersError } =
          await supabaseClient
            .from("leaders")
            .select("id, full_name")
            .eq("task_id", selectedTask.id)
            .is("deleted_at", null)
            .limit(1);

        if (activeLeadersError) {
          console.error("Task availability check error:", activeLeadersError);

          alert(
            "تعذّر التحقق من توفر المهمة. السبب: " +
              (activeLeadersError.message || "خطأ غير معروف."),
          );

          return;
        }

        if (activeLeaders && activeLeaders.length > 0) {
          alert(
            "هذه المهمة مخصصة حاليًا للقائد " +
              (activeLeaders[0].full_name || "آخر") +
              "، لذلك لا يمكن إسنادها لقائد آخر.",
          );

          return;
        }

        // SAVE BUTTON

        const saveButton = document.getElementById("saveLeaderButton");

        if (saveButton) {
          saveButton.disabled = true;
          saveButton.textContent = "جارٍ الحفظ...";
        }

        let newTeamId = null;
        let leaderCreated = false;

        try {
          if (selectedTask.has_team === true) {
            const teamName = selectedTask.name.replace("فرقة", "").trim();

            if (!teamName) {
              throw new Error("اسم المهمة غير صالح لإنشاء الفريق.");
            }

            const { data: teamData, error: teamError } =
              await AppDb.createTeam({
                task_id: selectedTask.id,
                name: teamName,
              });

            if (teamError) {
              throw teamError;
            }

            if (!teamData) {
              throw new Error("لم يتم إنشاء الفريق.");
            }

            newTeamId = teamData.id;
          }

          // STEP 1:
          // CREATE LEADER

          const leaderPayload = {
            full_name: name,
            assistants: assistants || null,
            phone: phone || null,
            birth_date: birthDate,
            branch: branch,
            task_id: selectedTask.id,
            has_uniform: uniform,
            team_id: newTeamId,
          };

          const { data, error } = await AppDb.createLeader(leaderPayload);

          if (error) {
            throw error;
          }

          leaderCreated = true;

          console.log("Leader saved successfully:", data);

          // STEP 2:
          // REFRESH LIST

          const listLoaded = await loadLeaders();

          await loadTrashCount();

          if (!listLoaded) {
            console.warn(
              "Leader was saved, but the list could not be refreshed.",
            );
          }

          // STEP 3:
          // RESET FORM

          leaderForm.reset();

          const defaultUniform = document.querySelector(
            'input[name="hasUniform"][value="false"]',
          );

          if (defaultUniform) {
            defaultUniform.checked = true;
          }

          const taskInputAfterSave = document.getElementById("leaderBranch");

          if (taskInputAfterSave) {
            delete taskInputAfterSave.dataset.selectedTask;
            delete taskInputAfterSave.dataset.selectedTaskId;
            delete taskInputAfterSave.dataset.addingTask;

            taskInputAfterSave.value = "";

            taskInputAfterSave.placeholder = "ابحث أو اختر المهمة";
          }

          closeAddLeaderForm();
        } catch (error) {
          if (newTeamId && !leaderCreated) {
            const { error: cleanupError } = await supabaseClient
              .from("teams")
              .update({
                deleted_at: new Date().toISOString(),
              })
              .eq("id", newTeamId);

            if (cleanupError) {
              console.error("New team cleanup failed:", cleanupError);

              alert(
                "تعذّر تنظيف الفريق الجديد:\n" +
                  "Message: " +
                  (cleanupError.message || "غير متوفر") +
                  "\nCode: " +
                  (cleanupError.code || "غير متوفر") +
                  "\nDetails: " +
                  (cleanupError.details || "غير متوفر") +
                  "\nHint: " +
                  (cleanupError.hint || "غير متوفر"),
              );
            }
          }

          console.error("Error saving leader:", error);

          alert(
            "تعذّر حفظ القائد. السبب: " +
              (error.message || "غير متوفر") +
              "\nرمز الخطأ: " +
              (error.code || "غير متوفر") +
              "\nالتفاصيل: " +
              (error.details || "غير متوفر") +
              "\nملاحظة قاعدة البيانات: " +
              (error.hint || "غير متوفر"),
          );
        } finally {
          if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "حفظ";
          }
        }
      });
    }
}

// Leader card rendering
{
    function toArabicDigits(value) {
        return String(value ?? 0).replace(/\d/g, function (digit) {
            return "٠١٢٣٤٥٦٧٨٩"[digit];
        });
    }

    function addLeaderToTable(leader) {
        const table = document.getElementById("leadersTable");
        const emptyState = document.getElementById("emptyState");

        if (!table || !emptyState) {
            return;
        }

        emptyState.style.display = "none";
        table.style.display = "flex";

        const card = document.createElement("div");
        card.className = "leader-row";
        card.dataset.leaderId = leader.id;

        const ageText = leader.birthDate
            ? calculateAge(leader.birthDate)
            : "غير محدد العمر";

        const phone = leader.phone
            ? String(leader.phone).replace(/^\+961\s*/, "")
            : "غير محدد";

        const uniformHtml = leader.uniform
            ? `
                  <span class="leader-detail-icon">👕</span>
                  <span class="uniform-text has-uniform">البدلة موجودة</span>
                `
            : `
                  <span class="leader-detail-icon">👕</span>
                  <span class="uniform-text no-uniform">لا توجد بدلة</span>
                `;

        const activitiesHtml =
            leader.hasTeam === true
                ? `
                    <div class="leader-stat">
                      <span class="leader-stat-label">النشاطات</span>
                      <strong>${toArabicDigits(leader.activities || 0)}</strong>
                    </div>
                  `
                : "";

        card.innerHTML = `
              <div class="leader-main">

                <div class="leader-profile">

                  <div class="leader-avatar">
                    👤
                  </div>

                  <div class="leader-identity">

                    <h3 class="leader-name">
                      ${escapeHtml(leader.name || "غير محدد")}
                    </h3>

                    <div class="leader-phone">
                      <span class="phone-icon">📞</span>
                      ${
                        phone === "غير محدد"
                          ? "غير محدد"
                          : "+961 " + escapeHtml(phone)
                      }
                    </div>

                    ${
                      leader.assistants
                        ? `
                          <div class="leader-assistants">
                            <span class="assistants-label">المساعدون:</span>
                            <span>${escapeHtml(leader.assistants)}</span>
                          </div>
                        `
                        : ""
                    }

                  </div>

                </div>

                <div class="leader-details">

                  <div class="leader-detail">
                    <span class="leader-detail-icon">📅</span>
                    <span>${escapeHtml(ageText)}</span>
                  </div>

                  <div class="leader-detail">
                    <span class="leader-detail-icon">👥</span>
                    <span>${escapeHtml(leader.branch || "غير محددة")}</span>
                  </div>

                  <div class="leader-detail">
                    ${uniformHtml}
                  </div>

                </div>

                <div class="leader-stats">

                  ${activitiesHtml}

                  <div class="leader-stat">
                    <span class="leader-stat-label">الحضور</span>
                    <strong>
                      ${toArabicDigits(leader.attendancePresent || 0)}
                      /
                      ${toArabicDigits(leader.attendanceTotal || 0)}
                    </strong>
                  </div>

                </div>

                <div class="leader-actions">

                  <button
                    type="button"
                    class="leader-info-button"
                  >
                    <span>معلومات القائد</span>
                    <span class="leader-info-arrow">←</span>
                  </button>

                </div>

              </div>
        `;

        const infoButton = card.querySelector(".leader-info-button");
        infoButton.addEventListener("click", function (event) {
            event.stopPropagation();
            window.location.href =
                "leader-admin.html?id=" + encodeURIComponent(leader.id);
        });

        table.appendChild(card);
    }
    Object.assign(window, { toArabicDigits, addLeaderToTable });
}

// HTML escaping
{
    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
    Object.assign(window, { escapeHtml });
}

// Leader deletion
{
    async function deleteLeader(leaderId) {
      const confirmed = confirm(
        "هل أنت متأكد من حذف هذا القائد؟ يمكنك استعادته لاحقًا من سلة المحذوفات.",
      );

      if (!confirmed) {
        return;
      }

      const { error } = await AppDb.softDeleteLeader(leaderId);

      if (error) {
        console.error("Delete error:", error);

        alert("حدث خطأ أثناء حذف القائد.");

        return;
      }

      await loadLeaders();
      await loadTrashCount();
    }
    Object.assign(window, { deleteLeader });
}

// Trash count, sign out, and initial loading
{
    async function loadTrashCount() {
      const { data: deletedLeaders, error: leadersError } =
        await AppDb.listDeletedLeaders();

      const { data: deletedMembers, error: membersError } =
        await AppDb.listDeletedMembers();

      if (leadersError || membersError) {
        console.error("Trash count error:", leadersError || membersError);
        return;
      }

      const totalDeleted =
        (deletedLeaders || []).length + (deletedMembers || []).length;

      const trashCount = document.getElementById("trashCount");

      if (trashCount) {
        trashCount.textContent = totalDeleted;
      }
    }
    async function logout() {
      await AppDb.signOut();
      window.location.href = "../index.html";
    }
    loadAdminName();
    loadLeaders();
    loadTrashCount();
    Object.assign(window, { loadTrashCount, logout });
}

// My Info sidebar navigation
{
    const myInfoButton = document.getElementById("myInfoButton");

    const adminSidebar = document.getElementById("adminSidebar");

    const sidebarState = new URLSearchParams(window.location.search).get(
      "sidebar",
    );

    if (adminSidebar && sidebarState === "open") {
      adminSidebar.classList.add("open");
    }

    if (myInfoButton) {
      myInfoButton.addEventListener("click", function () {
        window.location.href = "my-info.html?sidebar=open";
      });
    }
}

// Task combobox
{
        async function setupTasksComboBox() {
          const input = document.getElementById("leaderBranch");

          const dropdown = document.getElementById("tasksDropdown");

          const combo = document.getElementById("taskComboBox");

          if (!input || !dropdown || !combo) {
            return;
          }

          let tasks = [];
          let addingMode = false;

          // LOAD TASKS

          async function loadTasks() {
            const { data, error } = await AppDb.listTasks();

            if (error) {
              console.error("Error loading tasks:", error);

              return;
            }

            tasks = data || [];
          }

          // CLOSE DROPDOWN

          function closeDropdown() {
            dropdown.classList.remove("open");
            dropdown.innerHTML = "";
          }

          // OPEN TASK LIST

          function openTaskList() {
            addingMode = false;

            input.dataset.addingTask = "false";

            input.placeholder = "ابحث أو اختر المهمة";

            dropdown.innerHTML = "";

            const currentTask = input.dataset.selectedTask
              ? input.dataset.selectedTask.trim().toLowerCase()
              : "";

            const search = input.value.trim().toLowerCase();

            // إضافة مهمة دائمًا أول عنصر

            const addOption = document.createElement("div");

            addOption.className = "add-task-option";

            addOption.textContent = "＋ إضافة مهمة";

            addOption.addEventListener("click", function (event) {
              event.stopPropagation();
              startAddingTask();
            });

            dropdown.appendChild(addOption);

            const filteredTasks = tasks.filter(function (task) {
              const taskName = task.name.trim().toLowerCase();

              // لا نعرض المهمة المختارة حاليًا

              if (currentTask && taskName === currentTask) {
                return false;
              }

              // إذا في بحث، نفلتر

              if (search && search !== currentTask) {
                return taskName.includes(search);
              }

              return true;
            });

            filteredTasks.forEach(function (task) {
              const option = document.createElement("div");

              option.className = "task-option";

              option.textContent = task.name;

              option.addEventListener("click", function () {
                input.value = task.name;

                input.dataset.selectedTask = task.name;

                input.dataset.selectedTaskId = task.id;

                input.dataset.addingTask = "false";

                closeDropdown();
              });

              dropdown.appendChild(option);
            });

            dropdown.classList.add("open");
          }

          // START ADDING TASK

          function startAddingTask() {
            addingMode = true;

            input.dataset.addingTask = "true";

            delete input.dataset.selectedTask;
            delete input.dataset.selectedTaskId;

            input.value = "";

            input.placeholder = "اكتب اسم المهمة";

            dropdown.innerHTML = "";

            const buttonsArea = document.createElement("div");

            buttonsArea.className = "task-action-buttons";

            const saveButton = document.createElement("button");

            saveButton.type = "button";

            saveButton.className = "save-task-button";

            saveButton.textContent = "حفظ المهمة";

            saveButton.addEventListener("click", async function (event) {
              event.stopPropagation();
              await saveNewTask();
            });

            const cancelButton = document.createElement("button");

            cancelButton.type = "button";

            cancelButton.className = "cancel-task-button";

            cancelButton.textContent = "إلغاء";

            cancelButton.addEventListener("click", function (event) {
              event.stopPropagation();

              addingMode = false;

              input.dataset.addingTask = "false";

              input.value = "";

              input.placeholder = "ابحث أو اختر المهمة";

              closeDropdown();
            });

            buttonsArea.appendChild(saveButton);
            buttonsArea.appendChild(cancelButton);

            dropdown.appendChild(buttonsArea);

            dropdown.classList.add("open");

            input.focus();
          }

          // SAVE NEW TASK

          async function saveNewTask() {
            const name = input.value.trim();

            if (!name) {
              input.focus();
              return;
            }

            const normalizedName = name.toLowerCase();

            const existingTask = tasks.find(function (task) {
              return task.name.trim().toLowerCase() === normalizedName;
            });

            if (existingTask) {
              input.value = existingTask.name;

              input.dataset.selectedTask = existingTask.name;

              input.dataset.selectedTaskId = existingTask.id;

              addingMode = false;

              input.dataset.addingTask = "false";

              input.placeholder = "ابحث أو اختر المهمة";

              closeDropdown();

              return;
            }

            const { data, error } = await AppDb.createTask(name);

            if (error) {
              console.error("Error adding task:", error);

              if (error.code === "23505") {
                await loadTasks();

                const duplicateTask = tasks.find(function (task) {
                  return task.name.trim().toLowerCase() === normalizedName;
                });

                if (duplicateTask) {
                  input.value = duplicateTask.name;

                  input.dataset.selectedTask = duplicateTask.name;

                  input.dataset.selectedTaskId = duplicateTask.id;

                  addingMode = false;

                  input.dataset.addingTask = "false";

                  input.placeholder = "ابحث أو اختر المهمة";

                  closeDropdown();

                  return;
                }
              }

              alert(
                "تعذر حفظ المهمة: " +
                  (error.message ||
                    error.details ||
                    error.hint ||
                    "خطأ غير معروف"),
              );

              return;
            }

            // has_team لا يتم إرسالها من JavaScript.
            // Database trigger يحددها تلقائيًا
            // بناءً على وجود كلمة "فرقة".

            tasks.push(data);

            input.value = data.name;

            input.dataset.selectedTask = data.name;

            input.dataset.selectedTaskId = data.id;

            addingMode = false;

            input.dataset.addingTask = "false";

            input.placeholder = "ابحث أو اختر المهمة";

            closeDropdown();
          }

          // INPUT EVENTS

          document.addEventListener("click", function (event) {
      if (!dropdown.classList.contains("open")) {
        return;
      }

      if (
        event.target !== input &&
        !dropdown.contains(event.target)
      ) {
        closeDropdown();
      }
    });
    input.addEventListener("focus", async function () {
            await loadTasks();

            if (addingMode) {
              dropdown.classList.add("open");
            } else {
              openTaskList();
            }
          });

          input.addEventListener("beforeinput", function (event) {
            if (event.inputType === "insertText" && event.data) {
              const hasEnglish = /[A-Za-z]/.test(event.data);

              if (hasEnglish) {
                event.preventDefault();
              }
            }
          });

          input.addEventListener("paste", function (event) {
            const text = (event.clipboardData || window.clipboardData).getData(
              "text",
            );

            if (/[A-Za-z]/.test(text)) {
              event.preventDefault();

              const arabicOnly = text.replace(/[A-Za-z]/g, "");

              if (arabicOnly) {
                document.execCommand("insertText", false, arabicOnly);
              }
            }
          });

          input.addEventListener("input", function () {
            // إذا عدّل المستخدم الاسم يدويًا،
            // لا نترك task_id القديم.

            const selectedTask = input.dataset.selectedTask
              ? input.dataset.selectedTask.trim()
              : "";

            if (selectedTask !== input.value.trim()) {
              delete input.dataset.selectedTask;
              delete input.dataset.selectedTaskId;
            }

            if (!addingMode) {
              openTaskList();
            }
          });

          input.addEventListener("keydown", async function (event) {
            if (event.key === "Enter" && addingMode) {
              event.preventDefault();
              await saveNewTask();
            }

            if (event.key === "Escape") {
              addingMode = false;

              input.dataset.addingTask = "false";

              input.placeholder = "ابحث أو اختر المهمة";

              closeDropdown();
            }
          });

          document.addEventListener("click", function (event) {
            if (!combo.contains(event.target)) {
              closeDropdown();
            }
          });

          await loadTasks();
        }

        setupTasksComboBox();
}

// Sidebar query handling
{
    if (new URLSearchParams(location.search).get("sidebar") === "open") {
      history.replaceState(null, "", "admin.html");
    }
}

// Mobile sidebar swipe
{
    (function () {
      const sidebar = document.getElementById("adminSidebar");

      if (!sidebar) {
        return;
      }

      let startX = 0;
      let startY = 0;

      sidebar.addEventListener("touchstart", function (event) {
        const touch = event.touches[0];

        startX = touch.clientX;
        startY = touch.clientY;
      }, { passive: true });

      sidebar.addEventListener("touchend", function (event) {
        const touch = event.changedTouches[0];

        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (
          deltaX > 80 &&
          deltaX > Math.abs(deltaY)
        ) {
          sidebar.classList.remove("open");
        }
      }, { passive: true });
    })();
}

// Page event handlers
{
    const sidebarToggle = document.getElementById("sidebarToggle");
    const adminSidebar = document.getElementById("adminSidebar");
    const trashButton = document.getElementById("trashButton");
    const logoutButton = document.getElementById("logoutButton");
    const addLeaderButton = document.getElementById("addLeaderButton");
    const meetingsButton = document.getElementById("meetingsButton");
    const leaderNameInput = document.getElementById("leaderName");
    const assistantsInput = document.getElementById("leaderAssistants");

    sidebarToggle.addEventListener("click", function () {
      adminSidebar.classList.toggle("open");
    });

    trashButton.addEventListener("click", function () {
      window.location.href = "trash.html";
    });

    logoutButton.addEventListener("click", function () {
      window.logout();
    });
    addLeaderButton.addEventListener("click", openAddLeaderForm);
    meetingsButton.addEventListener("click", function () {
      window.location.href = "meetings.html";
    });

    document
      .querySelectorAll(".close-button, .cancel-button")
      .forEach(function (button) {
        button.addEventListener("click", closeAddLeaderForm);
      });

    leaderNameInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, "");
    });

    assistantsInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^\u0600-\u06FF\s\/]/g, "");
    });
}
