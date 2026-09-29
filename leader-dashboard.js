// Leader dashboard and member/activity behavior

function openActivitiesPage() {
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    alert("تعذر تحديد القائد.");
    return;
  }

  window.location.href =
    "activities.html?id=" +
    encodeURIComponent(id);
}


const leaderId =
  new URLSearchParams(window.location.search).get("id");
const memberIdToEdit =
  new URLSearchParams(window.location.search).get("member");

let currentLeader = null;
let currentTeamId = null;
let hasTeam = false;
let members = [];
let activities = [];
let activityAttendance = [];


// Display and date helpers
function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function calculateAge(dateValue) {

  if (!dateValue) return null;

  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : null;

}


function formatPhone(value) {

  if (!value) return "غير محدد";

  const phone =
    String(value)
      .replace(/^\+961\s*/, "")
      .trim();

  return phone
    ? "+961 " + phone
    : "غير محدد";

}


function formatDate(value) {

  if (!value) return "غير محدد";

  const parts =
    String(value).slice(0, 10).split("-");

  if (parts.length !== 3) {
    return String(value);
  }

  return (
    parts[2] +
    "/" +
    parts[1] +
    "/" +
    parts[0]
  );

}


// Load the leader and determine team access.
async function loadLeader() {

  if (!leaderId) {
    window.location.href = "index.html";
    return false;
  }

  const result =
    await AppDb.getLeaderById(leaderId);

  if (
    result.error ||
    !result.data ||
    result.data.deleted_at
  ) {

    console.error(
      "LOAD LEADER ERROR:",
      result.error
    );

    window.location.href = "index.html";
    return false;

  }

  currentLeader = result.data;
  currentTeamId = result.data.team_id || null;

  const taskResult = currentLeader.task_id
    ? await AppDb.getTaskById(currentLeader.task_id)
    : { data: null, error: null };

  if (taskResult.error) {
    console.error("LOAD TASK ERROR:", taskResult.error);
    return false;
  }

  hasTeam = taskResult.data?.has_team === true;
  document.querySelectorAll(".dashboard-actions, #membersSection").forEach(
    element => { element.hidden = !hasTeam; }
  );

  const name =
    currentLeader.full_name || "القائد";

  document.getElementById(
    "topLeaderName"
  ).textContent = name;

  if (currentLeader.profile_image) {

    document.getElementById(
      "topLeaderAvatar"
    ).innerHTML =
      '<img src="' +
      escapeHtml(currentLeader.profile_image) +
      '" alt="صورة القائد">';

  }

  return true;

}


// Load member, activity, and attendance data.
async function loadMembers() {

  if (!currentLeader || !hasTeam) return;

  let query =
    supabaseClient
      .from("members")
      .select("*").is("deleted_at", null)
      .eq("leader_id", leaderId)
      .order("created_at", {
        ascending: false
      });

  const result = await query;

  if (result.error) {

    console.error(
      "LOAD MEMBERS ERROR:",
      result.error
    );

    return;

  }

  members = result.data || [];

  renderMembers();
  updateSidebarCounts();

}


