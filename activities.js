// Activities page behavior

const leaderId =
  new URLSearchParams(window.location.search).get("id");

let currentLeader = null;
let currentTeamId = null;
let members = [];
let activities = [];
let activityAttendance = [];
let selectedMemberIds = new Set();
let activityDateValue = null;

// Display and search helpers
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeArabic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function toArabicDigits(value) {
  return String(value).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[digit]);
}

function toEnglishDigits(value) {
  return String(value).replace(/[٠-٩]/g, digit =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
  );
}

function formatDate(value) {
  if (!value) return "غير محدد";

  const parts = String(value).split("-");

  if (parts.length !== 3) return value;

  return `${toArabicDigits(parts[2])}/${toArabicDigits(parts[1])}/${toArabicDigits(parts[0])}`;
}

// Page navigation and activity form
function goBackToDashboard() {
  if (!leaderId) {
    window.location.href = "leader-dashboard.html";
    return;
  }

  window.location.href =
    "leader-dashboard.html?id=" + encodeURIComponent(leaderId);
}

function openActivityForm() {
  const modal = document.getElementById("activityModal");

  if (!modal) return;

  document.getElementById("activityTitle").value = "";
  selectedMemberIds = new Set(members.map(member => member.id));

  setTodayActivityDate();
  renderMembers();

  modal.classList.add("active");
  document.body.classList.add("activity-modal-open");
}

function closeActivityForm() {
  const modal = document.getElementById("activityModal");

  if (!modal) return;

  modal.classList.remove("active");
  document.body.classList.remove("activity-modal-open");
}

// Activity date picker and typed-date synchronization
function populateDatePicker() {
  const day = document.getElementById("activityDay");
  const month = document.getElementById("activityMonth");
  const year = document.getElementById("activityYear");

  day.innerHTML = "";
  month.innerHTML = "";
  year.innerHTML = "";

  for (let i = 1; i <= 31; i++) {
    const option = document.createElement("option");
    option.value = String(i).padStart(2, "0");
    option.textContent = String(i).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    day.appendChild(option);
  }

  const months = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
  ];

  months.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = name;
    month.appendChild(option);
  });

  const currentYear = new Date().getFullYear();

  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const option = document.createElement("option");
    option.value = String(y);
    option.textContent = String(y).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    year.appendChild(option);
  }
}

function setTodayActivityDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());

  activityDateValue = `${year}-${month}-${day}`;

  document.getElementById("activityDateText").value =
    `${toArabicDigits(day)}/${toArabicDigits(month)}/${toArabicDigits(year)}`;
  document.getElementById("activityDay").value = day;
  document.getElementById("activityMonth").value = month;
  document.getElementById("activityYear").value = year;
}

function syncActivityDateFromPicker() {
  const day = document.getElementById("activityDay").value;
  const month = document.getElementById("activityMonth").value;
  const year = document.getElementById("activityYear").value;

  activityDateValue = `${year}-${month}-${day}`;
  document.getElementById("activityDateText").value =
    `${toArabicDigits(day)}/${toArabicDigits(month)}/${toArabicDigits(year)}`;
}

function handleTypedActivityDate() {
  const input = document.getElementById("activityDateText");

  input.value = input.value.replace(/[^\d٠-٩/]/g, "").slice(0, 10);

  const normalized = toEnglishDigits(input.value);
  const match = normalized.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);

  if (!match) return;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return;
  }

  activityDateValue =
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  document.getElementById("activityDay").value = String(day).padStart(2, "0");
  document.getElementById("activityMonth").value = String(month).padStart(2, "0");
  document.getElementById("activityYear").value = String(year);
}

function toggleActivityDatePicker() {
  const picker = document.getElementById("activityDatePicker");

  if (!picker) return;

  const willOpen = !picker.classList.contains("open");
  picker.classList.toggle("open", willOpen);
  picker.style.display = willOpen ? "block" : "none";
}

