document.addEventListener('DOMContentLoaded', async () => {
    const defaultResumeName = document.getElementById('default-resume-name');
    const manageBtn = document.getElementById('manage-btn');

    // Load Default Resume
    const data = await chrome.storage.local.get('resumes');
    const resumes = data.resumes || [];
    const defaultResume = resumes.find(r => r.isDefault) || resumes[0];

    if (defaultResume) {
        defaultResumeName.textContent = defaultResume.name;
        defaultResumeName.title = defaultResume.name;
    } else {
        defaultResumeName.textContent = 'No resume selected';
    }

    // Open Options Page
    manageBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});
