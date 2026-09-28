// Meeting details, attendance, and editing

const params = new URLSearchParams(window.location.search);
const meetingId = params.get("id");

let meeting = null;
let attendance = [];
let leaders = [];
let selectedAttendanceIds = new Set();
let selectedDate = null;


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


// Date formatting and date-picker helpers
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


function setDatePickerValue(dateString) {
    setEditMeetingDatePicker(dateString);
}

function getSelectedDate() {
    const input =
        document.getElementById("editMeetingDate");

    return input ? input.value : "";
}

const EDIT_MEETING_MONTH_NAMES = [
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

function editToEnglishDigits(value) {
    return String(value)
        .replace(/[٠-٩]/g, digit =>
            String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
        );
}

function formatTypedEditMeetingDate(dateString) {
    const parts =
        String(dateString || "")
            .split("/")
            .map(part => editToEnglishDigits(part).trim());

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

    return formatEditMeetingDateValue(
        year,
        month,
        day
    );
}

function handleTypedEditMeetingDate() {
    const input =
        document.getElementById("editMeetingDateText");

    if (!input) return;

    let value =
        String(input.value || "")
            .replace(/[^0-9\u0660-\u0669/]/g, "");

    input.value = value;

    const parsed =
        formatTypedEditMeetingDate(value);

    if (!parsed) {
        return;
    }

    document.getElementById("editMeetingDate").value =
        parsed;

    setEditMeetingDatePicker(parsed);
}

function editToArabicDigits(value) {
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

function formatEditMeetingDateValue(year, month, day) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function populateEditMeetingDateYears(selectedYear) {
    const yearSelect =
        document.getElementById("editMeetingYear");

    if (!yearSelect) return;

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
                `<option value="${year}">${editToArabicDigits(year)}</option>`
            )
            .join("");

    yearSelect.value = String(selectedYear);
}

function populateEditMeetingDateDays(
    year,
    month,
    selectedDay
) {
    const daySelect =
        document.getElementById("editMeetingDay");

    if (!daySelect) return;

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
            `<option value="${day}">${editToArabicDigits(day)}</option>`
        )
        .join("");

    daySelect.value = String(safeDay);
}

function setEditMeetingDatePicker(dateString) {
    const fallback =
        new Date();

    const parts =
        String(dateString || "")
            .split("-")
            .map(Number);

    const year =
        parts[0] || fallback.getFullYear();

    const month =
        parts[1] || (fallback.getMonth() + 1);

    const day =
        parts[2] || fallback.getDate();

    populateEditMeetingDateYears(year);

    const monthSelect =
        document.getElementById("editMeetingMonth");

    if (!monthSelect) return;

    monthSelect.innerHTML =
        EDIT_MEETING_MONTH_NAMES
            .map(
                (name, index) =>
                    `<option value="${index + 1}">${name}</option>`
            )
            .join("");

    monthSelect.value = String(month);

    populateEditMeetingDateDays(
        year,
        month,
        day
    );

    syncEditMeetingDateFromPicker();
}

function syncEditMeetingDateFromPicker() {
    const yearSelect =
        document.getElementById("editMeetingYear");

    const monthSelect =
        document.getElementById("editMeetingMonth");

    const daySelect =
        document.getElementById("editMeetingDay");

    if (!yearSelect || !monthSelect || !daySelect) {
        return;
    }

    const year =
        Number(yearSelect.value);

    const month =
        Number(monthSelect.value);

    const oldDay =
        Number(daySelect.value) || 1;

    populateEditMeetingDateDays(
        year,
        month,
        oldDay
    );

    const day =
        Number(daySelect.value);

    const value =
        formatEditMeetingDateValue(
            year,
            month,
            day
        );

    document.getElementById("editMeetingDate").value =
        value;

    const arabicDay =
        editToArabicDigits(
            String(day).padStart(2, "0")
        );

    const arabicMonth =
        editToArabicDigits(
            String(month).padStart(2, "0")
        );

    const arabicYear =
        editToArabicDigits(year);

    document.getElementById("editMeetingDateText").value =
        `${arabicDay}/${arabicMonth}/${arabicYear}`;
}

function toggleEditMeetingDatePicker() {
    const popover =
        document.getElementById("editMeetingDatePopover");

    const trigger =
        document.getElementById("editMeetingDateTrigger");

    if (!popover) return;

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

    if (trigger) {
        trigger.setAttribute(
            "aria-expanded",
            isOpen ? "false" : "true"
        );
    }
}

