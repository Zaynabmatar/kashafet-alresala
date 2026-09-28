// Admin identity used by the existing shared navigation.
async function loadAdminName() {

  const currentAdminId =
    new URLSearchParams(window.location.search).get("id");

  if (!currentAdminId) {
    return;
  }

  const { data, error } = await AppDb.getAdminProfileById(currentAdminId);

  if (error) {
    console.error("Admin profile error:", error);
    return;
  }

  if (data) {

    document.getElementById("userName").textContent =
      data.full_name || "";

  }

}


// Display helpers
function escapeHtml(value) {

  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;

}


function formatDeletedDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  return date.toLocaleString("ar-LB", {

    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"

  });

}


// Load and render deleted leaders and members.
async function loadTrash() {

  const { data: deletedLeaders, error: leadersError } =
    await AppDb.listDeletedLeaders();

  const { data: deletedMembers, error: membersError } =
    await AppDb.listDeletedMembers();

  if (leadersError || membersError) {

    console.error("Trash loading error:", {
      leadersError,
      membersError
    });

    alert("حدث خطأ أثناء تحميل سلة المحذوفات.");

    return;
  }

  const list = document.getElementById("trashList");
  const empty = document.getElementById("trashEmpty");
  const total = document.getElementById("trashTotal");

  list.innerHTML = "";

  const leaders = deletedLeaders || [];
  const members = deletedMembers || [];

  const teamNames = {};

  if (members.some((member) => member.team_id)) {
    const { data: teams, error: teamsError } = await supabaseClient
      .from("teams")
      .select("id, name");

    if (teamsError) {
      console.error("Trash teams loading error:", teamsError);
    } else {
      (teams || []).forEach((team) => {
        teamNames[team.id] = team.name;
      });
    }
  }

  const allDeleted = [
    ...leaders.map((leader) => ({
      type: "leader",
      data: leader
    })),
    ...members.map((member) => ({
      type: "member",
      data: member
    }))
  ];

  total.textContent = allDeleted.length;

  document.querySelectorAll(".trash-count").forEach((counter) => {
    counter.textContent = allDeleted.length;
  });

  if (!allDeleted.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  allDeleted.forEach((item) => {

    const card = document.createElement("article");
    card.className = "trash-card";

    if (item.type === "leader") {

      const leader = item.data;

      const imageSource = leader.profile_image || leader.image || "";
      const imageHtml = imageSource
        ? `<img src="${escapeHtml(imageSource)}" alt="">`
        : "👤";

      let ageText = "غير محدد العمر";

      if (leader.birth_date) {
        const birth = new Date(leader.birth_date);
        const today = new Date();

        let age = today.getFullYear() - birth.getFullYear();
        const monthDifference = today.getMonth() - birth.getMonth();

        if (
          monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < birth.getDate())
        ) {
          age--;
        }

        ageText =
          age >= 0
            ? String(age).replace(/\d/g, function (digit) {
                return "٠١٢٣٤٥٦٧٨٩"[digit];
              }) + " سنة"
            : "غير محدد العمر";
      }

      const phone = leader.phone
        ? String(leader.phone).replace(/^\+961\s*/, "")
        : "غير محدد";

      const uniformHtml = leader.has_uniform
        ? `
            <span class="trash-detail-icon">👕</span>
            <span class="trash-uniform has-uniform">البدلة موجودة</span>
          `
        : `
            <span class="trash-detail-icon no-uniform-icon">✕</span>
            <span class="trash-uniform no-uniform">لا توجد بدلة</span>
          `;

      card.innerHTML = `
        <div class="trash-card-info">

          <div class="trash-avatar">
            ${imageHtml}
          </div>

          <div class="trash-details">

            <h3>
              ${escapeHtml(leader.full_name || "بدون اسم")}
            </h3>

            <div class="trash-leader-details">

              <div class="trash-detail">
                <span class="trash-detail-icon">📞</span>
                <span>
                  ${
                    phone === "غير محدد"
                      ? "غير محدد"
                      : "+961 " + escapeHtml(phone)
                  }
                </span>
              </div>

              <div class="trash-detail">
                <span class="trash-detail-icon">📅</span>
                <span>${escapeHtml(ageText)}</span>
              </div>

              <div class="trash-detail">
                <span class="trash-detail-icon">👥</span>
                <span>${escapeHtml(leader.branch || "غير محددة")}</span>
              </div>

              <div class="trash-detail">
                ${uniformHtml}
              </div>

            </div>

            ${
              leader.assistants
                ? `
                  <div class="trash-assistants">
                    <span class="trash-assistants-label">المساعدون:</span>
                    <span>${escapeHtml(leader.assistants)}</span>
                  </div>
                `
                : ""
            }

            <p class="deleted-date">
              تم الحذف:
              ${formatDeletedDate(leader.deleted_at)}
            </p>

          </div>

        </div>

        <button
          class="restore-button restore-leader-button"
          type="button"
          data-leader-id="${leader.id}"
        >
          ↩ استعادة
        </button>
      `;

    } else {

      const member = item.data;

      const imageSource = member.profile_image || member.image || "";
      const imageHtml = imageSource
        ? `<img src="${escapeHtml(imageSource)}" alt="">`
        : "👤";

      let ageText = "غير محدد العمر";

      if (member.birth_date) {
        const birth = new Date(member.birth_date);
        const today = new Date();

        let age = today.getFullYear() - birth.getFullYear();
        const monthDifference = today.getMonth() - birth.getMonth();

        if (
          monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < birth.getDate())
        ) {
          age--;
        }

        ageText =
          age >= 0
            ? String(age).replace(/\d/g, function (digit) {
                return "٠١٢٣٤٥٦٧٨٩"[digit];
              }) + " سنة"
            : "غير محدد العمر";
      }

      const phone = member.phone
        ? String(member.phone).replace(/^\+961\s*/, "")
        : "غير محدد";

      const uniformHtml = member.has_uniform === true
        ? `
            <span class="trash-detail-icon">👕</span>
            <span class="trash-uniform has-uniform">يوجد بدلة</span>
          `
        : `
            <span class="trash-detail-icon no-uniform-icon">✕</span>
            <span class="trash-uniform no-uniform">لا يوجد بدلة</span>
          `;

      const teamName = member.team_id
        ? (teamNames[member.team_id] || "فرقة غير محددة")
        : "بدون فرقة";

      card.innerHTML = `
        <div class="trash-card-info">

          <div class="trash-avatar">
            ${imageHtml}
          </div>

          <div class="trash-details">

            <h3>
              ${escapeHtml(member.full_name || "بدون اسم")}
            </h3>

            <div class="trash-leader-details">

              <div class="trash-detail">
                <span class="trash-detail-icon">👤</span>
                <span>عنصر</span>
              </div>

              <div class="trash-detail">
                <span class="trash-detail-icon">👥</span>
                <span>${escapeHtml(teamName)}</span>
              </div>

              <div class="trash-detail">
                <span class="trash-detail-icon">📞</span>
                <span>
                  ${
                    phone === "غير محدد"
                      ? "غير محدد"
                      : "+961 " + escapeHtml(phone)
                  }
                </span>
              </div>

              <div class="trash-detail">
                <span class="trash-detail-icon">📅</span>
                <span>${escapeHtml(ageText)}</span>
              </div>

              <div class="trash-detail">
                ${uniformHtml}
              </div>

            </div>

            <p class="deleted-date">
              تم الحذف:
              ${formatDeletedDate(member.deleted_at)}
            </p>

          </div>

        </div>

        <button
          class="restore-button restore-member-button"
          type="button"
          data-member-id="${member.id}"
        >
          ↩ استعادة
        </button>

      `;

    }

    list.appendChild(card);

  });

}


