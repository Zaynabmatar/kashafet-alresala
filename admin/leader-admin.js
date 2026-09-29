const params = new URLSearchParams(window.location.search);
const leaderId = params.get("id");

function toArabicDigits(value) {
    return String(value).replace(/\d/g, function(digit) {
        return "٠١٢٣٤٥٦٧٨٩"[digit];
    });
}
let currentLeader = null;
let currentLeaderHasTeam = false;
let members = [];
let activities = [];

const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر"
];

// Formatting and profile data
function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function calculateAge(birthDate) {

    if (!birthDate) return "غير محدد";

    const birth = new Date(birthDate + "T00:00:00");

    if (isNaN(birth.getTime())) return "غير محدد";

    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const monthDifference = today.getMonth() - birth.getMonth();

    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() < birth.getDate()
        )
    ) {
        age--;
    }

    return age >= 0 ? `${age} سنة` : "غير محدد";
}

function formatPhone(phone) {

    if (!phone) return "غير محدد";

    if (String(phone).startsWith("+961")) {
        return phone;
    }

    return "+961 " + phone;
}

function formatUniform(hasUniform) {
    return hasUniform
        ? '<span class="uniform-status has-uniform">توجد بدلة</span>'
        : '<span class="uniform-status no-uniform">لا توجد بدلة</span>';
}

// Leader profile and team data
async function loadLeader() {

    if (!leaderId) {
        showError();
        return;
    }

    const loadingState = document.getElementById("loadingState");
    const leaderContent = document.getElementById("leaderContent");

    let loadingTimer = setTimeout(function () {
        if (
            loadingState &&
            leaderContent &&
            window.getComputedStyle(leaderContent).display !== "block"
        ) {
            loadingState.style.display = "block";
        }
    }, 0);

    if (loadingState) loadingState.style.display = "none";

    const { data, error } = await AppDb.getLeaderById(leaderId);

    clearTimeout(loadingTimer);

    if (error || !data) {
        console.error(error);
        showError();
        return;
    }

    currentLeader = data;

const leaderAvatar = document.getElementById("leaderAvatar");

if (leaderAvatar) {
    leaderAvatar.innerHTML = "";

    if (data.profile_image) {
        const image = document.createElement("img");

        image.src = data.profile_image;
        image.alt = data.full_name
            ? "صورة " + data.full_name
            : "صورة القائد";

        image.loading = "eager";

        leaderAvatar.appendChild(image);
    } else {
        leaderAvatar.textContent = "👤";
    }
}


    currentLeaderHasTeam = Boolean(data.team_id);

    const teamSections = document.getElementById("teamSections");

    if (teamSections) {
        if (currentLeaderHasTeam) {
            teamSections.hidden = false;
            teamSections.style.removeProperty("display");
        } else {
            teamSections.hidden = true;
            teamSections.style.setProperty("display", "none", "important");
        }
    }

    document.getElementById("leaderName").textContent =
        data.full_name || "بدون اسم";

    document.getElementById("leaderAssistants").textContent =
        data.assistants ? "أسماء المساعدين: " + data.assistants : "";

    document.getElementById("leaderBranch").textContent = data.branch || "المهمة غير محددة";

    document.getElementById("leaderPhone").textContent =
        formatPhone(data.phone);

    const leaderAgeValue = calculateAge(data.birth_date);

if (
    leaderAgeValue === null ||
    leaderAgeValue === undefined ||
    leaderAgeValue === "" ||
    leaderAgeValue === "غير محدد"
) {
    document.getElementById("leaderAge").textContent = "غير محدد";
} else {
    const ageDigits = String(leaderAgeValue).replace(
        /\d/g,
        digit => "٠١٢٣٤٥٦٧٨٩"[digit]
    );

    document.getElementById("leaderAge").textContent =
        ageDigits.includes("سنة")
            ? ageDigits
            : ageDigits + " سنة";
}

    document.getElementById("leaderUniform").innerHTML =
        formatUniform(data.has_uniform);

    document.getElementById("loadingState").style.display = "none";
    document.getElementById("leaderContent").style.display = "block";
}

function safeDisplayText(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
}

