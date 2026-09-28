// Login page user directory behavior

function openProfile(button) {
  const adminId = button.dataset.adminId;

  if (!adminId) {
    console.error("Admin ID not found");
    return;
  }

  window.location.href =
    "admin/admin.html?id=" + encodeURIComponent(adminId);
}

async function loadAdminName() {
  const { data, error } = await AppDb.getAdminSummary();

  if (error) {
    console.error("Error loading admin:", error);
    return;
  }

  const nameElement = document.querySelector(".user-name");

  if (nameElement) {
    nameElement.textContent = data.full_name;
  }

  const adminAvatar = document.getElementById("adminAvatarImage");

  if (adminAvatar && data.profile_image) {
    adminAvatar.innerHTML = `<img src="${data.profile_image}" alt="">`;
  }

  const adminButton = document.querySelector(".user-card");

  if (adminButton) {
    adminButton.dataset.adminId = data.id;
  }
}

async function loadLeaders() {
  const leadersList = document.getElementById("leadersList");

  if (!leadersList) return;

  const [leadersResult, tasksResult] = await Promise.all([
    AppDb.listActiveLeaderDirectory(),
    AppDb.listTasks()
  ]);

  const { data, error } = leadersResult;

  if (error) {
    console.error("Error loading leaders:", error);
    return;
  }

  if (tasksResult.error) {
    console.error("Error loading tasks:", tasksResult.error);
    return;
  }

  leadersList.innerHTML = "";

  const teamTaskIds = new Set(
    (tasksResult.data || [])
      .filter(function (task) {
        return task.has_team === true;
      })
      .map(function (task) {
        return String(task.id);
      })
  );

  const teamLeaders = (data || []).filter(function (leader) {
    return teamTaskIds.has(String(leader.task_id));
  });

  if (teamLeaders.length === 0) return;

  teamLeaders.forEach(function (leader) {
    const button = document.createElement("button");
    button.className = "user-card";
    button.type = "button";

    button.innerHTML = `
      <span class="avatar">
        ${leader.profile_image
          ? `<img src="${leader.profile_image}" alt="">`
          : `<svg viewBox="0 0 24 24"><path d="M12 12 a4 4 0 1 0 0-8 a4 4 0 0 0 0 8 M4 21 c0-4.4 3.6-7 8-7 s8 2.6 8 7 Z"/></svg>`
        }
      </span>
      <span class="user-name"></span>
    `;

    button.querySelector(".user-name").textContent = leader.full_name;
    button.addEventListener("click", function () {
      window.location.href =
        "leader-dashboard.html?id=" + encodeURIComponent(leader.id);
    });

    leadersList.appendChild(button);
  });
}

// The admin card remains clickable before and after its profile data loads.
const adminButton = document.querySelector(".user-card");

if (adminButton) {
  adminButton.addEventListener("click", function () {
    openProfile(this);
  });
}

loadAdminName();
loadLeaders();