async function loadActivities() {

  if (!currentLeader || !hasTeam) return;

  let query =
    supabaseClient
      .from("activities")
      .select("*")
      .eq("leader_id", leaderId)
      .order("activity_date", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

  const result = await query;

  if (result.error) {

    console.error(
      "LOAD ACTIVITIES ERROR:",
      result.error
    );

    return;

  }

  activities = result.data || [];

  renderActivityYears();
  renderActivities();

  await loadAttendance();

}


async function loadAttendance() {

  if (!activities.length) {

    activityAttendance = [];
    renderMembers();
    return;

  }

  const activityIds =
    activities.map(
      activity => activity.id
    );

  const result =
    await supabaseClient
      .from("activity_attendance")
      .select("*")
      .in("activity_id", activityIds);

  if (result.error) {

    console.error(
      "LOAD ATTENDANCE ERROR:",
      result.error
    );

    return;

  }

  activityAttendance =
    result.data || [];

  renderMembers();
  renderActivities();

}


function updateSidebarCounts() {

  const countElement =
    document.getElementById("membersCount");

  const missingElement =
    document.getElementById(
      "missingUniformCount"
    );

  if (countElement) {
    countElement.textContent =
      members.length;
  }

  if (missingElement) {
    missingElement.textContent =
      members.filter(
        member =>
          member.has_uniform === false
      ).length;
  }

}


// Render the member cards and their attendance summaries.
function renderMembers() {

  const list =
    document.getElementById(
      "membersList"
    );

  if (!list) return;

  if (!members.length) {

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>لا يوجد أعضاء</h3>
        <p>اضغط على «إضافة عنصر» لإضافة أول عنصر.</p>
      </div>
    `;

    return;
  }

  list.innerHTML =
    members.map(member => {

      const age =
        calculateAge(member.birth_date);

      const phone =
        formatPhone(member.phone);

      const uniform =
        member.has_uniform === true;

      const visibleActivities = activities;

      const visibleActivityIds =
        new Set(
          visibleActivities.map(
            activity => String(activity.id)
          )
        );

      const attendanceCount =
        activityAttendance.filter(
          row =>
            String(row.member_id) === String(member.id) &&
            row.status === "present" &&
            visibleActivityIds.has(String(row.activity_id))
        ).length;

      const totalActivities =
        visibleActivities.length;

      return `
        <article class="member-card" data-member-id="${member.id}">

          <div class="member-main">

            <div class="member-profile">

              <div class="member-avatar">
                👤
              </div>

              <div class="member-identity">

                <div class="member-name-phone">

                  <h3>
                    ${escapeHtml(member.full_name || "بدون اسم")}
                  </h3>

                  <span class="member-phone">
                    📞 ${escapeHtml(phone || "غير محدد")}
                  </span>

                </div>

              </div>

            </div>


            <div class="member-info">

              <div class="info-item">

                <span class="info-label">
                  العمر
                </span>

                <strong>
                  ${
                    age !== null
                      ? escapeHtml(new Intl.NumberFormat("ar-u-nu-arab").format(age)) + " سنة"
                      : "غير محدد"
                  }
                </strong>

              </div>


              <div class="info-item">

                <span class="info-label">
                  البدلة
                </span>

                <strong class="${
                  uniform
                    ? "has-uniform"
                    : "no-uniform"
                }">

                  ${
                    uniform
                      ? "✓ 👕 توجد بدلة"
                      : "✕ 👕 لا توجد بدلة"
                  }

                </strong>

              </div>

              <div class="info-item">

                <span class="info-label">
                  الحضور
                </span>

                <strong>
                  ${new Intl.NumberFormat("ar-u-nu-arab").format(attendanceCount)} / ${new Intl.NumberFormat("ar-u-nu-arab").format(totalActivities)}
                </strong>

              </div>

            </div>


            <div class="member-card-actions">
              <button
                type="button"
                class="member-edit-button"
                data-member-action="edit"
                data-member-id="${member.id}"
              >
                تعديل المعلومات
              </button>

              <button
                type="button"
                class="member-delete-button"
                data-member-action="delete"
                data-member-id="${member.id}"
              >
                حذف العنصر
              </button>
            </div>

          </div>

        </article>
      `;

    }).join("");

}


// Activity list rendering and year filtering.
function renderActivityYears() {

  const select =
    document.getElementById(
      "activityYearFilter"
    );

  if (!select) return;

  const current =
    select.value || "all";

  const years =
    [
      ...new Set(
        activities
          .map(
            activity =>
              String(
                activity.activity_date || ""
              ).slice(0, 4)
          )
          .filter(Boolean)
      )
    ].sort((a, b) => b.localeCompare(a));


  select.innerHTML =
    '<option value="all">كل السنوات</option>' +
    years
      .map(
        year =>
          `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`
      )
      .join("");


  if (
    years.includes(current)
  ) {
    select.value = current;
  }

}


function renderActivities() {

  const list =
    document.getElementById(
      "activitiesList"
    );

  if (!list) return;


  const filter =
    document.getElementById(
      "activityYearFilter"
    ).value;


  const filtered =
    activities.filter(
      activity => {

        if (filter === "all") {
          return true;
        }

        return String(
          activity.activity_date || ""
        ).slice(0, 4) === filter;

      }
    );


  if (!filtered.length) {

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>لا يوجد أنشطة</h3>
        <p>لم يتم العثور على أنشطة ضمن الاختيار الحالي.</p>
      </div>
    `;

    return;

  }


  list.innerHTML =
    filtered.map(activity => {

      const attendance =
        activityAttendance.filter(
          row =>
            row.activity_id === activity.id
        );

      const present =
        attendance.filter(
          row =>
            row.status === "present"
        ).length;


      return `
        <article class="activity-card" data-activity-id="${activity.id}">

          <div class="activity-main">

            <div class="activity-icon">
              📅
            </div>

            <div>

              <h3>
                ${escapeHtml(
                  activity.title || "نشاط"
                )}
              </h3>

              <p class="activity-date">
                ${escapeHtml(
                  formatDate(
                    activity.activity_date
                  )
                )}
              </p>

              ${
                activity.description
                  ? `
                    <p class="activity-description">
                      ${escapeHtml(
                        activity.description
                      )}
                    </p>
                  `
                  : ""
              }

            </div>

          </div>


          <div class="activity-count">

            <span>
              الحضور
            </span>

            <strong>
              ${present}/${members.length}
            </strong>

          </div>

        </article>
      `;

    }).join("");

}


