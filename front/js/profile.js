function openEditSkillsModal() {
    const editSkillsModal = document.getElementById('editSkillsModal');
    const skillsList = document.getElementById('skillsList');
    const editSkillsForm = document.getElementById('editSkillsForm');

    // Clear previous form content
    editSkillsForm.innerHTML = '';

    // Generate input fields for each skill
    skillsList.querySelectorAll('li').forEach((skill, index) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = skill.innerText;
        input.name = `skill-${index + 1}`; // Assign unique name for each input
        editSkillsForm.appendChild(input);
    });

    // Add "Save Changes" button
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save Changes';
    saveButton.onclick = saveSkillsChanges;
    editSkillsForm.appendChild(saveButton);

    // Show the modal
    editSkillsModal.style.display = 'block';
}

function closeEditSkillsModal() {
    const editSkillsModal = document.getElementById('editSkillsModal');
    editSkillsModal.style.display = 'none';
}
function saveSkillsChanges() {
    const skillsList = document.getElementById('skillsList');
    const editSkillsForm = document.getElementById('editSkillsForm');

    // Update each skill in the list with the edited content
    const editedSkills = Array.from(editSkillsForm.querySelectorAll('input')).map(input => `<li>${input.value}</li>`).join('');
    skillsList.innerHTML = editedSkills;

    // Hide the modal after saving changes
    closeEditSkillsModal();
}

