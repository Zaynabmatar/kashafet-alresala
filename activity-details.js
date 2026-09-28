// Activity Details page behavior

const params = new URLSearchParams(window.location.search);
const activityId = params.get("id");
const leaderId = params.get("leader_id");

let activity = null;
let activities = [];
let members = [];
let attendance = [];
let selectedMemberIds = new Set();

const MONTHS_AR = [
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

// Display and input helpers
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

function editToEnglishDigits(value) {
  return String(value).replace(/[٠-٩]/g, digit =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
  );
}

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
    .trim()
    .replace(/[A-Za-z]/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function formatDate(dateString) {
  if (!dateString) return "";

  const parts = String(dateString).slice(0, 10).split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day || !MONTHS_AR[month - 1]) {
    return dateString;
  }

  return `${toArabicDigits(day)} ${MONTHS_AR[month - 1]} ${toArabicDigits(year)}`;
}

function goBackToActivities() {
  const target = leaderId
    ? `activities.html?id=${encodeURIComponent(leaderId)}`
    : "activities.html";

  window.location.href = target;
}

// Activity edit date picker
const EDIT_ACTIVITY_MONTH_NAMES = [
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

function formatEditActivityDateValue(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function populateEditActivityDateYears(selectedYear) {
  const yearSelect = document.getElementById("editActivityYear");

  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  const years = [];

  for (let year = currentYear - 10; year <= currentYear + 10; year++) {
    years.push(year);
  }

  if (selectedYear && !years.includes(Number(selectedYear))) {
    years.push(Number(selectedYear));
  }

  yearSelect.innerHTML = years
    .sort((a, b) => a - b)
    .map(year => `<option value="${year}">${toArabicDigits(year)}</option>`)
    .join("");

  yearSelect.value = String(selectedYear);
}

function populateEditActivityDateDays(year, month, selectedDay) {
  const daySelect = document.getElementById("editActivityDay");

  if (!daySelect) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Number(selectedDay) || 1, daysInMonth);

  daySelect.innerHTML = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  )
    .map(day => `<option value="${day}">${toArabicDigits(day)}</option>`)
    .join("");

  daySelect.value = String(safeDay);
}

function setEditActivityDatePicker(dateString) {
  const fallback = new Date();
  const parts = String(dateString || "").split("-").map(Number);
  const year = parts[0] || fallback.getFullYear();
  const month = parts[1] || fallback.getMonth() + 1;
  const day = parts[2] || fallback.getDate();

  populateEditActivityDateYears(year);

  const monthSelect = document.getElementById("editActivityMonth");

  if (!monthSelect) return;

  monthSelect.innerHTML = EDIT_ACTIVITY_MONTH_NAMES
    .map((name, index) => `<option value="${index + 1}">${name}</option>`)
    .join("");
  monthSelect.value = String(month);

  populateEditActivityDateDays(year, month, day);
  syncEditActivityDateFromPicker();
}

function syncEditActivityDateFromPicker() {
  const yearSelect = document.getElementById("editActivityYear");
  const monthSelect = document.getElementById("editActivityMonth");
  const daySelect = document.getElementById("editActivityDay");

  if (!yearSelect || !monthSelect || !daySelect) return;

  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);
  const oldDay = Number(daySelect.value) || 1;

  populateEditActivityDateDays(year, month, oldDay);

  const day = Number(daySelect.value);
  const value = formatEditActivityDateValue(year, month, day);

  document.getElementById("editActivityDate").value = value;
  document.getElementById("editActivityDateText").value =
    `${toArabicDigits(String(day).padStart(2, "0"))}/${toArabicDigits(String(month).padStart(2, "0"))}/${toArabicDigits(year)}`;
}

function handleTypedEditActivityDate() {
  const input = document.getElementById("editActivityDateText");

  if (!input) return;

  const value = String(input.value || "").replace(/[^0-9\u0660-\u0669/]/g, "");
  input.value = value;

  const parts = value
    .split("/")
    .map(part => editToEnglishDigits(part).trim());

  if (parts.length !== 3) return;

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
    return;
  }

  const parsed = formatEditActivityDateValue(year, month, day);
  document.getElementById("editActivityDate").value = parsed;
  setEditActivityDatePicker(parsed);
}

