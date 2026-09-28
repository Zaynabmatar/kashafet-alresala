
    let meetings = [];
    let activeLeaders = [];
    let selectedLeaderIds = new Set();
    let attendanceCounts = new Map();

    /* =========================
       التاريخ
    ========================== */

    function todayDate() {
      const now = new Date();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    function toArabicDigits(value) {
      return String(value).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[digit]);
    }

    function formatDate(dateString) {
      if (!dateString) {
        return "";
      }

      const parts = dateString.split("-");

      if (parts.length !== 3) {
        return toArabicDigits(dateString);
      }

      return toArabicDigits(
        `${parts[0]}/${parts[1]}/${parts[2]}`
      );
    }

    /* =========================
       عنوان الاجتماع
    ========================== */

    function getMeetingTitle(number) {
      return `الاجتماع رقم ${toArabicDigits(number)}`;
    }

    async function renumberMeetingsByYear(yearsToRenumber = []) {

      const uniqueYears = [
        ...new Set(
          yearsToRenumber
            .map(year => Number(year))
            .filter(Number.isInteger)
        )
      ];

      if (!uniqueYears.length) {
        return;
      }

      const { data, error } = await supabaseClient
        .from("meetings")
        .select("id, title, meeting_date")
        .in(
          "meeting_date",
          []
        );

      if (error) {
        console.error("LOAD MEETINGS FOR RENUMBER ERROR:", error);
        throw error;
      }
    }

    async function renumberMeetingYears(yearsToRenumber = []) {
      const years = [
        ...new Set(
          yearsToRenumber
            .map(year => Number(year))
            .filter(Number.isInteger)
        )
      ];

      if (!years.length) {
        return;
      }

      const { data, error } = await supabaseClient
        .from("meetings")
        .select("id, title, meeting_date")
        .order("meeting_date", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      for (const year of years) {
        const yearMeetings = (data || [])
          .filter(meeting =>
            Number(String(meeting.meeting_date || "").slice(0, 4)) === year
          )
          .sort((a, b) => {
            const dateCompare = String(a.meeting_date || "").localeCompare(
              String(b.meeting_date || "")
            );

            if (dateCompare !== 0) {
              return dateCompare;
            }

            return String(a.id).localeCompare(String(b.id));
          });

        for (let index = 0; index < yearMeetings.length; index++) {
          const meeting = yearMeetings[index];
          const newTitle = getMeetingTitle(index + 1);

          if (meeting.title === newTitle) {
            continue;
          }

          const { error: updateError } = await supabaseClient
            .from("meetings")
            .update({
              title: newTitle
            })
            .eq("id", meeting.id);

          if (updateError) {
            throw updateError;
          }
        }
      }
    }

    async function loadMeetings(selectedYear) {

      const list = document.getElementById("meetingsList");

      const { data, error } = await AppDb.listMeetings();

      if (error) {

        console.error("LOAD MEETINGS ERROR:", error);

        list.innerHTML = `
          <div class="empty-state">
            تعذر تحميل الاجتماعات
          </div>
        `;

        return;
      }

      meetings = data || [];

      const attendanceResult =
        await AppDb.listMeetingAttendanceForMeetings(
          meetings.map(meeting => meeting.id)
        );

      if (attendanceResult.error) {
        console.error("LOAD ATTENDANCE ERROR:", attendanceResult.error);
      }

      attendanceCounts = new Map();

      (attendanceResult.data || []).forEach(row => {
        const count = attendanceCounts.get(row.meeting_id) || {
          present: 0,
          total: 0
        };

        count.total += 1;
        count.present += row.status === "present" ? 1 : 0;
        attendanceCounts.set(row.meeting_id, count);
      });

      buildYearFilter(selectedYear);
      renderMeetings();
    }

    /* =========================
       فلتر السنوات
    ========================== */

    function buildYearFilter(selectedYear) {

      const select = document.getElementById("yearFilter");
      const meetingYears = meetings
        .map(meeting => Number(String(meeting.meeting_date || "").slice(0, 4)))
        .filter(Number.isInteger);

      const years = [...new Set(meetingYears)].sort((a, b) => b - a);
      const requestedYear = Number(selectedYear);

      if (!years.length) {
        years.push(new Date().getFullYear());
      }

      select.innerHTML = years
        .map(year => `<option value="${year}">${toArabicDigits(year)}</option>`)
        .join("");

      select.value = years.includes(requestedYear)
        ? requestedYear
        : years[0];
    }

    /* =========================
       عرض الاجتماعات
    ========================== */

    async function renderMeetings() {

      const list = document.getElementById("meetingsList");

      const selectedYear =
        Number(document.getElementById("yearFilter").value);

      const filteredMeetings = meetings.filter(meeting => {

        if (!meeting.meeting_date) {
          return false;
        }

        return (
          Number(meeting.meeting_date.substring(0, 4)) ===
          selectedYear
        );
      });

      if (!filteredMeetings.length) {

        list.innerHTML = `
          <div class="empty-state">
            لا يوجد اجتماعات في هذه السنة
          </div>
        `;

        return;
      }

      list.innerHTML = "";

      const numberedMeetings = [...filteredMeetings].sort((a, b) => {
        const dateA = String(a.meeting_date || "");
        const dateB = String(b.meeting_date || "");

        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      });

      for (const meeting of filteredMeetings) {

        const meetingNumber =
          numberedMeetings.findIndex(item => item.id === meeting.id) + 1;

        const attendance = attendanceCounts.get(meeting.id) || {
          present: 0,
          total: 0
        };

        const card = document.createElement("button");

        card.type = "button";
        card.className = "meeting-card";

        card.innerHTML = `
          <div class="meeting-card-main">

            <h3>
              ${escapeHtml(`الاجتماع رقم ${toArabicDigits(meetingNumber)}`)}
            </h3>

            <div class="meeting-info">
              <span>📅</span>
              <span>
                ${formatDate(meeting.meeting_date)}
              </span>
            </div>

            <div class="meeting-info">
              <span>👥</span>
              <span>
                ${toArabicDigits(attendance.present)}
                من
                ${toArabicDigits(attendance.total)}
                حاضرون
              </span>
            </div>

          </div>

          <span class="meeting-arrow" aria-hidden="true">‹</span>
        `;

        card.addEventListener("click", () => {

          window.location.href =
            `meeting-details.html?id=${encodeURIComponent(meeting.id)}`;

        });

        list.appendChild(card);
      }
    }

    /* =========================
       عدد الحضور
    ========================== */

    async function getMeetingAttendanceCount(meetingId) {

      const { data, error } =
        await AppDb.listMeetingAttendance(meetingId);

      if (error || !data) {
        return {
          present: 0,
          total: 0
        };
      }

      return {

        present:
          data.filter(
            row => row.status === "present"
          ).length,

        total: data.length
      };
    }

    /* =========================
       التاريخ - Date Picker
    ========================== */

    const MEETING_MONTH_NAMES = [
      "كانون الثاني",
      "شباط",
      "آذار",
      "نيسان",
      "أيار",
      "حزيران",
      "تموز",
      "آب",
      "أيلول",
      "تشرين الأول",
      "تشرين الثاني",
      "كانون الأول"
    ];

    function toEnglishDigits(value) {

      return String(value)
        .replace(/[٠-٩]/g, digit =>
          String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
        );
    }

    function formatTypedArabicDate(dateString) {

      const parts =
        String(dateString || "")
          .split("/")
          .map(part => toEnglishDigits(part).trim());

      if (parts.length !== 3) {
        return null;
      }

      const day = Number(parts[0]);
      const month = Number(parts[1]);
      const year = Number(parts[2]);

      if (
        !Number.isInteger(day) ||
        !Number.isInteger(month) ||
        !Number.isInteger(year) ||
        year < 1900 ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > new Date(year, month, 0).getDate()
      ) {
        return null;
      }

      return formatMeetingDateValue(
        year,
        month,
        day
      );
    }

    function handleTypedMeetingDate() {

      const input =
        document.getElementById("meetingDateText");

      let value =
        String(input.value || "")
          .replace(/[^0-9\u0660-\u0669/]/g, "");

      input.value = value;

      const parsed =
        formatTypedArabicDate(value);

      if (!parsed) {
        return;
      }

      document.getElementById("meetingDate").value =
        parsed;

      setMeetingDatePicker(parsed);
    }

    function toArabicDigits(value) {

      return String(value)
        .replace(/0/g, "٠")
        .replace(/1/g, "١")
        .replace(/2/g, "٢")
        .replace(/3/g, "٣")
        .replace(/4/g, "٤")
        .replace(/5/g, "٥")
        .replace(/6/g, "٦")
        .replace(/7/g, "٧")
        .replace(/8/g, "٨")
        .replace(/9/g, "٩");
    }

    function formatMeetingDateValue(year, month, day) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function populateMeetingDateYears(selectedYear) {

      const yearSelect =
        document.getElementById("meetingYear");

      const currentYear =
        new Date().getFullYear();

      const years = [];

      for (
        let year = currentYear - 10;
        year <= currentYear + 10;
        year++
      ) {
        years.push(year);
      }

      if (
        selectedYear &&
        !years.includes(Number(selectedYear))
      ) {
        years.push(Number(selectedYear));
      }

      yearSelect.innerHTML =
        years
          .sort((a, b) => a - b)
          .map(year =>
            `<option value="${year}">${toArabicDigits(year)}</option>`
          )
          .join("");

      yearSelect.value = String(selectedYear);
    }

    function populateMeetingDateDays(year, month, selectedDay) {

      const daySelect =
        document.getElementById("meetingDay");

      const daysInMonth =
        new Date(year, month, 0).getDate();

      const safeDay =
        Math.min(
          Number(selectedDay) || 1,
          daysInMonth
        );

      daySelect.innerHTML =
        Array.from(
          { length: daysInMonth },
          (_, index) => index + 1
        )
        .map(day =>
          `<option value="${day}">${toArabicDigits(day)}</option>`
        )
        .join("");

      daySelect.value = String(safeDay);
    }

    function setMeetingDatePicker(dateString) {

      const parts =
        String(dateString || todayDate())
          .split("-")
          .map(Number);

      const now = new Date();

      const year =
        parts[0] || now.getFullYear();

      const month =
        parts[1] || (now.getMonth() + 1);

      const day =
        parts[2] || now.getDate();

      populateMeetingDateYears(year);

      const monthSelect =
        document.getElementById("meetingMonth");

      monthSelect.innerHTML =
        MEETING_MONTH_NAMES
          .map(
            (name, index) =>
              `<option value="${index + 1}">${name}</option>`
          )
          .join("");

      monthSelect.value = String(month);

      populateMeetingDateDays(
        year,
        month,
        day
      );

      syncMeetingDateFromPicker();
    }

    function syncMeetingDateFromPicker() {

      const year =
        Number(
          document.getElementById("meetingYear").value
        );

      const month =
        Number(
          document.getElementById("meetingMonth").value
        );

      const oldDay =
        Number(
          document.getElementById("meetingDay").value
        ) || 1;

      populateMeetingDateDays(
        year,
        month,
        oldDay
      );

      const day =
        Number(
          document.getElementById("meetingDay").value
        );

      const value =
        formatMeetingDateValue(
          year,
          month,
          day
        );

      document.getElementById("meetingDate").value =
        value;

      const arabicDay =
        toArabicDigits(String(day).padStart(2, "0"));

      const arabicYear =
        toArabicDigits(year);

      document.getElementById("meetingDateText").value =
        `${arabicDay}/${toArabicDigits(String(month).padStart(2, "0"))}/${arabicYear}`;
    }

    function toggleMeetingDatePicker() {

      const popover =
        document.getElementById("meetingDatePopover");

      const trigger =
        document.getElementById("meetingDateTrigger");

      const isOpen =
        popover.classList.contains("open");

      popover.classList.toggle(
        "open",
        !isOpen
      );

      popover.setAttribute(
        "aria-hidden",
        isOpen ? "true" : "false"
      );

      trigger.setAttribute(
        "aria-expanded",
        isOpen ? "false" : "true"
      );
    }

    function closeMeetingDatePicker() {

      const popover =
        document.getElementById("meetingDatePopover");

      const trigger =
        document.getElementById("meetingDateTrigger");

      if (!popover) return;

      popover.classList.remove("open");

      popover.setAttribute(
        "aria-hidden",
        "true"
      );

      if (trigger) {
        trigger.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }

    /* =========================
       فتح نافذة الاجتماع
    ========================== */

    async function openMeetingModal() {

      const modal =
        document.getElementById("meetingModal");

      const searchInput =
        document.getElementById("leaderSearch");

      const leadersList =
        document.getElementById("leadersList");

      /* تاريخ اليوم */

      setMeetingDatePicker(todayDate());

      closeMeetingDatePicker();

      /* تصفير البحث */

      searchInput.value = "";

      /* تصفير البيانات */

      activeLeaders = [];
      selectedLeaderIds = new Set();

      leadersList.innerHTML = `
        <div class="no-leaders">
          جاري تحميل القادة...
        </div>
      `;

      modal.classList.add("active");

      document.body.classList.add("modal-open");

      const { data, error } =
        await AppDb.listActiveLeaderDirectory();

      if (error) {

        console.error("LOAD LEADERS ERROR:", error);

        leadersList.innerHTML = `
          <div class="no-leaders">
            تعذر تحميل القادة
          </div>
        `;

        return;
      }

      activeLeaders = data || [];

      /* كل القادة محددين تلقائيًا */

      activeLeaders.forEach(leader => {
        selectedLeaderIds.add(leader.id);
      });

      renderLeaders();
    }

    /* =========================
       إغلاق النافذة
    ========================== */

    function closeMeetingModal() {

      const modal =
        document.getElementById("meetingModal");

      modal.classList.remove("active");

      document.body.classList.remove("modal-open");
    }

    /* =========================
       توحيد البحث العربي
    ========================== */

    function normalizeArabic(value) {

      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ـ/g, "")
        .replace(/\s+/g, "")
        .replace(/^(القائد|القائدة|قائد|قائدة)/, "")
        .trim();
    }

    /* =========================
       عرض القادة
    ========================== */

    function renderLeaders() {

      const container =
        document.getElementById("leadersList");

      const searchValue =
        normalizeArabic(
          document.getElementById("leaderSearch").value
        );

      const filtered =
        activeLeaders.filter(leader => {

          const name =
            normalizeArabic(leader.full_name);

          return (
            !searchValue ||
            name.includes(searchValue)
          );
        });

      if (!filtered.length) {

        container.innerHTML = `
          <div class="no-leaders">
            لا يوجد قائد بهذا الاسم
          </div>
        `;

        return;
      }

      container.innerHTML =
        filtered
          .map(leader => {

            const checked =
              selectedLeaderIds.has(leader.id);

            return `
              <label class="leader-row">

                <div class="leader-row-info">

                  <div class="leader-avatar">
                    👤
                  </div>

                  <span>
                    ${escapeHtml(leader.full_name)}
                  </span>

                </div>

                <input
                  type="checkbox"
                  data-leader-id="${leader.id}"
                  ${checked ? "checked" : ""}
                />

              </label>
            `;
          })
          .join("");
    }

    /* =========================
       اختيار / إلغاء قائد
    ========================== */

    function toggleLeader(leaderId) {

      if (selectedLeaderIds.has(leaderId)) {

        selectedLeaderIds.delete(leaderId);

      } else {

        selectedLeaderIds.add(leaderId);
      }
    }

    /* =========================
       البحث
    ========================== */

    function handleLeaderSearchInput(input) {

      /*
         السماح بالعربي والأرقام والمسافات فقط.
         أي حرف English يتم حذفه فورًا.
      */

      input.value =
        String(input.value || "")
          .replace(/[A-Za-z]/g, "")
          .replace(/[^\u0600-\u06FF٠-٩\s]/g, "");

      filterLeaders();
    }

    function blockEnglishSearch(event) {

      if (
        /^[A-Za-z]$/.test(event.key)
      ) {
        event.preventDefault();
      }
    }

    function filterLeaders() {
      renderLeaders();
    }

    /* =========================
       حفظ الاجتماع
    ========================== */

    async function saveMeeting() {
      const date = document.getElementById("meetingDate").value;
      const button = document.getElementById("saveMeetingButton");

      if (!date) {
        alert("اختاري تاريخ الاجتماع");
        return;
      }

      if (!activeLeaders.length) {
        alert("لا يوجد قادة لإضافة الاجتماع");
        return;
      }

      button.disabled = true;
      button.textContent = "جاري الحفظ...";

      try {
        const meetingYear = Number(String(date || '').slice(0, 4));

        /* إنشاء الاجتماع */
        const { data: meeting, error: meetingError } =
          await AppDb.createMeeting({
            title: getMeetingTitle(1),
            meeting_date: date
          });

        if (meetingError) {
          console.error("MEETING INSERT ERROR:", meetingError);
          alert(
            "خطأ حفظ الاجتماع: " +
              (meetingError.message || JSON.stringify(meetingError))
          );
          return;
        }

        if (!meeting || !meeting.id) {
          alert("تم إنشاء الاجتماع لكن لم يتم إرجاع رقم الاجتماع.");
          return;
        }

        /* إنشاء حضور القادة */
        const attendanceRows = activeLeaders.map(leader => ({
          meeting_id: meeting.id,
          leader_id: leader.id,
          status: selectedLeaderIds.has(leader.id) ? "present" : "absent"
        }));

        const { error: attendanceError } =
          await AppDb.createMeetingAttendance(attendanceRows);

        if (attendanceError) {
          console.error("ATTENDANCE INSERT ERROR:", attendanceError);
          alert(
            "تم إنشاء الاجتماع، لكن حصل خطأ بحفظ الحضور:\n" +
              (attendanceError.message || JSON.stringify(attendanceError))
          );
          return;
        }

        await renumberMeetingYears([meetingYear]);
        closeMeetingModal();
        await loadMeetings(Number(date.substring(0, 4)));
      } catch (error) {
        console.error("SAVE MEETING ERROR:", error);
        alert(
          "خطأ أثناء حفظ الاجتماع:\n" +
            (error.message || JSON.stringify(error))
        );
      } finally {
        button.disabled = false;
        button.textContent = "حفظ الاجتماع";
      }
    }

    /* =========================
       حماية النصوص
    ========================== */

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    /* =========================
       إغلاق عند الضغط خارج النافذة
    ========================== */

    document
      .getElementById("meetingModal")
      .addEventListener("click", function (event) {
        if (event.target === this) {
          closeMeetingModal();
        }
      });
    /* =========================
       أحداث الصفحة
    ========================== */

    document
      .getElementById("backToAdminButton")
      .addEventListener("click", function () {
        window.location.href = "admin.html";
      });

    document
      .getElementById("openMeetingModalButton")
      .addEventListener("click", function () {
        openMeetingModal();
      });

    document
      .getElementById("yearFilter")
      .addEventListener("change", function () {
        renderMeetings();
      });

    document
      .getElementById("closeMeetingModalButton")
      .addEventListener("click", function () {
        closeMeetingModal();
      });

    document
      .getElementById("meetingDateText")
      .addEventListener("input", function () {
        handleTypedMeetingDate();
      });

    document
      .getElementById("meetingDateTrigger")
      .addEventListener("click", function () {
        toggleMeetingDatePicker();
      });

    ["meetingDay", "meetingMonth", "meetingYear"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        syncMeetingDateFromPicker();
      });
    });

    document
      .getElementById("leaderSearch")
      .addEventListener("input", function (event) {
        handleLeaderSearchInput(event.currentTarget);
      });

    document
      .getElementById("leaderSearch")
      .addEventListener("keydown", function (event) {
        blockEnglishSearch(event);
      });

    document
      .getElementById("saveMeetingButton")
      .addEventListener("click", function () {
        saveMeeting();
      });

    document
      .getElementById("leadersList")
      .addEventListener("change", function (event) {
        const checkbox = event.target;

        if (checkbox instanceof HTMLInputElement && checkbox.type === "checkbox") {
          toggleLeader(checkbox.dataset.leaderId);
        }
      });

    /* =========================
       بدء الصفحة
    ========================== */

    loadMeetings(new Date().getFullYear());