// Member search and attendance selection for a new activity
function renderMembers() {
  const container = document.getElementById("membersList");
  const searchInput = document.getElementById("memberSearch");
  const searchValue = normalizeArabic(searchInput?.value || "");

  const filteredMembers = members.filter(member =>
    normalizeArabic(member.full_name).includes(searchValue)
  );

  if (!filteredMembers.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا يوجد عنصر بهذا الاسم
      </div>
    `;
    updateSelectedMembersCount();
    return;
  }

  container.innerHTML = filteredMembers.map(member => `
    <label class="member-row">
      <div class="member-row-info">
        <div class="member-avatar">👤</div>
        <span>${escapeHtml(member.full_name)}</span>
      </div>

      <input
        type="checkbox"
        data-member-id="${escapeHtml(member.id)}"
        ${selectedMemberIds.has(member.id) ? "checked" : ""}
      >
    </label>
  `).join("");

  updateSelectedMembersCount();
}

function toggleMemberSelection(memberId) {
  if (selectedMemberIds.has(memberId)) {
    selectedMemberIds.delete(memberId);
  } else {
    selectedMemberIds.add(memberId);
  }

  updateSelectedMembersCount();
}

function updateSelectedMembersCount() {
  document.getElementById("selectedMembersCount").textContent =
    `تم اختيار ${selectedMemberIds.size} عنصر`;
}

// Load leader, members, activities, and attendance
async function loadLeader() {
  if (!leaderId) {
    alert("تعذر تحديد القائد.");
    return false;
  }

  const result = await AppDb.getLeaderById(leaderId);

  if (result.error || !result.data) {
    console.error("LOAD LEADER ERROR:", result.error);
    alert("تعذر تحميل معلومات القائد.");
    return false;
  }

  currentLeader = result.data;
  currentTeamId = currentLeader.team_id || null;
  return true;
}

async function loadMembers() {
  const result = await supabaseClient
    .from("members")
    .select("*")
    .eq("leader_id", leaderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("LOAD MEMBERS ERROR:", result.error);
    alert("تعذر تحميل العناصر.");
    return;
  }

  members = result.data || [];
  selectedMemberIds = new Set(members.map(member => member.id));
  renderMembers();
}

async function loadActivities() {
  const result = await supabaseClient
    .from("activities")
    .select("*")
    .eq("leader_id", leaderId)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("LOAD ACTIVITIES ERROR:", result.error);
    alert("تعذر تحميل سجل الأنشطة.");
    return;
  }

  activities = result.data || [];
  activityAttendance = [];

  const activityIds = activities
    .map(activity => activity.id)
    .filter(Boolean);

  if (activityIds.length) {
    const attendanceResult = await supabaseClient
      .from("activity_attendance")
      .select("activity_id, member_id, status")
      .in("activity_id", activityIds);

    if (attendanceResult.error) {
      console.error(
        "LOAD ACTIVITY ATTENDANCE ERROR:",
        attendanceResult.error
      );
      activityAttendance = [];
    } else {
      activityAttendance = attendanceResult.data || [];
    }
  }

  renderActivityYears();
  renderActivities();
}

function renderActivityYears() {
  const select = document.getElementById("activityYearFilter");
  const currentYear = String(new Date().getFullYear());

  const years = [
    ...new Set(
      activities
        .map(activity => String(activity.activity_date || "").slice(0, 4))
        .filter(Boolean)
    )
  ];

  // Keep the current year selectable even when it has no activities yet.
  if (!years.includes(currentYear)) {
    years.push(currentYear);
  }

  years.sort((a, b) => Number(b) - Number(a));
  select.innerHTML = '<option value="all">كل السنوات</option>';

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = toArabicDigits(year);
    select.appendChild(option);
  });

  select.value = currentYear;
}

// Activity history and per-year numbering
function renderActivities() {
  const list = document.getElementById("activitiesList");
  const filter = document.getElementById("activityYearFilter").value;

  const filtered = activities.filter(activity => {
    if (filter === "all") return true;

    return String(activity.activity_date || "").slice(0, 4) === filter;
  });

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        لا توجد أنشطة
      </div>
    `;
    return;
  }

  /*
   * Keep the existing order: older activities first for numbering,
   * with created_at breaking ties. Each year has its own sequence.
   */
  const numberedActivities = [...activities].sort((a, b) => {
    const dateA = String(a.activity_date || "");
    const dateB = String(b.activity_date || "");

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const createdA = String(a.created_at || "");
    const createdB = String(b.created_at || "");

    return createdA.localeCompare(createdB);
  });

  list.innerHTML = filtered.map(activity => {
    // This is intentionally year-scoped; keep in sync with activity details.
    const activityNumber = numberedActivities
      .filter(item =>
        String(item.activity_date || "").slice(0, 4) ===
        String(activity.activity_date || "").slice(0, 4)
      )
      .findIndex(item => item.id === activity.id) + 1;

    const attendanceRows = activityAttendance.filter(
      row => row.activity_id === activity.id
    );

    const presentCount = attendanceRows.filter(
      row => row.status === "present"
    ).length;

    const totalCount = members.length;

    return `
      <article
        class="activity-card"
        data-activity-id="${escapeHtml(activity.id)}"
      >
        <div class="activity-card-main">
          <div class="activity-number">
            نشاط رقم ${toArabicDigits(activityNumber)}
          </div>

          <h3>${escapeHtml(activity.title || "نشاط")}</h3>

          <div class="activity-info">
            📅
            <span>${escapeHtml(formatDate(activity.activity_date))}</span>
          </div>

          <div class="activity-info activity-attendance-info">
            👥
            <span>
              الحضور:
              ${toArabicDigits(presentCount)}
              من أصل
              ${toArabicDigits(totalCount)}
            </span>
          </div>
        </div>

        <div class="activity-arrow">‹</div>
      </article>
    `;
  }).join("");
}