// Team members and activities
async function loadMembers() {
    if (!currentLeaderHasTeam) return;

    const list = document.getElementById("membersList");

    if (!list || !leaderId) return;

    const { data, error } = await supabaseClient
        .from("members")
        .select("*")
        .eq("leader_id", leaderId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LEADER ADMIN - members:", error);
        list.innerHTML = `<div class="empty-content">تعذر تحميل الأعضاء.</div>`;
        return;
    }

    members = data || [];

    const countElement = document.getElementById("membersHeaderCount");
    const missingUniformElement = document.getElementById("membersMissingUniform");

    const missingUniformCount = members.filter(function (member) {
        return member.has_uniform === false;
    }).length;

    if (countElement) {
        countElement.textContent = toArabicDigits(members.length);

    }

    if (missingUniformElement) {
        missingUniformElement.textContent =
            toArabicDigits(missingUniformCount) + " بدون بدلة";
    }
    if (!members.length) {
        list.innerHTML = `
            <div class="empty-content">
                لا يوجد أعضاء
            </div>
        `;
        return;
    }

    list.innerHTML = members.map(function (member) {

        const name = safeDisplayText(
            member.full_name || "بدون اسم"
        );

        const phone = member.phone
            ? safeDisplayText(formatPhone(member.phone))
            : "لا يوجد رقم";

        const age = member.birth_date
            ? safeDisplayText(calculateAge(member.birth_date))
            : "العمر غير محدد";

        const uniform = member.has_uniform === true
            ? "يوجد بدلة"
            : "لا يوجد بدلة";

        return `
            <div
                class="leader-admin-data-item member-admin-item"
                role="button"
                tabindex="0"
                data-member-id="${member.id}"
            >

                <div class="member-admin-info">
                    <strong class="member-name-display">
                        ${name}
                    </strong>

                    <span class="member-detail phone-detail">
                        <span class="member-detail-icon">☎</span>
                        <span class="member-phone-value" dir="ltr">${phone}</span>
                    </span>

                    <span class="member-detail age-detail">
                        <span class="member-detail-icon">🎂</span>
                        <span>${toArabicDigits(age)}</span>
                    </span>

                    <span class="member-detail ${
                        member.has_uniform === true
                            ? "member-uniform-ok"
                            : "member-uniform-missing"
                    }">
                        <span class="member-detail-icon">👕</span>
                        <span>${uniform}</span>
                    </span>

                </div>

                ${renderMemberActions(member.id)}

            </div>
        `;
    }).join("");
}
async function loadActivities() {

    if (!currentLeaderHasTeam) return;

    const list = document.getElementById("activitiesList");

    if (!list || !leaderId) return;

    const { data, error } = await supabaseClient
        .from("activities")
        .select("*")
        .eq("leader_id", leaderId)
        .order("activity_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LEADER ADMIN - activities:", error);
        list.innerHTML = `
            <div class="empty-content">
                تعذر تحميل النشاطات.
            </div>
        `;
        return;
    }

    activities = data || [];

    const activitiesCount =
        document.getElementById("activitiesCount");

    if (activitiesCount) {
        activitiesCount.textContent =
            toArabicDigits(activities.length);
    }
    if (!activities.length) {
        list.innerHTML = `
            <div class="empty-content">
                لا توجد نشاطات
            </div>
        `;
        return;
    }

    list.innerHTML = activities.map(function(activity) {

        const title =
            safeDisplayText(activity.title || "نشاط بدون عنوان");

        let dateText = "التاريخ غير محدد";

        if (activity.activity_date) {

            const date =
                new Date(activity.activity_date + "T00:00:00");

            if (!Number.isNaN(date.getTime())) {
                dateText = safeDisplayText(
                    date.toLocaleDateString("ar-LB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    })
                );
            }
        }

        return `
            <div class="leader-admin-data-item">
                <strong>
                    <button type="button"
                            class="activity-name-button"
                            data-activity-id="${activity.id}">
                        ${title}
                    </button>
                </strong>
                <span>${dateText}</span>
            </div>
        `;

    }).join("");
}

// Activity details and attendance
function showError() {

    document.getElementById("loadingState").style.display = "none";
    document.getElementById("errorState").style.display = "block";
}