function toggleEditActivityDatePicker() {
  const popover = document.getElementById("editActivityDatePopover");
  const trigger = document.getElementById("editActivityDateTrigger");

  if (!popover) return;

  const isOpen = popover.classList.contains("open");
  popover.classList.toggle("open", !isOpen);
  popover.setAttribute("aria-hidden", isOpen ? "true" : "false");

  if (trigger) {
    trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
  }
}

function closeEditActivityDatePicker() {
  const popover = document.getElementById("editActivityDatePopover");
  const trigger = document.getElementById("editActivityDateTrigger");

  if (!popover) return;

  popover.classList.remove("open");
  popover.setAttribute("aria-hidden", "true");

  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
}

// Attendance display and edit selection
function renderPresentMembers() {
  const container = document.getElementById("presentMembers");
  const presentIds = new Set(
    attendance
      .filter(row => row.status === "present")
      .map(row => row.member_id)
  );

  const presentMembers = members.filter(member => presentIds.has(member.id));
  const presentCount = presentMembers.length;
  const totalCount = members.length;

  document.getElementById("attendanceSummary").textContent =
    `الحضور: ${toArabicDigits(presentCount)} من أصل ${toArabicDigits(totalCount)}`;

  if (!presentMembers.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا يوجد حاضرون
      </div>
    `;
    return;
  }

  container.innerHTML = presentMembers.map(member => `
    <div class="present-member-card">
      <div class="member-avatar">👤</div>
      <span>${escapeHtml(member.full_name)}</span>
    </div>
  `).join("");
}

function renderEditMembers() {
  const container = document.getElementById("editMembersList");
  const searchInput = document.getElementById("editMemberSearch");
  const searchValue = normalizeArabic(searchInput ? searchInput.value : "");

  const filteredMembers = members.filter(member =>
    normalizeArabic(member.full_name).includes(searchValue)
  );

  if (!filteredMembers.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا يوجد عضو بهذا الاسم
      </div>
    `;
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
}

function toggleMemberSelection(memberId) {
  if (selectedMemberIds.has(memberId)) {
    selectedMemberIds.delete(memberId);
  } else {
    selectedMemberIds.add(memberId);
  }
}

// Load activity, members, attendance, and the year-specific activity number
async function loadDetails() {
  if (!activityId || !leaderId) {
    alert("لم يتم تحديد النشاط");
    goBackToActivities();
    return;
  }

  try {
    const [activityResult, activitiesResult, membersResult, attendanceResult] =
      await Promise.all([
        supabaseClient
          .from("activities")
          .select("*")
          .eq("id", activityId)
          .eq("leader_id", leaderId)
          .single(),

        supabaseClient
          .from("activities")
          .select("*")
          .eq("leader_id", leaderId)
          .order("activity_date", { ascending: true })
          .order("created_at", { ascending: true }),

        supabaseClient
          .from("members")
          .select("*")
          .eq("leader_id", leaderId)
          .order("full_name", { ascending: true }),

        supabaseClient
          .from("activity_attendance")
          .select("*")
          .eq("activity_id", activityId)
      ]);

    if (activityResult.error || !activityResult.data) {
      console.error("LOAD ACTIVITY ERROR:", activityResult.error);
      alert("تعذر تحميل النشاط");
      goBackToActivities();
      return;
    }

    if (membersResult.error) throw membersResult.error;
    if (attendanceResult.error) throw attendanceResult.error;

    activity = activityResult.data;
    activities = activitiesResult.data || [];
    attendance = attendanceResult.data || [];

    // Active members are included; deleted attendees remain visible for this activity.
    const activityMemberIds = new Set(attendance.map(row => row.member_id));
    members = (membersResult.data || []).filter(
      member => !member.deleted_at || activityMemberIds.has(member.id)
    );

    const activityYear = String(activity.activity_date || "").slice(0, 4);
    const activityIndex = activities
      .filter(
        item => String(item.activity_date || "").slice(0, 4) === activityYear
      )
      .findIndex(item => item.id === activity.id);

    const activityNumber = activityIndex >= 0 ? activityIndex + 1 : 1;

    document.getElementById("activityNumber").textContent =
      `نشاط رقم ${toArabicDigits(activityNumber)}`;
    document.getElementById("activityTitle").textContent =
      activity.title || "نشاط";
    document.getElementById("activityDate").textContent =
      formatDate(activity.activity_date);

    renderPresentMembers();
  } catch (error) {
    console.error("LOAD ACTIVITY DETAILS ERROR:", error);
    alert("تعذر تحميل تفاصيل النشاط");
    goBackToActivities();
  }
}

// Edit activity fields and attendance
function openEditActivity() {
  selectedMemberIds = new Set(
    attendance
      .filter(row => row.status === "present")
      .map(row => row.member_id)
  );

  document.getElementById("editActivityTitle").value = activity.title || "";
  document.getElementById("editMemberSearch").value = "";
  setEditActivityDatePicker(activity.activity_date);
  closeEditActivityDatePicker();
  renderEditMembers();

  document.getElementById("editActivityModal").classList.add("active");
  document.body.classList.add("activity-modal-open");
}

function closeEditActivity() {
  document.getElementById("editActivityModal").classList.remove("active");
  document.body.classList.remove("activity-modal-open");
}

async function saveActivityEdits() {
  const button = document.getElementById("saveEditActivityButton");
  const title = document.getElementById("editActivityTitle").value.trim();
  const newDate = document.getElementById("editActivityDate").value;

  if (!newDate) {
    alert("يرجى اختيار تاريخ النشاط.");
    return;
  }

  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";

  try {
    const { error: activityError } = await supabaseClient
      .from("activities")
      .update({
        title: title || null,
        activity_date: newDate
      })
      .eq("id", activityId)
      .eq("leader_id", leaderId);

    if (activityError) throw activityError;

    const knownRows = new Map(
      attendance.map(row => [row.member_id, row])
    );

    const existingRows = attendance.map(row =>
      supabaseClient
        .from("activity_attendance")
        .update({
          status: selectedMemberIds.has(row.member_id) ? "present" : "absent"
        })
        .eq("id", row.id)
    );

    const updateResults = await Promise.all(existingRows);
    const updateError = updateResults.find(result => result.error)?.error;

    if (updateError) throw updateError;

    const newRows = members
      .filter(member => !knownRows.has(member.id))
      .map(member => ({
        activity_id: activityId,
        member_id: member.id,
        status: selectedMemberIds.has(member.id) ? "present" : "absent"
      }));

    if (newRows.length) {
      const { error } = await supabaseClient
        .from("activity_attendance")
        .insert(newRows);

      if (error) throw error;
    }

    await loadDetails();
    closeEditActivity();
  } catch (error) {
    console.error("SAVE ACTIVITY EDIT ERROR:", error);
    alert("تعذر حفظ تعديلات النشاط");
  } finally {
    button.disabled = false;
    button.textContent = "حفظ التعديلات";
  }
}

// Page event listeners
document
  .querySelector(".menu-button")
  .addEventListener("click", goBackToActivities);

document
  .getElementById("editActivityButton")
  .addEventListener("click", openEditActivity);

document
  .querySelector(".close-modal-button")
  .addEventListener("click", closeEditActivity);

document
  .getElementById("editActivityDateText")
  .addEventListener("input", handleTypedEditActivityDate);

document
  .getElementById("editActivityDateTrigger")
  ?.addEventListener("click", toggleEditActivityDatePicker);

document
  .getElementById("editActivityMonth")
  .addEventListener("change", syncEditActivityDateFromPicker);

document
  .getElementById("editActivityYear")
  .addEventListener("change", syncEditActivityDateFromPicker);

document
  .getElementById("editActivityDay")
  .addEventListener("change", syncEditActivityDateFromPicker);

document
  .getElementById("editMemberSearch")
  .addEventListener("input", function () {
    this.value = this.value.replace(/[A-Za-z]/g, "");
    renderEditMembers();
  });

document
  .getElementById("editMembersList")
  .addEventListener("change", event => {
    const checkbox = event.target.closest("input[type='checkbox'][data-member-id]");

    if (checkbox) {
      toggleMemberSelection(checkbox.dataset.memberId);
    }
  });

document
  .getElementById("editActivityModal")
  .addEventListener("click", function (event) {
    if (event.target === this) {
      closeEditActivity();
    }
  });

document
  .getElementById("saveEditActivityButton")
  .addEventListener("click", saveActivityEdits);

document.addEventListener("input", function (event) {
  if (event.target && event.target.id === "editActivityTitle") {
    event.target.value = event.target.value.replace(/[A-Za-z]/g, "");
  }
});

loadDetails();