function openActivity(activityId) {
  window.location.href =
    "activity-details.html?id=" +
    encodeURIComponent(activityId) +
    "&leader_id=" +
    encodeURIComponent(leaderId);
}

// Create an activity and its attendance rows
async function saveActivity() {
  const button = document.getElementById("saveActivityButton");
  const enteredTitle = document
    .getElementById("activityTitle")
    .value
    .trim();
  const title = enteredTitle || "نشاط";

  /* The title is optional, but when supplied it must be Arabic text. */
  if (
    title &&
    !/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s٠-٩0-9،؛؟.!'"()\-]+$/.test(title)
  ) {
    alert("عنوان النشاط يجب أن يكون باللغة العربية فقط.");
    return;
  }

  if (!activityDateValue) {
    alert("يرجى اختيار تاريخ النشاط.");
    return;
  }

  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";

  try {
    const result = await supabaseClient
      .from("activities")
      .insert({
        leader_id: leaderId,
        title: title || null,
        activity_date: activityDateValue,
        team_id: currentTeamId
      })
      .select()
      .single();

    if (result.error) {
      throw result.error;
    }

    const activityId = result.data.id;

    if (members.length > 0) {
      const attendanceRows = members.map(member => ({
        activity_id: activityId,
        member_id: member.id,
        status: selectedMemberIds.has(member.id) ? "present" : "absent"
      }));

      const attendanceResult = await supabaseClient
        .from("activity_attendance")
        .insert(attendanceRows);

      if (attendanceResult.error) {
        console.error(
          "SAVE ACTIVITY ATTENDANCE ERROR:",
          attendanceResult.error
        );

        // Remove the new activity if its attendance rows could not be saved.
        await supabaseClient
          .from("activities")
          .delete()
          .eq("id", activityId);

        throw attendanceResult.error;
      }
    }

    closeActivityForm();
    await loadActivities();
  } catch (error) {
    console.error("SAVE ACTIVITY ERROR:", error);
    alert("تعذر حفظ النشاط.");
  } finally {
    button.disabled = false;
    button.textContent = "حفظ النشاط";
  }
}

// Page event listeners
document
  .querySelector(".activities-back-button")
  .addEventListener("click", goBackToDashboard);

document
  .querySelector(".add-activity-button")
  .addEventListener("click", openActivityForm);

document
  .querySelector(".close-form-button")
  .addEventListener("click", closeActivityForm);

document
  .getElementById("saveActivityButton")
  .addEventListener("click", saveActivity);

document
  .getElementById("activityYearFilter")
  .addEventListener("change", renderActivities);

document
  .getElementById("membersList")
  .addEventListener("change", event => {
    const checkbox = event.target.closest("input[type='checkbox'][data-member-id]");

    if (checkbox) {
      toggleMemberSelection(checkbox.dataset.memberId);
    }
  });

document
  .getElementById("activitiesList")
  .addEventListener("click", event => {
    const activityCard = event.target.closest(".activity-card[data-activity-id]");

    if (activityCard) {
      openActivity(activityCard.dataset.activityId);
    }
  });

document
  .getElementById("activityDateText")
  .addEventListener("input", handleTypedActivityDate);

document
  .getElementById("activityDay")
  .addEventListener("change", syncActivityDateFromPicker);

document
  .getElementById("activityMonth")
  .addEventListener("change", syncActivityDateFromPicker);

document
  .getElementById("activityYear")
  .addEventListener("change", syncActivityDateFromPicker);

document
  .getElementById("memberSearch")
  .addEventListener("input", function () {
    this.value = this.value.replace(/[A-Za-z]/g, "");
    renderMembers();
  });

const activityDateTrigger = document.getElementById("activityDateTrigger");

if (activityDateTrigger) {
  activityDateTrigger.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    toggleActivityDatePicker();
  });
}

document.addEventListener("click", function (event) {
  const picker = document.getElementById("activityDatePicker");
  const trigger = document.getElementById("activityDateTrigger");

  if (
    picker.classList.contains("open") &&
    !picker.contains(event.target) &&
    event.target !== trigger
  ) {
    picker.classList.remove("open");
  }
});

const activityTitleInput = document.getElementById("activityTitle");

if (activityTitleInput) {
  activityTitleInput.addEventListener("input", function () {
    this.value = this.value.replace(
      /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g,
      ""
    );
  });
}

// Initialize the page and load its data
async function init() {
  populateDatePicker();
  setTodayActivityDate();

  const loaded = await loadLeader();

  if (!loaded) return;

  await loadMembers();
  await loadActivities();
}

init();