// Member and activity actions
function openMembers() {
  openMemberModal();
}

function openActivityDetails(activityId) {
  window.location.href =
    "activity-details.html?id=" + encodeURIComponent(activityId) +
    "&leader_id=" + encodeURIComponent(leaderId);
}


function openMemberModal() {

  editingMemberId = null;

  
const modal =
    document.getElementById("memberModal");

  const title =
    modal
      ? modal.querySelector(".modal-header h2")
      : null;

  const subtitle =
    modal
      ? modal.querySelector(".modal-header p")
      : null;

  const dayInput =
    document.getElementById("memberBirthDay");

  const monthInput =
    document.getElementById("memberBirthMonth");

  const yearInput =
    document.getElementById("memberBirthYear");

  if (dayInput) {
    dayInput.value = "";
  }

  if (monthInput) {
    monthInput.value = "";
  }

  if (yearInput) {
    yearInput.value = "";
  }
  const saveButton =
    document.getElementById("saveMemberButton");

  if (title) {
    title.textContent =
      "إضافة عنصر";
  }

  if (subtitle) {
    subtitle.textContent =
      "أدخل معلومات العنصر";
  }

  if (saveButton) {
    saveButton.textContent =
      "حفظ العنصر";
  }

  const nameInput =
    document.getElementById("memberName");

  const phoneInput =
    document.getElementById("memberPhone");



  if (nameInput) {
    nameInput.value = "";
  }

  if (phoneInput) {
    phoneInput.value = "";
  }



  const yesUniform =
    document.querySelector(
      'input[name="memberUniform"][value="true"]'
    );

  const noUniform =
    document.querySelector(
      'input[name="memberUniform"][value="false"]'
    );

  if (yesUniform) {
    yesUniform.checked = true;
  }

  if (noUniform) {
    noUniform.checked = false;
  }

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }
}


function closeMemberModal() {

  const modal = document.getElementById("memberModal");
  if (!modal) return;

  modal.classList.remove("active");
  modal.style.display = "none";

}


function openActivityModal() {

  document.getElementById(
    "activityModal"
  ).classList.add("active");

  document.getElementById(
    "activityTitle"
  ).value = "";

  document.getElementById(
    "activityDescription"
  ).value = "";

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("activityDate").value = today;
  document.getElementById("activityDatePicker").value = today;
  document.getElementById("activityDateText").value =
    `${today.slice(8, 10)}/${Number(today.slice(5, 7))}/${today.slice(0, 4)}`;

}