// Restore actions keep their original confirmation and AppDb behavior.
async function restoreMember(memberId) {

  const confirmed = confirm(
    "هل تريد استعادة هذا العنصر إلى قائمة العناصر؟"
  );

  if (!confirmed) {
    return;
  }

  const { error } = await AppDb.restoreMember(memberId);

  if (error) {

    console.error(
      "Member restore error:",
      error
    );

    alert(
      "حدث خطأ أثناء استعادة العنصر."
    );

    return;
  }

  await loadTrash();

}

async function restoreLeader(leaderId) {

  const confirmed = confirm(
    "هل تريد استعادة هذا القائد إلى قائمة القادة؟"
  );


  if (!confirmed) {
    return;
  }


  const { data: deletedLeader, error: deletedLeaderError } =
    await AppDb.getLeaderById(leaderId);


  if (deletedLeaderError || !deletedLeader) {
    console.error("Deleted leader loading error:", deletedLeaderError);

    alert("تعذّر التحقق من معلومات القائد قبل الاستعادة.");

    return;
  }


  if (deletedLeader.task_id) {
    const { data: activeLeaders, error: activeLeadersError } =
      await supabaseClient
        .from("leaders")
        .select("id, full_name")
        .eq("task_id", deletedLeader.task_id)
        .is("deleted_at", null)
        .neq("id", leaderId)
        .limit(1);

    if (activeLeadersError) {
      console.error("Task availability check error:", activeLeadersError);

      alert("تعذّر التحقق من توفر المهمة قبل الاستعادة.");

      return;
    }

    if (activeLeaders && activeLeaders.length > 0) {
      alert(
        "لا يمكن استعادة القائد " +
          (deletedLeader.full_name || "المحذوف") +
          "، لأن المهمة «" +
          (deletedLeader.branch || "غير محددة") +
          "» مخصصة حاليًا للقائد " +
          (activeLeaders[0].full_name || "آخر") +
          ".",
      );

      return;
    }
  }


  const { error } = await AppDb.restoreLeader(leaderId);


  if (error) {

    console.error(
      "Restore error:",
      error
    );

    alert(
      "حدث خطأ أثناء استعادة القائد."
    );

    return;
  }


  await loadTrash();

}


// Shared navigation entry point.
async function logout() {

  await AppDb.signOut();

  window.location.href = "../index.html";

}


// Page controls
document
  .getElementById("backToAdminButton")
  .addEventListener("click", function () {
    window.location.href = "admin.html";
  });

document
  .getElementById("trashList")
  .addEventListener("click", function (event) {
    const leaderButton = event.target.closest(".restore-leader-button");

    if (leaderButton) {
      restoreLeader(leaderButton.dataset.leaderId);
      return;
    }

    const memberButton = event.target.closest(".restore-member-button");

    if (memberButton) {
      restoreMember(memberButton.dataset.memberId);
    }
  });

loadAdminName();
loadTrash();