async function openActivityDetails(activityId) {

    const activity = activities.find(function(item) {
        return String(item.id) === String(activityId);
    });

    if (!activity) return;

    const activityIndex = activities.findIndex(function(item) {
        return String(item.id) === String(activityId);
    });

    document.getElementById("activityViewNumber").textContent =
        activityIndex >= 0
            ? toArabicDigits(activityIndex + 1)
            : "—";

    document.getElementById("activityViewTitle").textContent =
        activity.title || "نشاط بدون عنوان";

    let dateText = "التاريخ غير محدد";

    if (activity.activity_date) {
        const date = new Date(
            activity.activity_date + "T00:00:00"
        );

        if (!Number.isNaN(date.getTime())) {
            dateText = date.toLocaleDateString("ar-LB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        }
    }

    document.getElementById("activityViewDate").textContent =
        dateText;

    const attendeesContainer =
        document.getElementById("activityViewAttendees");

    attendeesContainer.innerHTML = `
        <div class="activity-attendees-loading">
            جاري تحميل الحاضرين...
        </div>
    `;

    document.getElementById("activityModal").classList.add("active");

    const { data: attendanceRows, error: attendanceError } =
        await supabaseClient
            .from("activity_attendance")
            .select("member_id, status")
            .eq("activity_id", activityId)
            .eq("status", "present");

    if (attendanceError) {
        console.error(
            "ACTIVITY ATTENDANCE ERROR:",
            attendanceError
        );

        attendeesContainer.innerHTML = `
            <div class="activity-attendees-empty">
                تعذر تحميل الحاضرين.
            </div>
        `;

        return;
    }

    const presentMemberIds = (attendanceRows || []).map(function(row) {
        return row.member_id;
    });

    if (!presentMemberIds.length) {
        attendeesContainer.innerHTML = `
            <div class="activity-attendees-empty">
                لا يوجد حاضرون
            </div>
        `;
        return;
    }

    const { data: presentMembers, error: membersError } =
        await supabaseClient
            .from("members")
            .select("id, full_name")
            .in("id", presentMemberIds)
            .is("deleted_at", null)
            .order("full_name", { ascending: true });

    if (membersError) {
        console.error(
            "ACTIVITY PRESENT MEMBERS ERROR:",
            membersError
        );

        attendeesContainer.innerHTML = `
            <div class="activity-attendees-empty">
                تعذر تحميل أسماء الحاضرين.
            </div>
        `;

        return;
    }

    if (!presentMembers || !presentMembers.length) {
        attendeesContainer.innerHTML = `
            <div class="activity-attendees-empty">
                لا يوجد حاضرون
            </div>
        `;
        return;
    }

    attendeesContainer.innerHTML = presentMembers.map(function(member) {
        return `
            <div class="activity-attendee-item">
                ${safeDisplayText(member.full_name || "عضو بدون اسم")}
            </div>
        `;
    }).join("");
}

function closeActivityModal() {
    const modal = document.getElementById("activityModal");

    if (modal) {
        modal.classList.remove("active");
    }
}
// Leader profile editing
function normalizeArabicDigits(value) {
    return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, function(digit) {
        return String(digit.charCodeAt(0) <= 0x0669
            ? digit.charCodeAt(0) - 0x0660
            : digit.charCodeAt(0) - 0x06F0);
    });
}
function toArabicIndicDigits(value) {
    return String(value || "").replace(/[0-9]/g, function(digit) {
        return String.fromCharCode(digit.charCodeAt(0) + 0x0660 - 0x0030);
    });
}
function openEditModal() {

    if (!currentLeader) return;

    document.getElementById("editName").value =
        currentLeader.full_name || "";

    document.getElementById("editPhone").value =
        currentLeader.phone
            ? String(currentLeader.phone).replace(/^\+961\s*/, "")
            : "";

    document.getElementById("editAssistants").value =
        currentLeader.assistants || "";

    document.getElementById("editBranch").value =
        currentLeader.branch || "";

    const birthDate =
        String(currentLeader.birth_date || "").slice(0, 10);

    const birthParts =
        birthDate ? birthDate.split("-") : [];

    document.getElementById("editBirthDay").value =
        toArabicIndicDigits(birthParts[2]);

    document.getElementById("editBirthMonth").value =
        toArabicIndicDigits(birthParts[1]);

    document.getElementById("editBirthYear").value =
        toArabicIndicDigits(birthParts[0]);

    const uniformRadio = document.querySelector(
        `input[name="editUniform"][value="${currentLeader.has_uniform ? "true" : "false"}"]`
    );

    if (uniformRadio) {
        uniformRadio.checked = true;
    }

    document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("show");
}

document.getElementById("editForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const name =
        document.getElementById("editName").value.trim();

    const phone =
        document.getElementById("editPhone").value.trim();

    const assistants =
        document.getElementById("editAssistants").value.trim();

    const day =
        normalizeArabicDigits(
            document.getElementById("editBirthDay").value.trim()
        );

    const month =
        normalizeArabicDigits(
            document.getElementById("editBirthMonth").value.trim()
        );

    const year =
        normalizeArabicDigits(
            document.getElementById("editBirthYear").value.trim()
        );

    const uniform =
        document.querySelector(
            'input[name="editUniform"]:checked'
        )?.value === "true";

    if (!name) {
        alert("يرجى إدخال اسم القائد.");
        return;
    }

    let birthDate = null;

    if (day || month || year) {

        if (!day || !month || !year) {
            alert("يرجى إدخال اليوم والشهر والسنة كاملة.");
            return;
        }

        const dayNumber = Number(day);
        const monthNumber = Number(month);
        const yearNumber = Number(year);

        const testDate =
            new Date(yearNumber, monthNumber - 1, dayNumber);

        const isValidDate =
            year.length === 4 &&
            yearNumber >= 1900 &&
            monthNumber >= 1 &&
            monthNumber <= 12 &&
            dayNumber >= 1 &&
            dayNumber <= 31 &&
            testDate.getFullYear() === yearNumber &&
            testDate.getMonth() === monthNumber - 1 &&
            testDate.getDate() === dayNumber;

        if (!isValidDate) {
            alert("يرجى إدخال تاريخ ميلاد صحيح.");
            return;
        }

        birthDate =
            year +
            "-" +
            month.padStart(2, "0") +
            "-" +
            day.padStart(2, "0");
    }

    const branch =
        currentLeader?.branch || null;

    const saveButton =
        document.querySelector(".save-button");

    saveButton.disabled = true;

    const { data, error } =
        await AppDb.updateLeader(leaderId, {

            full_name: name,

            assistants:
                assistants || null,

            phone:
                phone || null,

            birth_date:
                birthDate,

            branch:
                branch,

            has_uniform:
                uniform
        });

    saveButton.disabled = false;

    if (error) {

        console.error(error);

        alert(
            "خطأ الحفظ: " +
            error.message
        );

        return;
    }

    currentLeader = data;

const leaderAvatar = document.getElementById("leaderAvatar");

if (leaderAvatar) {
    leaderAvatar.innerHTML = "";

    if (data.profile_image) {
        const image = document.createElement("img");

        image.src = data.profile_image;
        image.alt = data.full_name
            ? "صورة " + data.full_name
            : "صورة القائد";

        image.loading = "eager";

        leaderAvatar.appendChild(image);
    } else {
        leaderAvatar.textContent = "👤";
    }
}


    closeEditModal();

    await loadLeader();
});

