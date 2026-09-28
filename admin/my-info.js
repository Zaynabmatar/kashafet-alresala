// Profile loading
async function loadMyInfo() {
    const loadingMessage = document.getElementById("loadingMessage");
    const profileContent = document.getElementById("profileContent");
    const errorMessage = document.getElementById("errorMessage");

    try {
        const { data: profile, error: profileError } = await AppDb.getAdminProfile();
        if (profileError || !profile) {
            throw new Error("لم يتم العثور على حساب الأدمن");
        }

        const adminId = profile.id;

        document.getElementById("fullName").textContent =
            profile.full_name || "غير محدد";
        document.getElementById("fullNameInfo").textContent =
            profile.full_name || "غير محدد";

        const roleText =
            profile.role === "admin" || profile.role === "leader"
                ? "قائدة الكشافة"
                : profile.role || "غير محدد";

        document.getElementById("role").textContent = roleText;
        document.getElementById("roleInfo").textContent = roleText;
        document.getElementById("phoneInfo").textContent =
            profile.phone || "غير محدد";

        let ageText = "غير محدد";
        window.currentProfileBirthDate = profile.birth_date || null;

        if (profile.birth_date) {
            const birthDate = new Date(profile.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();

            if (
                monthDifference < 0 ||
                (monthDifference === 0 && today.getDate() < birthDate.getDate())
            ) {
                age--;
            }

            if (age >= 0) {
                ageText = age + " سنة";
            }
        }

        document.getElementById("ageInfo").textContent = ageText;
        loadingMessage.style.display = "none";
        profileContent.dataset.profileId = adminId;
        profileContent.style.display = "block";
    } catch (error) {
        console.error("Error loading my info:", error);
        loadingMessage.style.display = "none";
        errorMessage.textContent = "Error: " + error.message;
        errorMessage.style.display = "block";
    }
}

// Profile editor markup
function addProfileEditorMarkup() {
    const grid = document.querySelector(".info-grid");

    if (!grid) {
        console.error("info-grid not found");
        return;
    }

    const actions = document.createElement("div");
    actions.className = "edit-actions";
    actions.innerHTML = `
        <button type="button" id="editProfileButton">تعديل المعلومات</button>
        <button type="button" id="saveProfileButton" class="is-hidden">حفظ</button>
        <button type="button" id="cancelEditButton" class="is-hidden">إلغاء</button>
    `;
    grid.parentNode.appendChild(actions);

    const items = grid.querySelectorAll(".info-item");
    const nameItem = items[0];
    const ageItem = items[1];
    const phoneItem = items[2];

    nameItem.insertAdjacentHTML(
        "beforeend",
        '<input type="text" id="fullNameInput" class="edit-input is-hidden">'
    );

    ageItem.insertAdjacentHTML(
        "beforeend",
        '<div id="birthDatePicker" class="birth-date-picker is-hidden">' +
            '<div class="birth-date-fields">' +
                '<select id="birthDay" class="edit-input birth-day">' +
                    '<option value="">Day</option>' +
                '</select>' +
                '<select id="birthMonth" class="edit-input birth-month">' +
                    '<option value="">Month</option>' +
                '</select>' +
                '<select id="birthYear" class="edit-input birth-year">' +
                    '<option value="">Year</option>' +
                '</select>' +
            '</div>' +
        '</div>' +
        '<input type="hidden" id="birthDateInput">'
    );

    phoneItem.insertAdjacentHTML(
        "beforeend",
        '<input type="tel" id="phoneInput" class="edit-input is-hidden" dir="ltr" placeholder="+961 3XXXXXX" autocomplete="tel">'
    );
}

// Profile editing
function setupProfileEditor() {
    const editButton = document.getElementById("editProfileButton");
    const saveButton = document.getElementById("saveProfileButton");
    const cancelButton = document.getElementById("cancelEditButton");
    const nameInput = document.getElementById("fullNameInput");
    const phoneInput = document.getElementById("phoneInput");
    const birthDateInput = document.getElementById("birthDateInput");
    const nameValue = document.getElementById("fullNameInfo");
    const phoneValue = document.getElementById("phoneInfo");
    const ageValue = document.getElementById("ageInfo");

    if (!editButton || !saveButton || !cancelButton) {
        console.error("Profile edit controls not found.");
        return;
    }

    let originalName = "";
    let originalPhone = "";

    function calculateAge(birthDateValue) {
        if (!birthDateValue) return "غير محدد";

        const birthDate = new Date(birthDateValue);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();

        if (
            monthDifference < 0 ||
            (monthDifference === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return age >= 0 ? age + " سنة" : "غير محدد";
    }

    function setupBirthDatePicker() {
        const daySelect = document.getElementById("birthDay");
        const monthSelect = document.getElementById("birthMonth");
        const yearSelect = document.getElementById("birthYear");

        if (!daySelect || !monthSelect || !yearSelect) return;

        if (yearSelect.options.length === 1) {
            const currentYear = new Date().getFullYear();

            for (let year = currentYear; year >= 1900; year--) {
                const option = document.createElement("option");
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }

            const months = [
                "January", "February", "March", "April",
                "May", "June", "July", "August",
                "September", "October", "November", "December"
            ];

            months.forEach((month, index) => {
                const option = document.createElement("option");
                option.value = String(index + 1).padStart(2, "0");
                option.textContent = month;
                monthSelect.appendChild(option);
            });

            for (let day = 1; day <= 31; day++) {
                const option = document.createElement("option");
                option.value = String(day).padStart(2, "0");
                option.textContent = day;
                daySelect.appendChild(option);
            }
        }

        function updateBirthDate() {
            const day = daySelect.value;
            const month = monthSelect.value;
            const year = yearSelect.value;

            if (day && month && year) {
                const dateValue = year + "-" + month + "-" + day;
                const selectedDate = new Date(dateValue + "T00:00:00");
                const today = new Date();

                if (selectedDate > today) {
                    birthDateInput.value = "";
                    return;
                }

                birthDateInput.value = dateValue;
            }
        }

        daySelect.addEventListener("change", updateBirthDate);
        monthSelect.addEventListener("change", updateBirthDate);
        yearSelect.addEventListener("change", updateBirthDate);
    }

    function loadBirthDateIntoPicker(dateValue) {
        const daySelect = document.getElementById("birthDay");
        const monthSelect = document.getElementById("birthMonth");
        const yearSelect = document.getElementById("birthYear");

        if (!daySelect || !monthSelect || !yearSelect) return;

        if (!dateValue) {
            daySelect.value = "";
            monthSelect.value = "";
            yearSelect.value = "";
            return;
        }

        const parts = dateValue.substring(0, 10).split("-");

        if (parts.length === 3) {
            yearSelect.value = parts[0];
            monthSelect.value = parts[1];
            daySelect.value = parts[2];
        }
    }

    function enterEditMode() {
        originalName = nameValue.textContent === "غير محدد"
            ? ""
            : nameValue.textContent;
        originalPhone = phoneValue.textContent === "غير محدد"
            ? ""
            : phoneValue.textContent;

        nameInput.value = originalName;

        const savedPhone = originalPhone || "";
        if (savedPhone) {
            phoneInput.value = savedPhone.startsWith("+961")
                ? savedPhone
                : "+961 " + savedPhone.replace(/^0/, "");
        } else {
            phoneInput.value = "+961 ";
        }

        birthDateInput.value = window.currentProfileBirthDate || "";
        nameInput.style.display = "block";
        phoneInput.style.display = "block";
        phoneInput.setAttribute("dir", "ltr");
        phoneInput.style.setProperty("direction", "ltr", "important");
        phoneInput.style.setProperty("text-align", "left", "important");
        phoneInput.style.setProperty("unicode-bidi", "isolate", "important");
        phoneInput.style.setProperty("writing-mode", "horizontal-tb", "important");

        document.getElementById("birthDatePicker").style.display = "block";
        loadBirthDateIntoPicker(birthDateInput.value);
        nameValue.style.display = "none";
        phoneValue.style.display = "none";
        ageValue.style.display = "none";
        editButton.style.display = "none";
        saveButton.style.display = "inline-block";
        cancelButton.style.display = "inline-block";
    }

    function exitEditMode() {
        nameInput.style.display = "none";
        phoneInput.style.display = "none";
        document.getElementById("birthDatePicker").style.display = "none";
        birthDateInput.style.display = "none";
        nameValue.style.display = "block";
        phoneValue.style.display = "block";
        ageValue.style.display = "block";
        editButton.style.display = "inline-block";
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
    }

    setupBirthDatePicker();
    editButton.addEventListener("click", enterEditMode);
    cancelButton.addEventListener("click", function () {
        nameInput.value = originalName;
        phoneInput.value = originalPhone;
        exitEditMode();
    });

    saveButton.addEventListener("click", async function () {
        const newName = nameInput.value.trim();
        let newPhone = phoneInput.value.trim();
        newPhone = newPhone.replace(/\s+/g, " ");

        if (newPhone.startsWith("03")) {
            newPhone = "+961 " + newPhone.substring(1);
        } else if (newPhone.startsWith("3") && !newPhone.startsWith("+961")) {
            newPhone = "+961 " + newPhone;
        } else if (newPhone && !newPhone.startsWith("+961")) {
            newPhone = "+961 " + newPhone.replace(/^0/, "");
        }

        const newBirthDate = birthDateInput.value || null;

        if (!newName) {
            alert("الرجاء إدخال الاسم الكامل.");
            nameInput.focus();
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "جارٍ الحفظ...";

        try {
            const currentProfileId =
                document.querySelector("#profileContent")?.dataset.profileId;

            if (!currentProfileId) {
                throw new Error("لم يتم العثور على معرف الحساب.");
            }

            const { error: updateError } = await AppDb.updateProfile(currentProfileId, {
                full_name: newName,
                phone: newPhone || null,
                birth_date: newBirthDate
            });

            if (updateError) throw updateError;

            nameValue.textContent = newName || "غير محدد";
            phoneValue.textContent = newPhone || "غير محدد";
            ageValue.textContent = calculateAge(newBirthDate);
            document.getElementById("fullName").textContent =
                newName || "غير محدد";
            exitEditMode();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("لم نتمكن من حفظ المعلومات: " + error.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "حفظ";
        }
    });
}

addProfileEditorMarkup();
setupProfileEditor();
loadMyInfo();
