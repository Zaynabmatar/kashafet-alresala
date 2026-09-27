const SUPABASE_URL = "https://agvjqtyybpvyjoqotfwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_VVSZXpYqWJq9am1fsDjX4Q_V5tMmary";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   ADMIN SESSION
   Meetings and other admin-only actions can use these checks.
   Database policies remain the final authority.
========================================================= */

async function requireAdminSession() {
  const { data: authData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError) {
    return {
      data: null,
      error: authError,
    };
  }

  if (!authData.user) {
    return {
      data: null,
      error: new Error("An authenticated admin session is required."),
    };
  }

  const profileResult = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("id", authData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (profileResult.error) {
    return profileResult;
  }

  if (!profileResult.data) {
    return {
      data: null,
      error: new Error("The authenticated user is not an admin."),
    };
  }

  return {
    data: authData.user,
    error: null,
  };
}


async function runAsAdmin(operation) {
  const adminResult = await requireAdminSession();

  if (adminResult.error) {
    return {
      data: null,
      error: adminResult.error,
    };
  }

  return operation();
}


/* =========================================================
   CENTRAL DATABASE GATEWAY
========================================================= */

window.AppDb = {

  /* =======================================================
     ADMIN / PROFILE
  ======================================================= */

  getAdminSummary() {
    return supabaseClient
      .from("profiles")
      .select("id, full_name, profile_image")
      .eq("role", "admin")
      .single();
  },


  getAdminProfile() {
    return supabaseClient
      .from("profiles")
      .select(
        "id, full_name, phone, birth_date, profile_image, role"
      )
      .eq("role", "admin")
      .single();
  },


  getAdminProfileById(adminId) {
    return supabaseClient
      .from("profiles")
      .select("full_name, profile_image")
      .eq("id", adminId)
      .eq("role", "admin")
      .maybeSingle();
  },


  updateProfile(profileId, changes) {
    return supabaseClient
      .from("profiles")
      .update(changes)
      .eq("id", profileId);
  },


  uploadProfileImage(profileId, file) {
    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    const filePath =
      profileId +
      "/profile-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2) +
      "." +
      extension;

    return supabaseClient.storage
      .from("profiles")
      .upload(filePath, file, {
        upsert: false,
        cacheControl: "0",
      });
  },


  getProfileImagePublicUrl(filePath) {
    return supabaseClient.storage
      .from("profiles")
      .getPublicUrl(filePath);
  },


  listProfileFiles(profileId) {
    return supabaseClient.storage
      .from("profiles")
      .list(profileId);
  },


  removeProfileFiles(filePaths) {
    return supabaseClient.storage
      .from("profiles")
      .remove(filePaths);
  },


  /* =======================================================
     LEADERS
  ======================================================= */

  listActiveLeaders() {
    return supabaseClient
      .from("leaders")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });
  },


  listActiveLeaderDirectory() {
    return supabaseClient
      .from("leaders")
      .select(
        "id, full_name, profile_image, task_id"
      )
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });
  },


  getLeaderById(leaderId) {
    return supabaseClient
      .from("leaders")
      .select("*")
      .eq("id", leaderId)
      .single();
  },


  createLeader(leader) {
    return supabaseClient
      .from("leaders")
      .insert([leader])
      .select()
      .single();
  },


  updateLeader(leaderId, changes) {
    return supabaseClient
      .from("leaders")
      .update(changes)
      .eq("id", leaderId)
      .select()
      .single();
  },


  softDeleteLeader(leaderId) {
    return supabaseClient
      .from("leaders")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", leaderId);
  },


  listDeletedLeaders() {
    return supabaseClient
      .from("leaders")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", {
        ascending: false,
      });
  },


  restoreLeader(leaderId) {
    return supabaseClient
      .from("leaders")
      .update({
        deleted_at: null,
      })
      .eq("id", leaderId);
  },


  countDeletedLeaders() {
    return supabaseClient
      .from("leaders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .not("deleted_at", "is", null);
  },
    /* =======================================================
       MEMBERS
     ======================================================= */

  listActiveMembersByLeader(leaderId) {
    return supabaseClient
      .from("members")
      .select("*")
      .eq("leader_id", leaderId)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });
  },

  getMemberById(memberId) {
    return supabaseClient
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();
  },

  createMember(member) {
    return supabaseClient
      .from("members")
      .insert([member])
      .select("*")
      .single();
  },

  updateMember(memberId, changes) {
    return supabaseClient
      .from("members")
      .update(changes)
      .eq("id", memberId)
      .select("*")
      .single();
  },

  softDeleteMember(memberId) {
    return supabaseClient
      .from("members")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", memberId);
  },

  listDeletedMembers() {
    return supabaseClient
      .from("members")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", {
        ascending: false,
      });
  },

  restoreMember(memberId) {
    return supabaseClient
      .from("members")
      .update({
        deleted_at: null,
      })
      .eq("id", memberId);
  },


  /* =======================================================
     TASKS
     
     IMPORTANT:
     - has_team is controlled by the database trigger.
     - "فرقة" inside the task name => has_team = true.
     - Creating a task does NOT create a team.
     - Duplicate names are rejected by the database
       unique index.
  ======================================================= */

  listTasks() {
    return supabaseClient
      .from("tasks")
      .select("id, name, has_team")
      .order("name", {
        ascending: true,
      });
  },


  getTaskById(taskId) {
    return supabaseClient
      .from("tasks")
      .select("id, name, has_team")
      .eq("id", taskId)
      .maybeSingle();
  },


  createTask(name) {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
      return Promise.resolve({
        data: null,
        error: new Error("Task name is required."),
      });
    }

    /*
      Do NOT send has_team from JavaScript.

      The database trigger decides:
      "فرقة" موجودة في الاسم => has_team = true
      غير موجودة => has_team = false
    */

    return supabaseClient
      .from("tasks")
      .insert([
        {
          name: cleanName,
        },
      ])
      .select("id, name, has_team")
      .single();
  },


  /* =======================================================
     TEAMS
     
     Kept for compatibility with the existing system.
     Creating a TASK does not automatically create a TEAM.
  ======================================================= */

  getOrCreateTeam(taskId, teamName) {
    return supabaseClient
      .from("teams")
      .select("id, task_id, name")
      .eq("task_id", taskId)
      .is("deleted_at", null)
      .maybeSingle()
      .then(async function (result) {

        if (result.error) {
          return result;
        }

        if (result.data) {
          return result;
        }

        return supabaseClient
          .from("teams")
          .insert([
            {
              task_id: taskId,
              name: teamName,
            },
          ])
          .select("id, task_id, name")
          .single();
      });
  },


  createTeam(team) {
    return supabaseClient
      .from("teams")
      .insert([team])
      .select("id, task_id, name")
      .single();
  },


  /* =======================================================
     MEETINGS
  ======================================================= */

  listMeetings() {
    return supabaseClient
      .from("meetings")
      .select("id, title, meeting_date, created_at")
      .order("meeting_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });
  },


  getMeetingById(meetingId) {
    return supabaseClient
      .from("meetings")
      .select("id, title, meeting_date")
      .eq("id", meetingId)
      .single();
  },


  listMeetingAttendance(meetingId) {
    return supabaseClient
      .from("meeting_attendance")
      .select(
        "id, meeting_id, leader_id, status"
      )
      .eq("meeting_id", meetingId);
  },


  listMeetingAttendanceForMeetings(meetingIds) {
    if (!meetingIds.length) {
      return Promise.resolve({
        data: [],
        error: null,
      });
    }

    return supabaseClient
      .from("meeting_attendance")
      .select("meeting_id, status")
      .in("meeting_id", meetingIds);
  },


  createMeeting(meeting) {
    return supabaseClient
      .from("meetings")
      .insert([meeting])
      .select(
        "id, title, meeting_date"
      )
      .single();
  },


  createMeetingAttendance(rows) {
    return supabaseClient
      .from("meeting_attendance")
      .insert(rows);
  },


  updateMeetingAttendanceStatus(
    meetingId,
    leaderId,
    status
  ) {
    return supabaseClient
      .from("meeting_attendance")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("meeting_id", meetingId)
      .eq("leader_id", leaderId);
  },


  /* =======================================================
     AUTH
  ======================================================= */

  signOut() {
    return supabaseClient.auth.signOut();
  },
};


