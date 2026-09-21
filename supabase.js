const SUPABASE_URL = "https://agvjqtyybpvyjoqotfwq.supabase.co";

const SUPABASE_KEY = "sb_publishable_VVSZXpYqWJq9am1fsDjX4Q_V5tMmary";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/*
 * Central database gateway.
 * Keep all Supabase access in this file so pages only call AppDb methods.
 */
window.AppDb = {
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
            .select("id, full_name, phone, birth_date, profile_image, role")
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
        const extension = file.name.split(".").pop().toLowerCase();
        const filePath = profileId + "/profile." + extension;

        return supabaseClient.storage
            .from("profiles")
            .upload(filePath, file, {
                upsert: true,
                cacheControl: "3600"
            });
    },

    getProfileImagePublicUrl(profileId, file) {
        const extension = file.name.split(".").pop().toLowerCase();
        const filePath = profileId + "/profile." + extension;

        return supabaseClient.storage
            .from("profiles")
            .getPublicUrl(filePath);
    },

    listProfileFiles(profileId) {
        return supabaseClient.storage.from("profiles").list(profileId);
    },

    removeProfileFiles(filePaths) {
        return supabaseClient.storage.from("profiles").remove(filePaths);
    },

    listActiveLeaders() {
        return supabaseClient
            .from("leaders")
            .select("*")
            .is("deleted_at", null)
            .order("full_name", { ascending: true });
    },

    listActiveLeaderDirectory() {
        return supabaseClient
            .from("leaders")
            .select("id, full_name")
            .is("deleted_at", null)
            .order("full_name", { ascending: true });
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
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", leaderId);
    },

    listDeletedLeaders() {
        return supabaseClient
            .from("leaders")
            .select("*")
            .not("deleted_at", "is", null)
            .order("deleted_at", { ascending: false });
    },

    restoreLeader(leaderId) {
        return supabaseClient
            .from("leaders")
            .update({ deleted_at: null })
            .eq("id", leaderId);
    },

    countDeletedLeaders() {
        return supabaseClient
            .from("leaders")
            .select("id", { count: "exact", head: true })
            .not("deleted_at", "is", null);
    },

    listTasks() {
        return supabaseClient
            .from("tasks")
            .select("id, name")
            .order("name", { ascending: true });
    },

    createTask(name) {
        return supabaseClient
            .from("tasks")
            .insert([{ name: name }])
            .select("id, name")
            .single();
    },

    signOut() {
        return supabaseClient.auth.signOut();
    }
};