async function deleteCurrentLeader() {
    if (!leaderId) return;
    const confirmed = confirm("هل أنت متأكد أنك تريد حذف هذا القائد؟");
    if (!confirmed) return;
    const button = document.getElementById("deleteLeaderButton");
    if (button) button.disabled = true;
    const { error } = await AppDb.softDeleteLeader(leaderId);
    if (error) {
        console.error(error);
        alert("تعذر حذف القائد: " + error.message);
        if (button) button.disabled = false;
        return;
    }
    window.location.href = "../admin/admin.html";
}
function goBack() {
    window.location.href = "../admin/admin.html";
}
document.getElementById("editModal").addEventListener("click", function(event) {

    if (event.target === this) {
        closeEditModal();
    }
});


/* =======================================================
   MEMBER CRUD
   ======================================================= */

var editingMemberId = null;

function openMemberModal(memberId = null) {
    editingMemberId = memberId;

    const modal = document.getElementById("memberModal");

    if (!modal) return;

    /* افتح النافذة أولًا */
    modal.classList.add("show");


    const title = document.getElementById("memberModalTitle");
    const subtitle = document.getElementById("memberModalSubtitle");
    const saveButton = document.getElementById("saveMemberButton");

    if (memberId) {
        const member = members.find(function (item) {
            return String(item.id) === String(memberId);
        });

        if (!member) return;

        if (title) {
            title.textContent = "تعديل معلومات العنصر";
        }

        if (subtitle) {
            subtitle.textContent =
                "عدّل معلومات العنصر ثم احفظ التغييرات";
        }

        if (saveButton) {
            saveButton.textContent = "حفظ التعديلات";
        }

        document.getElementById("memberName").value =
            member.full_name || "";

        let phone = member.phone || "";

        phone = normalizeArabicDigits(String(phone))
            .replace(/^\+961/, "")
            .replace(/^961/, "")
            .replace(/\D/g, "");

        document.getElementById("memberPhone").value = phone;

        let day = "";
        let month = "";
        let year = "";

        if (member.birth_date) {
            const parts = String(member.birth_date).split("-");

            if (parts.length === 3) {
                year = parts[0];
                month = parts[1];
                day = parts[2];
            }
        }

        document.getElementById("memberBirthDay").value = day;
        document.getElementById("memberBirthMonth").value = month;
        document.getElementById("memberBirthYear").value = year;

        const uniformInput = document.querySelector(
            'input[name="memberUniform"][value="' +
            (member.has_uniform === true ? "true" : "false") +
            '"]'
        );

        if (uniformInput) {
            uniformInput.checked = true;
        }

    } else {
        if (title) {
            title.textContent = "إضافة عنصر";
        }

        if (subtitle) {
            subtitle.textContent = "أدخل معلومات العنصر";
        }

        if (saveButton) {
            saveButton.textContent = "حفظ العنصر";
        }

        document.getElementById("memberName").value = "";
        document.getElementById("memberPhone").value = "";
        document.getElementById("memberBirthDay").value = "";
        document.getElementById("memberBirthMonth").value = "";
        document.getElementById("memberBirthYear").value = "";

        const defaultUniform = document.querySelector(
            'input[name="memberUniform"][value="true"]'
        );

        if (defaultUniform) {
            defaultUniform.checked = true;
        }
    }
}
function closeMemberModal() {
    const modal = document.getElementById("memberModal");

    if (modal) {
        modal.classList.remove("show");
    }

    editingMemberId = null;
}

