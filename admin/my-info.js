function normalizeBirthDateDigits(value) {
    return String(value || "").replace(/[٠-٩]/g, digit =>
        String(digit.charCodeAt(0) - 0x0660)
    );
}

function parseBirthDate(value) {
    if (!value) return null;

    const normalized = normalizeBirthDateDigits(value).slice(0, 10);
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
        year < 1900 ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return null;

    return { year, month, day };
}

function calculateAgeText(birthDateValue) {
    const birthDate = parseBirthDate(birthDateValue);
    if (!birthDate) return "غير محدد";

    const today = new Date();
    let age = today.getFullYear() - birthDate.year;
    if (
        today.getMonth() + 1 < birthDate.month ||
        (today.getMonth() + 1 === birthDate.month && today.getDate() < birthDate.day)
    ) {
        age--;
    }

    const displayedAge = String(age).replace(/[0-9]/g, digit =>
        String.fromCharCode(digit.charCodeAt(0) + 0x0660 - 0x0030)
    );
    return age >= 0 ? displayedAge + " سنة" : "غير محدد";
}

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

        window.currentProfileBirthDate = profile.birth_date || null;
        document.getElementById("ageInfo").textContent =
            calculateAgeText(profile.birth_date);
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
                '<input type="text" id="birthDay" class="edit-input birth-day" inputmode="numeric" maxlength="2" placeholder="اليوم" aria-label="اليوم">' +
                '<input type="text" id="birthMonth" class="edit-input birth-month" inputmode="numeric" maxlength="2" placeholder="الشهر" aria-label="الشهر">' +
                '<input type="text" id="birthYear" class="edit-input birth-year" inputmode="numeric" maxlength="4" placeholder="السنة" aria-label="السنة">' +
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

    function setupBirthDatePicker() {
        const dateInputs = [
            document.getElementById("birthDay"),
            document.getElementById("birthMonth"),
            document.getElementById("birthYear")
        ];

        dateInputs.forEach(input => {
            if (!input) return;

            input.addEventListener("beforeinput", function (event) {
                if (event.data && /[^0-9٠-٩]/.test(event.data)) {
                    event.preventDefault();
                }
            });

            input.addEventListener("input", function () {
                input.value = input.value.replace(/[^0-9٠-٩]/g, "");
                updateBirthDate();
            });
        });

        function updateBirthDate() {
            const [dayInput, monthInput, yearInput] = dateInputs;
            if (!dayInput || !monthInput || !yearInput) return;

            const day = normalizeBirthDateDigits(dayInput.value);
            const month = normalizeBirthDateDigits(monthInput.value);
            const year = normalizeBirthDateDigits(yearInput.value);

            if (!day && !month && !year) {
                birthDateInput.value = "";
                return;
            }

            if (!day || !month || !year) {
                birthDateInput.value = "";
                return;
            }

            const dateValue = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            birthDateInput.value = parseBirthDate(dateValue) ? dateValue : "";
        }
    }

    function loadBirthDateIntoPicker(dateValue) {
        const dayInput = document.getElementById("birthDay");
        const monthInput = document.getElementById("birthMonth");
        const yearInput = document.getElementById("birthYear");

        if (!dayInput || !monthInput || !yearInput) return;

        if (!dateValue) {
            dayInput.value = "";
            monthInput.value = "";
            yearInput.value = "";
            return;
        }

        const parsedDate = parseBirthDate(dateValue);

        if (parsedDate) {
            yearInput.value = String(parsedDate.year);
            monthInput.value = String(parsedDate.month).padStart(2, "0");
            dayInput.value = String(parsedDate.day).padStart(2, "0");
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

        const dateInputs = [
            document.getElementById("birthDay"),
            document.getElementById("birthMonth"),
            document.getElementById("birthYear")
        ];
        const normalizedParts = dateInputs.map(input =>
            normalizeBirthDateDigits(input?.value || "").trim()
        );
        const hasBirthDatePart = normalizedParts.some(Boolean);
        let newBirthDate = null;

        if (hasBirthDatePart) {
            const [day, month, year] = normalizedParts;
            const parsedDate = day && month && year
                ? parseBirthDate(`${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
                : null;

            if (!parsedDate) {
                alert("يرجى إدخال تاريخ ميلاد كامل وصحيح.");
                return;
            }

            newBirthDate = `${String(parsedDate.year).padStart(4, "0")}-${String(parsedDate.month).padStart(2, "0")}-${String(parsedDate.day).padStart(2, "0")}`;
        }

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
            ageValue.textContent = calculateAgeText(newBirthDate);
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