function closeEditMeetingDatePicker() {
    const popover =
        document.getElementById("editMeetingDatePopover");

    const trigger =
        document.getElementById("editMeetingDateTrigger");

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

// Attendance display and meeting numbering
function renderPresentLeaders() {

    const container = document.getElementById("presentLeaders");

    const presentIds = new Set(
        attendance
            .filter(row => row.status === "present")
            .map(row => row.leader_id)
    );

    const presentLeaders = leaders.filter(leader =>
        presentIds.has(leader.id)
    );


    document.getElementById("attendanceSummary").textContent =
        `${toArabicDigits(presentLeaders.length)} حاضر`;


    if (!presentLeaders.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا يوجد حاضرون
            </div>
        `;

        return;
    }


    container.innerHTML = presentLeaders.map(leader => `
        <div class="present-leader-card">

            <div class="leader-avatar">
                👤
            </div>

            <span>${escapeHtml(leader.full_name)}</span>

        </div>
    `).join("");
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


function getMeetingTitle(number) {
    return `الاجتماع رقم ${toArabicDigits(number)}`;
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
        .order("meeting_date", { ascending: true });

    if (error) {
        throw error;
    }

    for (const year of years) {

        const yearMeetings = (data || [])
            .filter(meeting =>
                Number(String(meeting.meeting_date || "").slice(0, 4)) === year
            )
            .sort((a, b) => {
                const dateCompare =
                    String(a.meeting_date || "").localeCompare(
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

            const { error: updateError } =
                await supabaseClient
                    .from("meetings")
                    .update({ title: newTitle })
                    .eq("id", meeting.id);

            if (updateError) {
                throw updateError;
            }
        }
    }
}


// Load the selected meeting, its attendance, and its leaders
async function loadDetails() {

    if (!meetingId) {
        alert("لم يتم تحديد الاجتماع");
        window.location.href = "meetings.html";
        return;
    }


    try {

        const [
            meetingResult,
            attendanceResult,
            leadersResult
        ] = await Promise.all([
            AppDb.getMeetingById(meetingId),
            AppDb.listMeetingAttendance(meetingId),
            supabaseClient.from("leaders").select("id, full_name, deleted_at")
        ]);


        if (meetingResult.error || !meetingResult.data) {

            console.error(meetingResult.error);

            alert("تعذر تحميل الاجتماع");
            window.location.href = "meetings.html";
            return;
        }


        meeting = meetingResult.data;
        attendance = attendanceResult.data || [];

/*
 * تعديل اجتماع موجود:
 * القادة النشطون يظهرون دائمًا.
 * القائد المحذوف يظهر فقط إذا كان مرتبطًا
 * أصلًا بهذا الاجتماع في سجل الحضور.
 */
        const associatedLeaderIds = new Set(
            attendance.map(row => row.leader_id)
        );

        leaders = (leadersResult.data || [])
            .filter(leader =>
                !leader.deleted_at ||
                associatedLeaderIds.has(leader.id)
            );


        document.getElementById("meetingTitle").textContent =
            meeting.title || "اجتماع";


        document.getElementById("meetingDate").textContent =
            formatDate(meeting.meeting_date);


        renderPresentLeaders();

    } catch (error) {

        console.error("LOAD MEETING DETAILS ERROR:", error);

        alert("تعذر تحميل تفاصيل الاجتماع");
        window.location.href = "meetings.html";
    }
}


// Edit meeting details and attendance
function openEditMeeting() {

    selectedAttendanceIds = new Set(
        attendance
            .filter(row => row.status === "present")
            .map(row => row.leader_id)
    );


    document.getElementById("editLeaderSearch").value = "";

    setEditMeetingDatePicker(meeting.meeting_date);
    closeEditMeetingDatePicker();

    renderEditLeaders();

    document
        .getElementById("editMeetingModal")
        .classList.add("active");
}


function closeEditMeeting() {

    document
        .getElementById("editMeetingModal")
        .classList.remove("active");
}


function renderEditLeaders() {

    const container = document.getElementById("editLeadersList");

    const searchValue = normalizeArabic(
        document.getElementById("editLeaderSearch").value
    );


    const filteredLeaders = leaders.filter(leader =>
        normalizeArabic(leader.full_name).includes(searchValue)
    );


    if (!filteredLeaders.length) {

        container.innerHTML = `
            <div class="no-leaders">
                لا يوجد قائد بهذا الاسم
            </div>
        `;

        return;
    }


    container.innerHTML = filteredLeaders.map(leader => `
        <label class="leader-row">

            <div class="leader-row-info">

                <div class="leader-avatar">
                    👤
                </div>

                <span>${escapeHtml(leader.full_name)}</span>

            </div>

            <input
                type="checkbox"
                ${selectedAttendanceIds.has(leader.id) ? "checked" : ""}
                data-leader-id="${leader.id}"
            >

        </label>
    `).join("");
}


function toggleAttendanceLeader(leaderId) {

    if (selectedAttendanceIds.has(leaderId)) {
        selectedAttendanceIds.delete(leaderId);
    } else {
        selectedAttendanceIds.add(leaderId);
    }
}


async function saveMeetingEdits() {

    const button = document.getElementById("saveEditMeetingButton");

    button.disabled = true;
    button.textContent = "جارٍ الحفظ...";


    try {

        const oldYear = Number(String(meeting.meeting_date || "").slice(0, 4));
        const newDate = getSelectedDate();
        const newYear = Number(String(newDate || "").slice(0, 4));


        const { error: dateError } = await supabaseClient
            .from("meetings")
            .update({
                meeting_date: newDate
            })
            .eq("id", meetingId);


        if (dateError) {
            throw dateError;
        }


        const knownRows = new Map(
            attendance.map(row => [row.leader_id, row])
        );


        const existingRows = attendance.map(row =>
            AppDb.updateMeetingAttendanceStatus(
                meetingId,
                row.leader_id,
                selectedAttendanceIds.has(row.leader_id)
                    ? "present"
                    : "absent"
            )
        );


        const updateResults = await Promise.all(existingRows);

        const updateError =
            updateResults.find(result => result.error)?.error;


        if (updateError) {
            throw updateError;
        }


        const newRows = leaders
            .filter(leader => !knownRows.has(leader.id))
            .map(leader => ({
                meeting_id: meetingId,
                leader_id: leader.id,
                status: selectedAttendanceIds.has(leader.id)
                    ? "present"
                    : "absent"
            }));


        if (newRows.length) {

            const { error } =
                await AppDb.createMeetingAttendance(newRows);

            if (error) {
                throw error;
            }
        }


        await renumberAllMeetingsChronologically();
        await loadDetails();
        closeEditMeeting();

    } catch (error) {

        console.error("SAVE MEETING EDIT ERROR:", error);

        alert("تعذر حفظ تعديلات الاجتماع");

    } finally {

        button.disabled = false;
        button.textContent = "حفظ التعديلات";
    }
}


// Page controls and event listeners
document
    .getElementById("backToMeetingsButton")
    .addEventListener("click", function () {
        window.location.href = "meetings.html";
    });

document
    .getElementById("editMeetingButton")
    .addEventListener("click", openEditMeeting);

document
    .getElementById("closeEditMeetingButton")
    .addEventListener("click", closeEditMeeting);

document
    .getElementById("editMeetingDateText")
    .addEventListener("input", handleTypedEditMeetingDate);

document
    .getElementById("editMeetingDateTrigger")
    .addEventListener("click", toggleEditMeetingDatePicker);

["editMeetingDay", "editMeetingMonth", "editMeetingYear"].forEach(id => {
    document
        .getElementById(id)
        .addEventListener("change", syncEditMeetingDateFromPicker);
});

document
    .getElementById("editLeadersList")
    .addEventListener("change", function (event) {
        const checkbox = event.target;

        if (checkbox.matches("input[data-leader-id]")) {
            toggleAttendanceLeader(checkbox.dataset.leaderId);
        }
    });

document
    .getElementById("saveEditMeetingButton")
    .addEventListener("click", saveMeetingEdits);

document
    .getElementById("editLeaderSearch")
    .addEventListener("input", function () {

        const input = this;

        // السماح بالعربية والأرقام والمسافات وعلامات الترقيم فقط.
        // أي حرف إنجليزي يتم حذفه فوراً.
        input.value = input.value.replace(/[A-Za-z]/g, "");

        renderEditLeaders();
    });


document
    .getElementById("editMeetingModal")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeEditMeeting();
        }

    });


loadDetails();

// Chronological meeting numbering

/* =========================================================
   GLOBAL MEETING NUMBERING
========================================================= */

async function renumberAllMeetingsChronologically() {

    const { data, error } = await supabaseClient
        .from("meetings")
        .select("id, title, meeting_date")
        .order("meeting_date", { ascending: true })
        .order("id", { ascending: true });

    if (error) {
        console.error(
            "DETAILS MEETING RENUMBER ERROR:",
            error
        );
        throw error;
    }

    for (let index = 0; index < (data || []).length; index++) {

        const meeting = data[index];

        const newTitle =
            `الاجتماع رقم ${toArabicDigits(index + 1)}`;

        if (meeting.title === newTitle) {
            continue;
        }

        const { error: updateError } =
            await supabaseClient
                .from("meetings")
                .update({ title: newTitle })
                .eq("id", meeting.id);

        if (updateError) {
            throw updateError;
        }
    }
}