async function saveMember() {
    if (!leaderId || !currentLeader) {
        console.error("ADMIN MEMBERS: لا يوجد قائد محدد.");
        return;
    }

    if (!currentLeader.team_id) {
        alert("هذا القائد لا يملك فرقة.");
        return;
    }

    const name = String(
        document.getElementById("memberName")?.value || ""
    ).trim();

    let phone = String(
        document.getElementById("memberPhone")?.value || ""
    ).trim();

    const day = normalizeArabicDigits(
        document.getElementById("memberBirthDay")?.value || ""
    ).trim();

    const month = normalizeArabicDigits(
        document.getElementById("memberBirthMonth")?.value || ""
    ).trim();

    const year = normalizeArabicDigits(
        document.getElementById("memberBirthYear")?.value || ""
    ).trim();

    const uniformInput = document.querySelector(
        'input[name="memberUniform"]:checked'
    );

    const hasUniform = uniformInput
        ? uniformInput.value === "true"
        : true;

    if (!name) {
        alert("يرجى إدخال اسم العنصر.");
        return;
    }

    phone = normalizeArabicDigits(phone).replace(/\D/g, "");

    let birthDate = null;

    if (day || month || year) {
        if (!day || !month || !year) {
            alert("يرجى إدخال تاريخ الميلاد كاملًا.");
            return;
        }

        birthDate =
            year + "-" +
            month.padStart(2, "0") + "-" +
            day.padStart(2, "0");
    }

    const saveButton = document.getElementById("saveMemberButton");

    if (saveButton) {
        saveButton.disabled = true;
    }

    try {
        if (editingMemberId) {

            const { error } = await supabaseClient
                .from("members")
                .update({
                    full_name: name,
                    phone: phone || null,
                    birth_date: birthDate,
                    has_uniform: hasUniform,
                    team_id: currentLeader.team_id
                })
                .eq("id", editingMemberId)
                .eq("leader_id", leaderId);

            if (error) {
                console.error("ADMIN MEMBERS - update:", error);
                alert("تعذر تعديل معلومات العنصر.");
                return;
            }

        } else {

            const { error } = await supabaseClient
                .from("members")
                .insert({
                    leader_id: leaderId,
                    full_name: name,
                    phone: phone || null,
                    birth_date: birthDate,
                    profile_image: null,
                    has_uniform: hasUniform,
                    team_id: currentLeader.team_id
                });

            if (error) {
                console.error("ADMIN MEMBERS - insert:", error);
                alert("تعذر إضافة العنصر.");
                return;
            }
        }

        closeMemberModal();
        await loadMembers();

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}

async function deleteMember(memberId) {
    const member = members.find(function (item) {
        return item.id === memberId;
    });

    if (!member) return;

    const confirmed = confirm(
        "هل تريد نقل هذا العنصر إلى سلة المحذوفات؟"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("members")
        .update({
            deleted_at: new Date().toISOString()
        })
        .eq("id", memberId)
        .eq("leader_id", leaderId);

    if (error) {
        console.error("ADMIN MEMBERS - delete:", error);
        alert("تعذر نقل العنصر إلى سلة المحذوفات.");
        return;
    }

    await loadMembers();
}

function renderMemberActions(memberId) {
    return `
        <div class="member-admin-actions">
            <button
                type="button"
                class="member-edit-button"
                data-member-action="edit"
                data-member-id="${memberId}"
            >
                تعديل
            </button>

            <button
                type="button"
                class="member-delete-button"
                data-member-action="delete"
                data-member-id="${memberId}"
            >
                حذف
            </button>
        </div>
    `;
}
window.openMemberModal = openMemberModal;
window.closeMemberModal = closeMemberModal;
window.saveMember = saveMember;

// Profile, member, and activity controls
document
    .querySelector(".menu-button")
    .addEventListener("click", goBack);

document
    .querySelector(".leader-card-actions .edit-button:not(.delete-leader-button)")
    .addEventListener("click", openEditModal);

document
    .getElementById("deleteLeaderButton")
    .addEventListener("click", deleteCurrentLeader);

document
    .querySelector(".add-member-button")
    .addEventListener("click", function () {
        openMemberModal();
    });

document
    .querySelector("#editModal .close-button")
    .addEventListener("click", closeEditModal);

document
    .querySelector("#editModal .cancel-button")
    .addEventListener("click", closeEditModal);

document
    .querySelector("#activityModal .modal-close")
    .addEventListener("click", closeActivityModal);

document
    .querySelector("#memberModal .close-button")
    .addEventListener("click", closeMemberModal);

document
    .getElementById("saveMemberButton")
    .addEventListener("click", saveMember);

document
    .getElementById("membersList")
    .addEventListener("click", function (event) {
        const actionButton = event.target.closest("[data-member-action]");

        if (actionButton) {
            const memberId = actionButton.dataset.memberId;

            if (actionButton.dataset.memberAction === "edit") {
                openMemberModal(memberId);
            } else if (actionButton.dataset.memberAction === "delete") {
                deleteMember(memberId);
            }

            return;
        }

        if (event.target.closest(".member-admin-actions")) {
            return;
        }

        const memberItem = event.target.closest(".member-admin-item");

        if (memberItem) {
            openMemberModal(memberItem.dataset.memberId);
        }
    });

document
    .getElementById("activitiesList")
    .addEventListener("click", function (event) {
        const activityButton = event.target.closest("[data-activity-id]");

        if (activityButton) {
            openActivityDetails(activityButton.dataset.activityId);
        }
    });

// Keep the existing profile and member input filtering.
document.getElementById("editName").addEventListener("input", function () {
    this.value = this.value.replace(/[^؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]/g, "");
});

document.getElementById("editAssistants").addEventListener("input", function () {
    this.value = this.value.replace(/[^؀-ۿ\s\/]/g, "");
});

document.getElementById("editPhone").addEventListener("input", function () {
    this.value = normalizeArabicDigits(this.value).replace(/\D/g, "");
});

["editBirthDay", "editBirthMonth", "editBirthYear", "memberBirthDay", "memberBirthMonth", "memberBirthYear"]
    .forEach(function (id) {
        document.getElementById(id).addEventListener("input", function () {
            this.value = this.value.replace(/[^\d٠-٩۰-۹]/g, "");
        });
    });

document.getElementById("memberName").addEventListener("input", function () {
    this.value = this.value.replace(/[^؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]/g, "");
});

document.getElementById("memberPhone").addEventListener("input", function () {
    this.value = normalizeArabicDigits(this.value).replace(/\D/g, "");
});

loadLeader().then(function () {
    if (!currentLeader) return;
    loadMembers();
    loadActivities();
});
