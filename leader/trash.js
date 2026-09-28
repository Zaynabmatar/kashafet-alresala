// Leader Trash page behavior

const leaderId =
  new URLSearchParams(window.location.search).get("id");

let deletedMembers = [];

// Display helpers
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function calculateAge(birthDate) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const month = today.getMonth() - birth.getMonth();

  if (
    month < 0 ||
    (month === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}

function formatPhone(phone) {
  if (!phone) return "";

  const value = String(phone).trim();

  if (value.startsWith("+961")) {
    return value;
  }

  if (value.startsWith("961")) {
    return "+" + value;
  }

  return value;
}

function formatDeletedDate(dateValue) {
  if (!dateValue) return "غير محدد";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleDateString("ar-LB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// Render deleted members and the current deleted-item count
function renderTrash() {
  const list = document.getElementById("trashList");
  const empty = document.getElementById("trashEmpty");
  const total = document.getElementById("trashTotal");

  if (!list || !empty || !total) return;

  total.textContent = deletedMembers.length;
  list.innerHTML = "";

  if (!deletedMembers.length) {
    list.style.display = "none";
    empty.style.display = "block";
    return;
  }

  list.style.display = "grid";
  empty.style.display = "none";

  deletedMembers.forEach(member => {
    const age = calculateAge(member.birth_date);
    const phone = formatPhone(member.phone);
    const uniform = member.has_uniform === true;

    const avatar = member.profile_image
      ? `<img src="${escapeHtml(member.profile_image)}" alt="">`
      : "👤";

    const card = document.createElement("article");
    card.className = "trash-card member-trash-card";

    card.innerHTML = `
      <div class="member-main">
        <div class="member-profile">
          <div class="member-avatar">
            ${avatar}
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
                  ? escapeHtml(age) + " سنة"
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
        </div>

        <div class="member-card-actions">
          <div class="deleted-date">
            حُذف بتاريخ ${escapeHtml(
              formatDeletedDate(member.deleted_at)
            )}
          </div>

          <button
            class="restore-button"
            type="button"
            data-member-id="${escapeHtml(member.id)}"
          >
            ↩ استعادة
          </button>
        </div>
      </div>
    `;

    list.appendChild(card);
  });
}

// Load deleted members
async function loadTrash() {
  if (!leaderId) {
    alert("تعذر تحديد القائد.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("members")
      .select("*")
      .eq("leader_id", leaderId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Load deleted members error:", error);
      alert("تعذر تحميل سلة المحذوفات.");
      return;
    }

    deletedMembers = data || [];
    renderTrash();
  } catch (error) {
    console.error("Trash error:", error);
    alert("حدث خطأ أثناء تحميل سلة المحذوفات.");
  }
}

// Restore a deleted member after confirmation
async function restoreMember(memberId) {
  if (!leaderId) return;

  const member = deletedMembers.find(
    item => String(item.id) === String(memberId)
  );

  if (!member) return;

  const confirmed = confirm(
    "هل تريد ↩ استعادة هذا العنصر؟"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("members")
    .update({
      deleted_at: null
    })
    .eq("id", memberId)
    .eq("leader_id", leaderId);

  if (error) {
    console.error("Restore member error:", error);
    alert("تعذر ↩ استعادة العنصر.");
    return;
  }

  deletedMembers = deletedMembers.filter(
    item => String(item.id) !== String(memberId)
  );

  renderTrash();
}

// Navigation and page event listeners
function goBack() {
  window.location.href =
    "../leader-dashboard.html?id=" +
    encodeURIComponent(leaderId);
}

document
  .querySelector(".menu-button")
  ?.addEventListener("click", goBack);

document
  .getElementById("trashList")
  ?.addEventListener("click", event => {
    const restoreButton = event.target.closest(".restore-button");

    if (restoreButton) {
      restoreMember(restoreButton.dataset.memberId);
    }
  });

loadTrash();