function closeActivityModal() {

  document.getElementById(
    "activityModal"
  ).classList.remove("active");

}
// Member editing and soft deletion
async function deleteMember(memberId) {

  const member =
    members.find(
      item => String(item.id) === String(memberId)
    );

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
    .eq("id", memberId);

  if (error) {
    console.error("Delete member error:", error);
    alert("تعذر حذف العنصر.");
    return;
  }

  members = members.filter(
    item => String(item.id) !== String(memberId)
  );

  renderMembers();
}
let editingMemberId = null;
function editMember(memberId) {

  const member =
    members.find(
      item => String(item.id) === String(memberId)
    );

  if (!member) {
    alert("تعذّر العثور على العنصر.");
    return;
  }

  editingMemberId = member.id;

  const modal =
    document.getElementById("memberModal");

  const nameInput =
    document.getElementById("memberName");

  const phoneInput =
    document.getElementById("memberPhone");

  const saveButton =
    document.getElementById("saveMemberButton");

  if (nameInput) {
    nameInput.value =
      member.full_name || "";
  }

  if (phoneInput) {

    let phone =
      String(member.phone || "");

    phone =
      phone
        .replace(/^\+961\s*/i, "")
        .replace(/^961\s*/i, "")
        .replace(/[^0-9\u0660-\u0669\u06F0-\u06F9]/g, "");

    phoneInput.value = phone;
  }

  /* تاريخ الميلاد: اليوم / الشهر / السنة */
  const birthValue =
    String(member.birth_date || "").slice(0, 10);

  const birthParts =
    birthValue.split("-");

  const dayInput =
    document.getElementById("memberBirthDay");

  const monthInput =
    document.getElementById("memberBirthMonth");

  const yearInput =
    document.getElementById("memberBirthYear");

    const birthDigitStyle =
    localStorage.getItem(`memberBirthDigitStyle:${member.id}`) || "english";

  if (birthParts.length === 3) {

    if (yearInput) {
      yearInput.value = formatMemberBirthDigits(birthParts[0], birthDigitStyle);
    }

    if (monthInput) {
      monthInput.value = formatMemberBirthDigits(birthParts[1], birthDigitStyle);
    }

    if (dayInput) {
      dayInput.value = formatMemberBirthDigits(birthParts[2], birthDigitStyle);
    }

  } else {

    if (dayInput) dayInput.value = "";
    if (monthInput) monthInput.value = "";
    if (yearInput) yearInput.value = "";
  }

  const yesUniform =
    document.querySelector(
      'input[name="memberUniform"][value="true"]'
    );

  const noUniform =
    document.querySelector(
      'input[name="memberUniform"][value="false"]'
    );

  if (yesUniform) {
    yesUniform.checked =
      member.has_uniform === true;
  }

  if (noUniform) {
    noUniform.checked =
      member.has_uniform !== true;
  }

  const title =
    modal
      ? modal.querySelector(".modal-header h2")
      : null;

  const subtitle =
    modal
      ? modal.querySelector(".modal-header p")
      : null;

  if (title) {
    title.textContent =
      "تعديل معلومات العنصر";
  }

  if (subtitle) {
    subtitle.textContent =
      "عدّل معلومات العنصر ثم احفظ التغييرات";
  }

  if (saveButton) {
    saveButton.textContent =
      "حفظ التعديلات";
  }

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }
}
function formatMemberBirthDigits(value, style) {
  const text = String(value || "");

  if (style !== "arabic") {
    return text;
  }

  return text.replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}
function normalizeArabicDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, function (digit) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    })
    .replace(/[۰-۹]/g, function (digit) {
      return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
    });
}
function parseActivityDate(value) {
  const parts = normalizeArabicDigits(String(value || "").trim()).split("/");
  if (parts.length !== 3 || !/^\d{1,2}$/.test(parts[0]) ||
      !/^\d{1,2}$/.test(parts[1]) || !/^\d{4}$/.test(parts[2])) return "";
  const [day, month, year] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  if (year < 1900 || month < 1 || month > 12 || day < 1 ||
      date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
async function saveMember() {

  if (!currentLeader) return;

  const name =
    document.getElementById("memberName")?.value.trim() || "";

  const phone =
    document.getElementById("memberPhone")?.value.trim() || "";

  const day =
    normalizeArabicDigits(
      document.getElementById("memberBirthDay")?.value.trim() || ""
    );

  const month =
    normalizeArabicDigits(
      document.getElementById("memberBirthMonth")?.value.trim() || ""
    );

  const year =
    normalizeArabicDigits(
      document.getElementById("memberBirthYear")?.value.trim() || ""
    );

  const birthDate =
    day && month && year
      ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";

  const birthFields = [
    document.getElementById("memberBirthDay")?.value.trim() || "",
    document.getElementById("memberBirthMonth")?.value.trim() || "",
    document.getElementById("memberBirthYear")?.value.trim() || ""
  ];
  const hasBirthDate = birthFields.some(Boolean);
  
  const birthDigitStyle =
    /[٠-٩]/.test(birthFields.join(""))
      ? "arabic"
      : "english";
const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`) : null;
  if (
    hasBirthDate &&
    (!birthDate ||
      Number.isNaN(parsedBirthDate.getTime()) ||
      parsedBirthDate.getFullYear() !== Number(year) ||
      parsedBirthDate.getMonth() + 1 !== Number(month) ||
      parsedBirthDate.getDate() !== Number(day))
  ) {
    alert("يرجى إدخال تاريخ ميلاد صحيح بالترتيب: اليوم / الشهر / السنة.");
    return;
  }

  const uniformInput =
    document.querySelector(
      'input[name="memberUniform"]:checked'
    );

  const uniform =
    uniformInput
      ? uniformInput.value === "true"
      : true;

  if (!name) {
    alert("يرجى إدخال اسم العنصر.");
    return;
  }

  const button =
    document.getElementById("saveMemberButton");

  if (button) {
    button.disabled = true;
    button.textContent =
      editingMemberId
        ? "جاري حفظ التعديلات..."
        : "جاري الحفظ...";
  }

  try {

    let result;

    if (editingMemberId) {

      result =
        await supabaseClient
          .from("members")
          .update({
            full_name: name,
            phone: phone || null,
            birth_date: birthDate || null,
            has_uniform: uniform
          })
          .eq("id", editingMemberId)
          .eq("leader_id", leaderId)
          .select()
          .single();

    } else {

      result =
        await supabaseClient
          .from("members")
          .insert({
            leader_id: leaderId,
            full_name: name,
            phone: phone || null,
            birth_date: birthDate || null,
            profile_image: null,
            has_uniform: uniform,
            team_id: currentTeamId
          })
          .select()
          .single();
    }

    if (result.error) {
      console.error("Member save error:", result.error);
      alert("تعذر حفظ معلومات العنصر.");
      return;
    }

    editingMemberId = null;

    const modal =
      document.getElementById("memberModal");

    if (modal) {
      modal.classList.remove("active");
      modal.style.display = "none";
    }
    const savedMemberId =
      result.data?.id || editingMemberId;

    if (savedMemberId) {
      localStorage.setItem(
        `memberBirthDigitStyle:${savedMemberId}`,
        birthDigitStyle
      );
    }

    await loadMembers();
} catch (error) {

    console.error("Unexpected member save error:", error);
    alert("حدث خطأ أثناء حفظ معلومات العنصر.");

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "حفظ";
    }
  }
}


async function saveActivity() {

  if (!currentLeader) return;

  const title =
    document.getElementById(
      "activityTitle"
    ).value.trim();

  const description =
    document.getElementById(
      "activityDescription"
    ).value.trim();

  const activityText = document.getElementById("activityDateText").value;
  const activityDate = parseActivityDate(activityText);
  document.getElementById("activityDate").value = activityDate;


  if (!title) {
    alert("يرجى إدخال عنوان النشاط.");
    return;
  }

  if (!activityDate) {
    alert("يرجى اختيار تاريخ النشاط.");
    return;
  }


  const button =
    document.getElementById(
      "saveActivityButton"
    );

  button.disabled = true;
  button.textContent = "جاري الحفظ...";


  try {

    const result =
      await supabaseClient
        .from("activities")
        .insert({
          leader_id: leaderId,
          title: title,
          description:
            description || null,
          activity_date: activityDate,
          team_id: currentTeamId
        })
        .select()
        .single();


    if (result.error) {
      throw result.error;
    }


    closeActivityModal();

    await loadActivities();

  } catch (error) {

    console.error(
      "SAVE ACTIVITY ERROR:",
      error
    );

    alert(
      "تعذّر حفظ النشاط: " +
      (error.message || "حدث خطأ.")
    );

  } finally {

    button.disabled = false;
    button.textContent = "حفظ النشاط";

  }

}


// Sidebar interaction and navigation
/* ===== LEADER SIDEBAR SWIPE TO CLOSE ===== */
(function () {
  const sidebar = document.getElementById("leaderSidebar");
  if (!sidebar) return;

  let touchStartX = 0;
  let touchStartY = 0;

  sidebar.addEventListener("touchstart", function (event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  sidebar.addEventListener("touchend", function (event) {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      sidebar.classList.remove("open");
    }
  }, { passive: true });
})();
/* ===== END LEADER SIDEBAR SWIPE TO CLOSE ===== */
function toggleSidebar() {

  document
    .getElementById("leaderSidebar")
    .classList.toggle("open");

}


function openMyInfo() {

  window.location.href =
    "leader/my-info.html?id=" +
    encodeURIComponent(leaderId);

}


async function loadTrashCount() {
  const countEl = document.getElementById("trashCount");
  if (!countEl || !leaderId) return;

  const { count, error } = await supabaseClient
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("leader_id", leaderId)
    .not("deleted_at", "is", null);

  if (error) {
    console.error("Load trash count error:", error);
    return;
  }

  countEl.textContent = count || 0;
}
function openTrash() {

  window.location.href =
    "leader/trash.html?id=" +
    encodeURIComponent(leaderId);

}


async function logout() {

  if (
    typeof supabaseClient !== "undefined" &&
    supabaseClient.auth
  ) {
    await supabaseClient.auth.signOut();
  }

  window.location.href = "index.html";

}


document.addEventListener(
  "click",
  function(event) {

    const sidebar =
      document.getElementById(
        "leaderSidebar"
      );

    const menu =
      document.querySelector(
        ".menu-button"
      );

    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menu.contains(event.target)
    ) {
      sidebar.classList.remove("open");
    }

  }
);


document
  .getElementById("memberModal")
  .addEventListener(
    "click",
    function(event) {

      if (event.target === this) {
        closeMemberModal();
      }

    }
  );


document
  .getElementById("activityModal")
  .addEventListener(
    "click",
    function(event) {

      if (event.target === this) {
        closeActivityModal();
      }

    }
  );


// Dashboard startup and member form field setup
async function startDashboard() {

  const loaded =
    await loadLeader();

  if (!loaded) return;

  if (!hasTeam) return;

  await loadMembers();
  await loadActivities();

  if (memberIdToEdit) {
    editMember(memberIdToEdit);
  }

}


startDashboard();


/* ===== MEMBER ADD FORM UI ===== */

let memberBirthControlsReady = false;

loadTrashCount();

// Member form field refinements

document.addEventListener("DOMContentLoaded", function () {

  const activityText = document.getElementById("activityDateText");
  const activityPicker = document.getElementById("activityDatePicker");
  const activityValue = document.getElementById("activityDate");
  if (activityText && activityPicker && activityValue) {
    activityText.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9\u0660-\u0669\u06F0-\u06F9/]/g, "");
      const parsed = parseActivityDate(this.value);
      activityValue.value = parsed;
      if (parsed) activityPicker.value = parsed;
    });
    activityPicker.addEventListener("change", function () {
      if (!this.value) return;
      activityValue.value = this.value;
      activityText.value = `${this.value.slice(8, 10)}/${Number(this.value.slice(5, 7))}/${this.value.slice(0, 4)}`;
    });
  }

  const modal = document.getElementById("memberModal");
  if (!modal) return;

  const name = document.getElementById("memberName");
  const phone = document.getElementById("memberPhone");

  /* اسم العنصر */
  if (name) {
    name.placeholder = "";
    name.removeAttribute("placeholder");
    name.setAttribute("lang", "ar");
    name.setAttribute("dir", "rtl");

    name.addEventListener("input", function () {
      this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, "");
    });
  }

  /* رقم الهاتف */
  if (phone) {
    phone.placeholder = "";
    phone.removeAttribute("placeholder");
    phone.setAttribute("inputmode", "numeric");
    phone.setAttribute("autocomplete", "off");
    phone.setAttribute("dir", "ltr");

    phone.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9\u0660-\u0669\u06F0-\u06F9]/g, "");
    });
  }

  /* Labels */
  modal.querySelectorAll(".form-group, .form-field, .input-group").forEach(group => {

    const input = group.querySelector(
      "input:not([type='radio']):not([type='checkbox']), textarea, select"
    );

    if (!input) return;

    let label = group.querySelector("label");

    if (!label) {
      label = document.createElement("label");
      label.htmlFor = input.id;
      group.insertBefore(label, input);
    }

    if (input.id === "memberName") {
      label.textContent = "اسم العنصر";
    }

    if (input.id === "memberPhone") {
      label.textContent = "رقم الهاتف";
    }
  });

});
loadTrashCount();

// Sidebar and dashboard actions
document
  .getElementById("toggleSidebarButton")
  .addEventListener("click", toggleSidebar);

document
  .getElementById("openMyInfoButton")
  .addEventListener("click", openMyInfo);

document
  .getElementById("openTrashButton")
  .addEventListener("click", openTrash);

document
  .getElementById("logoutButton")
  .addEventListener("click", logout);

document
  .getElementById("openMembersButton")
  .addEventListener("click", openMembers);

document
  .getElementById("openActivitiesButton")
  .addEventListener("click", openActivitiesPage);

// Member and activity modals
document
  .getElementById("openMemberModalButton")
  .addEventListener("click", openMemberModal);

document
  .getElementById("closeMemberModalButton")
  .addEventListener("click", closeMemberModal);

document
  .getElementById("saveMemberButton")
  .addEventListener("click", saveMember);

document
  .getElementById("closeActivityModalButton")
  .addEventListener("click", closeActivityModal);

document
  .getElementById("saveActivityButton")
  .addEventListener("click", saveActivity);

// Dynamic member and activity cards
document
  .getElementById("membersList")
  .addEventListener("click", function (event) {
    const actionButton = event.target.closest("[data-member-action]");

    if (actionButton) {
      const memberId = actionButton.dataset.memberId;

      if (actionButton.dataset.memberAction === "edit") {
        editMember(memberId);
      } else if (actionButton.dataset.memberAction === "delete") {
        deleteMember(memberId);
      }

      return;
    }

    const memberCard = event.target.closest(".member-card");

    if (memberCard) {
      editMember(memberCard.dataset.memberId);
    }
  });

const activitiesList = document.getElementById("activitiesList");

if (activitiesList) {
  activitiesList.addEventListener("click", function (event) {
    const activityCard = event.target.closest(".activity-card");

    if (activityCard) {
      openActivityDetails(activityCard.dataset.activityId);
    }
  });
}
